/// The episode hub — the room's sprint picture for one Do Zāwiya episode, and nothing more: the series' episodes as
/// tiles (each feeds its own episode), the resources as counted tiles, the ring of steps (each with its day, cue, who,
/// whether it is logged and how much Claude has prepared), and what goes out to YouTube. No text, notes or
/// questions: each step and resource is its own screen with its own data (`/phase/:key`, `/resource/:key`).

import type { EpisodeCtx } from './context';
import { shortCite } from './focus';
import { publishTiles } from './publish';
import { resourceTiles } from './resources';
import { stepViews, type StepView } from './steps';
import { daysBetween, obj, splitTitle, strings } from './text';

export function backlog(ctx: EpisodeCtx) {
  const eps = ctx.series_order.filter((e) => !e.id.endsWith(':slides') && e.state)
    .sort((a, b) => (a.session_no ?? 0) - (b.session_no ?? 0) || a.id.localeCompare(b.id, 'en', { numeric: true }));
  const at = Math.max(0, eps.findIndex((e) => e.id === ctx.id));
  const start = Math.floor(at / 20) * 20;
  const tiles = eps.slice(start, start + 20).map((e) => {
    const tail = e.id.split(':').pop() ?? e.id;
    const label = /^R\d/.test(tail) ? tail.slice(1) : tail;
    const state = e.id === ctx.id ? 'now' : e.state === 'done' ? 'done' : e.state === 'active' ? 'active' : 'queued';
    return { id: e.id, label, state };
  });
  return { title: ctx.series_title, total: eps.length, tiles };
}

/// Episodes produced in the series, and the run of them each finished within a cadence (+1 day) of the one before.
export function produced(ctx: EpisodeCtx) {
  const done = ctx.siblings.map((c) => c.finished_on).filter((d): d is string => !!d).sort();
  const gap = (ctx.plan.cadenceDays ?? 7) + 1;
  let run = done.length ? 1 : 0;
  for (let k = done.length - 1; k > 0; k--) {
    if (daysBetween(done[k - 1]!, done[k]!) <= gap) run++; else break;
  }
  return { total: done.length, in_a_row: run };
}

/// The one thing in hand, for the ring's centre and the phone's reminder.
function nowOf(steps: StepView[]) {
  const s = steps.find((x) => x.state === 'now');
  if (!s) return null;
  return { key: s.key, phase: s.phase, title: s.title, day: s.day, cue: s.cue, cue_prayer: s.cue_prayer,
    cue_after_min: s.cue_after_min, cue_on: s.cue_on, minutes: s.minutes, who: s.who, when: s.when };
}

export function buildHub(ctx: EpisodeCtx, seriesMeta: Record<string, unknown> = {}) {
  const t = splitTitle(ctx.title);
  const steps = stepViews(ctx);
  const have = steps.reduce((n, s) => n + s.prepared.have, 0), total = steps.reduce((n, s) => n + s.prepared.total, 0);
  const cite = shortCite(ctx);
  const path = strings(seriesMeta['path']);
  return {
    id: ctx.id, title: ctx.title, title_en: t.en, title_ar: t.ar, number: ctx.session_no, series: ctx.series_title,
    subtitle: [ctx.series_title, cite].filter(Boolean).join(' · ') || null,
    path: path.length ? path : [ctx.series_title].filter(Boolean),
    state: ctx.checklist.state,
    days: Math.max(1, ...steps.map((s) => s.day)),
    steps, now: nowOf(steps),
    ready: { have, total, pct: total ? Math.round((have / total) * 100) : 0 },
    logged: { done: steps.filter((s) => s.state === 'done').length, of: steps.length },
    backlog: backlog(ctx),
    resources: resourceTiles(ctx),
    publish: { tiles: publishTiles(ctx), produced: produced(ctx) },
    room: typeof obj(ctx.meta)['room'] === 'string' ? ctx.meta['room'] : null,
  };
}
