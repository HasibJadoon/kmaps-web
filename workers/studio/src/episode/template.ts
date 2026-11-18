/// The episode template — the shape every Do Zāwiya episode follows, Qurʾān and Bible alike, for two people (Hasib
/// presents, Ali asks and pushes back). It is Jessica Warner McDonald's way, beat by beat (owner, 2026-11-18: "I will
/// follow Jessica McDonald's — that's my natural"), from her long episodes such as al-Baqarah 2:285: a short the day
/// before asks and promises research; the episode keeps the promise, reads, gives one big idea, ties back, brings one
/// parallel, lands one takeaway, lets the objection stand, says honestly where we stand, and closes the same way.
///
/// Delivered her way, by two people talking it through ("plain English verses, exactly her way of delivery, two people
/// engaging and discussing"): the Qurʾān and the Bible are read in plain English; Ali and Hasib react, ask and answer
/// each other in every section rather than taking turns to lecture.
///
/// Guidelines, not a script ("guidelines, not full script — it should guide us in the framework"): each section says
/// what it is for, and carries a short pointer for this episode from what Claude has prepared. A series may set its
/// own template in its meta (`template`, same shape); none does.

import type { EpisodeCtx } from './context';
import { chain, list, parallel, short, sources } from './phases/parts';
import { concept, shortCite } from './focus';
import { line, obj } from './text';

export interface TemplateSegment { segment: string; label: string; minutes: number; who: string; does: string }

/// Written for two people (owner: "the template should be best for 2 people"): every section names who opens and
/// who answers, so the episode is a conversation — Ali asks and pushes, Hasib has done the research — not two
/// lectures in turn.
export const TEMPLATE: TemplateSegment[] = [
  { segment: 'promise', label: 'The promise', minutes: 2, who: 'Ali → Hasib',
    does: 'Ali asks the one question the short asked. Hasib: we promised research — here it is.' },
  { segment: 'read', label: 'Read', minutes: 4, who: 'Hasib · Ali',
    does: 'Hasib reads the verses (the Qurʾān in Arabic); Ali reads them in plain English. A long passage or a theme: only the verses that caught us.' },
  { segment: 'idea', label: 'The big idea', minutes: 5, who: 'Hasib ⇄ Ali',
    does: 'Hasib gives the one big idea; Ali asks for an example and for something of our own.' },
  { segment: 'been_here', label: 'Been here before', minutes: 2, who: 'Ali → Hasib',
    does: 'Ali: haven’t we been here before? Hasib ties it to an earlier episode.' },
  { segment: 'parallel', label: 'One parallel', minutes: 3, who: 'Hasib ⇄ Ali',
    does: 'Hasib brings one parallel; Ali raises the obvious objection; Hasib gives the best answer.' },
  { segment: 'heart', label: 'The heart', minutes: 4, who: 'Both',
    does: 'Each says the one thing to keep, in a sentence.' },
  { segment: 'pushback', label: 'Ali pushes back', minutes: 3, who: 'Ali ⇄ Hasib',
    does: 'Ali’s honest objection; Hasib answers what he can. It may stay open.' },
  { segment: 'stand', label: 'Where we stand', minutes: 2, who: 'Both',
    does: 'Each says honestly what he thinks, what he believes and what he doesn’t know.' },
  { segment: 'close', label: 'Close', minutes: 2, who: 'Hasib → Both',
    does: 'Hasib goes back to the opening question and names the next one; both sign off the same way.' },
];

function templateOf(seriesMeta: Record<string, unknown>): TemplateSegment[] {
  const raw = Array.isArray(seriesMeta['template']) ? seriesMeta['template'] : [];
  const own = raw.map(obj).map((r) => ({
    segment: line(r['segment']) ?? '', label: line(r['label']) ?? '', who: line(r['who']) ?? 'Both', does: line(r['does']) ?? '',
    minutes: typeof r['minutes'] === 'number' && r['minutes'] > 0 ? r['minutes'] : 1,
  })).filter((r) => r.segment && r.label);
  return own.length ? own : TEMPLATE;
}

/// This episode's pointer for each section — a few words from what is prepared, never a scripted line.
function pointers(ctx: EpisodeCtx): Record<string, string | null> {
  const par = parallel(ctx.meta);
  return {
    promise: line(ctx.meta['hook']),
    // the theme when the episode is built on one (meta `theme`), and the verses that caught us (meta `caught`, e.g.
    // ["Genesis 1:26–27", "2:7"]); else the passage's cite
    read: [line(ctx.meta['theme']) && `Theme: ${line(ctx.meta['theme'])}`, list(ctx.meta['caught']).join(' · ') || shortCite(ctx)]
      .filter(Boolean).join(' — ') || null,
    idea: concept(ctx.meta) ?? line(ctx.meta['struck']),
    been_here: line(ctx.meta['been_here']),
    parallel: par ? [par.ref, par.kind].filter(Boolean).join(' · ') : null,
    heart: line(ctx.meta['takeaway']),
    pushback: list(ctx.meta['objections'])[0] ?? null,
    stand: list(ctx.meta['unknowns'])[0] ?? null,
    close: chain(ctx.meta).open_question,
  };
}

/// The episode's deck (one per episode, for both iPads) and where each section's slides begin: episode meta
/// `deck` = {slug, sections: {<section>: <slide index>}}, written by scripts/studio/episode_deck.py; else the older
/// `:slides` sibling, opened from the start.
export function deckOf(ctx: EpisodeCtx): { url: string; at: Record<string, number> } | null {
  const d = obj(ctx.meta['deck']);
  const slug = line(d['slug']) ?? ctx.slides?.deck ?? null;
  if (!slug) return null;
  const at: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj(d['sections']))) if (typeof v === 'number' && v >= 0) at[k] = Math.floor(v);
  return { url: `com.kmaps.app://deck/${encodeURIComponent(slug)}`, at };
}

export function episodeTemplate(ctx: EpisodeCtx) {
  const cue = pointers(ctx);
  const deck = deckOf(ctx);
  let at = 0;
  const segments = templateOf(ctx.series_meta ?? {}).map((t) => {
    const n = deck?.at[t.segment];
    const out = { ...t, start: `${String(at).padStart(2, '0')}:00`, pointer: cue[t.segment] ?? null,
      slides: deck && n != null ? `${deck.url}?slide=${n}` : null };
    at += t.minutes;
    return out;
  });
  const ch = chain(ctx.meta);
  // ready to record? (her rules — what folds the old Review step into Episode)
  const src = sources(ctx.meta);
  const ready = [
    { key: 'short', label: 'The short asks the question', line: short(ctx.meta)?.hook ?? null },
    { key: 'question', label: 'The one question', line: cue['promise'] ?? null },
    { key: 'voices', label: 'One voice, and one who reads it differently',
      line: src.length === 2 && src.some((s) => s.differs) ? src.map((s) => s.who).join(' · ') : null },
    { key: 'parallel', label: 'One parallel', line: cue['parallel'] ?? null },
    { key: 'pushback', label: 'Ali’s objection', line: cue['pushback'] ?? null },
    { key: 'stand', label: 'What we don’t know', line: cue['stand'] ?? null },
    { key: 'chain', label: 'The next episode', line: ch.next },
  ].map((c) => ({ ...c, ok: !!c.line }));
  return {
    before: short(ctx.meta),
    segments,
    total_minutes: at,
    deck_url: deck?.url ?? null,
    ready,
    after: ch.open_question || ch.promise || ch.next ? ch : null,
  };
}
