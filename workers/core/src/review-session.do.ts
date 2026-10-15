import type { CoreEnv } from './env';
import { gradeOrBank } from './srs/grade-or-bank';
import { SrsRepo, type SrsCard } from './repositories/srs.repo';
import { answerCard } from './srs/answer';
import { isRating, type RatingValue } from './srs/fsrs';

interface Identity {
  userId: string;
  name: string | null;
  isHost: boolean;
}

interface Asked {
  cardId: string;
  askedBy: string;
  askedByName: string | null;
  front: string;
  back: string | null;
  module: string;
  resourceRef: string;
  askedAt: string;
  /** The card as its drill (extra.drill) — everyone plays it at once, and each is graded by their own
   *  answer: no reveal. A card with no drill is asked, revealed and rated as it always was. */
  drill?: Record<string, unknown> | null;
}

/** A card's drill, as it was filed (extra.drill), or null. */
export function drillOf(extraJson: string | null): Record<string, unknown> | null {
  try {
    const d = extraJson ? JSON.parse(extraJson)?.drill : null;
    return d && typeof d === 'object' ? d as Record<string, unknown> : null;
  } catch { return null; }
}

/** Whether a rating can be taken now: a drill at once (each answers it), a card once revealed. */
export const canRateNow = (asked: Pick<Asked, 'back' | 'drill'> | null) => !!asked && (!!asked.drill || asked.back !== null);

interface Answered {
  userId: string;
  name: string | null;
  rating: RatingValue;
  /** Answered right (a drill's own grading); null for a card rated by hand. */
  right: boolean | null;

  scheduled: boolean;

  nextInDays: number | null;
}

export class ReviewSession {
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
    const title = request.headers.get('X-KM-Session-Title') || null;
    if (!userId) return new Response('Authenticated user required', { status: 401 });

    const name = await this.displayNameOf(userId);

    const host = await this.state.storage.get<string>('host');
    if (!host) {
      await this.state.storage.put('host', userId);
      await this.state.storage.put('startedAt', new Date().toISOString());
      if (title) await this.state.storage.put('title', title);
    }

    const { 0: client, 1: server } = new WebSocketPair();
    const identity: Identity = { userId, name, isHost: (host ?? userId) === userId };
    this.state.acceptWebSocket(server);
    server.serializeAttachment(identity);

    this.sendTo(server, {
      t: 'sync',
      you: identity,
      title: await this.state.storage.get<string>('title') ?? null,
      asked: await this.getAsked(),
      answers: await this.getAnswers(),
      roster: this.roster(),
    });
    this.broadcastPresence();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    let msg: { t?: string; card?: string; rating?: number; secs?: number; right?: boolean };
    try {
      const text = typeof message === 'string' ? message : new TextDecoder().decode(message);
      msg = JSON.parse(text);
    } catch { return; }
    if (msg.t === 'ping') return;

    const me = ws.deserializeAttachment() as Identity | null;
    if (!me) return;

    switch (msg.t) {
      case 'ask':    if (msg.card) await this.ask(me, msg.card); return;
      case 'reveal': await this.reveal(); return;
      case 'rate':
        if (isRating(msg.rating)) {
          await this.rate(me, msg.rating, typeof msg.secs === 'number' ? Math.round(msg.secs) : null,
                          typeof msg.right === 'boolean' ? msg.right : null);
        }
        return;
      default: return;
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.broadcastPresence(ws);
  }

  private async ask(me: Identity, cardId: string): Promise<void> {
    const repo = new SrsRepo(this.env.DB_CORE);
    const card = await repo.findCard(cardId);
    if (!card || card.user_ref !== me.userId) return;

    const asked: Asked = {
      cardId: card.id,
      askedBy: me.userId,
      askedByName: me.name,
      front: card.front_text,
      back: null,
      module: card.module,
      resourceRef: card.resource_ref,
      askedAt: new Date().toISOString(),
      drill: drillOf(card.extra_json),
    };
    await this.state.storage.put('asked', asked);

    await this.state.storage.put('answers', [] as Answered[]);
    this.broadcast({ t: 'asked', asked, answers: [] });
  }

  private async reveal(): Promise<void> {
    const asked = await this.getAsked();
    if (!asked || asked.back !== null) return;
    const card = await new SrsRepo(this.env.DB_CORE).findCard(asked.cardId);
    if (!card) return;
    const revealed: Asked = { ...asked, back: card.back_text };
    await this.state.storage.put('asked', revealed);
    this.broadcast({ t: 'revealed', asked: revealed });
  }

  private async rate(me: Identity, rating: RatingValue, secs: number | null, right: boolean | null): Promise<void> {
    const asked = await this.getAsked();
    if (!asked || !canRateNow(asked)) return;
    if (asked.askedBy === me.userId) return;

    const answers = await this.getAnswers();
    if (answers.some((a) => a.userId === me.userId)) return;

    const repo = new SrsRepo(this.env.DB_CORE);
    const mine: SrsCard | null = await repo.counterpart(me.userId, asked.cardId);

    // a drill answered wrong is Again, whatever was tapped
    const r: RatingValue = asked.drill && right === false ? 1 as RatingValue : rating;
    let scheduled = false;
    let nextInDays: number | null = null;
    if (mine) {
      // the one rule: a banked drill missed stays banked
      const g = await gradeOrBank(repo, mine, me.userId, r, secs);
      scheduled = g.outcome === 'graded';
      nextInDays = scheduled ? g.card.scheduled_days : null;
    }

    answers.push({ userId: me.userId, name: me.name, rating: r, right: asked.drill ? right : null, scheduled, nextInDays });
    await this.state.storage.put('answers', answers);
    this.broadcast({ t: 'answers', answers });
  }

  private async displayNameOf(userId: string): Promise<string | null> {
    try {
      const row = await this.env.DB_CORE
        .prepare('SELECT display_name FROM core_users WHERE id = ?')
        .bind(userId)
        .first<{ display_name: string | null }>();
      return row?.display_name ?? null;
    } catch {
      return null;
    }
  }

  private async getAsked(): Promise<Asked | null> {
    return (await this.state.storage.get<Asked>('asked')) ?? null;
  }

  private async getAnswers(): Promise<Answered[]> {
    return (await this.state.storage.get<Answered[]>('answers')) ?? [];
  }

  private roster(sockets = this.state.getWebSockets()): Identity[] {
    return sockets
      .map((ws) => ws.deserializeAttachment() as Identity | null)
      .filter((i): i is Identity => !!i);
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
