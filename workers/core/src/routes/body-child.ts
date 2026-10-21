import { query, queryOne, execute } from '../../../shared/src/db';
import type { CoreEnv } from '../env';
import { prayersBlock } from './body-prayer';
import { type Mode, addDays, dayOf, fill, streak, weekday } from './body-mode';

// ── The CHILD dashboard (migration 079; the owner's son, 10) ──────────────────────────────────────────────────────────
// Moving, eating well and praying — nothing about weight or calories, ever: this answer carries no weight, BMI, kcal,
// macros, fasting or "burned" field at all, so the app has nothing of the kind to draw. Its blocks:
//   plate   My plate: today's meals (photo, title, items by name only) and the six food groups he had, the week as
//           dots, one gentle tip in the evening — never a score
//   move    active minutes toward 60 (WHO / Australian guidelines, ages 5–17), the kids' moves done, the strong-body
//           days this week (3 a week), the week's minutes
//   routine the kids' set (set_key from the mode), in the adult routine's shape so the same grid draws it
//   steps   as the adult's, against the profile's target
//   prayers the five (routes/body-prayer.ts, in the child mode: nothing missed, nothing owed)
// Every word is core_app_label: body_ui_<mode.words> (never the adult body_ui), body_plate for the groups.

type Label = { scope: string; key: string; label: string; label_ar: string | null; detail: string | null; icon: string | null;
               color: string | null; sort: number; extra_json: string | null };
type Word = { label: string; label_ar: string | null; detail: string | null; icon: string | null; color: string | null } & Record<string, unknown>;
type MealRow = { id: string; eaten_at: string; on_date: string; title: string; items_json: string | null; image_key: string | null;
                 note: string | null; groups_json: string | null };
type Item = { key: string; seq: number; part: string; name: string; reps: number; unit: string; icon: string; tone: string | null; cue: string;
              easier: string | null; place: string; video_url: string | null; frames_json: string | null; frame_ms: number | null;
              pose_json: string | null; video_id: string | null; demo_source: string | null; minutes: number | null } & Record<string, unknown>;

const json = <T>(s: string | null | undefined, fb: T): T => { try { return s ? JSON.parse(s) as T : fb; } catch { return fb; } };

/** The mode's own words only (body_ui_<words>): none of the adult's — no weight, meal or calorie words reach a child. */
export function childWords(labels: Label[], mode: Mode): Record<string, Word> {
  const scope = `body_ui_${mode.words ?? 'child'}`;
  return Object.fromEntries(labels.filter((l) => l.scope === scope).map((l) =>
    [l.key, { label: l.label, label_ar: l.label_ar, detail: l.detail, icon: l.icon, color: l.color, ...json<Record<string, unknown>>(l.extra_json, {}) } as Word]));
}

/** The plate's six groups, in their order, with their words. */
function plateGroups(labels: Label[]) {
  return labels.filter((l) => l.scope === 'body_plate').sort((a, b) => a.sort - b.sort).map((l) => {
    const x = json<Record<string, unknown>>(l.extra_json, {});
    return { key: l.key, label: l.label, detail: l.detail, icon: l.icon, color: l.color, tone: (x.tone as string) ?? null,
             emoji: (x.emoji as string) ?? null, nudge: (x.nudge as string) ?? null };
  });
}

/** A meal as a child's plate: no calories, no nutrients — the photo, the title, the items by name, the groups on it. */
function makeChildMeal(groups: ReturnType<typeof plateGroups>, link: (id: string) => Promise<string>) {
  return async (m: MealRow) => {
    const keys = new Set(json<string[]>(m.groups_json, []));
    return {
      id: m.id, eaten_at: m.eaten_at, on_date: m.on_date, title: m.title, note: m.note,
      items: json<Array<{ name?: string }>>(m.items_json, []).filter((i) => i && typeof i.name === 'string').map((i) => ({ name: i.name as string })),
      image_url: m.image_key ? await link(m.id) : null,
      groups: groups.filter((g) => keys.has(g.key)).map(({ nudge: _n, detail: _d, ...g }) => g),
    };
  };
}

const MEAL_COLS = `id, eaten_at, on_date, title, items_json, image_key, note, groups_json`;

export async function childDashboard(env: CoreEnv, me: string, profile: { tz: string; steps_target: number | null }, labels: Label[],
                                     mode: Mode, link: (id: string) => Promise<string>) {
  const ui = childWords(labels, mode);
  const tz = profile.tz || 'Australia/Sydney';
  const now = new Date();
  const today = dayOf(now, tz);
  const set = mode.routine_set ?? 'kids';
  const [meals, exercise, routine, routineDone, steps] = await Promise.all([
    query<MealRow>(env.DB_CORE, `SELECT ${MEAL_COLS} FROM core_body_meal WHERE owner_ref = ? AND on_date >= ? ORDER BY eaten_at DESC`, [me, addDays(today, -60)]),
    query<{ on_date: string; minutes: number }>(env.DB_CORE, `SELECT on_date, minutes FROM core_body_exercise WHERE owner_ref = ? AND on_date >= ?`, [me, addDays(today, -60)]),
    query<Item>(env.DB_CORE, `SELECT * FROM core_body_routine_item WHERE live = 1 AND set_key = ? ORDER BY seq`, [set]),
    query<{ on_date: string; item_key: string }>(env.DB_CORE, `SELECT on_date, item_key FROM core_body_routine_done WHERE owner_ref = ? AND on_date >= ?`, [me, addDays(today, -60)]),
    query<{ on_date: string; steps: number; km: number | null }>(env.DB_CORE, `SELECT on_date, steps, km FROM core_body_steps WHERE owner_ref = ? AND on_date >= ?`, [me, addDays(today, -370)]),
  ]);
  const week7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const w = (k: string) => (ui[k] ?? {}) as Word;
  const line = (k: string, v: Record<string, string | number> = {}) => ({ text: fill(w(k).label, v), icon: w(k).icon ?? null, tone: (w(k).tone as string) ?? null });

  // ── My plate ──
  const groups = plateGroups(labels);
  const childMeal = makeChildMeal(groups, link);
  const byDay = new Map<string, MealRow[]>();
  for (const m of meals) byDay.set(m.on_date, [...(byDay.get(m.on_date) ?? []), m]);
  const keysOn = (d: string) => new Set((byDay.get(d) ?? []).flatMap((m) => json<string[]>(m.groups_json, [])));
  const todays = byDay.get(today) ?? [];
  const had = keysOn(today);
  const n = groups.filter((g) => had.has(g.key)).length;
  const localHour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(now));
  const missing = groups.find((g) => !had.has(g.key));
  const tip = w('plate_nudge');
  const plate = {
    today: await Promise.all(todays.map(childMeal)),
    groups: groups.map(({ nudge: _n, ...g }) => ({ ...g, had: had.has(g.key) })),
    had: n, of: groups.length,
    line: !todays.length ? line('plate_empty') : n === groups.length ? line('plate_all') : line('plate_had', { n, of: groups.length }),
    // one gentle tip, in the evening, once a meal is in: the first group not had today
    tip: todays.length && missing?.nudge && localHour >= Number(tip.from_hour ?? 17)
      ? { label: tip.label, text: missing.nudge, icon: tip.icon ?? null, tone: (tip.tone as string) ?? null, emoji: missing.emoji } : null,
    week: week7.map((d) => ({ date: d, weekday: weekday(d), meals: (byDay.get(d) ?? []).length, groups: groups.filter((g) => keysOn(d).has(g.key)).map((g) => g.key) })),
    gallery: await Promise.all(meals.filter((m) => m.image_key).slice(0, 30).map(childMeal)),
  };

  // ── Move: active minutes toward the goal, the moves, the strong-body days ──
  const goal = Number(mode.move_goal_min ?? 60);
  const minOn = new Map<string, number>();
  for (const e of exercise) minOn.set(e.on_date, (minOn.get(e.on_date) ?? 0) + (e.minutes || 0));
  const doneOn = new Map<string, Set<string>>();
  for (const r of routineDone) doneOn.set(r.on_date, (doneOn.get(r.on_date) ?? new Set()).add(r.item_key));
  const doneToday = doneOn.get(today) ?? new Set<string>();
  const minutes = Math.round(minOn.get(today) ?? 0);
  const strongKeys = new Set(routine.filter((r) => (mode.strength_parts ?? []).includes(r.part)).map((r) => r.key));
  const strongDays = week7.filter((d) => [...(doneOn.get(d) ?? [])].some((k) => strongKeys.has(k))).length;
  const strengthGoal = Number(mode.strength_days ?? 3);
  const movesDone = routine.filter((r) => doneToday.has(r.key)).length;
  const moveStreak = streak(today, (d) => (minOn.get(d) ?? 0) >= goal);
  const move = {
    goal_min: goal, minutes, left: Math.max(0, goal - minutes), progress: goal > 0 ? Math.min(1, minutes / goal) : 0, reached: minutes >= goal,
    line: line('move_goal', { min: minutes, goal }),
    status: minutes >= goal ? line('move_reached') : line('move_left', { left: Math.max(0, goal - minutes) }),
    detail: w('move_goal').detail ?? null,
    moves_done: movesDone, moves_total: routine.length, moves_line: line('moves_line', { n: movesDone, of: routine.length }),
    streak: moveStreak, streak_line: line('move_streak', { n: moveStreak }),
    strength: { days: strongDays, goal: strengthGoal, ...line('strength', { n: strongDays, goal: strengthGoal }), detail: w('strength').detail ?? null },
    week_label: w('move_week').label ?? null,
    week: week7.map((d) => ({ date: d, weekday: weekday(d), minutes: Math.round(minOn.get(d) ?? 0) })),
  };

  // the kids' moves, in the adult routine's shape (the same grid draws them)
  const routineOut = {
    items: routine.map(({ frames_json, pose_json, ...r }) => ({ ...r, done: doneToday.has(r.key),
      frames: frames_json ? JSON.parse(frames_json) as string[] : null, pose: pose_json ? JSON.parse(pose_json) : null })),
    done: movesDone, total: routine.length, streak: moveStreak,
    video_url: null, video_label: null, video_id: null,
  };

  // ── steps, as the iPhone counted them ──
  const stepsTarget = profile.steps_target ?? 8000;
  const stepsBy = new Map(steps.map((r) => [r.on_date, r]));
  const stepsOut = {
    target: stepsTarget, today: stepsBy.get(today)?.steps ?? 0, km: stepsBy.get(today)?.km ?? null,
    week: week7.map((d) => ({ date: d, weekday: weekday(d), steps: stepsBy.get(d)?.steps ?? 0 })),
    streak: streak(today, (d) => (stepsBy.get(d)?.steps ?? 0) >= stepsTarget),
    history: Array.from({ length: 90 }, (_, i) => addDays(today, i - 89)).map((d) => ({ date: d, steps: stepsBy.get(d)?.steps ?? 0 })),
    months: (() => {
      const out: Array<{ month: string; label: string; avg: number; total: number; days: number }> = [];
      const [y, m] = today.split('-').map(Number);
      for (let k = 11; k >= 0; k--) {
        const dt = new Date(Date.UTC(y, m - 1 - k, 1));
        const key = dt.toISOString().slice(0, 7);
        const rows = steps.filter((r) => r.on_date.startsWith(key) && r.steps > 0);
        const total = rows.reduce((a, r) => a + r.steps, 0);
        out.push({ month: key, label: dt.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }),
                   avg: rows.length ? Math.round(total / rows.length) : 0, total, days: rows.length });
      }
      return out;
    })(),
    best: steps.reduce((b, r) => (r.steps > (b?.steps ?? 0) ? { date: r.on_date, steps: r.steps } : b), null as null | { date: string; steps: number }),
  };

  return { ready: true, mode: 'child', ui, today, plate, move, routine: routineOut, steps: stepsOut, prayers: await prayersBlock(env, me) };
}

/** The meal history for a child: days of plates, no calories. */
export async function childMealsPage(env: CoreEnv, me: string, labels: Label[], before: string, limit: number, first: boolean,
                                     link: (id: string) => Promise<string>, mode: Mode) {
  const groups = plateGroups(labels);
  const childMeal = makeChildMeal(groups, link);
  const dates = await query<{ on_date: string }>(env.DB_CORE,
    `SELECT DISTINCT on_date FROM core_body_meal WHERE owner_ref = ? AND on_date < ? ORDER BY on_date DESC LIMIT ?`, [me, before, limit]);
  const meals = dates.length ? await query<MealRow>(env.DB_CORE,
    `SELECT ${MEAL_COLS} FROM core_body_meal WHERE owner_ref = ? AND on_date <= ? AND on_date >= ? ORDER BY eaten_at DESC`,
    [me, dates[0].on_date, dates[dates.length - 1].on_date]) : [];
  const shaped = await Promise.all(meals.map(childMeal));
  const days = dates.map(({ on_date }) => {
    const ms = shaped.filter((m) => m.on_date === on_date);
    const keys = new Set(ms.flatMap((m) => m.groups.map((g) => g.key)));
    const at = new Date(`${on_date}T12:00:00Z`);
    return { date: on_date, weekday: weekday(on_date),
             day_label: at.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }),
             meals: ms, groups: groups.filter((g) => keys.has(g.key)).map((g) => g.key), had: keys.size, of: groups.length };
  });
  const ui = childWords(labels, mode);
  return { mode: 'child', days, months: first ? [] : null, ui: { plate: ui.plate ?? null, plate_gallery: ui.plate_gallery ?? null },
           next_before: dates.length === limit ? dates[dates.length - 1].on_date : null };
}

/** A tick of a kids' move: the day's routine logged as one exercise entry of the moves' own minutes — no calories. */
export async function logChildRoutine(env: CoreEnv, me: string, date: string, mode: Mode) {
  const set = mode.routine_set ?? 'kids';
  const [row, total, words] = await Promise.all([
    queryOne<{ n: number; mins: number | null }>(env.DB_CORE, `SELECT COUNT(*) AS n, SUM(COALESCE(i.minutes, 1.5)) AS mins
        FROM core_body_routine_done d JOIN core_body_routine_item i ON i.key = d.item_key AND i.set_key = ?
       WHERE d.owner_ref = ? AND d.on_date = ?`, [set, me, date]),
    queryOne<{ n: number }>(env.DB_CORE, `SELECT COUNT(*) AS n FROM core_body_routine_item WHERE live = 1 AND set_key = ?`, [set]),
    queryOne<{ label: string }>(env.DB_CORE, `SELECT label FROM core_app_label WHERE scope = ? AND key = 'moves_line'`, [`body_ui_${mode.words ?? 'child'}`]),
  ]);
  const n = row?.n ?? 0, of = total?.n ?? 0, minutes = Math.round(row?.mins ?? 0);
  const exId = `RT:${me}:${date}`;
  if (n === 0) {
    await execute(env.DB_CORE, `DELETE FROM core_body_exercise WHERE id = ?`, [exId]);
  } else {
    await execute(env.DB_CORE, `INSERT INTO core_body_exercise (id, owner_ref, on_date, kind, title, minutes, kcal, note)
        VALUES (?, ?, ?, 'routine', ?, ?, NULL, 'logged from the moves ticked')
      ON CONFLICT (id) DO UPDATE SET title = excluded.title, minutes = excluded.minutes, kcal = NULL`,
      [exId, me, date, fill(words?.label ?? '{n} of {of} moves', { n, of }), minutes]);
  }
  return { moves: n, of, minutes };
}
