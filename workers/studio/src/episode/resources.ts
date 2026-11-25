/// The episode's resources (the room's left column): the text, the concept, both people's points, the questions,
/// the deck. Each is its own screen; the hub only counts them.

import type { EpisodeCtx } from './context';
import { concept, focusOf } from './focus';
import { people } from './people';
import { line, str } from './text';
import { deckOf } from './template';

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

/// Before filming (meta.prep): what each of us goes through before the take — read a doc, run the slides, rehearse the
/// cards — each with who, an optional link, and whether it is ticked (meta.prep_done).
export interface PrepItem { id: string; title: string; who: string | null; link: string | null; done: string | null }
export function prepItems(ctx: EpisodeCtx): PrepItem[] {
  const done = (ctx.meta['prep_done'] && typeof ctx.meta['prep_done'] === 'object' ? ctx.meta['prep_done'] : {}) as Record<string, unknown>;
  return (Array.isArray(ctx.meta['prep']) ? ctx.meta['prep'] : []).flatMap((x) => {
    const r = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
    const id = str(r['id']), title = str(r['title']);
    return id && title ? [{ id, title, who: str(r['who']) ?? null, link: str(r['link']) ?? null, done: str(done[id]) ?? null }] : [];
  });
}

/// Everything that belongs to the episode (meta.resources: its own docs and slides, then what already exists for these
/// āyāt), grouped in the order written; each item a link the app opens where it is tapped.
export function libraryGroups(ctx: EpisodeCtx): Array<{ title: string; items: Array<{ title: string; link: string }> }> {
  const groups: Array<{ title: string; items: Array<{ title: string; link: string }> }> = [];
  for (const x of Array.isArray(ctx.meta['resources']) ? ctx.meta['resources'] : []) {
    const r = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
    const title = str(r['title']), link = str(r['link']);
    if (!title || !link) continue;
    const name = str(r['group']) ?? '';
    let g = groups.find((y) => y.title === name);
    if (!g) { g = { title: name, items: [] }; groups.push(g); }
    g.items.push({ title, link });
  }
  return groups;
}

export function resourceTiles(ctx: EpisodeCtx): ResourceTile[] {
  const isQr = /^\d+\//.test(str(ctx.meta['read_unit']) ?? '');
  const pts = people(ctx).reduce((n, p) => n + p.groups.reduce((m, g) => m + g.points.length, 0), 0);
  const out: ResourceTile[] = [];
  const prep = prepItems(ctx);
  if (prep.length) out.push({ key: 'checklist', title: 'Before filming', icon: 'checklist', n: prep.length });
  const lib = libraryGroups(ctx).reduce((n, g) => n + g.items.length, 0);
  if (lib) out.push({ key: 'library', title: 'Resources', icon: 'books.vertical', n: lib });
  const t = textCount(ctx);
  if (t) out.push({ key: 'text', title: isQr ? 'Āyāt' : 'Text', icon: 'book.closed', n: t });
  if (concept(ctx.meta)) out.push({ key: 'concept', title: 'Concept', icon: 'scope', n: 1 });
  if (pts) out.push({ key: 'points', title: 'Points', icon: 'text.bubble', n: pts });
  const q = questions(ctx).length;
  if (q) out.push({ key: 'questions', title: 'Questions', icon: 'questionmark.bubble', n: q });
  if (deckOf(ctx)) out.push({ key: 'slides', title: 'Slides', icon: 'rectangle.on.rectangle', n: 1 });
  return out;
}

export const RESOURCE_KEYS = ['checklist', 'library', 'text', 'concept', 'points', 'questions', 'slides'] as const;
export const NEEDS_TEXT = new Set(['text', 'concept']);

export function resource(ctx: EpisodeCtx, key: string): Record<string, unknown> | null {
  switch (key) {
    case 'checklist': { const items = prepItems(ctx); return items.length ? { items, done: items.filter((i) => i.done).length } : null; }
    case 'library': { const groups = libraryGroups(ctx); return groups.length ? { groups } : null; }
    case 'text': return { focus: focusOf(ctx) };
    case 'concept': return { concept: concept(ctx.meta), cite: focusOf(ctx).cite };
    case 'points': return { people: people(ctx) };
    case 'questions': return { questions: questions(ctx) };
    case 'slides': { const d = deckOf(ctx); return d ? { title: ctx.slides?.title ?? 'The episode’s slides', url: d.url } : null; }
    default: return null;
  }
}
