import { query, queryOne, execute } from '../../shared/src/db';
import { typedId } from '../../shared/src/ulid';
import type { CoreEnv } from './env';

interface Seat {
  userId: string;
  name: string;
  waiting: number;
  remote: boolean;
}

interface Played {
  cardId: string;
  askedBy: string;
  askedByName: string;
  promptEn: string | null;
  promptAr: string | null;
  promptUr: string | null;
  form: string | null;
  depth: number;
  forRef: string | null;
  forName: string | null;
  playedAt: number;
}

export class TableSession {
  private state: DurableObjectState;
  private env: CoreEnv;

  constructor(state: DurableObjectState, env: CoreEnv) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }
    const userId = request.headers.get('X-KM-User-Id') ?? '';
    const name = request.headers.get('X-KM-User-Name') ?? '';
    const code = request.headers.get('X-KM-Room-Code') ?? '';
    const remote = new URL(request.url).searchParams.get('remote') === '1';
    if (!userId || !code) return new Response('Authenticated user required', { status: 401 });
    await this.state.storage.put('code', code);

    const waiting = await this.waitingFor(userId);
    if (waiting < 1) {
      return new Response(
        JSON.stringify({ ok: false, error: {
          code: 'no_cards',
          message: 'Write at least one card before joining the table.' } }),
        { status: 409, headers: { 'content-type': 'application/json' } });
    }

    const { 0: client, 1: server } = new WebSocketPair();
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ userId, name, remote });

    const order = (await this.state.storage.get<string[]>('order')) ?? [];
    if (!order.includes(userId)) {
      order.push(userId);
      await this.state.storage.put('order', order);
    }
    if (!(await this.state.storage.get<string>('turn'))) {
      await this.state.storage.put('turn', userId);
    }

    await this.broadcastPresence();
    server.send(JSON.stringify({
      t: 'sync',
      you: { userId, name, remote },
      roster: await this.roster(),
      turn: await this.state.storage.get<string>('turn') ?? null,
      played: await this.state.storage.get<Played>('played') ?? null,
    }));
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const me = ws.deserializeAttachment() as
      { userId: string; name: string; remote?: boolean } | null;
    if (!me) return;
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)); }
    catch { return; }

    switch (msg['t']) {
      case 'ping': ws.send('pong'); return;
      case 'play': await this.play(me, String(msg['card'] ?? '')); return;
      case 'clear': await this.clear(); return;
      case 'pass': if ((await this.state.storage.get<string>('turn')) === me.userId) {
                     await this.advance();
                   } return;
      case 'rate': await this.rate(me, Number(msg['rating'] ?? 0)); return;
      case 'answer': await this.answer(me, String(msg['text'] ?? '')); return;
      default: return;
    }
  }

  async webSocketClose(): Promise<void> { await this.broadcastPresence(); }
  async webSocketError(): Promise<void> { await this.broadcastPresence(); }

  private async waitingFor(userId: string): Promise<number> {
    try {
      const row = await queryOne<{ n: number }>(
        this.env.DB_CORE,
        `SELECT COUNT(i.id) AS n
           FROM core_bank_pack p
           JOIN core_bank_item i ON i.pack_ref = p.id AND i.status = 'live'
          WHERE p.app = 'table' AND p.owner_ref = ?
            AND NOT EXISTS (SELECT 1 FROM core_bank_response r WHERE r.item_ref = i.id)`,
        [userId]);
      return Number(row?.n ?? 0);
    } catch (e) {
      console.warn('[table waitingFor]', e instanceof Error ? e.message : e);
      return 0;
    }
  }

  private async advance(): Promise<void> {
    const order = (await this.state.storage.get<string[]>('order')) ?? [];
    const current = await this.state.storage.get<string>('turn');
    if (!order.length) return;

    const start = Math.max(0, order.indexOf(current ?? ''));
    for (let step = 1; step <= order.length; step++) {
      const next = order[(start + step) % order.length];
      if ((await this.waitingFor(next)) > 0) {
        await this.state.storage.put('turn', next);
        this.broadcast({ t: 'turn', turn: next });
        return;
      }
    }
    await this.state.storage.delete('turn');
    this.broadcast({ t: 'turn', turn: null, done: true });
  }

  private async play(me: { userId: string; name: string }, cardId: string): Promise<void> {
    if (!cardId) return;
    const turn = await this.state.storage.get<string>('turn');
    if (turn && turn !== me.userId) return;

    const card = await queryOne<{
      id: string; prompt_en: string | null; prompt_ar: string | null;
      prompt_ur: string | null; stimulus_md: string | null; difficulty: number;
      addressed_to_ref: string | null; addressed_to_name: string | null;
      owner_ref: string | null; pack_ref: string;
    }>(
      this.env.DB_CORE,
      `SELECT i.id, i.prompt_en, i.prompt_ar, i.prompt_ur, i.stimulus_md, i.difficulty,
              i.addressed_to_ref, i.addressed_to_name, p.owner_ref, i.pack_ref
         FROM core_bank_item i
         JOIN core_bank_pack p ON p.id = i.pack_ref
        WHERE i.id = ? AND i.status = 'live'`,
      [cardId]);
    if (!card) return;

    if (card.owner_ref !== null && card.owner_ref !== me.userId) return;

    const played: Played = {
      cardId: card.id,
      askedBy: me.userId,
      askedByName: me.name,
      promptEn: card.prompt_en,
      promptAr: card.prompt_ar,
      promptUr: card.prompt_ur,
      form: card.stimulus_md,
      depth: card.difficulty,
      forRef: card.addressed_to_ref,
      forName: card.addressed_to_name,
      playedAt: Date.now(),
    };
    await this.state.storage.put('played', played);
    await this.state.storage.delete('answers');
    this.broadcast({ t: 'played', played });
    await this.record(me.userId, card.pack_ref, card.id,
                      card.addressed_to_ref, card.addressed_to_name);
    await this.advance();
    await this.broadcastPresence();
  }

  private async record(userId: string, packRef: string, cardId: string,
                       forRef: string | null, forName: string | null): Promise<void> {
    const code = await this.state.storage.get<string>('code');
    if (!code) return;
    try {
      const open = await query<{ id: string }>(
        this.env.DB_CORE,
        `SELECT id FROM core_bank_attempt
          WHERE user_ref = ? AND room_code = ? AND finished_at IS NULL
          ORDER BY started_at DESC LIMIT 1`, [userId, code]);
      let attempt = open[0]?.id;
      if (!attempt) {
        attempt = typedId('BAT');
        await execute(
          this.env.DB_CORE,
          `INSERT INTO core_bank_attempt (id, user_ref, unit_ref, pack_ref, mode, room_code)
           VALUES (?, ?, NULL, ?, 'table', ?)`, [attempt, userId, packRef, code]);
      }
      await execute(
        this.env.DB_CORE,
        `INSERT INTO core_bank_response
           (id, attempt_ref, item_ref, user_ref, seq, is_correct, credit, points,
            respondent_ref, respondent_name)
         VALUES (?, ?, ?, ?, 0, NULL, 0, 0, ?, ?)
         ON CONFLICT (attempt_ref, item_ref) DO NOTHING`,
        [typedId('BRS'), attempt, cardId, userId, forRef, forName]);
    } catch (error) {
      console.error('[table] play not recorded', String(error));
    }
  }

  private async answer(me: { userId: string; name: string; remote?: boolean },
                       text: string): Promise<void> {
    if (me.remote !== true) return;
    const said = text.trim().slice(0, 2000);
    const played = await this.state.storage.get<Played>('played');
    const code = await this.state.storage.get<string>('code');
    if (!said || !played || !code) return;

    const answers = (await this.state.storage.get<Record<string, string>>('answers')) ?? {};
    answers[me.userId] = said;
    await this.state.storage.put('answers', answers);
    this.broadcast({ t: 'answered', cardId: played.cardId,
                     userId: me.userId, name: me.name, text: said });

    try {
      await execute(
        this.env.DB_CORE,
        `UPDATE core_bank_response
            SET response_json = ?, respondent_ref = COALESCE(respondent_ref, ?),
                respondent_name = COALESCE(respondent_name, ?)
          WHERE item_ref = ?
            AND attempt_ref IN (SELECT id FROM core_bank_attempt WHERE room_code = ?)`,
        [JSON.stringify(answers), me.userId, me.name, played.cardId, code]);
    } catch (error) {
      console.error('[table] answer not saved', String(error));
    }
  }

  private async rate(me: { userId: string; name: string }, rating: number): Promise<void> {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return;
    const played = await this.state.storage.get<Played>('played');
    if (!played || played.askedBy !== me.userId) return;
    const code = await this.state.storage.get<string>('code');
    if (!code) return;
    try {
      await execute(
        this.env.DB_CORE,
        `UPDATE core_bank_response
            SET asker_rating = ?, asker_ref = ?
          WHERE item_ref = ?
            AND attempt_ref IN (SELECT id FROM core_bank_attempt WHERE room_code = ?)`,
        [rating, me.userId, played.cardId, code]);
      this.broadcast({ t: 'rated', cardId: played.cardId, rating });
    } catch (error) {
      console.error('[table] rating not saved', String(error));
    }
  }

  private async clear(): Promise<void> {
    await this.state.storage.delete('played');
    this.broadcast({ t: 'played', played: null });
  }

  private async roster(): Promise<Seat[]> {
    const seats: Seat[] = [];
    const seen = new Set<string>();
    for (const ws of this.state.getWebSockets()) {
      const who = ws.deserializeAttachment() as
        { userId: string; name: string; remote?: boolean } | null;
      if (!who || seen.has(who.userId)) continue;
      seen.add(who.userId);
      seats.push({ userId: who.userId, name: who.name, waiting: 0,
                   remote: who.remote === true });
    }
    if (!seats.length) return seats;

    try {
      const counts = await query<{ owner_ref: string; waiting: number }>(
        this.env.DB_CORE,
        `SELECT p.owner_ref, COUNT(i.id) AS waiting
           FROM core_bank_pack p
           LEFT JOIN core_bank_item i
             ON i.pack_ref = p.id AND i.status = 'live'
            AND NOT EXISTS (SELECT 1 FROM core_bank_response r WHERE r.item_ref = i.id)
          WHERE p.app = 'table'
            AND p.owner_ref IN (${seats.map(() => '?').join(',')})
          GROUP BY p.owner_ref`,
        seats.map((s) => s.userId));
      const by = new Map(counts.map((c) => [c.owner_ref, c.waiting]));
      for (const seat of seats) seat.waiting = Number(by.get(seat.userId) ?? 0);
    } catch { /* a count is not worth losing the room over */ }
    return seats;
  }

  private async broadcastPresence(): Promise<void> {
    this.broadcast({
      t: 'presence',
      roster: await this.roster(),
      turn: await this.state.storage.get<string>('turn') ?? null,
    });
  }

  private broadcast(payload: Record<string, unknown>): void {
    const text = JSON.stringify(payload);
    for (const ws of this.state.getWebSockets()) {
      try { ws.send(text); } catch { /* closing */ }
    }
  }
}
