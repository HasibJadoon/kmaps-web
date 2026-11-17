/// The episode's resources (the room's left column): the text, the concept, both people's points, the questions,
/// the deck. Each is its own screen; the hub only counts them.

import type { EpisodeCtx } from './context';
import { concept, focusOf } from './focus';
import { people } from './people';
import { line, str } from './text';

export interface ResourceTile { key: string; title: string; icon: string; n: number }

const questions = (ctx: EpisodeCtx) => (Array.isArray(ctx.meta['questions']) ? ctx.meta['questions'] : [])
  .map(line).filter((s): s is string => !!s);

/// How many blocks the selected text holds, from the meta alone (the hub never loads the text).
function textCount(ctx: EpisodeCtx): number {
  const unit = str(ctx.meta['read_unit']);
  const qr = unit?.match(/^(\d+)\/(\d+)(?:-(\d+))?$/);
  if (qr) return Number(qr[3] ?? qr[2]) - Number(qr[2]) + 1;
  if (Array.isArray(ctx.meta['read_passages'])) return (ctx.meta['read_passages'] as unknown[]).length;
  return unit || str(ctx.meta['read_note']) || str(ctx.meta['read_label']) ? 1 : 0;
}

export function resourceTiles(ctx: EpisodeCtx): ResourceTile[] {
  const isQr = /^\d+\//.test(str(ctx.meta['read_unit']) ?? '');
  const pts = people(ctx).reduce((n, p) => n + p.groups.reduce((m, g) => m + g.points.length, 0), 0);
  const out: ResourceTile[] = [];
  const t = textCount(ctx);
  if (t) out.push({ key: 'text', title: isQr ? 'Āyāt' : 'Text', icon: 'book.closed', n: t });
  if (concept(ctx.meta)) out.push({ key: 'concept', title: 'Concept', icon: 'scope', n: 1 });
  if (pts) out.push({ key: 'points', title: 'Points', icon: 'text.bubble', n: pts });
  const q = questions(ctx).length;
  if (q) out.push({ key: 'questions', title: 'Questions', icon: 'questionmark.bubble', n: q });
  if (ctx.slides) out.push({ key: 'slides', title: 'Slides', icon: 'rectangle.on.rectangle', n: 1 });
  return out;
}

export const RESOURCE_KEYS = ['text', 'concept', 'points', 'questions', 'slides'] as const;
export const NEEDS_TEXT = new Set(['text', 'concept']);

export function resource(ctx: EpisodeCtx, key: string): Record<string, unknown> | null {
  switch (key) {
    case 'text': return { focus: focusOf(ctx) };
    case 'concept': return { concept: concept(ctx.meta), cite: focusOf(ctx).cite };
    case 'points': return { people: people(ctx) };
    case 'questions': return { questions: questions(ctx) };
    case 'slides': return ctx.slides ? { title: ctx.slides.title, url: `com.kmaps.app://deck/${ctx.slides.deck}` } : null;
    default: return null;
  }
}
