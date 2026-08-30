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

    if (sessionId && !(await this.state.storage.get<string>('sessionId'))) {
      await this.state.storage.put('sessionId', sessionId);
      await this.state.storage.put('hostRef', hostRef);
    }

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
    const rows = await query<{
      id: string; prompt: string; options_json: string; correct_index: number;
      seconds: number; module: string; resource_ref: string | null; explanation: string | null;
    }>(
      this.env.DB_CORE,
      `SELECT id, prompt, options_json, correct_index, seconds, module,
              resource_ref, explanation
         FROM core_quiz_question WHERE id = ? AND status = 'active'`,
      [questionId],
    );
    const q = rows[0];
    if (!q) return;

    let options: string[] = [];
    try {
      const parsed = JSON.parse(q.options_json);
      if (Array.isArray(parsed)) options = parsed.map(String);
    } catch { return; }
    if (options.length < 2) return;

    const live: Live = {
      questionId: q.id,
      prompt: q.prompt,
      options,
      seconds: q.seconds,
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

    const given = await this.getGiven();
    if (given.some((g) => g.userId === me.userId)) return; // one answer each, first stands

    // Correctness is computed now but not broadcast now: the room learns only
    // that this person has locked in, because a live tally of who is right
    // tells everyone else the answer.
    const correctIndex = await this.correctIndexOf(live.questionId);
    const ms = Math.max(0, Date.now() - live.askedAt);
    const correct = correctIndex === choice;

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
    for (const g of given) {
      try {
        await execute(
          this.env.DB_CORE,
          `INSERT INTO core_quiz_answer
             (id, session_ref, question_ref, user_ref, choice, correct, ms, points)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (session_ref, question_ref, user_ref) DO NOTHING`,
          [typedId('QZA'), sessionId, questionId, g.userId, g.choice,
           g.correct ? 1 : 0, g.ms, g.points],
        );
      } catch { /* one lost row must not take the round down */ }
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
        `SELECT a.user_ref AS userId,
                COALESCE(u.display_name, u.email) AS name,
                SUM(a.points) AS points,
                SUM(a.correct) AS correct,
                COUNT(*) AS answered
           FROM core_quiz_answer a
           LEFT JOIN core_users u ON u.id = a.user_ref
          WHERE a.session_ref = ?
          GROUP BY a.user_ref
          ORDER BY points DESC, correct DESC`,
        [sessionId],
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
    const rows = await query<{ correct_index: number }>(
      this.env.DB_CORE,
      'SELECT correct_index FROM core_quiz_question WHERE id = ?', [questionId]);
    return rows[0]?.correct_index ?? null;
  }

  private async explanationOf(questionId: string): Promise<string | null> {
    const rows = await query<{ explanation: string | null }>(
      this.env.DB_CORE,
      'SELECT explanation FROM core_quiz_question WHERE id = ?', [questionId]);
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
