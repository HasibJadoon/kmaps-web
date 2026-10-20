import type { CoreEnv } from './env';
import { query, execute } from '../../shared/src/db';
import { typedId } from '../../shared/src/ulid';
import { speedPoints } from './bank/score';
import { quizDrillOf, quizAnswerHolds, type QuizMode } from './quiz/drills';

interface Player {
  userId: string;
  name: string | null;
  isHost: boolean;
}

interface Live {
  questionId: string;
  prompt: string;
  options: string[];
  seconds: number;
  module: string;
  resourceRef: string | null;

  askedAt: number;

  correctIndex: number | null;
  explanation: string | null;
  /** The Arabic a drill is asked of, when it is a drill. */
  line?: string | null;
  /** How it is answered: one plate (a bank question is always one), every plate that holds, or tiles in order. */
  mode?: QuizMode;
  /** all / order: the plates that hold, or the tiles' order — sent only once revealed. */
  correct?: number[] | null;
}

interface Given {
  userId: string;
  name: string | null;
  choice: number;
  /** all / order: the plates picked, or the tiles in the order built. */
  picked?: number[] | null;
  ms: number;
  correct: boolean;
  points: number;
  /** The first to answer right: their points carry the bonus for it. */
  first?: boolean;
}

/** Points on top for being the first to answer right. */
const FIRST_BONUS = 100;
/** A moment after the clock runs out before the answer is shown, for answers on their way. */
const GRACE_MS = 800;
type RevealReason = 'all' | 'time' | 'host';

const scoreFor = (correct: boolean, ms: number, seconds: number): number =>
  speedPoints(correct ? 1 : 0, ms, seconds);

export class QuizSession {
  constructor(private state: DurableObjectState, private env: CoreEnv) {
    try {
      this.state.setWebSocketAutoResponse(
        new WebSocketRequestResponsePair('ping', 'pong'),
      );
    } catch {  }
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }
    const userId = request.headers.get('X-KM-User-Id') ?? '';
    const sessionId = request.headers.get('X-KM-Session-Id') ?? '';
    const hostRef = request.headers.get('X-KM-Host-Id') ?? '';
    if (!userId) return new Response('Authenticated user required', { status: 401 });

    const roomCode = request.headers.get('X-KM-Room-Code') ?? '';
    if (sessionId && !(await this.state.storage.get<string>('sessionId'))) {
      await this.state.storage.put('sessionId', sessionId);
      await this.state.storage.put('hostRef', hostRef);
    }

    if (roomCode) await this.state.storage.put('code', roomCode);

    const { 0: client, 1: server } = new WebSocketPair();
    const player: Player = {
      userId,
      name: await this.displayNameOf(userId),
      isHost: userId === (await this.state.storage.get<string>('hostRef')),
    };
    this.state.acceptWebSocket(server);
    server.serializeAttachment(player);

    this.sendTo(server, {
      t: 'sync',
      you: player,
      live: this.publicLive(await this.getLive()),
      given: await this.givenSummary(),
      board: await this.board(),
      roster: this.roster(),
    });
    this.broadcastPresence();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    let msg: { t?: string; question?: string; choice?: number; picked?: number[]; drill?: string; scope?: string };
    try {
      const text = typeof message === 'string' ? message : new TextDecoder().decode(message);
      msg = JSON.parse(text);
    } catch { return; }
    if (msg.t === 'ping') return;

    const me = ws.deserializeAttachment() as Player | null;
    if (!me) return;

    switch (msg.t) {
      case 'push':
        if (me.isHost && msg.drill && msg.scope) await this.pushDrill(msg.scope, msg.drill);
        else if (me.isHost && msg.question) await this.push(msg.question);
        return;
      case 'answer':
        if (typeof msg.choice === 'number') await this.answer(me, msg.choice, null);
        else if (Array.isArray(msg.picked) && msg.picked.every((x) => Number.isInteger(x))) await this.answer(me, -1, msg.picked);
        return;
      case 'reveal': if (me.isHost) await this.reveal('host'); return;
      case 'end':    if (me.isHost) await this.end(); return;
      default: return;
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.broadcastPresence(ws);
    // the one still to answer left: the others need not wait for them
    if (await this.allIn(ws)) await this.reveal('all');
  }

  /** The clock for this question: when its time is up, the answer is shown to all. */
  private async timeUp(live: Live): Promise<void> {
    await this.state.storage.put('alarmFor', live.questionId);
    await this.state.storage.setAlarm(live.askedAt + live.seconds * 1000 + GRACE_MS);
  }

  async alarm(): Promise<void> {
    const live = await this.getLive();
    const forQ = await this.state.storage.get<string>('alarmFor');
    if (!live || forQ !== live.questionId) return;
    await this.reveal('time');
  }

  /** Everyone in the room who plays (the host too, when there is no one else) has answered. */
  private async allIn(excluding?: WebSocket): Promise<boolean> {
    const live = await this.getLive();
    if (!live || live.correctIndex !== null || live.correct) return false;
    const given = await this.getGiven();
    if (!given.length) return false;
    const people = this.roster(this.state.getWebSockets().filter((ws) => ws !== excluding));
    const players = people.filter((p) => !p.isHost);
    const need = new Set((players.length ? players : people).map((p) => p.userId));
    return [...need].every((id) => given.some((g) => g.userId === id));
  }

  private async push(questionId: string): Promise<void> {

    const rows = await query<{
      id: string; prompt: string; seconds: number | null; module: string;
      resource_ref: string | null; explanation: string | null; pack_ref: string;
    }>(
      this.env.DB_CORE,
      `SELECT i.id, COALESCE(i.prompt_en, i.prompt_ar, i.prompt_ur) AS prompt,
              i.seconds, i.module, i.resource_ref, i.explanation_en AS explanation,
              i.pack_ref
         FROM core_bank_item i
        WHERE i.id = ? AND i.status = 'live'
          AND i.scoring != 'none'`,
      [questionId],
    );
    const q = rows[0];
    if (!q) return;

    const optionRows = await query<{ id: string; label: string; is_correct: number }>(
      this.env.DB_CORE,
      `SELECT id, COALESCE(label_en, label_ar, label_ur) AS label, is_correct
         FROM core_bank_item_option
        WHERE item_ref = ? AND role = 'choice'
        ORDER BY sort_order`,
      [questionId],
    );
    const options = optionRows.map((o) => String(o.label ?? ''));
    if (options.length < 2) return;
    await this.state.storage.put('optionIds', optionRows.map((o) => o.id));
    await this.state.storage.put('packRef', q.pack_ref);

    const live: Live = {
      questionId: q.id,
      prompt: q.prompt,
      options,
      seconds: q.seconds ?? 20,
      module: q.module,
      resourceRef: q.resource_ref,
      askedAt: Date.now(),
      correctIndex: null,
      explanation: null,
    };
    await this.state.storage.put('live', live);
    await this.state.storage.put('given', [] as Given[]);
    await this.markLive();
    await this.timeUp(live);

    this.broadcast({ t: 'question', live: this.publicLive(live), given: [] });
  }

  /** A drill of a passage the host studied, from the host's own class record. Its answer stays here. */
  private async pushDrill(scope: string, itemRef: string): Promise<void> {
    const host = await this.state.storage.get<string>('hostRef');
    if (!host) return;
    const rows = await query<{ card_json: string | null; module: string }>(this.env.DB_CORE,
      `SELECT i.card_json, c.module FROM core_drill_class_item i JOIN core_drill_class c ON c.id = i.class_id
        WHERE c.user_ref = ? AND c.scope_ref = ? AND i.item_ref = ?`, [host, scope, itemRef]);
    const q = quizDrillOf(rows[0]?.card_json ?? null);
    if (!q) return;
    await this.state.storage.put('drillAnswer', { questionId: itemRef, mode: q.mode, correctIndex: q.correctIndex, correct: q.correct, explanation: q.explanation });
    await this.state.storage.put('optionIds', [] as string[]);
    // a drill's answers are kept under its passage, as a bank question's are under its pack
    await this.state.storage.put('packRef', scope);
    const live: Live = {
      questionId: itemRef, prompt: q.prompt, options: q.options, seconds: 20,
      module: rows[0]?.module ?? 'QR', resourceRef: scope, askedAt: Date.now(),
      correctIndex: null, explanation: null, line: q.line, mode: q.mode, correct: null,
    };
    await this.state.storage.put('live', live);
    await this.state.storage.put('given', [] as Given[]);
    await this.markLive();
    await this.timeUp(live);
    this.broadcast({ t: 'question', live: this.publicLive(live), given: [] });
  }

  private publicLive(live: Live | null) {
    if (!live) return null;
    return {
      questionId: live.questionId,
      prompt: live.prompt,
      options: live.options,
      seconds: live.seconds,
      module: live.module,
      resourceRef: live.resourceRef,
      askedAt: live.askedAt,
      revealed: live.correctIndex !== null || !!live.correct,
      correctIndex: live.correctIndex,
      explanation: live.explanation,
      line: live.line ?? null,
      mode: live.mode ?? 'one',
      correct: live.correct ?? null,
    };
  }

  private async answer(me: Player, choice: number, picked: number[] | null): Promise<void> {
    const live = await this.getLive();
    if (!live || live.correctIndex !== null || live.correct) return;
    const mode = live.mode ?? 'one';
    if (mode === 'one' ? (choice < 0 || choice >= live.options.length)
                       : (!picked || !picked.length || picked.some((i) => i < 0 || i >= live.options.length))) return;

    const ms = Math.max(0, Date.now() - live.askedAt);
    let correct: boolean;
    if (mode === 'one') {
      correct = (await this.correctIndexOf(live.questionId)) === choice;
    } else {
      const key = await this.state.storage.get<{ questionId: string; mode: QuizMode; correctIndex: number; correct: number[] }>('drillAnswer');
      if (!key || key.questionId !== live.questionId) return;
      correct = quizAnswerHolds(key, { picked: picked ?? [] });
    }

    const given = await this.getGiven();
    if (given.some((g) => g.userId === me.userId)) return;

    given.push({
      userId: me.userId, name: me.name, choice, picked, ms, correct,
      points: scoreFor(correct, ms, live.seconds),
    });
    await this.state.storage.put('given', given);

    this.broadcast({ t: 'locked', given: this.lockedSummary(given) });
    // everyone is in: the answer at once, no waiting for the clock
    if (await this.allIn()) await this.reveal('all');
  }

  private lockedSummary(given: Given[]) {
    return given.map((g) => ({ userId: g.userId, name: g.name }));
  }

  private async givenSummary() {
    const live = await this.getLive();
    const given = await this.getGiven();

    return live?.correctIndex !== null && live !== null
      ? given
      : this.lockedSummary(given);
  }

  private async reveal(reason: RevealReason = 'host'): Promise<void> {
    const live = await this.getLive();
    if (!live || live.correctIndex !== null || live.correct) return;

    const mode = live.mode ?? 'one';
    const key = await this.state.storage.get<{ questionId: string; correct: number[] }>('drillAnswer');
    const correctIndex = mode === 'one' ? await this.correctIndexOf(live.questionId) : -1;
    if (correctIndex === null) return;
    const correct = mode === 'one' ? null : (key?.questionId === live.questionId ? key.correct : null);
    if (mode !== 'one' && !correct) return;
    const explanation = await this.explanationOf(live.questionId);

    const revealed: Live = { ...live, correctIndex, correct, explanation };
    await this.state.storage.put('live', revealed);
    await this.state.storage.delete('alarmFor');

    // fastest first; the first one right carries the bonus
    const given = (await this.getGiven()).sort((a, b) => a.ms - b.ms);
    const first = given.find((g) => g.correct);
    if (first) { first.first = true; first.points += FIRST_BONUS; }
    await this.state.storage.put('given', given);

    // the places before this question, so the board can show who climbed
    const before = await this.board() as Array<{ userId: string }>;
    await this.persist(live.questionId, given);

    // how the room answered: per plate (one: the plate chosen; all: every plate picked)
    const tally = mode === 'order' ? null : live.options.map((_, i) =>
      given.filter((g) => (mode === 'one' ? g.choice === i : (g.picked ?? []).includes(i))).length);

    this.broadcast({
      t: 'reveal',
      reason,
      live: this.publicLive(revealed),
      given,
      tally,
      bonus: FIRST_BONUS,
      prev: Object.fromEntries(before.map((r, i) => [r.userId, i + 1])),
      board: await this.board(),
    });
  }

  private async persist(questionId: string, given: Given[]): Promise<void> {
    const sessionId = await this.state.storage.get<string>('sessionId');
    if (!sessionId) return;
    const packRef = await this.state.storage.get<string>('packRef');
    const optionIds = (await this.state.storage.get<string[]>('optionIds')) ?? [];
    const code = await this.state.storage.get<string>('code');
    if (!packRef || !code) {
      console.error('[quiz] cannot persist: packRef=%s code=%s', packRef, code);
      return;
    }

    for (const g of given) {
      try {

        const existing = await query<{ id: string }>(
          this.env.DB_CORE,
          `SELECT id FROM core_bank_attempt
            WHERE user_ref = ? AND room_code = ? AND finished_at IS NULL
            ORDER BY started_at DESC LIMIT 1`,
          [g.userId, code]);
        let attemptRef = existing[0]?.id;
        if (!attemptRef) {
          attemptRef = typedId('BAT');
          await execute(
            this.env.DB_CORE,
            `INSERT INTO core_bank_attempt (id, user_ref, unit_ref, pack_ref, mode, room_code)
             VALUES (?, ?, NULL, ?, 'live', ?)`,
            [attemptRef, g.userId, packRef, code]);
        }
        await execute(
          this.env.DB_CORE,
          `INSERT INTO core_bank_response
             (id, attempt_ref, item_ref, user_ref, seq, response_json, is_correct,
              credit, latency_ms, points)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (attempt_ref, item_ref) DO NOTHING`,
          [typedId('BRS'), attemptRef, questionId, g.userId, Math.max(0, g.choice ?? 0),
           JSON.stringify(g.picked ?? (optionIds[g.choice ?? -1] ? [optionIds[g.choice ?? -1]] : [])),
           g.correct ? 1 : 0, g.correct ? 1 : 0, g.ms, g.points],
        );

        await execute(
          this.env.DB_CORE,
          `UPDATE core_bank_attempt
              SET points = (SELECT COALESCE(SUM(points),0) FROM core_bank_response
                             WHERE attempt_ref = ?),
                  score  = (SELECT AVG(is_correct) FROM core_bank_response
                             WHERE attempt_ref = ? AND is_correct IS NOT NULL)
            WHERE id = ?`,
          [attemptRef, attemptRef, attemptRef]);
      } catch (error) {

        console.error('[quiz] response not persisted', g.userId, String(error));
      }
    }
  }

  private async board() {
    const sessionId = await this.state.storage.get<string>('sessionId');
    if (!sessionId) return [];
    try {
      return await query(
        this.env.DB_CORE,
        `SELECT r.user_ref AS userId,
                -- The local part, not the address: this goes to every socket
                -- in the room.
                COALESCE(u.display_name,
                         substr(u.email, 1, instr(u.email, '@') - 1), u.id) AS name,
                SUM(r.points) AS points,
                SUM(r.is_correct) AS correct,
                COUNT(*) AS answered
           FROM core_bank_response r
           JOIN core_bank_attempt a ON a.id = r.attempt_ref
           LEFT JOIN core_users u ON u.id = r.user_ref
          WHERE a.room_code = ?
          GROUP BY r.user_ref
          ORDER BY points DESC, correct DESC`,
        [await this.state.storage.get<string>('code') ?? ''],
      );
    } catch {
      return [];
    }
  }

  private async end(): Promise<void> {
    const sessionId = await this.state.storage.get<string>('sessionId');
    if (sessionId) {
      try {
        await execute(
          this.env.DB_CORE,
          `UPDATE core_quiz_session
              SET status = 'ended',
                  ended_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
            WHERE id = ?`,
          [sessionId],
        );
      } catch {  }
    }
    this.broadcast({ t: 'ended', board: await this.board() });
    for (const ws of this.state.getWebSockets()) {
      try { ws.close(1000, 'Quiz ended'); } catch {  }
    }
  }

  private async markLive(): Promise<void> {
    const sessionId = await this.state.storage.get<string>('sessionId');
    if (!sessionId) return;
    try {
      await execute(
        this.env.DB_CORE,
        `UPDATE core_quiz_session
            SET status = 'live',
                started_at = COALESCE(started_at, strftime('%Y-%m-%dT%H:%M:%SZ','now'))
          WHERE id = ?`,
        [sessionId],
      );
    } catch {  }
  }

  private async correctIndexOf(questionId: string): Promise<number | null> {
    const drill = await this.state.storage.get<{ questionId: string; correctIndex: number }>('drillAnswer');
    if (drill?.questionId === questionId) return drill.correctIndex;
    const rows = await query<{ n: number }>(
      this.env.DB_CORE,
      `SELECT COUNT(*) AS n FROM core_bank_item_option
        WHERE item_ref = ? AND role = 'choice' AND is_correct = 0
          AND sort_order < (SELECT MIN(sort_order) FROM core_bank_item_option
                             WHERE item_ref = ? AND role = 'choice' AND is_correct = 1)`,
      [questionId, questionId]);
    const marked = await query<{ n: number }>(
      this.env.DB_CORE,
      `SELECT COUNT(*) AS n FROM core_bank_item_option
        WHERE item_ref = ? AND role = 'choice' AND is_correct = 1`, [questionId]);
    if (!marked[0]?.n) return null;
    return rows[0]?.n ?? null;
  }

  private async explanationOf(questionId: string): Promise<string | null> {
    const drill = await this.state.storage.get<{ questionId: string; explanation: string | null }>('drillAnswer');
    if (drill?.questionId === questionId) return drill.explanation;
    const rows = await query<{ explanation: string | null }>(
      this.env.DB_CORE,
      `SELECT COALESCE(explanation_en, explanation_ar) AS explanation
         FROM core_bank_item WHERE id = ?`, [questionId]);
    return rows[0]?.explanation ?? null;
  }

  private async displayNameOf(userId: string): Promise<string | null> {
    try {
      const rows = await query<{ display_name: string | null }>(
        this.env.DB_CORE,
        'SELECT display_name FROM core_users WHERE id = ?', [userId]);
      return rows[0]?.display_name ?? null;
    } catch {
      return null;
    }
  }

  private async getLive(): Promise<Live | null> {
    return (await this.state.storage.get<Live>('live')) ?? null;
  }

  private async getGiven(): Promise<Given[]> {
    return (await this.state.storage.get<Given[]>('given')) ?? [];
  }

  private roster(sockets = this.state.getWebSockets()): Player[] {
    return sockets
      .map((ws) => ws.deserializeAttachment() as Player | null)
      .filter((p): p is Player => !!p);
  }

  private broadcast(payload: unknown): void {
    const data = JSON.stringify(payload);
    for (const ws of this.state.getWebSockets()) {
      try { ws.send(data); } catch {  }
    }
  }

  private broadcastPresence(excluding?: WebSocket): void {
    const sockets = this.state.getWebSockets().filter((ws) => ws !== excluding);
    const data = JSON.stringify({ t: 'presence', roster: this.roster(sockets) });
    for (const ws of sockets) {
      try { ws.send(data); } catch {  }
    }
  }

  private sendTo(ws: WebSocket, payload: unknown): void {
    try { ws.send(JSON.stringify(payload)); } catch {  }
  }
}
