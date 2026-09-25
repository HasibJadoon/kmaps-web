import type { StudioEnv } from './env';
import { EpisodeRepo, type EpisodeAggregate } from './repositories/episode.repo';
import { SessionRepo } from './repositories/session.repo';
import { liveView } from './live-view';

interface Cursor {
  section: number;
  point: number;
}

const LOBBY: Cursor = { section: -1, point: -1 };

interface Identity {
  role: 'host' | 'viewer';
  participantId: string | null;
  name: string | null;
  color: string | null;
}

export class EpisodeSession {

  private snapshot: EpisodeAggregate | null = null;

  constructor(private state: DurableObjectState, private env: StudioEnv) {

    try {
      this.state.setWebSocketAutoResponse(
        new WebSocketRequestResponsePair('ping', 'pong'),
      );
    } catch {

    }
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const episodeId = request.headers.get('X-KM-Episode-Id') ?? '';
    const sessionId = request.headers.get('X-KM-Session-Id') ?? '';
    const role = request.headers.get('X-KM-Role') === 'host' ? 'host' : 'viewer';
    const userId = request.headers.get('X-KM-User-Id') ?? '';

    await this.ensureInit(episodeId, sessionId);

    const { 0: client, 1: server } = new WebSocketPair();
    this.state.acceptWebSocket(server, [role]);

    const [episode, cursor, paused, played] = await Promise.all([
      this.getSnapshot(),
      this.getCursor(),
      this.getPaused(),
      this.getPlayed(),
    ]);

    const cast = episode?.participants.find(
      (p) => !!p.core_user_ref && p.core_user_ref === userId,
    ) ?? null;
    const identity: Identity = {
      role,
      participantId: cast?.id ?? null,
      name: cast?.display_name ?? null,
      color: cast?.color ?? null,
    };
    server.serializeAttachment(identity);

    this.sendTo(server, {
      t: 'sync',
      role,
      episode,
      cursor,
      paused,

      played,
      turn: await this.getTurn(),
      viewers: this.state.getWebSockets().length,
      you: identity,
      roster: this.rosterOf(this.state.getWebSockets()),
    });
    this.broadcastPresence();

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    let msg: { t?: string; section?: number; point?: number; card?: string; turn?: number };
    try {
      const text = typeof message === 'string' ? message : new TextDecoder().decode(message);
      msg = JSON.parse(text);
    } catch {
      return;
    }
    if (msg.t === 'ping') return;

    const isHost = this.state.getTags(ws).includes('host');

    if (msg.t === 'play' && msg.card) {
      await this.play(ws, msg.card, isHost);
      return;
    }

    // A turn of the card's exchange: either person at the table — or the
    // host — moves it on, so whoever just spoke hands to the other.
    if (msg.t === 'turn' && typeof msg.turn === 'number') {
      const who = ws.deserializeAttachment() as Identity | null;
      if (isHost || who?.participantId) await this.setTurn(msg.turn);
      return;
    }

    // Next card: the host, or either person at the table — a card's last
    // turn is often the other person's, and they close it.
    if (msg.t === 'next') {
      const who = ws.deserializeAttachment() as Identity | null;
      if (isHost || who?.participantId || await this.ownsCurrentCard(ws)) await this.move(1);
      return;
    }

    if (!isHost) return;
    switch (msg.t) {
      case 'prev':    await this.move(-1); break;
      case 'goto':    await this.goto(msg.section ?? 0, msg.point ?? -1); break;
      case 'pause':   await this.setPaused(true);  break;
      case 'resume':  await this.setPaused(false); break;
      case 'refresh': await this.refreshSnapshot(); break;
      case 'end':     await this.endSession(); break;
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {

    this.broadcastPresence(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    try { ws.close(1011, 'error'); } catch {  }
  }

  private async move(delta: number): Promise<void> {
    const episode = await this.getSnapshot();
    if (!episode) return;
    const stops = this.flatten(episode);
    if (stops.length === 0) return;

    const cursor = await this.getCursor();
    let idx = stops.findIndex((c) => c.section === cursor.section && c.point === cursor.point);
    if (idx < 0) idx = delta > 0 ? -1 : 0;
    idx = Math.max(0, Math.min(stops.length - 1, idx + delta));
    await this.setCursor(stops[idx]);
  }

  private async goto(section: number, point: number): Promise<void> {
    const episode = await this.getSnapshot();
    if (!episode) return;
    const stops = this.flatten(episode);
    const match =
      stops.find((c) => c.section === section && c.point === point) ??
      stops.find((c) => c.section === section) ??
      null;
    if (match) await this.setCursor(match);
  }

  private async play(ws: WebSocket, cardId: string, isHost: boolean): Promise<void> {
    const episode = await this.getSnapshot();
    if (!episode) return;

    let found: Cursor | null = null;
    let speakerRef: string | null = null;
    episode.sections.forEach((section, s) => {
      section.points.forEach((point, p) => {
        if (point.id === cardId) {
          found = { section: s, point: p };
          speakerRef = point.speaker_ref ?? null;
        }
      });
    });
    if (!found) return;

    const identity = ws.deserializeAttachment() as Identity | null;
    const mine = speakerRef !== null && speakerRef === identity?.participantId;

    const unclaimed = speakerRef === null;
    if (!isHost && !mine && !unclaimed) return;

    const played = await this.getPlayed();
    if (!played.includes(cardId)) {
      played.push(cardId);
      await this.state.storage.put('played', played);
    }
    await this.setCursor(found);
  }

  private async getPlayed(): Promise<string[]> {
    return (await this.state.storage.get<string[]>('played')) ?? [];
  }

  private async ownsCurrentCard(ws: WebSocket): Promise<boolean> {
    const identity = ws.deserializeAttachment() as Identity | null;
    const participantId = identity?.participantId;
    if (!participantId) return false;
    const episode = await this.getSnapshot();
    if (!episode) return false;
    const cursor = await this.getCursor();
    const point = episode.sections[cursor.section]?.points[cursor.point];
    return !!point && point.speaker_ref === participantId;
  }

  private flatten(episode: EpisodeAggregate): Cursor[] {
    const stops: Cursor[] = [];
    episode.sections.forEach((section, s) => {
      if (section.points.length === 0) {
        stops.push({ section: s, point: -1 });
      } else {
        section.points.forEach((_, p) => stops.push({ section: s, point: p }));
      }
    });
    return stops;
  }

  private async ensureInit(episodeId: string, sessionId: string): Promise<void> {
    if (await this.state.storage.get<string>('episodeId')) return;
    if (!episodeId) return;
    await this.state.storage.put('episodeId', episodeId);
    if (sessionId) await this.state.storage.put('sessionId', sessionId);
    await this.state.storage.put('cursor', LOBBY);
    await this.state.storage.put('paused', false);
    await this.state.storage.put('startedAt', new Date().toISOString());
  }

  private async getSnapshot(): Promise<EpisodeAggregate | null> {
    if (this.snapshot) return this.snapshot;
    const episodeId = await this.state.storage.get<string>('episodeId');
    if (!episodeId) return null;
    this.snapshot = liveView(await new EpisodeRepo(this.env.DB_ST).findAggregate(episodeId));
    return this.snapshot;
  }

  private async refreshSnapshot(): Promise<void> {
    this.snapshot = null;
    const episode = await this.getSnapshot();
    this.broadcast({
      t: 'sync',
      episode,
      cursor: await this.getCursor(),
      paused: await this.getPaused(),
      played: await this.getPlayed(),
      turn: await this.getTurn(),
      viewers: this.state.getWebSockets().length,
    });
  }

  private async getCursor(): Promise<Cursor> {
    return (await this.state.storage.get<Cursor>('cursor')) ?? LOBBY;
  }

  private async getPaused(): Promise<boolean> {
    return (await this.state.storage.get<boolean>('paused')) ?? false;
  }

  private async setCursor(cursor: Cursor): Promise<void> {
    await this.state.storage.put('cursor', cursor);
    // A new card starts on its first turn.
    await this.state.storage.put('turn', 0);

    this.broadcast({
      t: 'cursor',
      cursor,
      paused: await this.getPaused(),
      played: await this.getPlayed(),
      turn: 0,
    });
  }

  /// Which turn of the current card's exchange is being spoken.
  private async setTurn(turn: number): Promise<void> {
    const t = Math.max(0, Math.floor(turn));
    await this.state.storage.put('turn', t);
    this.broadcast({ t: 'turn', turn: t, cursor: await this.getCursor() });
  }

  private async getTurn(): Promise<number> {
    return (await this.state.storage.get<number>('turn')) ?? 0;
  }

  private async setPaused(paused: boolean): Promise<void> {
    await this.state.storage.put('paused', paused);
    this.broadcast({ t: 'cursor', cursor: await this.getCursor(), paused });
  }

  private async endSession(): Promise<void> {
    const sessionId = await this.state.storage.get<string>('sessionId');
    const episodeId = await this.state.storage.get<string>('episodeId');
    if (sessionId) {

      const recap = JSON.stringify({
        episode: await this.getSnapshot(),
        started_at: (await this.state.storage.get<string>('startedAt')) ?? null,
        ended_at: new Date().toISOString(),
      });
      try { await new SessionRepo(this.env.DB_ST).end(sessionId, recap); } catch {  }
    }
    if (episodeId) {
      try {
        await new EpisodeRepo(this.env.DB_ST).patchEpisode(episodeId, { status: 'done' });
      } catch {  }
    }
    this.broadcast({ t: 'ended' });
    for (const ws of this.state.getWebSockets()) {
      try { ws.close(1000, 'Session ended'); } catch {  }
    }
  }

  private broadcast(payload: unknown): void {
    const data = JSON.stringify(payload);
    for (const ws of this.state.getWebSockets()) {
      try { ws.send(data); } catch {  }
    }
  }

  private broadcastPresence(excluding?: WebSocket): void {
    const sockets = this.state.getWebSockets().filter((ws) => ws !== excluding);
    const data = JSON.stringify({
      t: 'presence',
      viewers: sockets.length,
      roster: this.rosterOf(sockets),
    });
    for (const ws of sockets) {
      try { ws.send(data); } catch {  }
    }
  }

  private rosterOf(sockets: WebSocket[]): Identity[] {
    return sockets.map((ws) => {
      const attached = ws.deserializeAttachment() as Identity | null;
      return {
        role: attached?.role ?? 'viewer',
        participantId: attached?.participantId ?? null,
        name: attached?.name ?? null,
        color: attached?.color ?? null,
      };
    });
  }

  private sendTo(ws: WebSocket, payload: unknown): void {
    try { ws.send(JSON.stringify(payload)); } catch {  }
  }
}
