// ─── QuizSession — a question asked to a room ─────────────────────────────────
//
// The host pushes a question; every screen shows it at the same moment; each
// person picks an option; the answer is revealed and the board moves.
//
// Three rules shape the whole object:
//
//   1. THE CORRECT ANSWER NEVER CROSSES THE WIRE BEFORE THE REVEAL. Not sent
//      and hidden — not sent. A quiz whose answer sits in the client is not a
//      quiz, and the first person to open an inspector wins every round.
//
//   2. SPEED IS SCORED, SO TIME IS MEASURED HERE. A client-reported elapsed is
//      a client-chosen score. The object stamps when the question went out and
//      when each answer arrived, and both stamps are its own.
//
//   3. ANSWERS ARE WRITTEN TO D1, NOT KEPT IN MEMORY. A Durable Object can be
//      evicted between questions; a leaderboard that lives only in RAM is one
//      that will eventually be lost, and the dashboard would have nothing to
//      read. Storage here is the live copy; D1 is the record.

import type { CoreEnv } from './env';
import { query, execute } from '../../shared/src/db';
import { typedId } from '../../shared/src/ulid';
import { speedPoints } from './bank/score';

interface Player {
  userId: string;
  name: string | null;
  isHost: boolean;
}

/** The question on screen, as the room may see it. */
interface Live {
  questionId: string;
  prompt: string;
  options: string[];
  seconds: number;
  module: string;
  resourceRef: string | null;
  /** Server clock when it went out. Every elapsed is measured from this. */
  askedAt: number;
  /** Only ever set once the host reveals. */
  correctIndex: number | null;
  explanation: string | null;
}

/** One person's answer to the question on screen. */
interface Given {
  userId: string;
  name: string | null;
  choice: number;
  ms: number;
  correct: boolean;
  points: number;
}

/** The room scores on the same scale as everything else. It used to carry its
 *  own copy of the formula with its own literal 1000 — two scorers drifting
 *  apart is exactly what one bank was for, and a point earned in the room has
 *  to be worth a point earned alone or the shared card compares nothing. */
const scoreFor = (correct: boolean, ms: number, seconds: number): number =>
  speedPoints(correct ? 1 : 0, ms, seconds);

export class QuizSession {
  constructor(private state: DurableObjectState, private env: CoreEnv) {
    try {
      this.state.setWebSocketAutoResponse(
        new WebSocketRequestResponsePair('ping', 'pong'),
      );
    } catch { /* older runtime — keepalive just wakes the object */ }
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
    // Kept current rather than write-once: an object that outlives a deploy
    // should not be stuck with an empty code it can never write a round under.
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
    let msg: { t?: string; question?: string; choice?: number };
    try {
      const text = typeof message === 'string' ? message : new TextDecoder().decode(message);
      msg = JSON.parse(text);
    } catch { return; }
    if (msg.t === 'ping') return;

    const me = ws.deserializeAttachment() as Player | null;
    if (!me) return;

    switch (msg.t) {
      case 'push':   if (me.isHost && msg.question) await this.push(msg.question); return;
      case 'answer': if (typeof msg.choice === 'number') await this.answer(me, msg.choice); return;
      case 'reveal': if (me.isHost) await this.reveal(); return;
      case 'end':    if (me.isHost) await this.end(); return;
      default: return;
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.broadcastPresence(ws);
  }

  // ── Pushing a question ─────────────────────────────────────────────────────

  private async push(questionId: string): Promise<void> {
    // The bank, not core_quiz_question. Migration 030 said this is one ledger
    // and the room went on writing its own table anyway, so the shared
    // scorecard has never contained a single live round. An option is a row
    // now, which is also what lets a wrong answer explain itself.
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
      correctIndex: null,      // withheld until reveal — rule 1
      explanation: null,
    };
    await this.state.storage.put('live', live);
    await this.state.storage.put('given', [] as Given[]);
    await this.markLive();

    this.broadcast({ t: 'question', live: this.publicLive(live), given: [] });
  }

  /** What a player is allowed to see. The correct index and the explanation are
   *  stripped until the host reveals — this is the one place that decides it. */
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
      revealed: live.correctIndex !== null,
      correctIndex: live.correctIndex,
      explanation: live.explanation,
    };
  }

  // ── Answering ──────────────────────────────────────────────────────────────

  private async answer(me: Player, choice: number): Promise<void> {
    const live = await this.getLive();
    if (!live || live.correctIndex !== null) return;      // no answering after the reveal
    if (choice < 0 || choice >= live.options.length) return;

    // Everything that needs the database happens BEFORE the read-modify-write,
    // and nothing is awaited between reading `given` and putting it back.
    //
    // The other order loses answers. A Durable Object's input gate does not
    // hold across an outbound D1 call, so with the lookup in the middle two
    // people answering at once both read the same `given`, both append, and
    // the second put overwrites the first — silently, and more often the
    // faster the room is. Two players answering together lost one of them
    // every time.
    const correctIndex = await this.correctIndexOf(live.questionId);
    const ms = Math.max(0, Date.now() - live.askedAt);
    const correct = correctIndex === choice;

    const given = await this.getGiven();
    if (given.some((g) => g.userId === me.userId)) return; // one answer each, first stands

    given.push({
      userId: me.userId, name: me.name, choice, ms, correct,
      points: scoreFor(correct, ms, live.seconds),
    });
    await this.state.storage.put('given', given);

    this.broadcast({ t: 'locked', given: this.lockedSummary(given) });
  }

  /** Who has answered — names only, never what they picked. */
  private lockedSummary(given: Given[]) {
    return given.map((g) => ({ userId: g.userId, name: g.name }));
  }

  private async givenSummary() {
    const live = await this.getLive();
    const given = await this.getGiven();
    // After the reveal the full detail is fair game; before it, names only.
    return live?.correctIndex !== null && live !== null
      ? given
      : this.lockedSummary(given);
  }

  // ── Revealing ──────────────────────────────────────────────────────────────

  private async reveal(): Promise<void> {
    const live = await this.getLive();
    if (!live || live.correctIndex !== null) return;

    const correctIndex = await this.correctIndexOf(live.questionId);
    if (correctIndex === null) return;
    const explanation = await this.explanationOf(live.questionId);

    const revealed: Live = { ...live, correctIndex, explanation };
    await this.state.storage.put('live', revealed);

    // Write the round to D1 before telling anyone. If this object dies in the
    // next second the board still exists, which is the whole reason the
    // dashboard can be trusted.
    const given = await this.getGiven();
    await this.persist(live.questionId, given);

    this.broadcast({
      t: 'reveal',
      live: this.publicLive(revealed),
      given,
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
        // Everyone in the room has an attempt, opened on first answer and
        // reused for the rest of the round. It carries the room code, which is
        // what makes the shared scorecard one GROUP BY across three apps
        // rather than a union of tables that count different things.
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
          [typedId('BRS'), attemptRef, questionId, g.userId, g.choice ?? 0,
           JSON.stringify(optionIds[g.choice ?? -1] ? [optionIds[g.choice ?? -1]] : []),
           g.correct ? 1 : 0, g.correct ? 1 : 0, g.ms, g.points],
        );
        // The attempt's own totals, so a room round reads like any other round.
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
        // One lost row must not take the round down — but a round that wrote
        // nothing at all looked exactly like one that wrote everything, which
        // is how the ledger stayed empty without anybody noticing.
        console.error('[quiz] response not persisted', g.userId, String(error));
      }
    }
  }

  /** The board, read back from D1 rather than accumulated in memory — so it is
   *  the same number the dashboard shows, computed the same way. */
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

  // ── Ending ─────────────────────────────────────────────────────────────────

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
      } catch { /* best effort */ }
    }
    this.broadcast({ t: 'ended', board: await this.board() });
    for (const ws of this.state.getWebSockets()) {
      try { ws.close(1000, 'Quiz ended'); } catch { /* already closed */ }
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
    } catch { /* best effort */ }
  }

  // ── Reads ──────────────────────────────────────────────────────────────────

  private async correctIndexOf(questionId: string): Promise<number | null> {
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

  // ── Fan-out ────────────────────────────────────────────────────────────────

  private broadcast(payload: unknown): void {
    const data = JSON.stringify(payload);
    for (const ws of this.state.getWebSockets()) {
      try { ws.send(data); } catch { /* dropped socket */ }
    }
  }

  private broadcastPresence(excluding?: WebSocket): void {
    const sockets = this.state.getWebSockets().filter((ws) => ws !== excluding);
    const data = JSON.stringify({ t: 'presence', roster: this.roster(sockets) });
    for (const ws of sockets) {
      try { ws.send(data); } catch { /* dropped socket */ }
    }
  }

  private sendTo(ws: WebSocket, payload: unknown): void {
    try { ws.send(JSON.stringify(payload)); } catch { /* dropped socket */ }
  }
}
