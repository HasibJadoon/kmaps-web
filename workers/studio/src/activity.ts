/// The Week and the Month as a view of activity: a calendar laid out by the
/// worker (weeks Monday→Sunday, every day labelled) with each day's cards —
/// the steps ticked that day and the day each unfinished episode is aimed at —
/// from every series that carries its own planner (see checklist.ts). The apps
/// only draw it; no date arithmetic happens on a device.

import { addDays, checklists, dayIn, dayLabel, type PlanEpisode, type SeriesPlan } from './checklist';

export interface ActivityCard {
  id: string;
  /// 'step' — a step ticked that day; 'plan' — a session planned for that day;
  /// 'aim' — the day an unfinished episode is aimed at (series without planned days).
  kind: 'step' | 'plan' | 'aim';
  title: string;
  sub: string;
  series: string;
  accent: string;
  done: boolean;
  episode_id: string;
}

export interface ActivityDay {
  date: string;
  day: number;
  label: string;
  /// False for the days of the previous or next month that fill a month's first and last weeks.
  in_range: boolean;
  today: boolean;
  cards: ActivityCard[];
}

export interface ActivityWeek { start: string; number: number; label: string; days: ActivityDay[] }

export interface Activity {
  mode: 'week' | 'month';
  key: string;
  label: string;
  prev: string;
  next: string;
  today: string;
  weeks: ActivityWeek[];
  count: { steps: number; planned: number };
}

export interface ActivitySeries {
  id: string;
  title: string;
  plan: SeriesPlan;
  accent: string;
  episodes: Array<PlanEpisode & { title: string }>;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October',
  'November', 'December'];

export function isoWeek(day: string): number {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
}

export function mondayOf(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return addDays(day, -((d.getUTCDay() + 6) % 7));
}

/// A card's short title: "Liberalism · 06 — Locke, Second Treatise (1689)" → "06 · Locke, Second Treatise (1689)";
/// "الجدال في آيات الله — The Charge and Its Genealogy" (session 2) → "02 · The Charge and Its Genealogy".
function shortTitle(title: string, sessionNo: number | null): string {
  const m = title.match(/·\s*(\d+(?:\.\d+)?)\s*—\s*(.+)$/);
  if (m) return `${m[1]} · ${m[2]}`;
  const tail = title.includes(' — ') ? title.split(' — ').pop()! : title;
  return sessionNo !== null ? `${String(sessionNo).padStart(2, '0')} · ${tail}` : tail;
}

function weekLabel(start: string): string {
  const end = addDays(start, 6);
  const a = new Date(`${start}T00:00:00Z`), b = new Date(`${end}T00:00:00Z`);
  return a.getUTCMonth() === b.getUTCMonth()
    ? `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`
    : `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`;
}

/// Every card of every planner series, by day (YYYY-MM-DD in the series' time zone).
export function cardsByDay(series: ActivitySeries[], now: Date): Map<string, ActivityCard[]> {
  const out = new Map<string, ActivityCard[]>();
  const push = (day: string, c: ActivityCard) => { const b = out.get(day) ?? []; b.push(c); out.set(day, b); };
  for (const s of series) {
    const titles = new Map(s.episodes.map((e) => [e.id, shortTitle(e.title, e.session_no)]));
    for (const [id, c] of checklists(s.plan, s.episodes, now)) {
      const title = titles.get(id) ?? id;
      for (const st of c.steps) {
        if (!st.done || !st.done_at) continue;
        push(dayIn(s.plan.tz, new Date(st.done_at)), {
          id: `${id}:${st.key}`, kind: 'step', title: st.label, sub: title, series: s.title,
          accent: s.accent, done: true, episode_id: id,
        });
      }
      if (c.target_on && !c.finished_on) {
        const planned = c.steps.filter((st) => st.planned_on);
        if (planned.length) {
          // a session per planned step, on its day (Mon · Wed · Fri · the Saturday shoot)
          for (const st of planned) {
            if (st.done) continue;
            push(st.planned_on!, {
              id: `${id}:${st.key}:plan`, kind: 'plan', title: st.label, sub: title, series: s.title,
              accent: s.accent, done: false, episode_id: id,
            });
          }
        } else {
          push(c.target_on, {
            id: `${id}:aim`, kind: 'aim', title, sub: `${c.done} of ${c.total}${c.up_next ? ' · up next' : ''}`,
            series: s.title, accent: s.accent, done: false, episode_id: id,
          });
        }
      }
    }
  }
  return out;
}

/// The calendar for `?week=YYYY-MM-DD` (the week that day falls in) or `?month=YYYY-MM`.
export function buildActivity(
  mode: 'week' | 'month', key: string, series: ActivitySeries[], now: Date, tz: string,
): Activity {
  const today = dayIn(tz, now);
  const cards = cardsByDay(series, now);
  let starts: string[];
  let label: string, prev: string, next: string, inRange: (d: string) => boolean;
  if (mode === 'week') {
    const start = mondayOf(key);
    starts = [start];
    label = `Week of ${dayLabel(start).split(' ').slice(1).join(' ')}`;
    prev = addDays(start, -7);
    next = addDays(start, 7);
    inRange = () => true;
  } else {
    const [y, m] = key.split('-').map(Number) as [number, number];
    const first = `${key}-01`;
    const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    starts = [];
    for (let s = mondayOf(first); s <= last; s = addDays(s, 7)) starts.push(s);
    label = `${LONG[m - 1]} ${y}`;
    prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
    next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
    inRange = (d) => d.startsWith(key);
  }
  let steps = 0, planned = 0;
  const weeks = starts.map((start) => ({
    start, number: isoWeek(start), label: weekLabel(start),
    days: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      const dayCards = (cards.get(date) ?? []).sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'step' ? -1 : 1));
      if (inRange(date)) for (const c of dayCards) { if (c.kind === 'step') steps++; else planned++; }
      return {
        date, day: Number(date.slice(8)), label: dayLabel(date), in_range: inRange(date),
        today: date === today, cards: dayCards,
      };
    }),
  }));
  return { mode, key: mode === 'week' ? starts[0]! : key, label, prev, next, today, weeks, count: { steps, planned } };
}
