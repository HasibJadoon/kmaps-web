/// Publish — the episode goes out to YouTube her way: a short that asks (Day 1) and the full episode that answers
/// (Day 2). Titles are the question itself; the description says what struck us, who we read, what comes next;
/// the long one's chapters come from the run sheet. Both can go out any time (nothing is logged by hand); publishing
/// the Episode finishes the episode and opens the next.

import type { EpisodeCtx } from './context';
import { runSheet } from './phases/runsheet';
import { short } from './phases/prepare';
import { sources } from './phases/think';
import { chain } from './phases/review';
import { line, obj, splitTitle } from './text';

export type Part = 'short' | 'long';
export const PARTS: Part[] = ['short', 'long'];

function published(meta: Record<string, unknown>, part: Part): { at: string; url: string | null } | null {
  const p = obj(obj(meta['published'])[part]);
  return typeof p['at'] === 'string' ? { at: p['at'], url: typeof p['url'] === 'string' ? p['url'] : null } : null;
}


export function publishView(ctx: EpisodeCtx) {
  const m = ctx.meta;
  const t = splitTitle(ctx.title);
  const sh = short(m), ch = chain(m), rs = runSheet(m);
  const who = sources(m).map((s) => s.who).join(' and ');
  const next = ch.next ? `Next: ${ch.next}.` : null;
  const series = ctx.series_title;
  const longTitle = line(m['hook']) ?? t.en;
  const longDesc = [line(m['struck']), who ? `We read ${who}.` : null, ch.open_question ? `Open question: ${ch.open_question}` : null,
    next, series ? `Do Zāwiya · ${series}` : null].filter(Boolean).join('\n\n');
  return {
    playlist: series ? `Do Zāwiya · ${series}` : 'Do Zāwiya',
    parts: [
      { part: 'short' as Part, title: sh?.hook ?? null, description: [sh?.open_question, 'Tomorrow we dig in.', series ? `Do Zāwiya · ${series}` : null]
          .filter(Boolean).join('\n\n'), chapters: [], ready: true, published: published(m, 'short') },
      { part: 'long' as Part, title: longTitle, description: longDesc,
        chapters: rs.segments.map((s) => ({ at: s.start, title: s.label })),
        ready: true, published: published(m, 'long') },
    ],
  };
}

export function publishTiles(ctx: EpisodeCtx) {
  return PARTS.map((part) => ({ part, title: part === 'short' ? 'Short' : 'Episode', done: !!published(ctx.meta, part) }));
}
