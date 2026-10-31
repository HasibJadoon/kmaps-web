import type { Router } from '../../../shared/src/router';
import { badRequest, notFound, ok, unauthorized } from '../../../shared/src/response';
import { actorRef } from '../../../shared/src/auth';
import { execute, queryOne } from '../../../shared/src/db';
import type { ContentEnv } from '../env';
import { StudyRepo } from '../repositories/study.repo';
import { buildMonth, buildWeek, mondayOf } from '../streams';

// The Week: the three streams and this week's sprint in each. ?week=YYYY-MM-DD shows the week that day falls in.
export function streamRoutes(router: Router<ContentEnv>) {
  router.get('/cm/streams', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const day = new URL(req.url).searchParams.get('week') ?? new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return badRequest('week: YYYY-MM-DD');
    return ok(await buildWeek(env.DB_CM, day, await new StudyRepo(env.DB_CM).list(user)));
  });

  // The month: its four (or five) sprints across the streams, and its retro. ?month=YYYY-MM.
  router.get('/cm/streams/month', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const month = new URL(req.url).searchParams.get('month') ?? new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) return badRequest('month: YYYY-MM');
    // the writers' names, from the studies' people
    const names: Record<string, string> = {};
    const studies = await new StudyRepo(env.DB_CM).list(user);
    for (const s of studies) {
      const row = await queryOne<{ meta_json: string | null }>(env.DB_CM, `SELECT meta_json FROM cm_documents WHERE doc_id = ?`, [s.doc_id]);
      try { for (const [ref, n] of Object.entries(JSON.parse(row?.meta_json ?? '{}').names ?? {})) names[ref] = (n as { name: string }).name; } catch { /* unnamed */ }
    }
    return ok(await buildMonth(env.DB_CM, month, names, studies));
  });

  // A retro note: keep, change or try — for the month, or one stream.
  router.post('/cm/streams/retro', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const b = await req.json().catch(() => null) as Record<string, unknown> | null;
    const month = String(b?.month ?? ''), kind = String(b?.kind ?? ''), text = String(b?.text ?? '').trim();
    if (!/^\d{4}-\d{2}$/.test(month) || !['keep', 'change', 'try'].includes(kind) || !text || text.length > 600) {
      return badRequest('month (YYYY-MM), kind (keep|change|try) and text required');
    }
    const id = `RETRO:${crypto.randomUUID()}`;
    await execute(env.DB_CM, `INSERT INTO cm_sprint_retro (retro_id, month, stream_key, kind, text, author_ref) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, month, typeof b?.stream === 'string' && b.stream ? b.stream : null, kind, text, user]);
    return ok({ id });
  });

  router.delete('/cm/streams/retro/:id', async (req, env, params) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    await execute(env.DB_CM, `DELETE FROM cm_sprint_retro WHERE retro_id = ? AND author_ref = ?`, [params.id, user]);
    return ok({ ok: true });
  });

  // A unit pulled from a stream's queue into a week.
  router.post('/cm/streams/:key/picks', async (req, env, params) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const b = await req.json().catch(() => null) as Record<string, unknown> | null;
    const unit = String(b?.unit ?? ''), label = String(b?.label ?? '');
    if (!unit || !label) return badRequest('unit and label required');
    if (!(await queryOne(env.DB_CM, `SELECT 1 FROM cm_stream WHERE stream_key = ?`, [params.key]))) return notFound(`stream ${params.key}`);
    const week = mondayOf(typeof b?.week === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.week) ? b.week : new Date().toISOString().slice(0, 10));
    const str = (v: unknown) => (typeof v === 'string' && v ? v : null);
    const src = (v: unknown) => (v && typeof v === 'object' && 'module' in v && 'path' in v ? JSON.stringify(v) : null);
    const id = `PICK:${crypto.randomUUID()}`;
    await execute(env.DB_CM,
      `INSERT INTO cm_sprint_pick (pick_id, stream_key, week_start, unit, label, title, title_ar, ref, page_json, down_json, picked_by, seq)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM cm_sprint_pick WHERE stream_key = ? AND week_start = ?))
       ON CONFLICT (stream_key, week_start, unit) DO NOTHING`,
      [id, params.key, week, unit, label, str(b?.title), str(b?.title_ar), str(b?.ref), src(b?.page), src(b?.down), user, params.key, week]);
    return ok({ id, week });
  });

  // A pick moved on (todo → doing → done), or taken out of the week.
  router.patch('/cm/streams/picks/:id', async (req, env, params) => {
    if (!actorRef(req)) return unauthorized('Authenticated user required');
    const b = await req.json().catch(() => null) as Record<string, unknown> | null;
    const state = String(b?.state ?? '');
    if (!['todo', 'doing', 'done'].includes(state)) return badRequest('state: todo | doing | done');
    if (params.id.startsWith('study:')) {
      // a study carried into the week, moved by hand: it becomes a pick of that week, with the state given
      const week = mondayOf(typeof b?.week === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.week) ? b.week : new Date().toISOString().slice(0, 10));
      const st = (await new StudyRepo(env.DB_CM).list(actorRef(req))).find((x) => x.doc_id === params.id.slice(6));
      const stream = typeof b?.stream === 'string' ? b.stream : null;
      if (!st?.sprint || !stream) return badRequest('week and stream required for a study');
      await execute(env.DB_CM,
        `INSERT INTO cm_sprint_pick (pick_id, stream_key, week_start, unit, label, title, title_ar, state, picked_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (stream_key, week_start, unit) DO UPDATE SET state = excluded.state, updated_at = datetime('now')`,
        [`PICK:${crypto.randomUUID()}`, stream, week, st.sprint.unit, (st.sprint as { label?: string }).label ?? st.title, st.title, st.title_ar, state, actorRef(req)]);
      return ok({ state });
    }
    await execute(env.DB_CM, `UPDATE cm_sprint_pick SET state = ?, updated_at = datetime('now') WHERE pick_id = ?`, [state, params.id]);
    return ok({ state });
  });

  router.delete('/cm/streams/picks/:id', async (req, env, params) => {
    if (!actorRef(req)) return unauthorized('Authenticated user required');
    await execute(env.DB_CM, `DELETE FROM cm_sprint_pick WHERE pick_id = ?`, [params.id]);
    return ok({ ok: true });
  });
}
