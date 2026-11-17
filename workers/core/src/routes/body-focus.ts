// ── The focus routine (owner 2026-11-17): two goals only — weight loss and the five prayers — a daily walk, and
// today's one meal (logged by Claude). Same shape every day, one thing to do now, quick buttons only.
//
//   GET  /core/body/focus?view=today|week|month[&at=YYYY-MM-DD]   the view, laid out here; the app only draws it
//   POST /core/body/walk {minutes?}                                 today's walk, once a day
//
// A plan opts in through its body_mode row (`focus: true`, `walk: {cue, prayer, after_min, minutes}`,
// `reckon_since`); the dashboard then answers with the Today view.

import type { Router } from '../../../shared/src/router';
import { ok, err } from '../../../shared/src/response';
import { query, queryOne, execute } from '../../../shared/src/db';
import { requireAuth } from '../../../shared/src/auth';
import { readJsonObject } from '../../../shared/src/validate';
import type { CoreEnv } from '../env';
import { addDays, dayOf, profileMode, type Mode } from './body-mode';
import { focusPrayers, type FocusPrayer } from './body-prayer';

type Profile = { owner_ref: string; start_kg: number | null; start_date: string | null; goal_kg: number | null;
                 target_date: string | null; tz: string | null };

export const RATINGS = [
  { key: 'bad', label: 'Bad', khushu: 2 },
  { key: 'good', label: 'Good', khushu: 4 },
  { key: 'best', label: 'Best', khushu: 5 },
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
  'November', 'December'];
const dayLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB',
  { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const mondayOf = (d: string) => addDays(d, -((new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7));
const hhmm = (iso: string | null, tz: string) => iso
  ? new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso)) : '';

/** "in 1 h 42 m" · "in 25 m" · "now". */
export function countdown(fromMs: number, toMs: number): string {
  const m = Math.round((toMs - fromMs) / 60_000);
  if (m <= 0) return 'now';
  const h = Math.floor(m / 60), r = m % 60;
  return h ? `in ${h} h${r ? ` ${r} m` : ''}` : `in ${r} m`;
}

/** The day's line: the five prayers and the walk, in the order of the day (the walk after the prayer it follows). */
export function dayLine(prayers: FocusPrayer[], walk: Mode['walk'], walked: boolean) {
  const line: Array<Record<string, unknown>> = prayers.map((p) => ({
    kind: 'prayer', key: p.key, label: p.label, label_ar: p.label_ar, time_label: p.time_label, state: p.state,
    rating: p.rating, done: p.prayed,
  }));
  if (walk) {
    const at = Math.max(0, prayers.findIndex((p) => p.key === walk.prayer || (walk.prayer === 'dhuhr' && p.key === 'jumuah')));
    line.splice(at + 1, 0, { kind: 'walk', key: 'walk', label: `Walk · ${walk.minutes} min`, label_ar: null,
      time_label: walk.cue, state: walked ? 'done' : 'open', rating: null, done: walked });
  }
  return line;
}

/** The one thing to do now. */
export function nowOf(prayers: FocusPrayer[], walk: Mode['walk'], walked: boolean, owed: FocusPrayer | null, nowMs: number) {
  const open = prayers.find((p) => !p.prayed && (p.state === 'open' || p.state === 'in_progress'));
  if (open) {
    return { kind: 'prayer', key: open.key, label: `Pray ${open.label}`, action: 'pray',
      countdown: open.ends_at ? `until ${new Date(open.ends_at).toISOString()}` : null, ends_at: open.ends_at };
  }
  if (owed) return { kind: 'make_up', key: owed.key, label: `Make up ${owed.label}`, action: 'pray', countdown: null, ends_at: null };
  const after = walk ? prayers.find((p) => p.key === walk.prayer || (walk.prayer === 'dhuhr' && p.key === 'jumuah')) : null;
  if (walk && !walked && after?.starts_at && nowMs >= Date.parse(after.starts_at)) {
    return { kind: 'walk', key: 'walk', label: `Walk · ${walk.minutes} min`, action: 'walk', countdown: walk.cue,
      minutes: walk.minutes, ends_at: null };
  }
  const next = prayers.find((p) => !p.prayed && p.state === 'not_yet' && p.starts_at);
  if (next) {
    return { kind: 'prayer', key: next.key, label: next.label, action: null,
      countdown: countdown(nowMs, Date.parse(next.starts_at!)), ends_at: null };
  }
  return { kind: 'rest', key: null, label: 'All done for today', action: null, countdown: null, ends_at: null };
}

function weightGoal(p: Profile, weights: Array<{ on_date: string; kg: number }>) {
  if (p.start_kg == null || p.goal_kg == null) return null;
  const current = weights.length ? weights[weights.length - 1]!.kg : p.start_kg;
  const lost = p.start_kg - current, total = p.start_kg - p.goal_kg;
  const progress = total > 0 ? Math.max(0, Math.min(1, lost / total)) : 0;
  const toGo = Math.max(0, Math.round((current - p.goal_kg) * 10) / 10);
  return {
    current, start: p.start_kg, goal: p.goal_kg, to_go: toGo, progress: Math.round(progress * 1000) / 1000,
    line: `${current} kg · ${toGo} kg to go`,
    target_date: p.target_date,
    // 36 kg in six months is faster than the usual 0.5–1 kg a week: said gently, every time
    note: 'About 1.4 kg a week is fast — a doctor should know the plan.',
    weighed_on: weights.length ? weights[weights.length - 1]!.on_date : null,
  };
}

async function todayMeal(env: CoreEnv, me: string, day: string, link: (id: string) => Promise<string>) {
  const m = await queryOne<{ id: string; title: string; kcal: number; protein_g: number | null; carbs_g: number | null;
    fat_g: number | null; fibre_g: number | null; image_key: string | null; nutrients_json: string | null; eaten_at: string }>(
    env.DB_CORE, `SELECT id, title, kcal, protein_g, carbs_g, fat_g, fibre_g, image_key, nutrients_json, eaten_at
                    FROM core_body_meal WHERE owner_ref = ? AND on_date = ? ORDER BY eaten_at DESC LIMIT 1`, [me, day]);
  if (!m) return null;
  let n: Record<string, number> = {};
  try { n = m.nutrients_json ? JSON.parse(m.nutrients_json) : {}; } catch { /* none */ }
  return {
    title: m.title, kcal: m.kcal,
    basics: [
      { key: 'protein', label: 'Protein', value: m.protein_g, unit: 'g' },
      { key: 'carbs', label: 'Carbs', value: m.carbs_g, unit: 'g' },
      { key: 'fibre', label: 'Fibre', value: m.fibre_g, unit: 'g' },
      { key: 'sugar', label: 'Sugar', value: n['sugar_g'] ?? null, unit: 'g' },
      { key: 'fat', label: 'Fat', value: m.fat_g, unit: 'g' },
      { key: 'sodium', label: 'Sodium', value: n['sodium_mg'] ?? null, unit: 'mg' },
    ].filter((b) => b.value != null),
    photo: m.image_key ? await link(m.id) : null,
  };
}

/** Days in a row, back from today (or yesterday when today's is not done yet), with a walk. */
function walkRun(walked: Set<string>, today: string): number {
  let d = walked.has(today) ? today : addDays(today, -1), n = 0;
  while (walked.has(d) && n < 3650) { n++; d = addDays(d, -1); }
  return n;
}

export async function focusView(env: CoreEnv, me: string, view: 'today' | 'week' | 'month', at: string | null,
                                link: (id: string) => Promise<string>) {
  const [{ tz, mode }, profile] = await Promise.all([
    profileMode(env, me),
    queryOne<Profile>(env.DB_CORE, `SELECT owner_ref, start_kg, start_date, goal_kg, target_date, tz FROM core_body_profile WHERE owner_ref = ?`, [me]),
  ]);
  if (!profile) return null;
  const today = dayOf(new Date(), tz);
  const walk = mode?.walk;
  let from: string, to: string, label: string, prev: string | null = null, next: string | null = null;
  if (view === 'week') {
    from = mondayOf(at ?? today); to = addDays(from, 6);
    label = `Week of ${dayLabel(from).split(' ').slice(1).join(' ')}`; prev = addDays(from, -7); next = addDays(from, 7);
  } else if (view === 'month') {
    const key = (at ?? today).slice(0, 7);
    const [y, m] = key.split('-').map(Number) as [number, number];
    const first = `${key}-01`, last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    from = mondayOf(first); to = addDays(mondayOf(last), 6);
    label = `${MONTHS[m - 1]} ${y}`;
    prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10);
    next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  } else {
    from = addDays(today, -1); to = today; label = 'Today';
  }
  const histFrom = addDays(today, -400);
  const [pr, weights, walks] = await Promise.all([
    focusPrayers(env, me, view === 'today' ? addDays(today, -60) : from, view === 'today' ? addDays(today, 1) : to),
    query<{ on_date: string; kg: number }>(env.DB_CORE, `SELECT on_date, kg FROM core_body_weight WHERE owner_ref = ? ORDER BY on_date`, [me]),
    query<{ on_date: string }>(env.DB_CORE, `SELECT DISTINCT on_date FROM core_body_exercise WHERE owner_ref = ? AND kind = 'walk' AND on_date >= ?`,
      [me, histFrom]),
  ]);
  const walked = new Set(walks.map((w) => w.on_date));
  const pday = pr.pday;
  const todays = pr.days.get(pday) ?? [];
  const prayedToday = todays.filter((p) => p.prayed).length;
  const reward = [`${prayedToday} of 5 today`, pr.full_days ? `${pr.full_days} full day${pr.full_days === 1 ? '' : 's'}` : null,
    walkRun(walked, today) ? `walked ${walkRun(walked, today)} day${walkRun(walked, today) === 1 ? '' : 's'} running` : null]
    .filter(Boolean).join(' · ');
  const base = {
    mode: 'focus', view, label, prev, next, today,
    goals: {
      weight: weightGoal(profile, weights),
      prayers: { count: prayedToday, of: 5, full_days: pr.full_days, line: `${prayedToday} of 5 today` },
    },
    ratings: RATINGS, reward: { line: reward },
    walk: walk ? { cue: walk.cue, minutes: walk.minutes, prayer: walk.prayer, after_min: walk.after_min, done: walked.has(today) } : null,
    times_missing: pr.times_missing, reckoning: pr.reckoning,
  };
  if (view === 'today') {
    // the oldest farḍ still owed (missed since the fresh start), to make up before anything new
    let owed: FocusPrayer | null = null;
    for (const [d, ps] of [...pr.days.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      if (d > pday) break;
      const m = ps.find((p) => p.state === 'missed');
      if (m) { owed = m; break; }
    }
    const nowMs = pr.now.getTime();
    const now = nowOf(todays, walk, walked.has(today), owed, nowMs);
    if (now.ends_at) now.countdown = `until ${hhmm(now.ends_at, tz)}`;
    return {
      ...base, date: pday, date_label: dayLabel(pday),
      now, day: dayLine(todays, walk, walked.has(today)),
      meal: await todayMeal(env, me, today, link),
      meal_empty: 'Not logged yet · send Claude a photo',
    };
  }
  const weightOn = new Map(weights.map((w) => [w.on_date, w.kg]));
  const weeks: Array<{ start: string; days: Array<Record<string, unknown>> }> = [];
  for (let s = from; s <= to; s = addDays(s, 7)) {
    weeks.push({ start: s, days: Array.from({ length: 7 }, (_, i) => {
      const d = addDays(s, i);
      const ps = d <= pday ? (pr.days.get(d) ?? []) : [];
      return {
        date: d, day: Number(d.slice(8)), label: dayLabel(d), today: d === today,
        in_range: view === 'week' || d.slice(0, 7) === (at ?? today).slice(0, 7),
        future: d > today,
        prayers: ps.map((p) => ({ key: p.key, label: p.label, state: p.state, rating: p.rating })),
        prayed: ps.filter((p) => p.prayed).length,
        walk: walked.has(d), kg: weightOn.get(d) ?? null,
      };
    }) });
  }
  return { ...base, weeks };
}

export function bodyFocusRoutes(router: Router<CoreEnv>, link: (env: CoreEnv, id: string) => Promise<string>) {
  router.get('/core/body/focus', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const q = new URL(req.url).searchParams;
    const v = q.get('view');
    const view = v === 'week' || v === 'month' ? v : 'today';
    const at = /^\d{4}-\d{2}(-\d{2})?$/.test(q.get('at') ?? '') ? q.get('at')! : null;
    const out = await focusView(env, ctx.userId, view, at && at.length === 7 ? `${at}-01` : at, (id) => link(env, id));
    return out ? ok(out) : err('not_found', 'No plan yet', 404);
  });

  router.post('/core/body/walk', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const b = await readJsonObject(req) ?? {};
    const { tz, mode } = await profileMode(env, ctx.userId);
    const today = dayOf(new Date(), tz);
    const minutes = Number.isInteger(b.minutes) && (b.minutes as number) > 0 && (b.minutes as number) < 600
      ? b.minutes as number : mode?.walk?.minutes ?? 30;
    const had = await queryOne<{ id: string }>(env.DB_CORE,
      `SELECT id FROM core_body_exercise WHERE owner_ref = ? AND on_date = ? AND kind = 'walk'`, [ctx.userId, today]);
    if (had) return err('conflict', "Today's walk is already logged", 409);
    await execute(env.DB_CORE, `INSERT INTO core_body_exercise (id, owner_ref, on_date, kind, title, minutes) VALUES (?, ?, ?, 'walk', 'Walk', ?)`,
      [crypto.randomUUID(), ctx.userId, today, minutes]);
    return ok(await focusView(env, ctx.userId, 'today', null, (id) => link(env, id)));
  });
}
