import type { ContentEnv } from './env';

/// A read-along episode read by two people (doc meta.people = 2): one live room per episode doc.
///
/// The episode itself is data (GET /cm/readalong/:id?ep=); the room only keeps everyone on the same place in it:
///   at     the scene and beat on screen — any device in the room moves it, every other device follows
///   mark   the take starts: every device flashes and beeps at the same moment (`in` ms from now), the sync point
///          the camera footage is lined up on
///   cut    the take ends: each scene shown during it becomes a marker (start/end from the mark), kept in the room
///          and read back at GET …/room/:ep/takes — the cut points for the Shorts
/// Nothing here knows what a scene says; the scene ids and cues come from the episode the devices loaded.

interface At { scene: number; beat: number; id: string | null }
interface Take { markAt: number; log: Array<At & { t: number }> }
export interface Marker { id: string | null; scene: number; beat: number; start: string; end: string }
export interface SavedTake { mark: string; cut: string; markers: Marker[] }

const FLASH_IN_MS = 3000;
const KEEP_TAKES = 20;

/// h:mm:ss.mmm from the mark.
export function tc(ms: number): string {
  const t = Math.max(0, Math.round(ms));
  const h = Math.floor(t / 3_600_000), m = Math.floor(t / 60_000) % 60, s = Math.floor(t / 1000) % 60, f = t % 1000;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(f).padStart(3, '0')}`;
}

/// The take's log as markers: one per step, each running to the next step (the last to the cut).
export function markersOf(take: Take, end: number): Marker[] {
  return take.log.map((step, i) => ({
    id: step.id, scene: step.scene, beat: step.beat,
    start: tc(step.t - take.markAt), end: tc((take.log[i + 1]?.t ?? end) - take.markAt),
  }));
}

export class ReadAlongRoom {
  constructor(private state: DurableObjectState, private env: ContentEnv) {
    try {
      this.state.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    } catch { /* older runtime: pings are answered in webSocketMessage */ }
  }

  async fetch(request: Request): Promise<Response> {
    if (new URL(request.url).pathname.endsWith('/takes')) {
      const takes = (await this.state.storage.get<SavedTake[]>('takes')) ?? [];
      return Response.json({ ok: true, data: takes });
    }
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }
    const { 0: client, 1: server } = new WebSocketPair();
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ ref: request.headers.get('X-KM-User-Id') ?? '' });
    const at = await this.at();
    const take = await this.state.storage.get<Take>('take');
    this.send(server, { t: 'hello', ...at, taking: !!take, here: this.state.getWebSockets().length });
    this.broadcast({ t: 'presence', here: this.state.getWebSockets().length }, server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const text = typeof message === 'string' ? message : new TextDecoder().decode(message);
    if (text === 'ping') { ws.send('pong'); return; }
    let msg: { t?: string; scene?: number; beat?: number; id?: string | null };
    try { msg = JSON.parse(text); } catch { return; }
    if (msg.t === 'go' && typeof msg.scene === 'number') {
      const at: At = { scene: Math.max(0, Math.floor(msg.scene)), beat: Math.max(0, Math.floor(msg.beat ?? 0)), id: msg.id ?? null };
      const was = await this.at();
      if (was.scene === at.scene && was.beat === at.beat) return;
      await this.state.storage.put('at', at);
      await this.log(at, Date.now());
      this.broadcast({ t: 'at', ...at }, ws);
    } else if (msg.t === 'mark') {
      await this.mark();
    } else if (msg.t === 'cut') {
      await this.cut();
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.broadcast({ t: 'presence', here: this.state.getWebSockets().filter((w) => w !== ws).length }, ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> { try { ws.close(1011, 'error'); } catch { /* gone */ } }

  private async at(): Promise<At> {
    return (await this.state.storage.get<At>('at')) ?? { scene: 0, beat: 0, id: null };
  }

  private async mark(): Promise<void> {
    if (await this.state.storage.get<Take>('take')) return;
    const markAt = Date.now() + FLASH_IN_MS;
    const take: Take = { markAt, log: [{ ...(await this.at()), t: markAt }] };
    await this.state.storage.put('take', take);
    // `in` rather than a wall-clock time: the iPads' clocks need not agree, the delay from now does
    this.broadcast({ t: 'mark', in: FLASH_IN_MS });
  }

  private async cut(): Promise<void> {
    const take = await this.state.storage.get<Take>('take');
    if (!take) return;
    await this.state.storage.delete('take');
    const end = Date.now();
    const markers = markersOf(take, end);
    const takes = (await this.state.storage.get<SavedTake[]>('takes')) ?? [];
    takes.push({ mark: new Date(take.markAt).toISOString(), cut: new Date(end).toISOString(), markers });
    await this.state.storage.put('takes', takes.slice(-KEEP_TAKES));
    this.broadcast({ t: 'cut', markers: markers.length });
  }

  private async log(at: At, t: number): Promise<void> {
    const take = await this.state.storage.get<Take>('take');
    if (!take || t < take.markAt) {
      // a step before the flash only moves where the take starts
      if (take) { take.log[0] = { ...at, t: take.markAt }; await this.state.storage.put('take', take); }
      return;
    }
    take.log.push({ ...at, t });
    await this.state.storage.put('take', take);
  }

  private broadcast(payload: unknown, except?: WebSocket): void {
    const data = JSON.stringify(payload);
    for (const ws of this.state.getWebSockets()) {
      if (ws === except) continue;
      try { ws.send(data); } catch { /* closing */ }
    }
  }

  private send(ws: WebSocket, payload: unknown): void {
    try { ws.send(JSON.stringify(payload)); } catch { /* closing */ }
  }
}
