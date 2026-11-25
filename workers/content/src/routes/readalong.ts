/// Read along — the series km_content holds, and one episode's scenes (src/readalong.ts).
///   GET /cm/readalong?surah=40&place=intro|surah   the series offered on that page
///   GET /cm/readalong/:id?ep=1                      one episode: chrome, episodes, scenes
///   GET /cm/readalong/:id/room/:ep                  (WebSocket) the live room of a two-person episode (readalong-room.ts)
///   GET /cm/readalong/:id/room/:ep/takes            that room's takes: per scene, its start and end from the mark
import type { Router } from '../../../shared/src/router';
import { actorRef } from '../../../shared/src/auth';
import { query, queryOne } from '../../../shared/src/db';
import { badRequest, notFound, ok, unauthorized } from '../../../shared/src/response';
import type { ContentEnv } from '../env';
import { offeredHere, readalongConfig, shapeEpisode, type BlockRow, type EpisodeRow, type SeriesRow, peopleOf } from '../readalong';

export function readAlongRoutes(router: Router<ContentEnv>) {
  router.get('/cm/readalong', async (req, env) => {
    if (!actorRef(req)) return unauthorized('Authenticated user required');
    const sp = new URL(req.url).searchParams;
    const surah = Number(sp.get('surah') ?? 0), place = sp.get('place') ?? 'surah';
    const rows = await query<SeriesRow>(env.DB_CM,
      `SELECT collection_id, title, title_ar, meta_json FROM cm_collections
        WHERE collection_type = 'series' AND json_extract(meta_json, '$.readalong') IS NOT NULL`);
    const out = rows.map((r) => ({ r, cfg: readalongConfig(r.meta_json) }))
      .filter((x): x is { r: SeriesRow; cfg: NonNullable<typeof x.cfg> } => !!x.cfg && offeredHere(x.cfg, place, surah))
      .sort((a, b) => (a.cfg.stream ?? 99) - (b.cfg.stream ?? 99))
      .map(({ r, cfg }) => ({ id: r.collection_id, title: r.title, stream: cfg.stream ?? null, name_en: r.title, name_ar: r.title_ar,
                              line: cfg.labels['hub_line'] ?? '', surah: cfg.surah ?? null }));
    return ok(out);
  });

  router.get('/cm/readalong/:id', async (req, env, { id }) => {
    if (!actorRef(req)) return unauthorized('Authenticated user required');
    const series = await queryOne<SeriesRow>(env.DB_CM,
      `SELECT collection_id, title, title_ar, meta_json FROM cm_collections WHERE collection_id = ? AND collection_type = 'series'`, [id]);
    const cfg = series ? readalongConfig(series.meta_json) : null;
    if (!series || !cfg) return notFound(`read-along series ${id}`);
    const episodes = await query<EpisodeRow>(env.DB_CM,
      `SELECT d.doc_id, d.title, d.meta_json, COALESCE(json_extract(i.meta_json, '$.episode_no'), i.seq_order) AS episode_no
         FROM cm_collection_items i JOIN cm_documents d ON d.doc_id = i.target_ref
        WHERE i.collection_id = ? ORDER BY episode_no`, [id]);
    if (!episodes.length) return notFound(`no episodes in ${id}`);
    const want = Number(new URL(req.url).searchParams.get('ep') ?? 0);
    const ep = episodes.find((e) => e.episode_no === want) ?? episodes[0];
    const blocks = await query<BlockRow>(env.DB_CM,
      `SELECT block_id, seq_order, attrs_json FROM cm_blocks WHERE doc_id = ? AND block_type = 'scene' ORDER BY seq_order`, [ep.doc_id]);
    return ok(shapeEpisode(series, cfg, episodes, ep, blocks));
  });

  // The room of one episode, only when it is read by two (doc meta.people): one room per episode doc.
  const room = async (req: Request, env: ContentEnv, id: string, epNo: string, takes: boolean) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    if (!takes && req.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return badRequest('WebSocket upgrade required');
    const ep = await queryOne<EpisodeRow>(env.DB_CM,
      `SELECT d.doc_id, d.title, d.meta_json, COALESCE(json_extract(i.meta_json, '$.episode_no'), i.seq_order) AS episode_no
         FROM cm_collection_items i JOIN cm_documents d ON d.doc_id = i.target_ref
        WHERE i.collection_id = ? AND COALESCE(json_extract(i.meta_json, '$.episode_no'), i.seq_order) = ?`, [id, Number(epNo)]);
    if (!ep || peopleOf(ep) < 2 || !env.READALONG_ROOM) return notFound(`no live room for ${id} episode ${epNo}`);
    const headers = new Headers(req.headers);
    headers.set('X-KM-Episode-Id', ep.doc_id);
    return env.READALONG_ROOM.get(env.READALONG_ROOM.idFromName(ep.doc_id)).fetch(new Request(req.url, { headers }));
  };
  router.get('/cm/readalong/:id/room/:ep', (req, env, { id, ep }) => room(req, env, id, ep, false));
  router.get('/cm/readalong/:id/room/:ep/takes', (req, env, { id, ep }) => room(req, env, id, ep, true));
}
