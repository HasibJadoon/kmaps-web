import type { ContentEnv } from './env';

/// A study's room — the passage page shared live by the study's people.
///
/// The page itself is data (GET /cm/studies/:id/log); the room only keeps the
/// two of you together on it:
///   presence  who has the page open, in their colours
///   focus     the stage each of you is on — the other's page shows it, and a
///             tap there goes to it
///   changed   the study moved (a step read or finished, a note written into
///             the passage, a sticky on the brainstorm board): every open page fetches the log again
/// A change made through the app is announced at once (POST …/changed from
/// the progress route); one written straight into D1 — a note Claude adds — is
/// caught by a check every half-minute while anyone is in the room.

interface Identity { ref: string; name: string; color: string | null; stage: string | null }

const CHECK_MS = 30_000;

export class StudyRoom {
  constructor(private state: DurableObjectState, private env: ContentEnv) {
    try {
      this.state.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    } catch { /* older runtime: pings are answered in webSocketMessage */ }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/changed')) {
      this.broadcast({ t: 'changed' });
      return new Response(null, { status: 204 });
    }
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }
    const studyId = request.headers.get('X-KM-Study-Id') ?? '';
    if (studyId) await this.state.storage.put('studyId', studyId);
    const me: Identity = {
      ref: request.headers.get('X-KM-User-Id') ?? '',
      name: decodeURIComponent(request.headers.get('X-KM-Name') ?? ''),
      color: request.headers.get('X-KM-Color') || null,
      stage: null,
    };
    const { 0: client, 1: server } = new WebSocketPair();
    this.state.acceptWebSocket(server);
    server.serializeAttachment(me);
    this.send(server, { t: 'hello', you: me, roster: this.roster() });
    this.broadcastPresence();
    if (!(await this.state.storage.getAlarm())) await this.state.storage.setAlarm(Date.now() + CHECK_MS);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const text = typeof message === 'string' ? message : new TextDecoder().decode(message);
    if (text === 'ping') { ws.send('pong'); return; }
    let msg: { t?: string; stage?: string | null };
    try { msg = JSON.parse(text); } catch { return; }
    if (msg.t === 'focus') {
      const me = ws.deserializeAttachment() as Identity;
      ws.serializeAttachment({ ...me, stage: msg.stage ?? null });
      this.broadcastPresence();
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> { this.broadcastPresence(ws); }
  async webSocketError(ws: WebSocket): Promise<void> { try { ws.close(1011, 'error'); } catch { /* gone */ } }

  /// While anyone is in, watch the study for changes made outside the app.
  async alarm(): Promise<void> {
    if (this.state.getWebSockets().length === 0) return;
    const studyId = await this.state.storage.get<string>('studyId');
    if (studyId) {
      const version = await this.version(studyId);
      const last = await this.state.storage.get<string>('version');
      if (last !== undefined && version !== last) this.broadcast({ t: 'changed' });
      await this.state.storage.put('version', version);
    }
    await this.state.storage.setAlarm(Date.now() + CHECK_MS);
  }

  /// The newest thing in the study: its progress and its passage's notes.
  private async version(studyId: string): Promise<string> {
    const row = await this.env.DB_CM.prepare(
      `SELECT
         (SELECT MAX(COALESCE(completed_at, last_at)) FROM cm_study_progress WHERE study_id = ?1) AS p,
         (SELECT MAX(n.updated_at) || ':' || COUNT(*) FROM cm_note_targets t JOIN cm_notes n ON n.note_id = t.note_id
           WHERE t.target_ref = json_extract((SELECT meta_json FROM cm_documents WHERE doc_id = ?1), '$.passage.unit_id')) AS n,
         (SELECT updated_at FROM cm_documents WHERE doc_id = ?1) AS d,
         (SELECT MAX(updated_at) || ':' || COUNT(*) FROM cm_study_sticky WHERE study_id = ?1)
           || '/' || (SELECT COUNT(*) || ':' || COALESCE(MAX(created_at), '') FROM cm_study_sticky_link WHERE study_id = ?1)
           || '/' || (SELECT COALESCE(MAX(updated_at), '') FROM cm_study_sticky_place WHERE study_id = ?1)
           || '/' || (SELECT COUNT(*) || ':' || COALESCE(MAX(COALESCE(deleted_at, created_at)), '') FROM cm_study_point WHERE study_id = ?1) AS s`,
    ).bind(studyId).first<{ p: string | null; n: string | null; d: string | null; s: string | null }>()
      .catch(() => null);   // a table not made yet: no watch this round, the app's own pings still go
    return `${row?.p ?? ''}|${row?.n ?? ''}|${row?.d ?? ''}|${row?.s ?? ''}`;
  }

  private roster(except?: WebSocket): Identity[] {
    const seen = new Map<string, Identity>();
    for (const ws of this.state.getWebSockets()) {
      if (ws === except) continue;
      const who = ws.deserializeAttachment() as Identity | null;
      if (who?.ref) seen.set(who.ref, who);
    }
    return [...seen.values()];
  }

  private broadcastPresence(except?: WebSocket): void {
    this.broadcast({ t: 'presence', roster: this.roster(except) }, except);
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
