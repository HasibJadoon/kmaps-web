/// The one Studio's read API (owner 2026-11-26: "Claude writes, the app just reads"). Every route is a GET that serves a
/// view-model built only from D1 rows (studio/model.ts); the apps render it. Old routes stay beside it until P7.
///   GET /st/studio?platform=ios|ipad|mac&locale=en      manifest: look, words, navigation, series (ETag = registry version)
///   GET /st/studio/now                                  next to film · in production · recently published
///   GET /st/studio/pipeline                             every episode in its stage's column
///   GET /st/studio/series/:id                           arcs → episodes (Shorts under their long)
///   GET /st/studio/episodes/:id                         the one episode page (old ids resolve through st_id_alias)
///   GET /st/studio/episodes/:id/run                     Recording: the scenes for the presenter (via CONTENT)
///   GET /st/studio/episodes/:id/study                   Study: mufassirūn side by side per āyah (via CONTENT)
///   GET /st/studio/episodes/:id/takes                   the live room's takes and markers
///   WS  /st/studio/episodes/:id/room                    the episode's live room (studio/room.do.ts)
import type { Router } from '../../../shared/src/router';
import { actorRef } from '../../../shared/src/auth';
import { notFound, ok, unauthorized } from '../../../shared/src/response';
import type { StudioEnv } from '../env';
import { loadEpisodes, loadRegistry, resolveId } from '../studio/load';
import { episodePage, manifest, nowPage, pipelinePage, runPage, sceneParams, seriesPage, studyPage } from '../studio/model';

const opts = (req: Request) => {
  const sp = new URL(req.url).searchParams;
  return { platform: sp.get('platform') ?? 'ios', locale: sp.get('locale') ?? 'en' };
};

export function studioRoutes(router: Router<StudioEnv>) {
  router.get('/st/studio', async (req, env) => {
    if (!actorRef(req)) return unauthorized('Authenticated user required');
    const o = opts(req);
    const reg = await loadRegistry(env.DB_ST, o.locale);
    if (req.headers.get('If-None-Match') === `"${reg.version}"`) return new Response(null, { status: 304 });
    const res = ok(manifest(reg, o.platform));
    res.headers.set('ETag', `"${reg.version}"`);
    return res;
  });

  router.get('/st/studio/now', async (req, env) => {
    if (!actorRef(req)) return unauthorized('Authenticated user required');
    const o = opts(req);
    const [reg, eps] = await Promise.all([loadRegistry(env.DB_ST, o.locale), loadEpisodes(env.DB_ST)]);
    return ok(nowPage(reg, eps, o.platform));
  });

  router.get('/st/studio/pipeline', async (req, env) => {
    if (!actorRef(req)) return unauthorized('Authenticated user required');
    const o = opts(req);
    const [reg, eps] = await Promise.all([loadRegistry(env.DB_ST, o.locale), loadEpisodes(env.DB_ST)]);
    return ok(pipelinePage(reg, eps, o.platform));
  });

  router.get('/st/studio/series/:id', async (req, env, { id }) => {
    if (!actorRef(req)) return unauthorized('Authenticated user required');
    const o = opts(req);
    const [reg, eps] = await Promise.all([loadRegistry(env.DB_ST, o.locale), loadEpisodes(env.DB_ST)]);
    if (!reg.series.some((s) => s.id === id)) return notFound(`series ${id}`);
    return ok(seriesPage(reg, id, eps, o.platform));
  });

  router.get('/st/studio/episodes/:id', async (req, env, { id }) => {
    if (!actorRef(req)) return unauthorized('Authenticated user required');
    const o = opts(req);
    const eid = await resolveId(env.DB_ST, id);
    const [reg, eps] = await Promise.all([loadRegistry(env.DB_ST, o.locale), loadEpisodes(env.DB_ST)]);
    const b = eps.find((e) => e.ep.id === eid);
    if (!b) return notFound(`episode ${id}`);
    return ok(episodePage(reg, b, o.platform, eps));
  });

  // Recording: the episode's scenes (from its scene doc in km_content, over CONTENT), for the presenter screen.
  router.get('/st/studio/episodes/:id/run', async (req, env, { id }) => {
    if (!actorRef(req)) return unauthorized('Authenticated user required');
    const o = opts(req);
    const eid = await resolveId(env.DB_ST, id);
    const [reg, eps] = await Promise.all([loadRegistry(env.DB_ST, o.locale), loadEpisodes(env.DB_ST, eid)]);
    const b = eps[0];
    if (!b) return notFound(`episode ${id}`);
    let scenes = null;
    if (b.ep.scenes_ref && env.CONTENT) {
      const qs = new URLSearchParams(sceneParams(reg, b)).toString();
      const r = await env.CONTENT.fetch(new Request(`https://content/cm/scenes/${encodeURIComponent(b.ep.scenes_ref)}?${qs}`, { headers: req.headers }));
      if (r.ok) scenes = ((await r.json()) as { data: { scenes: Array<Record<string, unknown>> } }).data;
    }
    return ok(runPage(reg, b, scenes, o.platform));
  });

  // Study: the five mufassirūn side by side per āyah, from the episode's tafsīr scripts (km_content essays).
  router.get('/st/studio/episodes/:id/study', async (req, env, { id }) => {
    if (!actorRef(req)) return unauthorized('Authenticated user required');
    const o = opts(req);
    const eid = await resolveId(env.DB_ST, id);
    const [reg, eps] = await Promise.all([loadRegistry(env.DB_ST, o.locale), loadEpisodes(env.DB_ST, eid)]);
    const b = eps[0];
    if (!b) return notFound(`episode ${id}`);
    const slugs = b.resources.filter((r) => r.group_key === 'tafsir' && r.url?.startsWith('com.kmaps.app://essay/'))
      .sort((x, y) => x.seq - y.seq).map((r) => ({ slug: r.url!.slice('com.kmaps.app://essay/'.length), title: r.label_override ?? '' }));
    const docs = env.CONTENT ? (await Promise.all(slugs.map(async (s) => {
      const r = await env.CONTENT!.fetch(new Request(`https://content/cm/essays/${encodeURIComponent(s.slug)}`, { headers: req.headers }));
      return r.ok ? { title: s.title, body: ((await r.json()) as { data: { body: string } }).data.body } : null;
    }))).filter((d): d is { title: string; body: string } => !!d) : [];
    return ok(studyPage(reg, b, docs, o.platform));
  });

  // The episode's live room (any number of devices; solo episodes use it for takes too).
  router.get('/st/studio/episodes/:id/room', async (req, env, { id }) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    if (req.headers.get('Upgrade')?.toLowerCase() !== 'websocket' || !env.EPISODE_ROOM) return notFound('room');
    const eid = await resolveId(env.DB_ST, id);
    if (!(await env.DB_ST.prepare(`SELECT 1 FROM st_episode WHERE id = ?`).bind(eid).first())) return notFound(`episode ${id}`);
    const headers = new Headers(req.headers);
    headers.set('X-KM-Episode-Id', eid);
    return env.EPISODE_ROOM.get(env.EPISODE_ROOM.idFromName(eid)).fetch(new Request(req.url, { headers }));
  });

  // Takes: what the live room recorded, with markers (Claude and the Mac's marker export read this).
  router.get('/st/studio/episodes/:id/takes', async (req, env, { id }) => {
    if (!actorRef(req)) return unauthorized('Authenticated user required');
    const eid = await resolveId(env.DB_ST, id);
    const takes = await env.DB_ST.prepare(`SELECT * FROM st_take WHERE episode_ref = ? ORDER BY take_no`).bind(eid).all();
    const markers = await env.DB_ST.prepare(
      `SELECT m.* FROM st_take_marker m JOIN st_take t ON t.id = m.take_ref WHERE t.episode_ref = ? ORDER BY m.take_ref, m.seq`).bind(eid).all();
    return ok({ id: eid, takes: (takes.results ?? []).map((t) => ({ ...t, markers: (markers.results ?? []).filter((m) => m['take_ref'] === t['id']) })) });
  });
}
