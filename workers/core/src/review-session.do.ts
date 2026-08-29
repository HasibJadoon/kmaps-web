// ─── ReviewSession — reviewing together ───────────────────────────────────────
//
// One person asks. The front of a card appears on every screen. Everyone
// guesses the back — out loud, in the room — and then each person rates how
// they actually did, and THEIR OWN card is scheduled from THEIR OWN answer.
//
// The two halves of that are what the design turns on:
//
//   the question is shared   — one card, one front, one reveal, one moment
//   the review is not        — a card belongs to a person, and so does a rating
//
// So this object holds the shared half only: which card is up, whether the back
// has been shown, and who has rated. The scheduling half goes straight through
// `answerCard`, the same path a solo review takes, against each rater's own
// row for the same question (`SrsRepo.counterpart`). There is deliberately no
// second scheduler here — a group session must not be able to disagree with the
// solo queue about when a card is due.
//
// THE BACK IS WITHHELD SERVER-SIDE. Not sent-but-hidden: not sent. A guessing
// game where the answer is already in the client and merely not drawn is not a
// guessing game, it is a trust exercise — and the first person to open a web
// inspector ends it.

import type { CoreEnv } from './env';
import { SrsRepo, type SrsCard } from './repositories/srs.repo';
import { answerCard } from './srs/answer';
import { isRating, type RatingValue } from './srs/fsrs';

/** Who a connected socket is. There are no guests: a rating has to land on
 *  somebody's card, so an unauthenticated socket could only ever watch. */
interface Identity {
  userId: string;
  name: string | null;
  isHost: boolean;
}

/** The card currently on the table, as everyone sees it. */
interface Asked {
  cardId: string;          // the ASKER's card id — each rater resolves their own
  askedBy: string;         // user id
  askedByName: string | null;
  front: string;
  back: string | null;     // null until revealed — see the note above
  module: string;
  resourceRef: string;
  askedAt: string;
}

/** What one person did with the card that is up. */
interface Answered {
  userId: string;
  name: string | null;
  rating: RatingValue;
  /** False when this person has no card of their own for this question: they
   *  still guessed, nothing was scheduled, and the room should be told which
   *  it was rather than shown a rating that quietly did nothing. */
  scheduled: boolean;
  /** Days until it comes back, when something was scheduled. */
  nextInDays: number | null;
}

export class ReviewSession {
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
    const title = request.headers.get('X-KM-Session-Title') || null;
    if (!userId) return new Response('Authenticated user required', { status: 401 });

    // Resolved here rather than passed in a header: the name is shown beside
    // every rating in the room, and reading it from the account is the one way
    // a client cannot decide what it is called.
    const name = await this.displayNameOf(userId);

    // The first person through the door owns the session. There is no separate
    // create step: a code is a room, and the room exists once someone is in it.
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
    let msg: { t?: string; card?: string; rating?: number; secs?: number };
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
          await this.rate(me, msg.rating, typeof msg.secs === 'number' ? Math.round(msg.secs) : null);
        }
        return;
      default: return;
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.broadcastPresence(ws);
  }

  // ── Asking ─────────────────────────────────────────────────────────────────

  /** Put a card up. Anyone may ask — that is the point of studying together —
   *  but only from their own collection, because the card id is theirs and the
   *  front is read from their row. */
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
    };
    await this.state.storage.put('asked', asked);
    // A new question clears the previous round's ratings. They are not lost —
    // every one of them is already a row in core_srs_review_log, which is the
    // record; this map is only what the room is currently looking at.
    await this.state.storage.put('answers', [] as Answered[]);
    this.broadcast({ t: 'asked', asked, answers: [] });
  }

  /** Show the back. Only now does it cross the wire. */
  private async reveal(): Promise<void> {
    const asked = await this.getAsked();
    if (!asked || asked.back !== null) return;
    const card = await new SrsRepo(this.env.DB_CORE).findCard(asked.cardId);
    if (!card) return;
    const revealed: Asked = { ...asked, back: card.back_text };
    await this.state.storage.put('asked', revealed);
    this.broadcast({ t: 'revealed', asked: revealed });
  }

  // ── Rating ─────────────────────────────────────────────────────────────────

  /** One person's honest verdict on how they did, applied to their own card.
   *
   *  Rating before the reveal is refused. Not to police anyone — to keep the
   *  log meaningful: FSRS reads a rating as "how well did you recall this when
   *  you saw the answer", and a rating entered before the answer was shown is
   *  measuring something else entirely. */
  private async rate(me: Identity, rating: RatingValue, secs: number | null): Promise<void> {
    const asked = await this.getAsked();
    if (!asked || asked.back === null) return;

    const answers = await this.getAnswers();
    if (answers.some((a) => a.userId === me.userId)) return;   // one verdict each

    const repo = new SrsRepo(this.env.DB_CORE);
    const mine: SrsCard | null = await repo.counterpart(me.userId, asked.cardId);

    let scheduled = false;
    let nextInDays: number | null = null;
    if (mine) {
      const updated = await answerCard(repo, mine, me.userId, rating, secs);
      scheduled = true;
      nextInDays = updated.scheduled_days;
    }

    answers.push({ userId: me.userId, name: me.name, rating, scheduled, nextInDays });
    await this.state.storage.put('answers', answers);
    this.broadcast({ t: 'answers', answers });
  }

  // ── State ──────────────────────────────────────────────────────────────────

  private async displayNameOf(userId: string): Promise<string | null> {
    try {
      const row = await this.env.DB_CORE
        .prepare('SELECT display_name FROM core_users WHERE id = ?')
        .bind(userId)
        .first<{ display_name: string | null }>();
      return row?.display_name ?? null;
    } catch {
      return null;   // a missing name costs a label, not the session
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
