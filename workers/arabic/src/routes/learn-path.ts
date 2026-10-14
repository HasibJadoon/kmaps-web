import type { Router } from '../../../shared/src/router';
import { ok, badRequest, notFound, conflict, unauthorized } from '../../../shared/src/response';
import { query, queryOne, execute } from '../../../shared/src/db';
import { actorRef } from '../../../shared/src/auth';
import { labels, byKey, type Label } from '../lib/labels';
import type { ArabicEnv } from '../env';

// The learner's way along the learning path (AR 0043 path_rank / path_lane, 0044 ar_learner_path).
// A step is an intake item on the path. It is LOCKED until the step before it in its lane is closed,
// then OPEN; the learner STARTS it, and CLOSES it — by marking it, or, when the step holds path units
// with checks (scened episodes), only by passing every unit check at the pass mark (90%). "Today" is
// the first unclosed, unlocked step of each lane: a little of everything, every day. Words and colours
// come from ar_practice_label (scopes learn, learn_state, intake_lane), resolved here.

interface Step { id: string; title_ar: string | null; url: string; kind: string; item_count: number | null; path_rank: number;
                 path_lane: string; level: string; target_ref: string | null; external_id: string | null }
type Scopes = Record<string, Label[]>;
const fill = (t: string | null | undefined, v: Record<string, string | number>) => (t ?? '').replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));
const badge = (l: Label | undefined, key: string) => ({ key, label: l?.label ?? key, labelAr: l?.labelAr ?? null, icon: l?.icon ?? null, color: l?.color ?? null });
const word = (L: Scopes, key: string, v: Record<string, string | number> = {}) => {
  const w = byKey(L.learn).get(key);
  return { label: fill(w?.label, v), labelAr: fill(w?.labelAr, v) || null, detail: w?.detail ?? null, icon: w?.icon ?? null };
};

/** The series a step became: the pipeline's target, else the work ids the series tools give a playlist or a video. */
const seriesOf = (s: Step) => [s.target_ref, s.external_id && `ACQ:YT:${s.external_id}`, s.external_id && `ACQ:YT:V-${s.external_id}`]
  .filter((x): x is string => !!x);

export async function unitsOfStep(env: ArabicEnv, s: Step): Promise<string[]> {
  const ids = seriesOf(s);
  if (!ids.length) return [];
  const ph = ids.map(() => '?').join(',');
  const rows = await query<{ id: string }>(env.DB_AR,
    `SELECT t.id FROM ar_text_unit t JOIN ar_acquisition_ref r ON r.id = t.acq_ref_id
      WHERE (r.parent_ref IN (${ph}) OR r.id IN (${ph})) AND t.script_json IS NOT NULL AND json_valid(t.script_json)
        AND json_array_length(json_extract(t.script_json, '$.scenes')) > 0`, [...ids, ...ids]);
  return rows.map((r) => r.id);
}

/** Every episode work a step holds — what its drills are drawn from. */
export async function worksOfStep(env: ArabicEnv, intakeId: string): Promise<string[]> {
  const s = await queryOne<Step>(env.DB_AR,
    `SELECT i.*, p.target_ref FROM ar_intake_item i LEFT JOIN ar_intake_pipeline p ON p.intake_id = i.id WHERE i.id = ?`, [intakeId]);
  if (!s) return [];
  const ids = seriesOf(s);
  if (!ids.length) return [];
  const ph = ids.map(() => '?').join(',');
  return (await query<{ id: string }>(env.DB_AR,
    `SELECT id FROM ar_acquisition_ref WHERE parent_ref IN (${ph}) OR id IN (${ph})`, [...ids, ...ids])).map((r) => r.id);
}

/** Every unit with scenes, by the series (and the work) it belongs to — one read for the whole path. */
async function unitIndex(env: ArabicEnv): Promise<Map<string, string[]>> {
  const rows = await query<{ unit: string; work: string; parent: string | null }>(env.DB_AR,
    `SELECT t.id AS unit, r.id AS work, r.parent_ref AS parent FROM ar_text_unit t JOIN ar_acquisition_ref r ON r.id = t.acq_ref_id
      WHERE t.script_json IS NOT NULL AND json_valid(t.script_json) AND json_array_length(json_extract(t.script_json, '$.scenes')) > 0`);
  const by = new Map<string, string[]>();
  for (const r of rows) for (const k of [r.work, r.parent]) if (k) by.set(k, [...(by.get(k) ?? []), r.unit]);
  return by;
}

async function walk(env: ArabicEnv, me: string | null) {
  const L = await labels(env);
  const pass = byKey(L.setting).get('unit_pass_score')?.min ?? 90;
  const steps = await query<Step>(env.DB_AR,
    `SELECT i.id, i.title_ar, i.url, i.kind, i.item_count, i.path_rank, i.path_lane, i.level, i.external_id, p.target_ref
       FROM ar_intake_item i LEFT JOIN ar_intake_pipeline p ON p.intake_id = i.id
      WHERE i.parent_id IS NULL AND i.path_rank IS NOT NULL ORDER BY i.path_rank`);
  const mine = new Map(me ? (await query<{ intake_id: string; state: string; done_at: string | null }>(env.DB_AR,
    `SELECT intake_id, state, done_at FROM ar_learner_path WHERE user_id = ?`, [me])).map((r) => [r.intake_id, r]) : []);
  const scores = new Map(me ? (await query<{ unit_id: string; best_score: number | null }>(env.DB_AR,
    `SELECT unit_id, best_score FROM ar_learner_unit WHERE user_id = ?`, [me])).map((r) => [r.unit_id, r.best_score ?? 0]) : []);
  const S = byKey(L.learn_state), lanes = byKey(L.intake_lane);
  const index = await unitIndex(env);
  const prevDone = new Map<string, { done: boolean; title: string }>();
  const out = [];
  for (const s of steps) {
    const units = [...new Set(seriesOf(s).flatMap((k) => index.get(k) ?? []))];
    const passed = units.filter((u) => (scores.get(u) ?? 0) >= pass).length;
    const graded = units.length > 0;
    const marked = mine.get(s.id);
    const done = graded ? passed === units.length : marked?.state === 'done';
    const prev = prevDone.get(s.path_lane);
    const locked = !done && !!prev && !prev.done;
    const state = done ? 'done' : locked ? 'locked' : marked ? 'started' : 'open';
    prevDone.set(s.path_lane, { done, title: s.title_ar ?? '' });
    out.push({
      id: s.id, step: s.path_rank, title: s.title_ar ?? s.url, url: s.url, episodes: s.item_count ?? 1, level: s.level,
      lane: badge(lanes.get(s.path_lane), s.path_lane), state: badge(S.get(state), state),
      graded, units: units.length, passed,
      gradedLine: graded ? word(L, 'graded_progress', { passed, units: units.length }) : null,
      lockedWhy: locked ? word(L, 'locked_why', { prev: prev!.title.slice(0, 60) }) : null,
      startedAt: marked ? true : false, doneAt: marked?.done_at ?? null,
    });
  }
  return { L, pass, steps: out };
}

export function learnPathRoutes(router: Router<ArabicEnv>) {
  // The path as the learner walks it: today's steps, the lanes, every step's state, and how far along.
  router.get('/ar/learn/path', async (req, env) => {
    const me = actorRef(req);
    if (!me) return unauthorized('Sign in to walk the path');
    const { L, pass, steps } = await walk(env, me);
    const laneOrder = (L.intake_lane ?? []).map((l) => l.key);
    const today = laneOrder.map((k) => steps.find((s) => s.lane.key === k && s.state.key !== 'done' && s.state.key !== 'locked'))
      .filter((s): s is NonNullable<typeof s> => !!s && s.lane.key !== 'volume');
    const done = steps.filter((s) => s.state.key === 'done').length;
    const res = ok({
      title: word(L, 'title'), today: { ...word(L, 'today'), steps: today },
      progress: { done, total: steps.length, percent: steps.length ? Math.round((done * 100) / steps.length) : 0, ...word(L, 'progress', { done, total: steps.length }) },
      pass, graded: word(L, 'graded', { pass }),
      lanes: (L.intake_lane ?? []).map((l) => {
        const own = steps.filter((s) => s.lane.key === l.key);
        return { ...badge(l, l.key), detail: l.detail, total: own.length, done: own.filter((s) => s.state.key === 'done').length };
      }),
      states: (L.learn_state ?? []).map((l) => badge(l, l.key)),
      actions: { start: word(L, 'start'), close: word(L, 'close'), reopen: word(L, 'reopen'), practice: word(L, 'practice') },
      steps,
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  });

  // Start a step, close it, or reopen it. A graded step closes only by its checks, at the pass mark.
  router.post('/ar/learn/path/:id', async (req, env, { id }) => {
    const me = actorRef(req);
    if (!me) return unauthorized('Sign in to keep your way');
    const b = await req.json().catch(() => ({})) as { state?: string; note?: string };
    if (!['started', 'done', 'reset'].includes(b.state ?? '')) return badRequest('state is started, done or reset');
    const step = await queryOne<Step>(env.DB_AR,
      `SELECT i.*, p.target_ref FROM ar_intake_item i LEFT JOIN ar_intake_pipeline p ON p.intake_id = i.id WHERE i.id = ? AND i.path_rank IS NOT NULL`, [id]);
    if (!step) return notFound(`path step ${id}`);
    if (b.state === 'reset') {
      await execute(env.DB_AR, `DELETE FROM ar_learner_path WHERE user_id = ? AND intake_id = ?`, [me, id]);
    } else {
      if (b.state === 'done') {
        const units = await unitsOfStep(env, step);
        if (units.length) {
          const L = await labels(env); const pass = byKey(L.setting).get('unit_pass_score')?.min ?? 90;
          const got = await query<{ unit_id: string }>(env.DB_AR,
            `SELECT unit_id FROM ar_learner_unit WHERE user_id = ? AND best_score >= ? AND unit_id IN (${units.map(() => '?').join(',')})`,
            [me, pass, ...units]);
          if (got.length < units.length)
            return conflict(word(L, 'not_yet', { passed: got.length, units: units.length, pass }).label);
        }
      }
      await execute(env.DB_AR,
        `INSERT INTO ar_learner_path (user_id, intake_id, state, note, done_at) VALUES (?, ?, ?, ?, ${b.state === 'done' ? "datetime('now')" : 'NULL'})
         ON CONFLICT (user_id, intake_id) DO UPDATE SET state = excluded.state, note = COALESCE(excluded.note, ar_learner_path.note),
           done_at = excluded.done_at`, [me, id, b.state, b.note ?? null]);
    }
    const { steps } = await walk(env, me);
    return ok(steps.find((s) => s.id === id) ?? null);
  });
}
