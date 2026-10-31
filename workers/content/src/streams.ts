import { query } from '../../shared/src/db';
import type { Study } from './repositories/study.repo';

/// The Week: the three streams (cm_stream), each with this week's sprint — the units pulled from its queue
/// (cm_sprint_pick), and how many are done. A pick whose unit has a study carries the study, so it opens its room.

export interface Source { module: string; path: string }

export interface Pick {
  id: string;
  unit: string;
  label: string;
  title: string | null;
  title_ar: string | null;
  ref: string | null;
  page: Source | null;
  down: Source | null;
  state: string;
  /** The study of this unit, when there is one: a tap opens its room. */
  study: string | null;
}

export interface Stream {
  key: string;
  title: string;
  title_ar: string | null;
  icon: string | null;
  accent: string | null;
  queue: Source;
  picks: Pick[];
  done: number;
}

export interface Week {
  /** The Monday it starts on, and the weeks either side. */
  start: string;
  prev: string;
  next: string;
  /** "Week of 2 Nov" and its ISO number. */
  label: string;
  number: number;
  streams: Stream[];
}

/// The Monday of the week a day falls in (UTC dates, YYYY-MM-DD).
export function mondayOf(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const back = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

function shift(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isoWeek(day: string): number {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parse(raw: string | null): Source | null {
  try { const v = raw ? JSON.parse(raw) : null; return v?.module && v?.path ? v : null; } catch { return null; }
}

export async function buildWeek(db: D1Database, day: string, studies: Study[]): Promise<Week> {
  const start = mondayOf(day);
  const [streams, picks] = await Promise.all([
    query<{ stream_key: string; title: string; title_ar: string | null; icon: string | null; accent: string | null;
      queue_module: string; queue_path: string }>(db,
      `SELECT stream_key, title, title_ar, icon, accent, queue_module, queue_path FROM cm_stream ORDER BY sort_order, stream_key`),
    query<{ pick_id: string; stream_key: string; unit: string; label: string; title: string | null; title_ar: string | null;
      ref: string | null; page_json: string | null; down_json: string | null; state: string }>(db,
      `SELECT pick_id, stream_key, unit, label, title, title_ar, ref, page_json, down_json, state FROM cm_sprint_pick
        WHERE week_start = ? ORDER BY seq, created_at`, [start]),
  ]);
  const roomOf = new Map<string, string>();
  for (const s of studies) if (s.sprint?.unit) roomOf.set(s.sprint.unit, s.doc_id);
  const d = new Date(`${start}T00:00:00Z`);
  return {
    start, prev: shift(start, -7), next: shift(start, 7),
    label: `Week of ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`, number: isoWeek(start),
    streams: streams.map((s) => {
      const mine = picks.filter((p) => p.stream_key === s.stream_key).map((p) => ({
        id: p.pick_id, unit: p.unit, label: p.label, title: p.title, title_ar: p.title_ar, ref: p.ref,
        page: parse(p.page_json), down: parse(p.down_json), state: p.state, study: roomOf.get(p.unit) ?? null,
      }));
      return { key: s.stream_key, title: s.title, title_ar: s.title_ar, icon: s.icon, accent: s.accent,
        queue: { module: s.queue_module, path: s.queue_path }, picks: mine, done: mine.filter((p) => p.state === 'done').length };
    }),
  };
}

/// The month: its weeks (each Monday that falls in it), each stream's picks in each week with how many were done,
/// and the retro notes — keep, change, try.
export interface MonthWeek { start: string; label: string; number: number }
export interface MonthStream {
  key: string; title: string; title_ar: string | null; icon: string | null; accent: string | null;
  weeks: Array<{ start: string; done: number; total: number; picks: Array<{ label: string; title: string | null; state: string }> }>;
  done: number; total: number;
}
export interface RetroNote { id: string; stream: string | null; kind: string; text: string; author: string | null; created_at: string }
export interface Month {
  month: string; label: string; prev: string; next: string;
  weeks: MonthWeek[];
  streams: MonthStream[];
  retro: RetroNote[];
}

const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export async function buildMonth(db: D1Database, month: string, names: Record<string, string> = {}): Promise<Month> {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  // the Mondays of the month: each week belongs to the month its Monday is in
  const weeks: MonthWeek[] = [];
  const d = new Date(first);
  d.setUTCDate(1 + ((8 - d.getUTCDay()) % 7));
  while (d.getUTCMonth() === m - 1) {
    const start = d.toISOString().slice(0, 10);
    weeks.push({ start, label: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`, number: isoWeek(start) });
    d.setUTCDate(d.getUTCDate() + 7);
  }
  const starts = weeks.map((w) => w.start);
  const [streams, picks, retro] = await Promise.all([
    query<{ stream_key: string; title: string; title_ar: string | null; icon: string | null; accent: string | null }>(db,
      `SELECT stream_key, title, title_ar, icon, accent FROM cm_stream ORDER BY sort_order, stream_key`),
    starts.length ? query<{ stream_key: string; week_start: string; label: string; title: string | null; state: string }>(db,
      `SELECT stream_key, week_start, label, title, state FROM cm_sprint_pick
        WHERE week_start IN (${starts.map(() => '?').join(',')}) ORDER BY seq, created_at`, starts) : Promise.resolve([]),
    query<{ retro_id: string; stream_key: string | null; kind: string; text: string; author_ref: string | null; created_at: string }>(db,
      `SELECT retro_id, stream_key, kind, text, author_ref, created_at FROM cm_sprint_retro WHERE month = ? ORDER BY created_at`, [month]),
  ]);
  const prev = new Date(Date.UTC(y, m - 2, 1)), next = new Date(Date.UTC(y, m, 1));
  return {
    month, label: `${LONG[m - 1]} ${y}`,
    prev: prev.toISOString().slice(0, 7), next: next.toISOString().slice(0, 7),
    weeks,
    streams: streams.map((s) => {
      const ws = starts.map((start) => {
        const ps = picks.filter((p) => p.stream_key === s.stream_key && p.week_start === start);
        return { start, done: ps.filter((p) => p.state === 'done').length, total: ps.length,
          picks: ps.map((p) => ({ label: p.label, title: p.title, state: p.state })) };
      });
      return { key: s.stream_key, title: s.title, title_ar: s.title_ar, icon: s.icon, accent: s.accent, weeks: ws,
        done: ws.reduce((n, w) => n + w.done, 0), total: ws.reduce((n, w) => n + w.total, 0) };
    }),
    retro: retro.map((r) => ({ id: r.retro_id, stream: r.stream_key, kind: r.kind, text: r.text,
      author: r.author_ref ? names[r.author_ref] ?? (r.author_ref === 'claude' ? 'Claude' : null) : null, created_at: r.created_at })),
  };
}
