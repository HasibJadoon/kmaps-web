import type { Router } from '../../../shared/src/router';
import { ok, err } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { query, queryOne, execute } from '../../../shared/src/db';
import { readJsonObject } from '../../../shared/src/validate';
import type { CoreEnv } from '../env';
import { type Mode, addDays, dayOf, fill, profileMode, streak } from './body-mode';

// ── The routine, each move timed (migration 081; owner, 2026-10-21: "Each exercise select start and end and log time
//    spent") — for the adult twenty and the kids' set alike ─────────────────────────────────────────────────────────
//   POST /core/body/routine          {key, done}  the plain tick ("Done — no timer"); {done:false} unticks
//   POST /core/body/routine/start    {key}        a running session; starting another cancels any still running
//   POST /core/body/routine/end      {id}         the session's seconds = now − start, kept within 5 s and 60 min; the
//                                                 move is marked done; a done move can be timed again (another set)
//   POST /core/body/routine/cancel   {id}         a running session dropped, nothing logged
// Each answers with the whole routine block, shaped here (the dashboards draw it through routineBlock too).
// The day's routine is one exercise entry (RT:<owner>:<date>): its minutes are the timed seconds of the moves done,
// plus an estimate only for a move ticked without a timer — 1.5 min (adult), the move's own minutes (kids' set).
// Adult: kcal from MET 3.8 at the latest weight, as before. A child's plan: no kcal, ever; minutes count toward 60.

type Label = { key: string; label: string; label_ar: string | null; detail: string | null; icon: string | null; color: string | null;
               extra_json: string | null };
type Item = { key: string; seq: number; part: string; name: string; reps: number; unit: string; icon: string; tone: string | null; cue: string;
              easier: string | null; place: string; video_url: string | null; frames_json: string | null; frame_ms: number | null;
              pose_json: string | null; video_id: string | null; demo_source: string | null; set_key?: string; minutes?: number | null } & Record<string, unknown>;
type Session = { id: string; on_date: string; item_key: string; started_at: string; ended_at: string | null; seconds: number | null };

const json = <T>(s: string | null | undefined, fb: T): T => { try { return s ? JSON.parse(s) as T : fb; } catch { return fb; } };
const ADULT_EST_MIN = 1.5;            // a move ticked without a timer (the owner's earlier rule)
const MET = 3.8;                      // moderate bodyweight work
const MIN_S = 5, MAX_S = 3600;

/** The routine's words (core_app_label body_routine_ui, a mode's body_routine_ui_<words> laid over them). */
async function routineWords(env: CoreEnv, mode: Mode | null) {
  const scopes = ['body_routine_ui', ...(mode?.words ? [`body_routine_ui_${mode.words}`] : [])];
  const rows = await query<Label & { scope: string }>(env.DB_CORE, `SELECT scope, key, label, label_ar, detail, icon, color, extra_json FROM core_app_label
     WHERE scope IN (${scopes.map(() => '?').join(', ')}) ORDER BY scope = 'body_routine_ui' DESC, sort`, scopes);
  const out: Record<string, Record<string, unknown>> = {};
  for (const l of rows) out[l.key] = { label: l.label, label_ar: l.label_ar, detail: l.detail, icon: l.icon, color: l.color, ...json<Record<string, unknown>>(l.extra_json, {}) };
  return out;
}

/** The routine block for the reader, the same for both dashboards and every routine POST. `video` is the adult's
 *  whole-routine video (body_ui routine); a mode's set has none. */
export async function routineBlock(env: CoreEnv, me: string, o: { today: string; mode: Mode | null; video?: Record<string, unknown> | null }) {
  const { today, mode } = o;
  const set = mode?.routine_set ?? 'adult';
  const since = addDays(today, -60);
  const [items, done, sessions, words, ex] = await Promise.all([
    query<Item>(env.DB_CORE, `SELECT * FROM core_body_routine_item WHERE live = 1 AND set_key = ? ORDER BY seq`, [set]),
    query<{ on_date: string; item_key: string }>(env.DB_CORE, `SELECT on_date, item_key FROM core_body_routine_done WHERE owner_ref = ? AND on_date >= ?`, [me, since]),
    query<Session>(env.DB_CORE, `SELECT id, on_date, item_key, started_at, ended_at, seconds FROM core_body_routine_session
                                  WHERE owner_ref = ? AND (on_date = ? OR ended_at IS NULL)`, [me, today]),
    routineWords(env, mode),
    mode ? query<{ on_date: string; minutes: number }>(env.DB_CORE, `SELECT on_date, minutes FROM core_body_exercise WHERE owner_ref = ? AND on_date >= ?`, [me, since])
         : Promise.resolve([] as Array<{ on_date: string; minutes: number }>),
  ]);
  const doneOn = new Map<string, Set<string>>();
  for (const r of done) doneOn.set(r.on_date, (doneOn.get(r.on_date) ?? new Set()).add(r.item_key));
  const doneToday = doneOn.get(today) ?? new Set<string>();
  const secs = new Map<string, number>();
  const running = new Map<string, { id: string; started_at: string }>();
  for (const s of sessions) {
    if (s.ended_at === null) running.set(s.item_key, { id: s.id, started_at: s.started_at });
    else if (s.on_date === today && doneToday.has(s.item_key)) secs.set(s.item_key, (secs.get(s.item_key) ?? 0) + (s.seconds ?? 0));
  }
  const secondsToday = [...secs.values()].reduce((a, b) => a + b, 0);
  // the streak: every move done (adult); the plan's goal of active minutes reached (a child's)
  const minOn = new Map<string, number>();
  for (const e of ex) minOn.set(e.on_date, (minOn.get(e.on_date) ?? 0) + (e.minutes || 0));
  const goal = Number(mode?.move_goal_min ?? 60);
  const n = streak(today, mode ? (d) => (minOn.get(d) ?? 0) >= goal : (d) => items.length > 0 && (doneOn.get(d)?.size ?? 0) >= items.length);
  const w = (k: string) => (words[k] ?? {}) as Record<string, unknown>;
  return {
    // each move's demonstration (frames, pose, gif), today's timed seconds and a session still running
    items: items.map(({ frames_json, pose_json, set_key: _set, minutes: _min, ...r }) => ({ ...r, done: doneToday.has(r.key),
      frames: frames_json ? JSON.parse(frames_json) as string[] : null, pose: pose_json ? JSON.parse(pose_json) : null,
      seconds: secs.get(r.key) ?? 0, running: running.get(r.key) ?? null })),
    done: items.filter((r) => doneToday.has(r.key)).length, total: items.length,
    streak: n,
    video_url: mode ? null : o.video?.video_url ?? null,
    video_label: mode ? null : o.video?.video_label ?? null,
    video_id: mode ? null : o.video?.video_id ?? null,
    seconds_today: secondsToday,
    seconds_line: secondsToday > 0 ? fill(w('seconds_today').label, { min: Math.max(1, Math.round(secondsToday / 60)) }) : null,
    words,
  };
}

/** The day's routine as one exercise entry, from what is done and what was timed. */
export async function logRoutineDay(env: CoreEnv, me: string, date: string, mode: Mode | null) {
  const set = mode?.routine_set ?? 'adult';
  const [rows, total, kgRow, label] = await Promise.all([
    query<{ key: string; est: number | null; secs: number | null }>(env.DB_CORE, `SELECT d.item_key AS key, i.minutes AS est,
        (SELECT SUM(s.seconds) FROM core_body_routine_session s WHERE s.owner_ref = d.owner_ref AND s.on_date = d.on_date
            AND s.item_key = d.item_key AND s.ended_at IS NOT NULL) AS secs
        FROM core_body_routine_done d JOIN core_body_routine_item i ON i.key = d.item_key AND i.set_key = ?
       WHERE d.owner_ref = ? AND d.on_date = ?`, [set, me, date]),
    queryOne<{ n: number }>(env.DB_CORE, `SELECT COUNT(*) AS n FROM core_body_routine_item WHERE live = 1 AND set_key = ?`, [set]),
    mode ? Promise.resolve(null) : queryOne<{ kg: number }>(env.DB_CORE, `SELECT kg FROM core_body_weight WHERE owner_ref = ? ORDER BY on_date DESC LIMIT 1`, [me]),
    mode ? queryOne<{ label: string }>(env.DB_CORE, `SELECT label FROM core_app_label WHERE scope = ? AND key = 'moves_line'`, [`body_ui_${mode.words ?? 'child'}`])
         : Promise.resolve(null),
  ]);
  const n = rows.length, of = total?.n ?? 0;
  const timed = rows.reduce((a, r) => a + (r.secs ?? 0), 0);
  // a move timed counts its real time; a move only ticked, the estimate
  const est = rows.filter((r) => !r.secs).reduce((a, r) => a + (mode ? (r.est ?? ADULT_EST_MIN) : ADULT_EST_MIN), 0);
  const minutes = Math.round(timed / 60 + est);
  const kcal = mode ? null : Math.round(minutes * MET * 3.5 * (kgRow?.kg ?? 100) / 200);
  const exId = `RT:${me}:${date}`;
  if (n === 0) {
    await execute(env.DB_CORE, `DELETE FROM core_body_exercise WHERE id = ?`, [exId]);
  } else {
    const title = mode ? fill(label?.label ?? '{n} of {of} moves', { n, of }) : `Daily routine · ${n} of ${of}`;
    await execute(env.DB_CORE, `INSERT INTO core_body_exercise (id, owner_ref, on_date, kind, title, minutes, kcal, note)
        VALUES (?, ?, ?, 'routine', ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET title = excluded.title, minutes = excluded.minutes, kcal = excluded.kcal`,
      [exId, me, date, title, minutes, kcal, mode ? 'logged from the moves ticked' : 'logged from the routine ticks']);
  }
  return mode ? { moves: n, of, minutes, seconds: timed } : { moves: n, of, minutes, kcal, seconds: timed };
}

export function bodyRoutineRoutes(router: Router<CoreEnv>) {
  /** The reader, the day, the mode and the whole-routine video, for an answer. */
  const ctxOf = async (env: CoreEnv, me: string) => {
    const pm = await profileMode(env, me);
    const video = pm.mode ? null : json<Record<string, unknown>>((await queryOne<{ extra_json: string | null }>(env.DB_CORE,
      `SELECT extra_json FROM core_app_label WHERE scope = 'body_ui' AND key = 'routine'`))?.extra_json, {});
    return { ...pm, today: dayOf(new Date(), pm.tz), video };
  };
  /** A move of the reader's own set only: the adult twenty, or the plan's (the kids' set). */
  const ownMove = async (env: CoreEnv, key: string, mode: Mode | null) => {
    const item = await queryOne<{ key: string; set_key: string }>(env.DB_CORE, `SELECT key, set_key FROM core_body_routine_item WHERE key = ? AND live = 1`, [key]);
    return !!item && item.set_key === (mode?.routine_set ?? 'adult');
  };
  const answer = async (env: CoreEnv, me: string, c: Awaited<ReturnType<typeof ctxOf>>, extra: Record<string, unknown>) =>
    ok({ ...extra, routine: await routineBlock(env, me, { today: c.today, mode: c.mode, video: c.video }) });

  router.post('/core/body/routine', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const me = ctx.userId;
    const b = await readJsonObject(req) ?? {};
    const key = String(b.key ?? '');
    const c = await ctxOf(env, me);
    if (!await ownMove(env, key, c.mode)) return err('bad_request', 'no such move');
    const date = c.today;
    if (b.done === false) {
      // unticked: the move's time today goes with it
      await execute(env.DB_CORE, `DELETE FROM core_body_routine_done WHERE owner_ref = ? AND on_date = ? AND item_key = ?`, [me, date, key]);
      await execute(env.DB_CORE, `DELETE FROM core_body_routine_session WHERE owner_ref = ? AND on_date = ? AND item_key = ?`, [me, date, key]);
    } else {
      await execute(env.DB_CORE, `INSERT OR IGNORE INTO core_body_routine_done (owner_ref, on_date, item_key) VALUES (?, ?, ?)`, [me, date, key]);
    }
    return answer(env, me, c, { date, key, done: b.done !== false, logged: await logRoutineDay(env, me, date, c.mode) });
  });

  router.post('/core/body/routine/start', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const me = ctx.userId;
    const b = await readJsonObject(req) ?? {};
    const key = String(b.key ?? '');
    const c = await ctxOf(env, me);
    if (!await ownMove(env, key, c.mode)) return err('bad_request', 'no such move');
    // one move timed at a time: any session still running is dropped
    await execute(env.DB_CORE, `DELETE FROM core_body_routine_session WHERE owner_ref = ? AND ended_at IS NULL`, [me]);
    const id = `RS:${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();
    await execute(env.DB_CORE, `INSERT INTO core_body_routine_session (id, owner_ref, on_date, item_key, started_at) VALUES (?, ?, ?, ?, ?)`,
      [id, me, c.today, key, now]);
    return answer(env, me, c, { session: { id, key, started_at: now } });
  });

  router.post('/core/body/routine/end', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const me = ctx.userId;
    const b = await readJsonObject(req) ?? {};
    const s = await queryOne<Session>(env.DB_CORE, `SELECT id, on_date, item_key, started_at, ended_at, seconds FROM core_body_routine_session
      WHERE id = ? AND owner_ref = ?`, [String(b.id ?? ''), me]);
    if (!s) return err('not_found', 'No move was started', 404);
    const c = await ctxOf(env, me);
    if (s.ended_at) return answer(env, me, c, { session: { id: s.id, key: s.item_key, seconds: s.seconds }, already: true });
    const seconds = Math.max(MIN_S, Math.min(MAX_S, Math.round((Date.now() - Date.parse(s.started_at)) / 1000)));
    const res = await execute(env.DB_CORE, `UPDATE core_body_routine_session SET ended_at = ?, seconds = ? WHERE id = ? AND ended_at IS NULL`,
      [new Date().toISOString(), seconds, s.id]);
    if (!res.meta.changes) return answer(env, me, c, { session: { id: s.id, key: s.item_key }, already: true });
    await execute(env.DB_CORE, `INSERT OR IGNORE INTO core_body_routine_done (owner_ref, on_date, item_key) VALUES (?, ?, ?)`, [me, s.on_date, s.item_key]);
    const logged = await logRoutineDay(env, me, s.on_date, c.mode);
    return answer(env, me, c, { session: { id: s.id, key: s.item_key, seconds }, logged });
  });

  router.post('/core/body/routine/cancel', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const me = ctx.userId;
    const b = await readJsonObject(req) ?? {};
    const res = await execute(env.DB_CORE, `DELETE FROM core_body_routine_session WHERE id = ? AND owner_ref = ? AND ended_at IS NULL`, [String(b.id ?? ''), me]);
    return answer(env, me, await ctxOf(env, me), { cancelled: !!res.meta.changes });
  });
}
