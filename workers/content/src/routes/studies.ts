import type { Router } from '../../../shared/src/router';
import { badRequest, notFound, ok, unauthorized } from '../../../shared/src/response';
import { actorRef } from '../../../shared/src/auth';
import type { ContentEnv } from '../env';
import { StudyRepo } from '../repositories/study.repo';
import { queryOne } from '../../../shared/src/db';
import { buildLog, type EpisodeDigest } from '../study-log';

// Studies: a passage worked through in steps, each step a deck. `?status=active`
// is what the workspace's active-study card asks for. Person steps resolve to
// the caller's own deck, so two people see the same study with their own slides.
export function studyRoutes(router: Router<ContentEnv>) {
  router.get('/cm/studies', async (req, env) => {
    const status = new URL(req.url).searchParams.get('status') ?? undefined;
    return ok(await new StudyRepo(env.DB_CM).list(actorRef(req), status));
  });

  // Time and reach on one step, reported by the player as the person reads.
  router.post('/cm/studies/:id/progress', async (req, env, params) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const b = await req.json().catch(() => null) as Record<string, unknown> | null;
    const step = Number(b?.step);
    if (!b || !Number.isInteger(step)) return badRequest('step required');
    const repo = new StudyRepo(env.DB_CM);
    const id = await repo.resolve(params.id);
    if (!id || !(await repo.isMember(id, user))) return notFound(`study ${params.id}`);
    await repo.report(id, user, {
      step,
      seconds: Number(b.seconds) || 0,
      slide: Number(b.slide) || 0,
      slideCount: Number(b.slide_count) || 0,
      done: b.done === true,
    });
    // The other person's page refreshes at once.
    if (env.STUDY_ROOM) {
      try {
        await env.STUDY_ROOM.get(env.STUDY_ROOM.idFromName(id)).fetch(new Request('https://study-room/changed', { method: 'POST' }));
      } catch { /* the room's own check catches it */ }
    }
    return ok({ ok: true });
  });

  // The monitor: both people through every step, with dates, time and review points.
  router.get('/cm/studies/:id/monitor', async (req, env, params) => {
    const repo = new StudyRepo(env.DB_CM);
    const id = await repo.resolve(params.id);
    const monitor = id ? await repo.monitor(id, actorRef(req)) : null;
    return monitor ? ok(monitor) : notFound(`study ${params.id}`);
  });

  // The passage's brain: every stage of the study before the episode, and
  // after it, with the log of what was done — see study-log.ts.
  router.get('/cm/studies/:id/log', async (req, env, params) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const repo = new StudyRepo(env.DB_CM);
    const id = await repo.resolve(params.id);
    if (!id || !(await repo.isMember(id, user))) return notFound(`study ${params.id}`);
    const study = (await repo.list(user)).find((s) => s.doc_id === id);
    const row = await queryOne<{ meta_json: string | null }>(env.DB_CM,
      `SELECT meta_json FROM cm_documents WHERE doc_id = ?`, [id]);
    if (!study || !row) return notFound(`study ${params.id}`);
    let raw: Record<string, unknown> = {};
    try { raw = JSON.parse(row.meta_json ?? '{}'); } catch { /* an empty page */ }
    const refs = study.episodes;
    const episodes: EpisodeDigest[] = [];
    for (const ep of refs) {
      if (!env.STUDIO) break;
      try {
        const r = await env.STUDIO.fetch(new Request(`https://km-studio/st/episodes/${encodeURIComponent(ep)}`,
          { headers: req.headers }));
        if (r.ok) {
          const body = await r.json() as { data?: EpisodeDigest } & EpisodeDigest;
          episodes.push(body.data ?? body);
        }
      } catch { /* the page shows the study without that episode */ }
    }
    return ok(await buildLog(env.DB_CM, study, raw, episodes, user));
  });

  // A note of the passage, for any of the study's people — the notes are
  // written once and read by both.
  router.get('/cm/studies/:id/notes/:note', async (req, env, params) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const repo = new StudyRepo(env.DB_CM);
    const id = await repo.resolve(params.id);
    if (!id || !(await repo.isMember(id, user))) return notFound(`study ${params.id}`);
    const row = await queryOne<{ meta_json: string | null }>(env.DB_CM,
      `SELECT meta_json FROM cm_documents WHERE doc_id = ?`, [id]);
    let unit = '';
    try { unit = String(JSON.parse(row?.meta_json ?? '{}')?.passage?.unit_id ?? ''); } catch { /* none */ }
    const note = await queryOne<Record<string, unknown>>(env.DB_CM,
      `SELECT n.note_id AS id, n.note_type, n.title, n.body_text AS body, n.visibility, n.domain,
              n.surah, n.ayah_from, n.ayah_to, n.is_pinned, n.tags_json, n.folder_ref, n.deleted_at,
              n.passage_ref, json_extract(n.meta_json,'$.quote') AS quote,
              n.stage, n.parent_ref, n.published_doc_ref, n.published_at, n.created_at, n.updated_at
         FROM cm_notes n JOIN cm_note_targets t ON t.note_id = n.note_id
        WHERE n.note_id = ? AND t.target_ref = ? LIMIT 1`, [params.note, unit]);
    return note ? ok(note) : notFound(`note ${params.note}`);
  });

  // The study's live room: both of you on the passage page together.
  router.get('/cm/studies/:id/live', async (req, env, params) => {
    if (req.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return badRequest('WebSocket upgrade required');
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const repo = new StudyRepo(env.DB_CM);
    const id = await repo.resolve(params.id);
    if (!id || !(await repo.isMember(id, user)) || !env.STUDY_ROOM) return notFound(`study ${params.id}`);
    const row = await queryOne<{ meta_json: string | null }>(env.DB_CM,
      `SELECT meta_json FROM cm_documents WHERE doc_id = ?`, [id]);
    let me: { name?: string; color?: string } = {};
    try { me = JSON.parse(row?.meta_json ?? '{}')?.names?.[user] ?? {}; } catch { /* unnamed */ }
    const headers = new Headers(req.headers);
    headers.set('X-KM-Study-Id', id);
    headers.set('X-KM-Name', encodeURIComponent(me.name ?? ''));
    headers.set('X-KM-Color', me.color ?? '');
    return env.STUDY_ROOM.get(env.STUDY_ROOM.idFromName(id)).fetch(new Request(req.url, { headers }));
  });
}
