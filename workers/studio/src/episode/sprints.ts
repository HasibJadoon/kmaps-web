/// The phone's sprint cards: one per planner series — its episode in hand, the step for now, how much Claude has
/// prepared and how much is logged. The card in hand today (a step due today, the most recent log first) is the one
/// being studied; a tap opens that episode's hub.

import type { EpisodeCtx } from './context';
import { shortCite } from './focus';
import { stepViews } from './steps';
import { splitTitle, str } from './text';

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
  last_logged: string | null;
  studying: boolean;
}

export function sprintCard(ctx: EpisodeCtx, seriesMeta: Record<string, unknown>): SprintCard {
  const t = splitTitle(ctx.title);
  const steps = stepViews(ctx);
  const have = steps.reduce((n, s) => n + s.prepared.have, 0), total = steps.reduce((n, s) => n + s.prepared.total, 0);
  const now = steps.find((s) => s.state === 'now');
  const last = ctx.checklist.steps.map((s) => s.done_at ?? '').filter(Boolean).sort().pop() ?? null;
  const path = Array.isArray(seriesMeta['path']) ? (seriesMeta['path'] as unknown[]).map(str).filter((x): x is string => !!x) : [];
  return {
    episode_id: ctx.id, series: ctx.series_title, accent: str(seriesMeta['accent']), path,
    title_en: t.en, title_ar: t.ar, number: ctx.session_no,
    subtitle: [ctx.series_title, shortCite(ctx)].filter(Boolean).join(' · ') || null,
    now: now ? { title: now.title, day: now.day, cue: now.cue, when: now.when, color: now.color, icon: now.icon } : null,
    ready: total ? Math.round((have / total) * 100) : 0,
    logged: { done: steps.filter((s) => s.state === 'done').length, of: steps.length },
    last_logged: last, studying: false,
  };
}

/// Order the cards — due today first, then the most recently worked on — and mark the first as the one in hand.
export function rankSprints(cards: SprintCard[]): SprintCard[] {
  const today = (c: SprintCard) => (c.now?.when === 'today' ? 1 : 0);
  const out = [...cards].sort((a, b) => today(b) - today(a) || (b.last_logged ?? '').localeCompare(a.last_logged ?? '')
    || (a.series ?? '').localeCompare(b.series ?? ''));
  if (out[0]?.now) out[0] = { ...out[0], studying: true };
  return out;
}
