/// The selected text as every screen shows it: the āyāt in Arabic only (owner 2026-11-17: "no translation here" —
/// every translation is one tap away, `/st/ayah/:key/translations`), or the reading's passages — only this episode's
/// 2-day part — with the one concept to master.

import type { EpisodeCtx } from './context';
import { line, obj, splitTitle, str } from './text';

export interface FocusBlock { id: string; n: number | null; cite: string | null; text: string; en: string | null }
export interface Focus {
  cite: string | null;
  rtl: boolean;
  concept: string | null;
  blocks: FocusBlock[];
  translation: string | null;
  /// When the text is not in the app: what to read, in the plan's own words.
  note: string | null;
  /// The reading as a Doc, opened in the app's essay reader (com.kmaps.app://essay/<slug>) — when the episode has one.
  doc: { slug: string; url: string; title: string | null; kicker: string } | null;
  open_url: string | null;
}

export function concept(meta: Record<string, unknown>): string | null {
  const c = meta['concept'];
  if (typeof c === 'string') return line(c);
  return line(obj(c)['label']);
}

export function focusOf(ctx: EpisodeCtx): Focus {
  const open = ctx.checklist.steps.find((s) => s.open)?.open ?? null;
  const r = ctx.reading;
  // every episode's reading as a Doc in the essay reader (owner 2026-11-17: "all episodes the same")
  const slug = str(ctx.meta['read_doc']);
  const doc = slug ? { slug, url: `com.kmaps.app://essay/${encodeURIComponent(slug)}`, title: null as string | null, kicker: 'Read in the reader' } : null;
  const base = { concept: concept(ctx.meta), open_url: open?.url ?? null, translation: null, note: null, doc };
  if (r?.kind === 'qr') {
    const span = r.from === r.to ? `${r.surah}:${r.from}` : `${r.surah}:${r.from}–${r.to}`;
    const qcite = r.surah_name ? `${r.surah_name} ${span}` : span;
    return { ...base, doc: doc && { ...doc, title: splitTitle(ctx.title).en || qcite }, cite: qcite, rtl: true, translation: r.translation,
      blocks: r.ayahs.map((a) => ({ id: `${r.surah}:${a.ayah}`, n: a.ayah, cite: null, text: a.text, en: null })) };
  }
  if (r?.kind === 'wv') {
    const first = r.passages[0]?.cite ?? null, last = r.passages[r.passages.length - 1]?.cite ?? null;
    const span = first && last && first !== last ? `${first}–${last}` : first;
    const wcite = [r.title, span].filter(Boolean).join(' · ') || null;
    if (doc) return { ...base, doc: { ...doc, title: str(ctx.meta['read_label']) ?? wcite }, cite: wcite, rtl: false, blocks: [] };
    return { ...base, cite: wcite, rtl: false,
      blocks: r.passages.map((p) => ({ id: p.id, n: null, cite: p.cite, text: p.text, en: p.en })) };
  }
  const card = obj(ctx.meta['card']);
  const note = line(ctx.meta['read_note']) ?? line(card['read']);
  const cite = str(ctx.meta['read_label']);
  // a guide written as a Doc (owner 2026-11-17: "Doc style, the reader already there") opens in the essay reader
  // every reading is a Doc in the app's one reader (owner 2026-11-18: "one universal reader, no more silos")
  if (doc) return { ...base, cite, rtl: false, blocks: [], note: null, doc: { ...doc, title: cite ?? splitTitle(ctx.title).en } };
  return { ...base, cite, rtl: false, blocks: [], note };
}

/// The short cite a step names ("40:4–5", "Locke · ch. V").
export function shortCite(ctx: EpisodeCtx): string | null {
  const label = str(ctx.meta['read_label']);
  if (label) return label;
  const unit = str(ctx.meta['read_unit']);
  const qr = unit?.match(/^(\d+)\/(\d+)(?:-(\d+))?$/);
  if (qr) return qr[3] && qr[3] !== qr[2] ? `${qr[1]}:${qr[2]}–${qr[3]}` : `${qr[1]}:${qr[2]}`;
  return null;
}
