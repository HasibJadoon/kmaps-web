import type { StudioEnv } from '../env';

/// One live room per episode (the one Studio's room; replaces EpisodeSession and content's ReadAlongRoom over P4–P7).
/// Any device in the room moves the scene and every other device follows; Start take makes every device flash and beep
/// together (`in` ms from now — the sync point the iPhones' footage is lined up on); End take saves the take and one
/// marker per scene shown to D1 (st_take, st_take_marker), where Claude and the Mac's marker export read them.
/// Nothing here knows what a scene says: scene ids come from the devices, which load the episode's run payload.

interface At { scene: number; beat: number; id: string | null }
interface Take { markAt: number; log: Array<At & { t: number }> }
export interface Marker { scene_ref: string | null; scene: number; beat: number; start_tc: string; end_tc: string }

const FLASH_IN_MS = 3000;

/// h:mm:ss.mmm from the mark.
export function tc(ms: number): string {
  const t = Math.max(0, Math.round(ms));
  const h = Math.floor(t / 3_600_000), m = Math.floor(t / 60_000) % 60, s = Math.floor(t / 1000) % 60, f = t % 1000;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(f).padStart(3, '0')}`;
}

/// The take's log as markers: one per step, each running to the next step (the last to the cut).
export function markersOf(take: Take, end: number): Marker[] {
  return take.log.map((step, i) => ({
    scene_ref: step.id, scene: step.scene, beat: step.beat,
    start_tc: tc(step.t - take.markAt), end_tc: tc((take.log[i + 1]?.t ?? end) - take.markAt),
  }));
}

/// The SQL that saves a finished take (pure, so it is tested without a database).
export function takeStatements(episodeId: string, takeNo: number, take: Take, end: number, devices: number) {
  const id = `${episodeId}:take:${takeNo}`;
  const iso = (ms: number) => new Date(ms).toISOString();
  return {
    id,
    take: { sql: `INSERT INTO st_take (id, episode_ref, take_no, mark_at, cut_at, devices_json, status) VALUES (?, ?, ?, ?, ?, ?, 'kept')`,
            args: [id, episodeId, takeNo, iso(take.markAt), iso(end), JSON.stringify({ count: devices })] },
    markers: markersOf(take, end).map((m, i) => ({
      sql: `INSERT INTO st_take_marker (take_ref, seq, scene_ref, beat, start_tc, end_tc) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, i, m.scene_ref, m.beat, m.start_tc, m.end_tc] })),
  };
}

export class EpisodeRoom {
  constructor(private state: DurableObjectState, private env: StudioEnv) {
    try { this.state.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong')); } catch { /* older runtime */ }
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('Expected WebSocket upgrade', { status: 426 });
    const episodeId = request.headers.get('X-KM-Episode-Id') ?? '';
    if (episodeId) await this.state.storage.put('episodeId', episodeId);
    const { 0: client, 1: server } = new WebSocketPair();
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ ref: request.headers.get('X-KM-User-Id') ?? '' });
    const at = await this.at();
    this.send(server, { t: 'hello', ...at, taking: !!(await this.state.storage.get<Take>('take')), here: this.state.getWebSockets().length });
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
      if (await this.state.storage.get<Take>('take')) return;
      const markAt = Date.now() + FLASH_IN_MS;
      await this.state.storage.put('take', { markAt, log: [{ ...(await this.at()), t: markAt }] } satisfies Take);
      this.broadcast({ t: 'mark', in: FLASH_IN_MS });
    } else if (msg.t === 'cut') {
      await this.cut();
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.broadcast({ t: 'presence', here: this.state.getWebSockets().filter((w) => w !== ws).length }, ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> { try { ws.close(1011, 'error'); } catch { /* gone */ } }

  private async at(): Promise<At> { return (await this.state.storage.get<At>('at')) ?? { scene: 0, beat: 0, id: null }; }

  private async log(at: At, t: number): Promise<void> {
    const take = await this.state.storage.get<Take>('take');
    if (!take) return;
    if (t < take.markAt) { take.log[0] = { ...at, t: take.markAt }; } else { take.log.push({ ...at, t }); }
    await this.state.storage.put('take', take);
  }

  private async cut(): Promise<void> {
    const take = await this.state.storage.get<Take>('take');
    if (!take) return;
    await this.state.storage.delete('take');
    const episodeId = (await this.state.storage.get<string>('episodeId')) ?? '';
    const end = Date.now();
    let saved = false, markers = 0;
    try {
      const row = await this.env.DB_ST.prepare(`SELECT COALESCE(MAX(take_no), 0) + 1 AS n FROM st_take WHERE episode_ref = ?`).bind(episodeId).first<{ n: number }>();
      const st = takeStatements(episodeId, row?.n ?? 1, take, end, this.state.getWebSockets().length);
      await this.env.DB_ST.batch([st.take, ...st.markers].map((s) => this.env.DB_ST.prepare(s.sql).bind(...s.args)));
      saved = true; markers = st.markers.length;
    } catch (e) {
      // keep the take in the room so it is not lost; it is saved again on the next cut attempt by Claude's import
      await this.state.storage.put(`unsaved:${end}`, take);
      console.warn('[episode-room] take not saved:', e instanceof Error ? e.message : e);
    }
    this.broadcast({ t: 'cut', markers, saved });
  }

  private broadcast(payload: unknown, except?: WebSocket): void {
    const data = JSON.stringify(payload);
    for (const ws of this.state.getWebSockets()) { if (ws !== except) { try { ws.send(data); } catch { /* closing */ } } }
  }

  private send(ws: WebSocket, payload: unknown): void { try { ws.send(JSON.stringify(payload)); } catch { /* closing */ } }
}
