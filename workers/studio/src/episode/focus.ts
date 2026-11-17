/// The selected text as every screen shows it: āyāt with their English, or the reading's passages — only this
/// episode's 2-day part — with the one concept to master.

import type { EpisodeCtx } from './context';
import { line, obj, str } from './text';

export interface FocusBlock { id: string; n: number | null; cite: string | null; text: string; en: string | null }
export interface Focus {
  cite: string | null;
  rtl: boolean;
  concept: string | null;
  blocks: FocusBlock[];
  translation: string | null;
  /// When the text is not in the app: what to read, in the plan's own words.
  note: string | null;
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
  const base = { concept: concept(ctx.meta), open_url: open?.url ?? null, translation: null, note: null };
  if (r?.kind === 'qr') {
    const span = r.from === r.to ? `${r.surah}:${r.from}` : `${r.surah}:${r.from}–${r.to}`;
    return { ...base, cite: r.surah_name ? `${r.surah_name} ${span}` : span, rtl: true, translation: r.translation,
      blocks: r.ayahs.map((a) => ({ id: `${r.surah}:${a.ayah}`, n: a.ayah, cite: null, text: a.text, en: a.en })) };
  }
  if (r?.kind === 'wv') {
    const first = r.passages[0]?.cite ?? null, last = r.passages[r.passages.length - 1]?.cite ?? null;
    const span = first && last && first !== last ? `${first}–${last}` : first;
    return { ...base, cite: [r.title, span].filter(Boolean).join(' · ') || null, rtl: false,
      blocks: r.passages.map((p) => ({ id: p.id, n: null, cite: p.cite, text: p.text, en: p.en })) };
  }
  const card = obj(ctx.meta['card']);
  return { ...base, cite: str(ctx.meta['read_label']), rtl: false, blocks: [],
    note: line(ctx.meta['read_note']) ?? line(card['read']) };
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
