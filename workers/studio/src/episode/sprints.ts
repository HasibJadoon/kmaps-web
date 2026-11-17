/// The phone's sprint cards: one per planner series — its episode in hand, the step for now, how much Claude has
/// prepared and how much is logged. The card in hand today (a step due today, the most recent log first) is the one
/// being studied; a tap opens that episode's hub.

import type { EpisodeCtx } from './context';
import { shortCite } from './focus';
import { minutesLabel, stepViews } from './steps';
import { splitTitle, str } from './text';
import { angleOf, groupLabel, placeOf } from './curriculum';

export interface SprintCard {
  episode_id: string;
  series: string | null;
  accent: string | null;
  path: string[];
  title_en: string;
  title_ar: string | null;
  number: number | null;
  subtitle: string | null;
  now: { title: string; day: number; cue: string | null; when: string | null; color: string; icon: string } | null;
  ready: number;
  logged: { done: number; of: number };
  /// Minutes studied on the episode so far, against the minutes its steps plan.
  studied: { minutes: number; of: number; label: string };
  last_logged: string | null;
  studying: boolean;
  /// Every passage of the series is recorded (a finished sūra / arc): shown as a small done tile.
  done: boolean;
  /// Round · cluster · angle, when the series is a curriculum.
  place?: ReturnType<typeof placeOf>;
  /// Every passage of the series as a tile (P01 … P20; Liberalism by reading part), for the phone's grid.
  tiles: SprintTile[];
}

export interface SprintTile { id: string; label: string; title: string; group: string | null; state: 'now' | 'done' | 'active' | 'queued'; angle_color: string | null }
type TileRow = { id: string; session_no: number | null; title: string; state: string | null; round?: number | null; cluster?: number | null; angle?: string | null; toc?: string | null };

/// The series' passages in order, each a tile: the one in hand lit, recorded ones done. A Liberalism part is grouped
/// under its reading ("06 · Locke").
export function sprintTiles(order: TileRow[], activeId: string, seriesMeta: Record<string, unknown> = {}): SprintTile[] {
  return order.filter((e) => !e.id.endsWith(':slides') && e.state)
    .sort((a, b) => (a.session_no ?? 0) - (b.session_no ?? 0) || a.id.localeCompare(b.id, 'en', { numeric: true }))
    .map((e) => {
      const tail = e.id.split(':').pop() ?? e.id;
      const part = tail.match(/^R(\d+)\.(\d+)$/);
      const lc = tail.match(/^L\d(\d\d)\.(\d+)$/);
      const label = lc ? `${lc[1]}.${lc[2]}` : part ? `${part[1]}.${part[2]}` : /^R\d/.test(tail) ? tail.slice(1) : tail;
      const t = e.toc ?? splitTitle(e.title).en;   // the contents line the builder writes, when there is one
      const group = groupLabel(e, seriesMeta) ?? (/^R\d/.test(tail) ? `${(part?.[1] ?? tail.slice(1))} · ${t.split(' · ')[0]}` : null);
      const state = e.id === activeId ? 'now' : e.state === 'done' ? 'done' : e.state === 'active' ? 'active' : 'queued';
      return { id: e.id, label, title: t, group, state, angle_color: angleOf(seriesMeta, e.angle)?.color ?? null };
    });
}

export function sprintCard(ctx: EpisodeCtx, seriesMeta: Record<string, unknown>, order: TileRow[] = []): SprintCard {
  const t = splitTitle(ctx.title);
  const steps = stepViews(ctx);
  const have = steps.reduce((n, s) => n + s.prepared.have, 0), total = steps.reduce((n, s) => n + s.prepared.total, 0);
  const now = steps.find((s) => s.state === 'now');
  // the latest touch: a tick from before, or study time
  const studyAt = typeof ctx.meta['study_at'] === 'string' ? ctx.meta['study_at'] as string : '';
  const last = [...ctx.checklist.steps.map((s) => s.done_at ?? ''), studyAt].filter(Boolean).sort().pop() ?? null;
  const planned = ctx.plan.steps.reduce((n, d) => n + (d.minutes ?? 0), 0);
  const path = Array.isArray(seriesMeta['path']) ? (seriesMeta['path'] as unknown[]).map(str).filter((x): x is string => !!x) : [];
  return {
    episode_id: ctx.id, series: ctx.series_title, accent: str(seriesMeta['accent']), path,
    title_en: t.en, title_ar: t.ar, number: ctx.session_no,
    subtitle: [ctx.series_title, shortCite(ctx)].filter(Boolean).join(' · ') || null,
    now: now ? { title: now.title, day: now.day, cue: now.cue, when: now.when, color: now.color, icon: now.icon } : null,
    ready: total ? Math.round((have / total) * 100) : 0,
    logged: { done: steps.filter((s) => s.state === 'done').length, of: steps.length },
    studied: { minutes: Math.round(ctx.checklist.studied / 60), of: planned, label: minutesLabel(ctx.checklist.studied) },
    last_logged: last, studying: false, done: false, tiles: sprintTiles(order, ctx.id, seriesMeta),
    place: placeOf(ctx.meta, seriesMeta),
  };
}

/// Mark the one in hand (a step due today, then the most recent log) as being studied, and order the cards by domain —
/// Worldview, then the Qurʾān (owner 2026-11-17: "1 – WV, 2 – Qurʾān").
export function rankSprints(cards: SprintCard[]): SprintCard[] {
  const today = (c: SprintCard) => (c.now?.when === 'today' ? 1 : 0);
  const hand = [...cards].sort((a, b) => today(b) - today(a) || (b.last_logged ?? '').localeCompare(a.last_logged ?? ''))[0];
  const domain = (c: SprintCard) => { const d = (c.path[0] ?? '').toLowerCase(); return d.startsWith('world') ? 0 : d.startsWith('qur') ? 1 : 2; };
  return [...cards].sort((a, b) => domain(a) - domain(b) || (a.series ?? '').localeCompare(b.series ?? ''))
    .map((c) => (c === hand && c.now ? { ...c, studying: true } : c));
}

/// A finished series (every passage recorded): a done tile on its domain's grid; it still opens its passages.
export function doneCard(ser: { id: string; title: string }, seriesTitle: string | null, seriesMeta: Record<string, unknown>,
  order: TileRow[]): SprintCard {
  const path = Array.isArray(seriesMeta['path']) ? (seriesMeta['path'] as unknown[]).map(str).filter((x): x is string => !!x) : [];
  const t = splitTitle(ser.title);
  const tiles = sprintTiles(order, '', seriesMeta);
  return {
    episode_id: tiles[tiles.length - 1]?.id ?? ser.id, series: seriesTitle, accent: str(seriesMeta['accent']), path,
    title_en: t.en, title_ar: t.ar, number: null, subtitle: `${tiles.length} passages`, now: null, ready: 100,
    logged: { done: tiles.length, of: tiles.length }, studied: { minutes: 0, of: 0, label: '0 min' },
    last_logged: null, studying: false, done: true, tiles,
  };
}
