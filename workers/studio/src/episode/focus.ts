/// The selected text as every screen shows it: the āyāt in Arabic only (owner 2026-11-17: "no translation here" —
/// every translation is one tap away, `/st/ayah/:key/translations`), or the reading's passages — only this episode's
/// 2-day part — with the one concept to master.

import type { EpisodeCtx } from './context';
import { line, obj, str } from './text';

export interface FocusBlock { id: string; n: number | null; cite: string | null; text: string; en: string | null }
/// A guide text set out for reading: short paragraphs, who is who, a timeline, and its sources as named links.
export interface Guide {
  paragraphs: string[];
  players: Array<{ name: string; line: string }>;
  events: Array<{ when: string; what: string }>;
  sources: Array<{ title: string; url: string | null }>;
  /// The headings the screen writes over each part.
  heads: { players: string; events: string; sources: string };
}
export interface Focus {
  cite: string | null;
  rtl: boolean;
  concept: string | null;
  blocks: FocusBlock[];
  translation: string | null;
  /// When the text is not in the app: what to read, in the plan's own words.
  note: string | null;
  /// The same note set out for reading (owner 2026-11-17: "fix this aesthetic of the reading view"), when it is a guide.
  guide: Guide | null;
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
  const base = { concept: concept(ctx.meta), open_url: open?.url ?? null, translation: null, note: null, guide: null, doc: null };
  if (r?.kind === 'qr') {
    const span = r.from === r.to ? `${r.surah}:${r.from}` : `${r.surah}:${r.from}–${r.to}`;
    return { ...base, cite: r.surah_name ? `${r.surah_name} ${span}` : span, rtl: true, translation: r.translation,
      blocks: r.ayahs.map((a) => ({ id: `${r.surah}:${a.ayah}`, n: a.ayah, cite: null, text: a.text, en: null })) };
  }
  if (r?.kind === 'wv') {
    const first = r.passages[0]?.cite ?? null, last = r.passages[r.passages.length - 1]?.cite ?? null;
    const span = first && last && first !== last ? `${first}–${last}` : first;
    return { ...base, cite: [r.title, span].filter(Boolean).join(' · ') || null, rtl: false,
      blocks: r.passages.map((p) => ({ id: p.id, n: null, cite: p.cite, text: p.text, en: p.en })) };
  }
  const card = obj(ctx.meta['card']);
  const note = line(ctx.meta['read_note']) ?? line(card['read']);
  const cite = str(ctx.meta['read_label']);
  // a guide written as a Doc (owner 2026-11-17: "Doc style, the reader already there") opens in the essay reader
  const slug = str(ctx.meta['read_doc']);
  if (slug) {
    return { ...base, cite, rtl: false, blocks: [], note: null, guide: null,
      doc: { slug, url: `com.kmaps.app://essay/${encodeURIComponent(slug)}`, title: cite, kicker: 'Read in the reader' } };
  }
  const guide = note ? guideOf(note) : null;
  return { ...base, cite, rtl: false, blocks: [], note: guide ? null : note, guide };
}

/// Sentences, kept whole across "c. 1050", "St.", "AD 30" and the like: a break is a full stop (or ? !), maybe a closing
/// quote or bracket, then a space and a capital letter.
export function sentences(text: string): string[] {
  return text.split(/(?<=[.!?]['’")\]]?)\s+(?=[A-Z‘'"(])/).map((x) => x.trim()).filter(Boolean)
    .reduce<string[]>((out, x) => {
      // "c." / "St." / "ch." / "v." ending a piece is an abbreviation, not a sentence end
      if (out.length && /\b(c|ca|St|ch|v|vv|cf|Dr|Mr|Mrs|vol|no|pp?)\.$/i.test(out[out.length - 1]!)) out[out.length - 1] += ` ${x}`;
      else out.push(x);
      return out;
    }, []);
}

/// A long block cut into reading paragraphs of about three sentences (≤ ~420 characters).
export function paragraphsOf(text: string): string[] {
  const out: string[] = [];
  let cur = '';
  for (const s of sentences(text)) {
    if (cur && (cur.length + s.length > 420 || sentences(cur).length >= 3)) { out.push(cur); cur = s; }
    else cur = cur ? `${cur} ${s}` : s;
  }
  if (cur) out.push(cur);
  return out;
}

/// The guide note the curriculum writes — its story, then "Key players: name — line; …", "Events: when — what.; …" and
/// "Sources: title — url; …" — as parts to set out. Null when the note has none of those parts (plain prose stays a note).
export function guideOf(note: string): Guide | null {
  const g: Guide = { paragraphs: [], players: [], events: [], sources: [], heads: { players: 'Who’s who', events: 'Timeline', sources: 'Sources' } };
  let structured = false;
  const dash = /\s+[—–-]\s+/;
  for (const part of note.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean)) {
    const head = part.match(/^(Key players|Players|Events|Timeline|Sources):\s*/i);
    if (!head) { g.paragraphs.push(...paragraphsOf(part)); continue; }
    structured = true;
    const body = part.slice(head[0].length);
    const kind = head[1]!.toLowerCase();
    if (kind.includes('player')) {
      for (const x of body.split(/;\s+/)) {
        const [name, ...rest] = x.split(dash);
        if (name?.trim()) g.players.push({ name: name.trim(), line: rest.join(' — ').trim() });
      }
    } else if (kind === 'events' || kind === 'timeline') {
      // each event ends with a full stop before the "; " that joins them (an event's own text may hold a ";")
      for (const x of body.split(/(?<=\.)\s*;\s+/)) {
        const m = x.match(/^(.+?)\s+[—–]\s+(.+)$/);
        if (m) g.events.push({ when: m[1]!.trim(), what: m[2]!.trim() });
        else if (x.trim()) g.events.push({ when: '', what: x.trim() });
      }
    } else {
      // a source is "title — url", joined by "; " — anchored on each url, since a title may hold its own ";"
      let rest = body;
      for (const m of body.matchAll(/(.+?)\s+[—–]\s+(https?:\/\/[^\s;]+?)[.,]?(?=;\s|;?$)/gs)) {
        g.sources.push({ title: m[1]!.replace(/^[;\s]+/, '').trim(), url: m[2]! });
        rest = rest.replace(m[0], '');
      }
      // titles with no url (catalogue-only books)
      for (const x of rest.split(/;\s+/).map((y) => y.trim()).filter((y) => y && y !== ';')) g.sources.push({ title: x.replace(/;$/, ''), url: null });
    }
  }
  return structured ? g : null;
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
