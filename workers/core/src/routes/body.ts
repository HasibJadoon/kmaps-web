import type { Router } from '../../../shared/src/router';
import { ok, err } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { query, queryOne, execute } from '../../../shared/src/db';
import { readJsonObject } from '../../../shared/src/validate';
import type { CoreEnv } from '../env';
import { prayersBlock, bodyPrayerRoutes, fardLoggedCount } from './body-prayer';

// ── The personal dashboard (migration 071): weight toward a goal, one meal a day, exercise, the five prayers ─────
//   GET  /core/body/dashboard        everything the screen draws, shaped here — the app only renders it
//   POST /core/body/prayer…          the prayers' sessions, times and Friday list — routes/body-prayer.ts (migration 078)
//   GET  /core/body/img/:id?exp&sig  a meal's photo from R2, by a link the dashboard signed (images cannot send a token)
//   GET  /core/body/meals?before&limit every meal logged, newest first, a page of days at a time
//   GET  /core/body/demo/:key/:file  a routine move's demonstration: photo (R2 demo/<key>/<n>.jpg) or GIF (demo/<key>/move-<n>.gif) — public
// Private: every read is the signed-in reader's own rows. Meals, weights and exercise are written by Claude from what
// the owner sends (kmaps-resources scripts/body/log.py), never by the app.

type Label = { scope: string; key: string; parent: string | null; label: string; label_ar: string | null; detail: string | null; icon: string | null; color: string | null; sort: number; extra_json: string | null };
type RoutineItem = { key: string; seq: number; part: string; name: string; reps: number; unit: string; icon: string; tone: string | null; cue: string;
                     easier: string | null; place: string; video_url: string | null;
                     frames_json: string | null; frame_ms: number | null; pose_json: string | null; video_id: string | null; demo_source: string | null };
type Profile = { start_kg: number; start_date: string; goal_kg: number; target_date: string; plan: string; kcal_target: number | null;
                 protein_g_target: number | null; height_cm: number | null; tz: string; steps_target: number | null };
type Weight = { on_date: string; kg: number };
type Meal = { id: string; eaten_at: string; on_date: string; title: string; items_json: string | null; kcal: number; protein_g: number | null;
              carbs_g: number | null; fat_g: number | null; fibre_g: number | null; image_key: string | null; note: string | null;
              servings: number | null; nutrients_json: string | null };
type Exercise = { id: string; on_date: string; kind: string; title: string | null; minutes: number; kcal: number | null; steps: number | null; note: string | null };
type Prayer = { on_date: string; prayer: string; prayed_at: string | null };

const DAY = 86_400_000;

/** The owner's calendar day (YYYY-MM-DD) for an instant. */
function dayOf(t: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(t);
}
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);
const r1 = (x: number) => Math.round(x * 10) / 10;

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A gateway-relative link to a meal's photo, good for a day. */
async function imageLink(env: CoreEnv, id: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 86_400;
  return `/api/core/body/img/${encodeURIComponent(id)}?exp=${exp}&sig=${await hmac(env.JWT_SECRET, `body-img|${id}|${exp}`)}`;
}

/** Least squares over (day, kg): the kg a week the scale is actually moving. */
function trend(ws: Weight[]): { perWeek: number; at: (d: string) => number } | null {
  if (ws.length < 2) return null;
  const x0 = ws[0].on_date;
  const xs = ws.map((w) => daysBetween(x0, w.on_date)), ys = ws.map((w) => w.kg);
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  if (sxx === 0) return null;
  const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / sxx;
  return { perWeek: slope * 7, at: (d) => my + slope * (daysBetween(x0, d) - mx) };
}

/** Days in a row, back from today (or yesterday, if today is not done yet), on which `done` holds. */
function streak(today: string, done: (d: string) => boolean): number {
  let d = done(today) ? today : addDays(today, -1), n = 0;
  while (done(d) && n < 3650) { n++; d = addDays(d, -1); }
  return n;
}

/** A meal's full nutrition, shaped for its screen: the donut (share of calories by macro), the label table, the signed
 *  photo link. One shape for the dashboard and the meal history. */
function makeMealOut(env: CoreEnv, labels: Label[]) {
  const nutrientRows = labels.filter((l) => l.scope === 'body_nutrient' && !(l.extra_json && JSON.parse(l.extra_json).hidden));
  const macroRows = labels.filter((l) => l.scope === 'body_macro');
  const ex = (l: Label) => (l.extra_json ? JSON.parse(l.extra_json) : {}) as Record<string, number | string>;
  return async (m: Meal) => {
    const n: Record<string, number> = m.nutrients_json ? JSON.parse(m.nutrients_json) : {};
    for (const [k, v] of [['fat_g', m.fat_g], ['carbs_g', m.carbs_g], ['protein_g', m.protein_g], ['fibre_g', m.fibre_g]] as const) {
      if (typeof v === 'number') n[k] = v;
    }
    const grams: Record<string, number | null> = { protein: m.protein_g, carbs: m.carbs_g, fat: m.fat_g };
    const kcalOf = macroRows.map((r) => ({ r, k: (grams[r.key] ?? 0) * Number(ex(r).kcal_per_g ?? 4) }));
    const sumK = kcalOf.reduce((a, x) => a + x.k, 0);
    const depth = (key: string): number => { const r = nutrientRows.find((x) => x.key === key); return r?.parent ? 1 + depth(r.parent) : 0; };
    return {
      id: m.id, eaten_at: m.eaten_at, on_date: m.on_date, title: m.title, kcal: m.kcal, servings: m.servings ?? 1,
      protein_g: m.protein_g, carbs_g: m.carbs_g, fat_g: m.fat_g, fibre_g: m.fibre_g, note: m.note,
      items: m.items_json ? JSON.parse(m.items_json) : [],
      image_url: m.image_key ? await imageLink(env, m.id) : null,
      donut: kcalOf.map(({ r, k }) => ({ key: r.key, label: r.label, label_ar: r.label_ar, icon: r.icon, color: r.color,
        g: r1(grams[r.key] ?? 0), pct: sumK > 0 ? Math.round(k / sumK * 100) : 0 })),
      nutrients: nutrientRows.filter((r) => typeof n[r.key] === 'number').map((r) => {
        const e = ex(r), dv = typeof e.dv === 'number' ? e.dv : null;
        return { key: r.key, label: r.label, label_ar: r.label_ar, color: r.color, unit: String(e.unit ?? 'g'), amount: r1(n[r.key]),
                 dv_pct: dv ? Math.round(n[r.key] / dv * 100) : null, depth: depth(r.key) };
      }),
    };
  };
}

export function bodyRoutes(router: Router<CoreEnv>) {
  bodyPrayerRoutes(router);
  router.get('/core/body/dashboard', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const me = ctx.userId;
    const [labels, profile] = await Promise.all([
      query<Label>(env.DB_CORE, `SELECT scope, key, parent, label, label_ar, detail, icon, color, sort, extra_json FROM core_app_label
                                  WHERE scope IN ('body_ui', 'body_prayer', 'body_exercise', 'body_nutrient', 'body_macro', 'body_weight') ORDER BY scope, sort`),
      queryOne<Profile>(env.DB_CORE, `SELECT * FROM core_body_profile WHERE owner_ref = ?`, [me]),
    ]);
    const word = (scope: string) => Object.fromEntries(labels.filter((l) => l.scope === scope).map((l) =>
      [l.key, { label: l.label, label_ar: l.label_ar, detail: l.detail, icon: l.icon, color: l.color,
                ...(l.extra_json ? JSON.parse(l.extra_json) : {}) }]));
    const ui = word('body_ui'), kindWords = word('body_exercise'), weightWords = word('body_weight');
    if (!profile) return ok({ ready: false, ui });

    const tz = profile.tz || 'Australia/Sydney';
    const now = new Date();
    const today = dayOf(now, tz);
    const since = addDays(today, -60);
    const [weights, meals, exercise, prayers, routine, routineDone, steps] = await Promise.all([
      query<Weight>(env.DB_CORE, `SELECT on_date, kg FROM core_body_weight WHERE owner_ref = ? ORDER BY on_date`, [me]),
      query<Meal>(env.DB_CORE, `SELECT * FROM core_body_meal WHERE owner_ref = ? AND on_date >= ? ORDER BY eaten_at DESC`, [me, since]),
      query<Exercise>(env.DB_CORE, `SELECT * FROM core_body_exercise WHERE owner_ref = ? AND on_date >= ? ORDER BY created_at DESC`, [me, since]),
      query<Prayer>(env.DB_CORE, `SELECT on_date, prayer, prayed_at FROM core_body_prayer WHERE owner_ref = ? AND on_date >= ?`, [me, since]),
      query<RoutineItem>(env.DB_CORE, `SELECT * FROM core_body_routine_item WHERE live = 1 ORDER BY seq`),
      query<{ on_date: string; item_key: string }>(env.DB_CORE, `SELECT on_date, item_key FROM core_body_routine_done WHERE owner_ref = ? AND on_date >= ?`, [me, since]),
      query<{ on_date: string; steps: number; km: number | null }>(env.DB_CORE, `SELECT on_date, steps, km FROM core_body_steps WHERE owner_ref = ? AND on_date >= ?`, [me, addDays(today, -370)]),
    ]);

    // ── weight: where it is, the plan's line, the pace needed and the pace kept ──
    const series = weights.length ? weights : [{ on_date: profile.start_date, kg: profile.start_kg }];
    const current = series[series.length - 1].kg;
    const span = Math.max(1, daysBetween(profile.start_date, profile.target_date));
    const planAt = (d: string) => profile.start_kg + (profile.goal_kg - profile.start_kg) * Math.min(1, Math.max(0, daysBetween(profile.start_date, d) / span));
    const recent = series.filter((w) => w.on_date >= addDays(today, -28));
    const t = trend(recent.length >= 2 ? recent : series);
    const daysLeft = Math.max(0, daysBetween(today, profile.target_date));
    const needed = daysLeft > 0 ? (profile.goal_kg - current) / daysLeft * 7 : 0;
    const eta = t && t.perWeek < -0.01 ? addDays(today, Math.ceil((profile.goal_kg - current) / (t.perWeek / 7))) : null;
    const lost = profile.start_kg - current, total = profile.start_kg - profile.goal_kg;

    // ── one meal a day ──
    const byDay = new Map<string, Meal[]>();
    for (const m of meals) byDay.set(m.on_date, [...(byDay.get(m.on_date) ?? []), m]);
    const todays = byDay.get(today) ?? [];
    const last = meals[0];
    const fastingHours = last ? Math.max(0, r1((now.getTime() - Date.parse(last.eaten_at)) / 3_600_000)) : null;
    const sum = (ms: Meal[], k: keyof Meal) => ms.reduce((a, m) => a + (Number(m[k]) || 0), 0);
    const kcalToday = sum(todays, 'kcal');
    const target = profile.kcal_target ?? null;
    const exToday = exercise.filter((e) => e.on_date === today);
    const burned = exToday.reduce((a, e) => a + (e.kcal ?? 0), 0);

    const mealOut = makeMealOut(env, labels);

    // ── the daily limit: a ceiling to stay under (owner, 2026-10-21), and enough protein; words and thresholds from
    //    core_app_label body_ui kcal_* (migration 077) ──
    const fill = (t: unknown, v: Record<string, string | number>) =>
      String(t ?? '').replace(/\{(\w+)\}/g, (_, k) => (k in v ? (typeof v[k] === 'number' ? Number(v[k]).toLocaleString('en-GB') : String(v[k])) : ''));
    const limitWord = (ui.kcal_limit ?? {}) as Record<string, unknown>;
    const tooLowPct = Number(limitWord.too_low_pct ?? 55), eveningHour = Number(limitWord.evening_hour ?? 18);
    const localHour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(now));
    const proteinToday = sum(todays, 'protein_g');
    const proteinTarget = profile.protein_g_target ?? null;
    const kcalStatus = !target ? null
      : kcalToday > target ? 'over'
      : todays.length > 0 && localHour >= eveningHour && kcalToday < target * tooLowPct / 100 ? 'too_low' : 'under';
    const statusWord = kcalStatus ? (ui[`kcal_${kcalStatus}`] ?? {}) as Record<string, unknown> : null;
    const vars = { target: target ?? 0, left: Math.max(0, (target ?? 0) - kcalToday), over: Math.max(0, kcalToday - (target ?? 0)),
                   protein: proteinTarget ?? 0 };
    const proteinWord = (ui.protein_goal ?? {}) as Record<string, unknown>;
    const limit = target ? {
      kcal_left: Math.max(0, target - kcalToday), kcal_over: Math.max(0, kcalToday - target), kcal_status: kcalStatus,
      status_text: statusWord ? fill(statusWord.label, vars) : null, status_icon: statusWord?.icon ?? null, status_tone: statusWord?.tone ?? null,
      protein_g: r1(proteinToday), protein_target: proteinTarget, protein_left: proteinTarget ? r1(Math.max(0, proteinTarget - proteinToday)) : null,
      protein_text: proteinTarget ? fill(proteinWord.label, { target: proteinTarget }) : null,
      protein_detail: proteinTarget ? fill(proteinWord.detail, { left: r1(Math.max(0, proteinTarget - proteinToday)) }) : null,
      line: fill(limitWord.label, vars), line_icon: limitWord.icon ?? null,
    } : null;

    // macros of today's meal against a simple split of the target (protein from the profile, the rest by energy)
    const p = sum(todays, 'protein_g'), c = sum(todays, 'carbs_g'), f = sum(todays, 'fat_g');
    const pT = profile.protein_g_target ?? (target ? Math.round(target * 0.3 / 4) : null);
    const macros = [
      { key: 'protein', label: 'Protein', g: r1(p), target: pT, color: '#E07A5F', icon: 'bolt.heart.fill' },
      { key: 'carbs', label: 'Carbs', g: r1(c), target: target ? Math.round(target * 0.35 / 4) : null, color: '#F2CC8F', icon: 'leaf.fill' },
      { key: 'fat', label: 'Fat', g: r1(f), target: target ? Math.round(target * 0.35 / 9) : null, color: '#81B29A', icon: 'drop.fill' },
    ];

    // ── prayers ──
    // the week counts the farḍ logged each day (the Friday prayer as Dhuhr); the block itself is body-prayer.ts's
    const prayedOn = (d: string) => fardLoggedCount(prayers.filter((r) => r.on_date === d));

    // ── the week ──
    const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((d) => {
      const ms = byDay.get(d) ?? [];
      const ex = exercise.filter((e) => e.on_date === d);
      return { date: d, weekday: new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }),
               kcal: sum(ms, 'kcal'), meals: ms.length, omad: ms.length === 1,
               exercise_min: ex.reduce((a, e) => a + e.minutes, 0), prayers: prayedOn(d) };
    });

    const gallery = await Promise.all(meals.filter((m) => m.image_key).slice(0, 30).map(mealOut));

    // ── the daily routine: ten moves, ticked one by one ──
    const doneOn = new Map<string, Set<string>>();
    for (const r of routineDone) doneOn.set(r.on_date, (doneOn.get(r.on_date) ?? new Set()).add(r.item_key));
    const doneToday = doneOn.get(today) ?? new Set<string>();
    const routineOut = {
      // each move's demonstration: real photos played as a loop (frames, frame_ms), or a drawn figure (pose); its video
      items: routine.map(({ frames_json, pose_json, ...r }) => ({ ...r, done: doneToday.has(r.key),
        frames: frames_json ? JSON.parse(frames_json) as string[] : null, pose: pose_json ? JSON.parse(pose_json) : null })),
      done: routine.filter((r) => doneToday.has(r.key)).length, total: routine.length,
      streak: streak(today, (d) => routine.length > 0 && (doneOn.get(d)?.size ?? 0) >= routine.length),
      video_url: (ui.routine as Record<string, unknown> | undefined)?.video_url ?? null,
      video_label: (ui.routine as Record<string, unknown> | undefined)?.video_label ?? null,
      video_id: (ui.routine as Record<string, unknown> | undefined)?.video_id ?? null,
    };

    // ── steps, as the iPhone counted them ──
    const stepsTarget = profile.steps_target ?? 8000;
    const stepsBy = new Map(steps.map((r) => [r.on_date, r]));
    const stepsOut = {
      target: stepsTarget, today: stepsBy.get(today)?.steps ?? 0, km: stepsBy.get(today)?.km ?? null,
      week: Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((d) => ({
        date: d, weekday: new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }),
        steps: stepsBy.get(d)?.steps ?? 0 })),
      streak: streak(today, (d) => (stepsBy.get(d)?.steps ?? 0) >= stepsTarget),
      // the history, from Apple Health: ninety days day by day, a year month by month (the average day of each)
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

    // ── the journey past the goal: the healthy range for the height, the milestones on the way, each with the day the
    //    plan's line reaches it (the line carried on past the goal at the same pace for the ideal) ──
    const h2 = profile.height_cm ? (profile.height_cm / 100) ** 2 : null;
    const bmiOf = (kg: number) => (h2 ? r1(kg / h2) : null);
    const idealKg = h2 ? r1(24.9 * h2) : null, healthyMinKg = h2 ? r1(18.5 * h2) : null;
    const planDay = (kg: number) => total > 0
      ? addDays(profile.start_date, Math.round(span * (profile.start_kg - kg) / total)) : null;
    const wordOf = (k: string) => (weightWords[k] ?? {}) as Record<string, unknown>;
    const every = Number(wordOf('milestone').every ?? 10);
    const stops: Array<{ key: string; kg: number }> = [];
    for (let kg = Math.floor((profile.start_kg - 0.01) / every) * every; kg > profile.goal_kg; kg -= every) stops.push({ key: 'step', kg });
    stops.push({ key: 'goal', kg: profile.goal_kg });
    if (idealKg !== null && idealKg < profile.goal_kg) stops.push({ key: 'ideal', kg: idealKg });
    const milestones = stops.map((m, i) => ({
      key: m.key === 'step' ? `step${i}` : m.key, kind: m.key, kg: m.kg, bmi: bmiOf(m.kg),
      label: m.key === 'step' ? `${m.kg} kg` : String(wordOf(m.key).label ?? m.key),
      icon: m.key === 'step' ? (wordOf('milestone').icon ?? null) : (wordOf(m.key).icon ?? null),
      tone: m.key === 'step' ? (wordOf('milestone').tone ?? null) : (wordOf(m.key).tone ?? null),
      date: planDay(m.kg), reached: current <= m.kg,
    }));
    const mark = (k: string, kg: number | null) => kg === null ? null : ({ key: k, kg, bmi: bmiOf(kg), label: wordOf(k).label ?? k,
      icon: wordOf(k).icon ?? null, tone: wordOf(k).tone ?? null, detail: wordOf(k).detail ?? null });
    const journey = h2 ? {
      start: mark('start', profile.start_kg), now: mark('now', current), goal: mark('goal', profile.goal_kg), ideal: mark('ideal', idealKg),
      healthy: { from_kg: healthyMinKg, to_kg: idealKg, label: wordOf('healthy').label ?? 'Healthy range', detail: wordOf('healthy').detail ?? null },
    } : null;

    return ok({
      ready: true,
      ui,
      today,
      weight: {
        start_kg: profile.start_kg, goal_kg: profile.goal_kg, current_kg: current, lost_kg: r1(lost), to_go_kg: r1(current - profile.goal_kg),
        progress: total > 0 ? Math.max(0, Math.min(1, lost / total)) : 0,
        start_date: profile.start_date, target_date: profile.target_date, days_left: daysLeft,
        plan_today_kg: r1(planAt(today)), on_track: current <= planAt(today) + 0.5,
        pace_needed_kg_wk: r1(needed), pace_actual_kg_wk: t ? r1(t.perWeek) : null, eta_date: eta,
        bmi: profile.height_cm ? r1(current / (profile.height_cm / 100) ** 2) : null,
        // the healthy range for this height (BMI 18.5–24.9): its top is the "ideal" past the goal (owner, 2026-10-21)
        ideal_kg: profile.height_cm ? r1(24.9 * (profile.height_cm / 100) ** 2) : null,
        healthy_min_kg: profile.height_cm ? r1(18.5 * (profile.height_cm / 100) ** 2) : null,
        goal_bmi: profile.height_cm ? r1(profile.goal_kg / (profile.height_cm / 100) ** 2) : null,
        bmi_band: profile.height_cm ? (() => { const b = current / (profile.height_cm! / 100) ** 2;
          return b < 18.5 ? 'Under' : b < 25 ? 'Healthy' : b < 30 ? 'Overweight' : b < 35 ? 'Obese I' : b < 40 ? 'Obese II' : 'Obese III'; })() : null,
        ideal_bmi: h2 ? 24.9 : null, healthy_min_bmi: h2 ? 18.5 : null, start_bmi: bmiOf(profile.start_kg),
        weigh_ins: weights.length, last_weighed: weights.length ? weights[weights.length - 1].on_date : null,
        journey, milestones,
        words: weightWords,
        series: series.map((w) => ({ date: w.on_date, kg: w.kg })),
        plan: [{ date: profile.start_date, kg: profile.start_kg }, { date: profile.target_date, kg: profile.goal_kg }],
      },
      meal: {
        plan: profile.plan, today: await Promise.all(todays.map(mealOut)), kcal: kcalToday, kcal_target: target,
        ring: target ? Math.min(1.5, kcalToday / target) : null, macros,
        fasting_hours: fastingHours, last_meal_at: last?.eaten_at ?? null,
        omad_streak: streak(today, (d) => (byDay.get(d)?.length ?? 0) === 1),
        ...(limit ?? {}),
      },
      exercise: {
        today: exToday.map((e) => ({ ...e, icon: kindWords[e.kind]?.icon ?? kindWords.other?.icon, color: kindWords[e.kind]?.color ?? null,
                                     kind_label: kindWords[e.kind]?.label ?? e.kind })),
        minutes: exToday.reduce((a, e) => a + e.minutes, 0), kcal: burned, net_kcal: kcalToday - burned,
        active_streak: streak(today, (d) => exercise.some((e) => e.on_date === d)),
      },
      prayers: await prayersBlock(env, me),
      week,
      gallery,
      routine: routineOut,
      steps: stepsOut,
    });
  });

  // ── every meal logged, newest first, a page of days at a time (owner, 2026-10-21: "also meal history") ──
  //   GET /core/body/meals?before=YYYY-MM-DD&limit=30   days strictly before `before` (default: all), up to `limit` days
  router.get('/core/body/meals', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const me = ctx.userId;
    const url = new URL(req.url);
    const beforeQ = url.searchParams.get('before');
    const before = beforeQ && /^\d{4}-\d{2}-\d{2}$/.test(beforeQ) ? beforeQ : '9999-12-31';
    const limit = Math.max(1, Math.min(60, Number(url.searchParams.get('limit') ?? 30) || 30));
    const [labels, profile] = await Promise.all([
      query<Label>(env.DB_CORE, `SELECT scope, key, parent, label, label_ar, detail, icon, color, sort, extra_json FROM core_app_label
                                  WHERE scope IN ('body_nutrient', 'body_macro', 'body_ui') ORDER BY scope, sort`),
      queryOne<Profile>(env.DB_CORE, `SELECT * FROM core_body_profile WHERE owner_ref = ?`, [me]),
    ]);
    const dates = await query<{ on_date: string }>(env.DB_CORE,
      `SELECT DISTINCT on_date FROM core_body_meal WHERE owner_ref = ? AND on_date < ? ORDER BY on_date DESC LIMIT ?`, [me, before, limit]);
    const meals = dates.length ? await query<Meal>(env.DB_CORE,
      `SELECT * FROM core_body_meal WHERE owner_ref = ? AND on_date <= ? AND on_date >= ? ORDER BY eaten_at DESC`,
      [me, dates[0].on_date, dates[dates.length - 1].on_date]) : [];
    const mealOut = makeMealOut(env, labels);
    const target = profile?.kcal_target ?? null;
    const shaped = await Promise.all(meals.map(mealOut));
    const days = dates.map(({ on_date }) => {
      const ms = shaped.filter((m) => m.on_date === on_date);
      const t = (k: 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g') => r1(ms.reduce((a, m) => a + (Number(m[k]) || 0), 0));
      const at = new Date(`${on_date}T12:00:00Z`);
      return {
        date: on_date,
        weekday: at.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }),
        day_label: at.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }),
        month: on_date.slice(0, 7),
        month_label: at.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
        meals: ms, kcal: t('kcal'), protein_g: t('protein_g'), carbs_g: t('carbs_g'), fat_g: t('fat_g'),
        kcal_target: target, ring: target ? Math.min(1.5, t('kcal') / target) : null, omad: ms.length === 1,
      };
    });
    // the months that hold meals, for the strip that jumps between them (first page only)
    const months = beforeQ ? null : (await query<{ month: string; days: number; meals: number }>(env.DB_CORE,
      `SELECT substr(on_date, 1, 7) AS month, COUNT(DISTINCT on_date) AS days, COUNT(*) AS meals FROM core_body_meal
        WHERE owner_ref = ? GROUP BY month ORDER BY month DESC`, [me])).map((m) => ({ ...m,
          label: new Date(`${m.month}-15T12:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
          // the page that starts at this month: every day before the first of the month after it
          before: (() => { const [y, mo] = m.month.split('-').map(Number); return new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 10); })() }));
    const ui = Object.fromEntries(labels.filter((l) => l.scope === 'body_ui' && (l.key === 'meal' || l.key === 'gallery'))
      .map((l) => [l.key, { label: l.label, label_ar: l.label_ar, detail: l.detail, icon: l.icon, color: l.color }]));
    return ok({ days, months, ui, next_before: dates.length === limit ? dates[dates.length - 1].on_date : null });
  });

  router.post('/core/body/routine', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const b = await readJsonObject(req) ?? {};
    const key = String(b.key ?? '');
    const item = await queryOne<{ key: string }>(env.DB_CORE, `SELECT key FROM core_body_routine_item WHERE key = ?`, [key]);
    if (!item) return err('bad_request', 'no such move');
    const prof = await queryOne<{ tz: string }>(env.DB_CORE, `SELECT tz FROM core_body_profile WHERE owner_ref = ?`, [ctx.userId]);
    const date = dayOf(new Date(), prof?.tz || 'Australia/Sydney');
    if (b.done === false) await execute(env.DB_CORE, `DELETE FROM core_body_routine_done WHERE owner_ref = ? AND on_date = ? AND item_key = ?`, [ctx.userId, date, key]);
    else await execute(env.DB_CORE, `INSERT OR IGNORE INTO core_body_routine_done (owner_ref, on_date, item_key) VALUES (?, ?, ?)`, [ctx.userId, date, key]);

    // each tick is logged as exercise (owner, 2026-10-21: "that should log on button clicked"): one entry for the day's
    // routine, its minutes and its calories from the moves done — 1.5 min a move, MET 3.8 (moderate bodyweight work)
    // at the latest weight: kcal = MET × 3.5 × kg / 200 per minute
    const [doneRow, total, kgRow] = await Promise.all([
      queryOne<{ n: number }>(env.DB_CORE, `SELECT COUNT(*) AS n FROM core_body_routine_done WHERE owner_ref = ? AND on_date = ?`, [ctx.userId, date]),
      queryOne<{ n: number }>(env.DB_CORE, `SELECT COUNT(*) AS n FROM core_body_routine_item WHERE live = 1`),
      queryOne<{ kg: number }>(env.DB_CORE, `SELECT kg FROM core_body_weight WHERE owner_ref = ? ORDER BY on_date DESC LIMIT 1`, [ctx.userId]),
    ]);
    const n = doneRow?.n ?? 0, of = total?.n ?? 10;
    const minutes = Math.round(n * 1.5);
    const kcal = Math.round(minutes * 3.8 * 3.5 * (kgRow?.kg ?? 100) / 200);
    const exId = `RT:${ctx.userId}:${date}`;
    if (n === 0) {
      await execute(env.DB_CORE, `DELETE FROM core_body_exercise WHERE id = ?`, [exId]);
    } else {
      await execute(env.DB_CORE, `INSERT INTO core_body_exercise (id, owner_ref, on_date, kind, title, minutes, kcal, note)
          VALUES (?, ?, ?, 'routine', ?, ?, ?, 'logged from the routine ticks')
        ON CONFLICT (id) DO UPDATE SET title = excluded.title, minutes = excluded.minutes, kcal = excluded.kcal`,
        [exId, ctx.userId, date, `Daily routine · ${n} of ${of}`, minutes, kcal]);
    }
    return ok({ date, key, done: b.done !== false, logged: { moves: n, of, minutes, kcal } });
  });

  // the iPhone's own counts for the last days (Core Motion), upserted — the app sends them each time it opens
  router.post('/core/body/steps', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const b = await readJsonObject(req) ?? {};
    // up to a year and a bit at once (Apple Health's history), as one statement over the JSON. The `WHERE true` is
    // needed: in an INSERT … SELECT with an upsert, SQLite reads a bare `ON CONFLICT` as the SELECT's join and fails.
    const days = (Array.isArray(b.days) ? b.days.slice(0, 400) : []).filter((d: Record<string, unknown>) =>
      typeof d?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date as string) && typeof d.steps === 'number')
      .map((d: Record<string, unknown>) => ({ date: d.date, steps: Math.max(0, Math.round(d.steps as number)), km: typeof d.km === 'number' ? d.km : null }));
    if (days.length) {
      await execute(env.DB_CORE, `INSERT INTO core_body_steps (owner_ref, on_date, steps, km)
          SELECT ?, json_extract(value, '$.date'), json_extract(value, '$.steps'), json_extract(value, '$.km') FROM json_each(?) WHERE true
        ON CONFLICT (owner_ref, on_date) DO UPDATE SET steps = excluded.steps, km = COALESCE(excluded.km, km),
          updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')`, [ctx.userId, JSON.stringify(days)]);
    }
    const n = days.length;
    return ok({ saved: n });
  });

  // a move's demonstration photo: public-domain frames (free-exercise-db), so no signature — the app loads them as images
  router.get('/core/body/demo/:key/:file', async (_req, env, params) => {
    if (!/^[a-z0-9]+$/.test(params.key) || !/^(\d{1,2}\.jpg|move-\d{1,2}\.gif)$/.test(params.file) || !env.PERSONAL) return err('not_found', 'No frame', 404);
    const obj = await env.PERSONAL.get(`demo/${params.key}/${params.file}`);
    if (!obj) return err('not_found', 'No frame', 404);
    return new Response(obj.body, {
      headers: { 'Content-Type': obj.httpMetadata?.contentType ?? 'image/jpeg', 'Cache-Control': 'public, max-age=604800, immutable' },
    });
  });

  router.get('/core/body/img/:id', async (req, env, params) => {
    const url = new URL(req.url);
    const exp = Number(url.searchParams.get('exp') ?? 0), sig = url.searchParams.get('sig') ?? '';
    if (!exp || exp < Date.now() / 1000 || sig !== await hmac(env.JWT_SECRET, `body-img|${params.id}|${exp}`)) {
      return err('forbidden', 'This link has expired', 403);
    }
    const m = await queryOne<{ image_key: string | null }>(env.DB_CORE, `SELECT image_key FROM core_body_meal WHERE id = ?`, [params.id]);
    if (!m?.image_key || !env.PERSONAL) return err('not_found', 'No photo', 404);
    const obj = await env.PERSONAL.get(m.image_key);
    if (!obj) return err('not_found', 'No photo', 404);
    return new Response(obj.body, {
      headers: { 'Content-Type': obj.httpMetadata?.contentType ?? 'image/jpeg', 'Cache-Control': 'private, max-age=86400' },
    });
  });
}
