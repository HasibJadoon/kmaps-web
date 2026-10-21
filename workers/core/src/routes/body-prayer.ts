import type { Router } from '../../../shared/src/router';
import { ok, err } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { query, queryOne, execute } from '../../../shared/src/db';
import { readJsonObject } from '../../../shared/src/validate';
import type { CoreEnv } from '../env';

// ── The prayers, as a tool to get better at them (migration 078; owner, 2026-10-21) ─────────────────────────────────
//   POST /core/body/prayer/times  {days:[{date,fajr,sunrise,dhuhr,asr,maghrib,isha}], place?}  the app's sun times
//   POST /core/body/prayer/start  {prayer, date?, qada?}         open a session (started_at now)
//   POST /core/body/prayer/end    {prayer, date?, ended_at?, rakat?, rakat_json?, khushu?, tags?, note?}  log it — final
//   POST /core/body/prayer/cancel {prayer, date?}                drop a session still running (never a logged one)
//   POST /core/body/prayer        {prayer, date?, qada?}         "prayed, no details" — final; {prayed:false} is refused
//   POST /core/body/friday        {key, done}                    a Friday sunnah ticked for the day
// Every POST answers with the whole `prayers` block, shaped here; the app only draws it.
//
// The rules (owner): a logged prayer is final. The prayer day rolls over at Fajr. Each prayer's window comes from the
// sun times the app sends and the window spec in core_app_label body_prayer; a farḍ prayer whose window has ended with
// nothing logged is missed, and stays "to make up" until it is made up (status qada). On Fridays the Friday prayer
// takes Dhuhr's place (a missed one is made up as Dhuhr). Ishraq and Tahajjud are voluntary: prayed or not, never missed.

type Label = { scope: string; key: string; label: string; label_ar: string | null; detail: string | null; icon: string | null;
               color: string | null; sort: number; extra_json: string | null };
type Row = { on_date: string; prayer: string; status: string; started_at: string | null; ended_at: string | null; minutes: number | null;
             rakat: number | null; rakat_json: string | null; khushu: number | null; tags_json: string | null; note: string | null;
             prayed_at: string | null };
type Times = { fajr: string; sunrise: string; dhuhr: string; asr: string; maghrib: string; isha: string };
type Part = { key: string; label: string; count: number; kind: string; optional?: boolean; min?: number; max?: number; qada?: boolean };
type Spec = { kind: 'fard' | 'nafl'; tone?: string; madhhab?: string; slot?: string; qada_as?: string; qada_note?: string;
              window?: { from: string; from_min?: number; to: string; to_min?: number }; parts?: Part[] };
type Word = { key: string; label: string; label_ar: string | null; detail: string | null; icon: string | null; color: string | null } & Record<string, unknown>;

export const FARD = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const NAFL = ['ishraq', 'tahajjud'];
const ALL = ['fajr', 'dhuhr', 'jumuah', 'asr', 'maghrib', 'isha', 'ishraq', 'tahajjud'];
const TIME_KEYS: Array<keyof Times> = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
const DAY = 86_400_000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const dayOf = (t: Date, tz: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(t);
const r1 = (x: number) => Math.round(x * 10) / 10;
export const isFriday = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay() === 5;
/** The farḍ slot a prayer fills: the Friday prayer fills Dhuhr's. */
export const slotOf = (p: string) => (p === 'jumuah' ? 'dhuhr' : p);
/** The five of a day, the Friday prayer in Dhuhr's place on Fridays. */
const fiveOf = (d: string) => FARD.map((k) => (k === 'dhuhr' && isFriday(d) ? 'jumuah' : k));
const fill = (t: unknown, v: Record<string, string | number>) => String(t ?? '').replace(/\{(\w+)\}/g, (_, k) => (k in v ? String(v[k]) : ''));
/** Arabic runs inside an English line set apart (first-strong isolates), so "3 وتر · +4 …" keeps its order. */
const isolate = (t: string) => t.replace(/[\u0600-\u06FF][\u0600-\u06FF\s]*[\u0600-\u06FF]|[\u0600-\u06FF]/g, (m) => `\u2068${m}\u2069`);
const json = <T>(s: string | null, fb: T): T => { try { return s ? JSON.parse(s) as T : fb; } catch { return fb; } };

async function loadWords(env: CoreEnv) {
  const labels = await query<Label>(env.DB_CORE, `SELECT scope, key, label, label_ar, detail, icon, color, sort, extra_json FROM core_app_label
    WHERE scope IN ('body_prayer', 'body_prayer_ui', 'body_prayer_part', 'body_khushu', 'body_friday') ORDER BY scope, sort`);
  const of = (scope: string) => labels.filter((l) => l.scope === scope).map((l) => ({
    key: l.key, label: l.label, label_ar: l.label_ar, detail: l.detail, icon: l.icon, color: l.color, ...json<Record<string, unknown>>(l.extra_json, {}),
  }) as Word);
  const map = (scope: string) => Object.fromEntries(of(scope).map((w) => [w.key, w]));
  const prayerRows = labels.filter((l) => l.scope === 'body_prayer');
  return {
    prayer: Object.fromEntries(prayerRows.map((l) => [l.key, { label: l.label, label_ar: l.label_ar, detail: l.detail, icon: l.icon, color: l.color }])),
    spec: Object.fromEntries(prayerRows.map((l) => [l.key, json<Spec>(l.extra_json, { kind: 'fard' })])) as Record<string, Spec>,
    ui: map('body_prayer_ui'), part: map('body_prayer_part'),
    khushu: of('body_khushu'), friday: of('body_friday'),
  };
}
type Words = Awaited<ReturnType<typeof loadWords>>;

async function profileTz(env: CoreEnv, me: string) {
  return (await queryOne<{ tz: string }>(env.DB_CORE, `SELECT tz FROM core_body_profile WHERE owner_ref = ?`, [me]))?.tz || 'Australia/Sydney';
}

async function timesFrom(env: CoreEnv, me: string, since: string) {
  const rows = await query<{ on_date: string; times_json: string }>(env.DB_CORE,
    `SELECT on_date, times_json FROM core_body_prayer_times WHERE owner_ref = ? AND on_date >= ?`, [me, since]);
  return new Map(rows.map((r) => [r.on_date, json<Times | null>(r.times_json, null)]).filter((x): x is [string, Times] => !!x[1]));
}

/** The prayer day: the calendar day, or the day before until that day's Fajr comes in. */
function prayerDayOf(now: Date, tz: string, times: Map<string, Times>): string {
  const cal = dayOf(now, tz);
  const f = times.get(cal)?.fajr;
  if (f) return now.getTime() < Date.parse(f) ? addDays(cal, -1) : cal;
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(now));
  return hour < 4 ? addDays(cal, -1) : cal;
}

/** A prayer's window on a day, from the spec and the day's (and next day's) sun times. */
function windowOf(spec: Spec, t: Times | undefined, next: Times | undefined): { starts_at: string; ends_at: string } | null {
  const w = spec.window;
  if (!w || !t) return null;
  const ref = (name: string): number | null => {
    if (name === 'fajr_next') return next ? Date.parse(next.fajr) : null;
    if (name === 'last_third') {
      if (!next) return null;
      const dusk = Date.parse(t.maghrib), dawn = Date.parse(next.fajr);
      return dawn - (dawn - dusk) / 3;
    }
    const v = (t as Record<string, string>)[name];
    return v ? Date.parse(v) : null;
  };
  const a = ref(w.from), b = ref(w.to);
  if (a === null || b === null || !isFinite(a) || !isFinite(b)) return null;
  return { starts_at: new Date(a + (w.from_min ?? 0) * 60_000).toISOString(), ends_at: new Date(b + (w.to_min ?? 0) * 60_000).toISOString() };
}

type Ctx = { me: string; tz: string; now: Date; words: Words; times: Map<string, Times>; rows: Map<string, Row>; since: string; pday: string };

async function context(env: CoreEnv, me: string): Promise<Ctx> {
  const [tz, words] = await Promise.all([profileTz(env, me), loadWords(env)]);
  const now = new Date();
  const cal = dayOf(now, tz);
  const from = addDays(cal, -70);
  const [times, rowList] = await Promise.all([
    timesFrom(env, me, from),
    query<Row>(env.DB_CORE, `SELECT on_date, prayer, status, started_at, ended_at, minutes, rakat, rakat_json, khushu, tags_json, note, prayed_at
                             FROM core_body_prayer WHERE owner_ref = ? AND on_date >= ?`, [me, from]),
  ]);
  const since = String((words.ui.reckoning as Record<string, unknown> | undefined)?.since ?? cal);
  return { me, tz, now, words, times, rows: new Map(rowList.map((r) => [`${r.on_date}|${r.prayer}`, r])), since, pday: prayerDayOf(now, tz, times) };
}

const hhmm = (iso: string | null | undefined, tz: string) => iso
  ? new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso)) : '';
const dateLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/** The row that fills a prayer's slot on a day: on Fridays, the Friday prayer or a Dhuhr made up in its place. */
function rowOf(c: Ctx, d: string, key: string): Row | undefined {
  if (slotOf(key) === 'dhuhr') return c.rows.get(`${d}|jumuah`) ?? c.rows.get(`${d}|dhuhr`);
  return c.rows.get(`${d}|${key}`);
}
const logged = (r: Row | undefined): boolean => !!r?.prayed_at;

/** A prayer's state on a day, decided here: not_yet, open, in_progress, prayed, missed (farḍ), passed (nafl). */
function stateOf(c: Ctx, d: string, key: string) {
  const spec = c.words.spec[key] ?? { kind: 'fard' };
  const win = windowOf(spec, c.times.get(d), c.times.get(addDays(d, 1)));
  const r = rowOf(c, d, key);
  const t = c.now.getTime();
  const state = logged(r) ? 'prayed'
    : r?.started_at ? 'in_progress'
    : !win ? (d < c.pday && spec.kind === 'nafl' ? 'passed' : 'open')
    : t < Date.parse(win.starts_at) ? 'not_yet'
    : t <= Date.parse(win.ends_at) ? 'open'
    : spec.kind === 'nafl' ? 'passed'
    : d >= c.since ? 'missed' : 'open';
  return { spec, win, r, state };
}

function planOf(c: Ctx, spec: Spec, onlyQada = false) {
  const parts = (spec.parts ?? []).filter((p) => !onlyQada || p.qada).map((p) => {
    const k = c.words.part[p.kind] ?? {} as Word;
    return { ...p, optional: !!p.optional, kind_label: k.label ?? p.kind, kind_label_ar: k.label_ar ?? null, kind_short: String(k.short ?? k.label ?? p.kind),
             tone: (k.tone as string | undefined) ?? null };
  });
  const req = parts.filter((p) => !p.optional);
  const opt = parts.filter((p) => p.optional);
  const line = [...req.map((p) => `${p.count} ${p.kind_short}`), ...opt.map((p) => `+${p.count} ${p.kind_short}`)].join(' · ');
  return { madhhab: spec.madhhab ?? null, parts, line: isolate(line), total: req.reduce((a, p) => a + p.count, 0) };
}

function tagWords(c: Ctx, keys: string[]) {
  return keys.map((k) => c.words.khushu.find((w) => w.key === k)).filter((w): w is Word => !!w && w.kind === 'tag')
    .map((w) => ({ key: w.key, label: w.label, icon: w.icon, tone: (w.tone as string) ?? null }));
}

function sessionOf(c: Ctx, r: Row | undefined) {
  if (!r) return null;
  const level = r.khushu ? c.words.khushu.find((w) => w.kind === 'level' && Number(w.level) === r.khushu) : undefined;
  const unit = c.words.ui.rakat_unit?.label ?? 'rakʿāt';
  const line = r.prayed_at ? [
    hhmm(r.started_at ?? r.prayed_at, c.tz),
    r.minutes !== null ? `${Math.max(1, Math.round(r.minutes))} min` : null,
    r.rakat !== null ? `${r.rakat} ${unit}` : null,
    r.khushu !== null ? `focus ${r.khushu}/5` : null,
  ].filter(Boolean).join(' · ') : null;
  const lineOut = line ? isolate(line) : null;
  return {
    status: r.status, started_at: r.started_at, ended_at: r.ended_at, prayed_at: r.prayed_at,
    minutes: r.minutes !== null ? r1(r.minutes) : null, rakat: r.rakat, rakat_json: json<Record<string, number> | null>(r.rakat_json, null),
    khushu: r.khushu, khushu_label: level?.label ?? null, tags: tagWords(c, json<string[]>(r.tags_json, [])), note: r.note,
    line: lineOut, final: !!r.prayed_at,
  };
}

function entryOf(c: Ctx, d: string, key: string) {
  const { spec, win, r, state } = stateOf(c, d, key);
  const w = c.words.prayer[key] ?? { label: key, label_ar: null, detail: null, icon: null, color: null };
  const status = logged(r) ? (spec.kind === 'nafl' ? 'prayed' : r!.status) : null;
  const stateKey = state === 'prayed' ? `state_${status}` : `state_${state}`;
  const sw = c.words.ui[stateKey] ?? c.words.ui.state_prayed;
  const time = state === 'not_yet' ? hhmm(win?.starts_at, c.tz) : state === 'open' || state === 'missed' ? hhmm(win?.ends_at, c.tz)
    : state === 'in_progress' ? hhmm(r?.started_at, c.tz) : '';
  const qadaSpec = spec.qada_as ? (c.words.spec[spec.qada_as] ?? spec) : spec;
  return {
    key, slot: slotOf(key), date: d, kind: spec.kind, ...w, tone: spec.tone ?? null,
    prayed: logged(r), state, status,
    state_label: sw ? fill(sw.label, { time }).replace(/ · until $| $/, '') : state, state_icon: sw?.icon ?? null, state_tone: (sw?.tone as string) ?? null,
    window: win ? { ...win, label: `${hhmm(win.starts_at, c.tz)} – ${hhmm(win.ends_at, c.tz)}` } : null,
    plan: planOf(c, spec),
    qada: spec.kind === 'fard' ? { as: qadaSpec === spec ? key : spec.qada_as, note: spec.qada_note ?? null, plan: planOf(c, qadaSpec, true) } : null,
    session: sessionOf(c, r),
  };
}

/** Days in a row, back from the prayer day (or the day before, if today is not done yet), on which `done` holds. */
function streak(today: string, done: (d: string) => boolean): number {
  let d = done(today) ? today : addDays(today, -1), n = 0;
  while (done(d) && n < 3650) { n++; d = addDays(d, -1); }
  return n;
}

function insightsOf(c: Ctx) {
  const ui = c.words.ui;
  const days = Array.from({ length: 30 }, (_, i) => addDays(c.pday, i - 29));
  const fard = days.flatMap((d) => FARD.map((s) => ({ d, s, r: rowOf(c, d, s) })));
  const loggedF = fard.filter((x) => logged(x.r));
  const avg = (xs: number[]) => (xs.length ? r1(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  const label = (s: string) => c.words.prayer[s]?.label ?? s;
  const bars = FARD.map((s) => {
    const rs = loggedF.filter((x) => x.s === s).map((x) => x.r as Row);
    return { key: s, label: label(s), label_ar: c.words.prayer[s]?.label_ar ?? null, tone: c.words.spec[s]?.tone ?? null,
             avg_khushu: avg(rs.filter((r) => r.khushu !== null).map((r) => r.khushu as number)),
             avg_minutes: avg(rs.filter((r) => r.minutes !== null).map((r) => r.minutes as number)), n: rs.length };
  });
  const scored = bars.filter((b) => b.avg_khushu !== null);
  const lowest = scored.length ? scored.reduce((a, b) => ((b.avg_khushu as number) < (a.avg_khushu as number) ? b : a)) : null;

  // the tags, and the prayer each comes up at most
  const counts = new Map<string, Map<string, number>>();
  for (const x of loggedF) for (const t of json<string[]>((x.r as Row).tags_json, [])) {
    const m = counts.get(t) ?? new Map<string, number>(); m.set(x.s, (m.get(x.s) ?? 0) + 1); counts.set(t, m);
  }
  const tags = [...counts.entries()].map(([k, m]) => {
    const w = c.words.khushu.find((x) => x.key === k);
    const [top, topN] = [...m.entries()].reduce((a, b) => (b[1] > a[1] ? b : a));
    return { key: k, label: w?.label ?? k, icon: w?.icon ?? null, tone: (w?.tone as string) ?? null, sign: Number(w?.sign ?? 0),
             count: [...m.values()].reduce((a, b) => a + b, 0), top_prayer: label(top), top_count: topN, tip: (w?.tip as string) ?? null };
  }).sort((a, b) => b.count - a.count);

  const worst = tags.find((t) => t.sign < 0 && t.top_count >= 2 && t.tip);
  const withKhushu = loggedF.filter((x) => (x.r as Row).khushu !== null).length;
  const takeaway = worst ? fill(worst.tip, { prayer: worst.top_prayer })
    : lowest && withKhushu >= 3 && (lowest.avg_khushu as number) < 4 ? fill(ui.takeaway_low?.label, { prayer: lowest.label, avg: String(lowest.avg_khushu) })
    : withKhushu >= 3 ? ui.takeaway_good?.label ?? '' : ui.takeaway_none?.label ?? '';

  // judged: from the first day the windows are known; a slot is judged once logged or missed
  const judged = fard.filter((x) => x.d >= c.since).map((x) => ({ ...x, st: stateOf(c, x.d, x.s).state }));
  const onTime = judged.filter((x) => logged(x.r) && x.r!.status === 'on_time').length;
  const madeUp = judged.filter((x) => logged(x.r) && x.r!.status === 'qada').length;
  const missed = judged.filter((x) => x.st === 'missed').length;
  const total = onTime + madeUp + missed;

  const trend = days.map((d) => {
    const ks = FARD.map((s) => rowOf(c, d, s)).filter((r): r is Row => logged(r) && r!.khushu !== null).map((r) => r.khushu as number);
    return { date: d, avg: avg(ks) };
  }).filter((p) => p.avg !== null);

  const week = Array.from({ length: 7 }, (_, i) => addDays(c.pday, i - 6));
  const nafl = NAFL.map((k) => ({ key: k, label: label(k), label_ar: c.words.prayer[k]?.label_ar ?? null, icon: c.words.prayer[k]?.icon ?? null,
                                  tone: c.words.spec[k]?.tone ?? null, n: week.filter((d) => logged(c.rows.get(`${d}|${k}`))).length, of: 7 }));

  // the last eight Fridays (from the latest on or before the prayer day), from the first judged day
  const back = (new Date(`${c.pday}T12:00:00Z`).getUTCDay() + 2) % 7;
  const fridays = Array.from({ length: 8 }, (_, i) => addDays(c.pday, -back - 7 * i)).filter((d) => d >= c.since);
  // a Friday not yet over is not counted against him
  const past = fridays.filter((d) => d < c.pday || logged(c.rows.get(`${d}|jumuah`)));
  const attended = past.filter((d) => logged(c.rows.get(`${d}|jumuah`))).length;
  const allMinutes = loggedF.map((x) => (x.r as Row).minutes).filter((m): m is number => m !== null);

  return {
    bars, lowest: lowest ? { key: lowest.key, label: lowest.label, avg_khushu: lowest.avg_khushu } : null,
    avg_minutes: avg(allMinutes), avg_khushu: avg(loggedF.map((x) => (x.r as Row).khushu).filter((k): k is number => k !== null)),
    takeaway, tags: tags.slice(0, 4).map(({ tip: _t, ...t }) => t), trend,
    on_time: onTime, made_up: madeUp, missed, judged: total, on_time_pct: total ? Math.round(onTime / total * 100) : null,
    nafl,
    fridays: { attended, of: past.length, line: past.length ? fill(ui.fridays?.label, { n: attended, of: past.length }) : ui.fridays_none?.label ?? '',
               days: past.map((d) => ({ date: d, label: dateLabel(d), attended: logged(c.rows.get(`${d}|jumuah`)) })) },
  };
}

/** The whole prayers block: today's five (Friday in Dhuhr's place) and the two extra, the plans, the day's state, what is
 *  owed, the Friday checklist, the insights, and the words. */
export async function prayersBlock(env: CoreEnv, me: string, c0?: Ctx) {
  const c = c0 ?? await context(env, me);
  const ui = c.words.ui;
  const d = c.pday;
  const today = fiveOf(d).map((k) => entryOf(c, d, k));
  const extra = NAFL.map((k) => entryOf(c, d, k));
  const done = today.filter((e) => e.prayed);
  const allOnTime = (day: string) => FARD.every((s) => { const r = rowOf(c, day, s); return logged(r) && r!.status === 'on_time'; });
  const n = streak(d, allOnTime);
  const complete = done.length === 5;
  const cw = complete ? (allOnTime(d) ? ui.complete : ui.complete_soft) : null;

  // owed: every farḍ missed since the first judged day, oldest first
  const owed: Array<Record<string, unknown>> = [];
  for (let day = c.since > addDays(d, -60) ? c.since : addDays(d, -60); day <= d; day = addDays(day, 1)) {
    for (const k of fiveOf(day)) {
      const e = stateOf(c, day, k);
      // missed, or being made up right now (a qaḍāʾ session still running stays in the list, with its start)
      const making = e.state === 'in_progress' && e.r?.status === 'qada';
      if (e.state !== 'missed' && !making) continue;
      const ent = entryOf(c, day, k);
      owed.push({ date: day, date_label: dateLabel(day), key: k, make_up_as: ent.qada?.as ?? k, label: ent.label, label_ar: ent.label_ar,
                  icon: ent.icon, tone: ent.tone, note: ent.qada?.note ?? null, plan: ent.qada?.plan ?? null,
                  ended_label: hhmm(e.win?.ends_at, c.tz), today: day === d, started_at: making ? e.r?.started_at ?? null : null });
    }
  }

  let friday: Record<string, unknown> | null = null;
  if (isFriday(d)) {
    const ticks = new Set((await query<{ item_key: string }>(env.DB_CORE,
      `SELECT item_key FROM core_body_friday_done WHERE owner_ref = ? AND on_date = ?`, [c.me, d])).map((r) => r.item_key));
    const items = c.words.friday.map((w) => ({ key: w.key, label: w.label, label_ar: w.label_ar, icon: w.icon, tone: (w.tone as string) ?? null, done: ticks.has(w.key) }));
    friday = { ...ui.friday, items, done: items.filter((i) => i.done).length, total: items.length };
  }

  // the dates the app should send sun times for: a week back (never before the first judged day) to tomorrow
  const missing = Array.from({ length: 9 }, (_, i) => addDays(d, i - 7)).filter((x) => x >= c.since && !c.times.has(x));
  const reck = (ui.reckoning ?? {}) as Record<string, unknown>;

  return {
    date: d, date_label: dateLabel(d), is_friday: isFriday(d),
    today, extra,
    count: done.length, of: 5,
    count_label: fill(ui.of_five?.label, { n: done.length }),
    streak: n, streak_label: fill(ui.streak?.label, { n }),
    complete: cw ? { on_time: cw === ui.complete, label: cw.label, label_ar: cw.label_ar, detail: cw.detail, icon: cw.icon, tone: (cw.tone as string) ?? 'gold' } : null,
    owed, owed_count: owed.length, owed_label: owed.length ? fill(ui.owed_count?.label, { n: owed.length }) : null,
    extra_done: extra.filter((e) => e.prayed).map((e) => e.key),
    friday,
    insights: insightsOf(c),
    khushu: {
      levels: c.words.khushu.filter((w) => w.kind === 'level').map((w) => ({ level: Number(w.level), label: w.label, detail: w.detail, icon: w.icon, tone: (w.tone as string) ?? null })),
      tags: c.words.khushu.filter((w) => w.kind === 'tag').map((w) => ({ key: w.key, label: w.label, icon: w.icon, tone: (w.tone as string) ?? null,
                                                                      sign: Number(w.sign ?? 0), only: (w.only as string[] | undefined) ?? null })),
    },
    words: ui,
    reckoning: { method: reck.method ?? 'mwl', asr: reck.asr ?? 'hanafi', since: c.since, label: ui.reckoning?.detail ?? null },
    times_missing: missing,
  };
}

/** Fard and Friday rows logged on each day, for the week chart. */
export function fardLoggedCount(rows: Array<{ prayer: string; prayed_at: string | null }>) {
  return new Set(rows.filter((r) => r.prayed_at && r.prayer !== 'ishraq' && r.prayer !== 'tahajjud').map((r) => slotOf(r.prayer))).size;
}

export function bodyPrayerRoutes(router: Router<CoreEnv>) {
  /** The date a request is about: the one sent (within the last 60 days) or the prayer day. */
  const dateFrom = (b: Record<string, unknown>, c: Ctx) =>
    typeof b.date === 'string' && ISO_DAY.test(b.date) && b.date <= c.pday && b.date >= addDays(c.pday, -60) ? b.date : c.pday;

  const out = async (env: CoreEnv, me: string, extra: Record<string, unknown> = {}) => ok({ ...extra, prayers: await prayersBlock(env, me) });

  router.post('/core/body/prayer/times', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const b = await readJsonObject(req) ?? {};
    const tz = await profileTz(env, ctx.userId);
    const cal = dayOf(new Date(), tz);
    const days = (Array.isArray(b.days) ? b.days.slice(0, 20) : []).filter((x: Record<string, unknown>) =>
      typeof x?.date === 'string' && ISO_DAY.test(x.date) && TIME_KEYS.every((k) => typeof x[k] === 'string' && isFinite(Date.parse(x[k] as string))))
      .map((x: Record<string, unknown>) => ({ date: x.date as string, times: JSON.stringify(Object.fromEntries(TIME_KEYS.map((k) => [k, new Date(x[k] as string).toISOString()]))) }));
    const place = typeof b.place === 'string' ? b.place.slice(0, 80) : null;
    // a past day's times are never rewritten: its missed prayers stay decided
    for (const x of days) {
      await execute(env.DB_CORE, `INSERT INTO core_body_prayer_times (owner_ref, on_date, times_json, place) VALUES (?, ?, ?, ?)
        ON CONFLICT (owner_ref, on_date) DO UPDATE SET times_json = excluded.times_json, place = excluded.place,
          updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE core_body_prayer_times.on_date >= ?`, [ctx.userId, x.date, x.times, place, cal]);
    }
    return out(env, ctx.userId, { saved: days.length });
  });

  router.post('/core/body/prayer/start', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const b = await readJsonObject(req) ?? {};
    const c = await context(env, ctx.userId);
    const date = dateFrom(b, c);
    let prayer = String(b.prayer ?? '');
    if (!ALL.includes(prayer)) return err('bad_request', 'No such prayer');
    const qadaAsked = b.qada === true;
    if (prayer === 'jumuah' && !isFriday(date)) return err('bad_request', 'The Friday prayer is only on Fridays');
    if (prayer === 'jumuah' && qadaAsked) prayer = 'dhuhr';           // a missed Friday prayer is made up as Dhuhr
    if (prayer === 'dhuhr' && isFriday(date) && !qadaAsked) prayer = 'jumuah';
    const kind = c.words.spec[prayer]?.kind ?? 'fard';
    if (qadaAsked && kind === 'nafl') return err('bad_request', 'Voluntary prayers are not made up');
    const shown = prayer === 'dhuhr' && isFriday(date) ? 'jumuah' : prayer;
    const { win, r, state } = stateOf(c, date, shown);
    if (logged(r)) return err('conflict', 'This prayer is already logged — a logged prayer is final', 409);
    if (r?.started_at) return out(env, ctx.userId, { started_at: r.started_at });
    if (kind === 'fard' && state === 'not_yet') return err('conflict', 'Its time has not come in yet', 409);
    const now = new Date().toISOString();
    const late = !!win && Date.parse(now) > Date.parse(win.ends_at);
    const status = kind === 'fard' && (qadaAsked || late || date < c.pday && state === 'missed') ? 'qada' : 'on_time';
    await execute(env.DB_CORE, `INSERT INTO core_body_prayer (owner_ref, on_date, prayer, status, started_at) VALUES (?, ?, ?, ?, ?)`,
      [ctx.userId, date, prayer, status, now]);
    return out(env, ctx.userId, { started_at: now, date, prayer, status });
  });

  router.post('/core/body/prayer/end', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const b = await readJsonObject(req) ?? {};
    const c = await context(env, ctx.userId);
    const date = dateFrom(b, c);
    const key = String(b.prayer ?? '');
    if (!ALL.includes(key)) return err('bad_request', 'No such prayer');
    // the running row for this slot (a Friday's Dhuhr made up sits under dhuhr)
    const r = slotOf(key) === 'dhuhr' ? rowOf(c, date, 'dhuhr') : c.rows.get(`${date}|${key}`);
    if (!r) return err('not_found', 'No prayer was started', 404);
    if (logged(r)) return err('conflict', 'This prayer is already logged — a logged prayer is final', 409);
    const start = Date.parse(r.started_at ?? new Date().toISOString());
    const nowMs = Date.now();
    const endMs = typeof b.ended_at === 'string' && isFinite(Date.parse(b.ended_at)) ? Math.min(nowMs, Math.max(start, Date.parse(b.ended_at))) : nowMs;
    const khushu = Number.isInteger(b.khushu) && (b.khushu as number) >= 1 && (b.khushu as number) <= 5 ? b.khushu as number : null;
    const known = new Set(c.words.khushu.filter((w) => w.kind === 'tag').map((w) => w.key));
    const tags = Array.isArray(b.tags) ? [...new Set(b.tags.filter((t): t is string => typeof t === 'string' && known.has(t)))] : [];
    const parts = b.rakat_json && typeof b.rakat_json === 'object' && !Array.isArray(b.rakat_json)
      ? Object.fromEntries(Object.entries(b.rakat_json as Record<string, unknown>).filter(([, v]) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 40))
      : null;
    const rakat = Number.isInteger(b.rakat) && (b.rakat as number) >= 0 && (b.rakat as number) <= 60 ? b.rakat as number
      : parts ? Object.values(parts).reduce((a: number, v) => a + (v as number), 0) : null;
    const note = typeof b.note === 'string' && b.note.trim() ? b.note.trim().slice(0, 1000) : null;
    const res = await execute(env.DB_CORE, `UPDATE core_body_prayer SET ended_at = ?, minutes = ?, rakat = ?, rakat_json = ?, khushu = ?, tags_json = ?,
        note = ?, prayed_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE owner_ref = ? AND on_date = ? AND prayer = ? AND prayed_at IS NULL`,
      [new Date(endMs).toISOString(), r1((endMs - start) / 60_000), rakat, parts ? JSON.stringify(parts) : null, khushu,
       tags.length ? JSON.stringify(tags) : null, note, ctx.userId, date, r.prayer]);
    if (!res.meta.changes) return err('conflict', 'This prayer is already logged — a logged prayer is final', 409);
    return out(env, ctx.userId, { date, prayer: r.prayer, logged: true });
  });

  router.post('/core/body/prayer/cancel', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const b = await readJsonObject(req) ?? {};
    const c = await context(env, ctx.userId);
    const date = dateFrom(b, c);
    const key = String(b.prayer ?? '');
    const r = slotOf(key) === 'dhuhr' ? rowOf(c, date, 'dhuhr') : c.rows.get(`${date}|${key}`);
    if (logged(r)) return err('conflict', 'A logged prayer is final — it cannot be cancelled', 409);
    if (r) await execute(env.DB_CORE, `DELETE FROM core_body_prayer WHERE owner_ref = ? AND on_date = ? AND prayer = ? AND prayed_at IS NULL`, [ctx.userId, date, r.prayer]);
    return out(env, ctx.userId, { date, cancelled: !!r });
  });

  // "prayed, no details": logged at once, final. Unticking is refused (owner: "Once logged cannot undo").
  router.post('/core/body/prayer', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const b = await readJsonObject(req) ?? {};
    if (b.prayed === false) return err('conflict', 'A logged prayer is final — it cannot be unticked', 409);
    const c = await context(env, ctx.userId);
    const date = dateFrom(b, c);
    let prayer = String(b.prayer ?? '');
    if (!ALL.includes(prayer)) return err('bad_request', 'No such prayer');
    const qadaAsked = b.qada === true;
    if (prayer === 'jumuah' && !isFriday(date)) return err('bad_request', 'The Friday prayer is only on Fridays');
    if (prayer === 'jumuah' && qadaAsked) prayer = 'dhuhr';
    if (prayer === 'dhuhr' && isFriday(date) && !qadaAsked) prayer = 'jumuah';
    const kind = c.words.spec[prayer]?.kind ?? 'fard';
    if (qadaAsked && kind === 'nafl') return err('bad_request', 'Voluntary prayers are not made up');
    const shown = prayer === 'dhuhr' && isFriday(date) ? 'jumuah' : prayer;
    const { win, r, state } = stateOf(c, date, shown);
    if (logged(r)) return err('conflict', 'This prayer is already logged — a logged prayer is final', 409);
    if (r?.started_at) {
      // a running session closed without details
      const start = Date.parse(r.started_at);
      await execute(env.DB_CORE, `UPDATE core_body_prayer SET ended_at = ?, minutes = ?, prayed_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
          WHERE owner_ref = ? AND on_date = ? AND prayer = ? AND prayed_at IS NULL`,
        [new Date().toISOString(), r1((Date.now() - start) / 60_000), ctx.userId, date, r.prayer]);
    } else {
      if (kind === 'fard' && state === 'not_yet') return err('conflict', 'Its time has not come in yet', 409);
      const late = !!win && Date.now() > Date.parse(win.ends_at);
      const status = kind === 'fard' && (qadaAsked || late) ? 'qada' : 'on_time';
      await execute(env.DB_CORE, `INSERT INTO core_body_prayer (owner_ref, on_date, prayer, status, prayed_at)
          VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))`, [ctx.userId, date, prayer, status]);
    }
    const rows = await query<{ prayer: string }>(env.DB_CORE, `SELECT prayer FROM core_body_prayer WHERE owner_ref = ? AND on_date = ? AND prayed_at IS NOT NULL`, [ctx.userId, date]);
    return out(env, ctx.userId, { date, prayed: rows.map((x) => x.prayer) });
  });

  router.post('/core/body/friday', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const b = await readJsonObject(req) ?? {};
    const c = await context(env, ctx.userId);
    if (!isFriday(c.pday)) return err('bad_request', 'The Friday list is for Fridays');
    const key = String(b.key ?? '');
    if (!c.words.friday.some((w) => w.key === key)) return err('bad_request', 'No such item');
    if (b.done === false) await execute(env.DB_CORE, `DELETE FROM core_body_friday_done WHERE owner_ref = ? AND on_date = ? AND item_key = ?`, [ctx.userId, c.pday, key]);
    else await execute(env.DB_CORE, `INSERT OR IGNORE INTO core_body_friday_done (owner_ref, on_date, item_key) VALUES (?, ?, ?)`, [ctx.userId, c.pday, key]);
    return ok({ prayers: await prayersBlock(env, ctx.userId, c) });
  });
}
