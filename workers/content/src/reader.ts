// The app's one reader (owner, 2026-11-18: "one universal reader, no more silos"): every reading is served as a
// ReaderDocument — its head (kicker, title, badge, facts, tags) and its body in the reader markdown the app draws
// (kmaps-ios KMReader: `##` section bands, `>` panels, `|` tables, ```graphic infographics, ```read read-along lines,
// ::audio, ::image). The worker shapes it; the app only draws it.
//
// A document written as markdown (an essay, a note) is read as it is; one stored as typed blocks (heading, paragraph,
// quote, callout, step, listItem, table, ayah, horizontalRule — the content store's bilingual blocks, English in
// content_text and Arabic in content_ar) is written out as reader markdown here.

export interface ReaderDocument {
  docId: string;
  slug: string | null;
  title: string;
  titleAr: string | null;
  kicker: string | null;
  kickerAr?: string | null;
  badge: string | null;
  facts: string[] | null;
  tags: string[];
  minutes: number;
  body: string;
  voice?: unknown;
  voiceable?: boolean;
  tint?: string | null;
}

export interface ReaderBlockRow {
  block_type: string;
  content_text: string | null;
  content_ar: string | null;
  attrs_json?: string | null;
}

export interface ReaderDocRow {
  doc_id: string;
  doc_type: string;
  slug: string | null;
  title: string;
  title_ar: string | null;
  reading_time_min: number | null;
  tags_json: string | null;
  meta_json: string | null;
  surah: number | null;
  ayah_from: number | null;
  ayah_to: number | null;
  passage_ref: string | null;
}

/// What kind of writing it is, said the way a reader would say it.
const KIND: Record<string, string> = {
  teaching_note: 'Teaching note', playbook: 'Playbook', doctrine: 'Doctrine', reference: 'Reference', article: 'Article',
  essay: 'Essay', skill: 'Skill', engine: 'Engine', note: 'Note',
};
export function kindLabel(docType: string): string {
  return KIND[docType] ?? docType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/// The books a quotation cites, by their slug, named as the reader names them.
const SOURCES: Record<string, string> = {
  farra_maani_quran: 'معاني القرآن للفرّاء', adima_dirasat: 'دراسات لأسلوب القرآن', ibn_yaish_sharh_mufassal: 'شرح المفصل',
  suyuti_hamn_hawami: 'همع الهوامع', sibawayh_kitab: 'الكتاب', ibn_anbari_insaf: 'الإنصاف',
};
export function sourceName(slug: string): string {
  if (SOURCES[slug]) return SOURCES[slug]!;
  if (slug.startsWith('QR:')) return slug.split(':')[1] ?? slug;
  return slug.replace(/_/g, ' ');
}

function attrs(b: ReaderBlockRow): Record<string, unknown> {
  try { return JSON.parse(b.attrs_json ?? '{}') ?? {}; } catch { return {}; }
}
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const lines = (s: string): string[] => s.split(/\n+/).map((x) => x.trim()).filter(Boolean);
/// Every line of a run set inside a `>` panel.
const panel = (rows: string[]): string => rows.flatMap(lines).map((l) => `> ${l}`).join('\n');

/// A verse in the muṣḥaf's own brackets (the reader sets ﴿…﴾ in UthmanicHafs).
function verse(ar: string): string { return ar.includes('﴿') ? ar : `﴿${ar}﴾`; }

/// Typed blocks → reader markdown.
export function blocksToMarkdown(blocks: ReaderBlockRow[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    const a = attrs(b);
    const en = str(b.content_text), ar = str(b.content_ar);
    switch (b.block_type) {
      case 'markdown':
        if (en) out.push(en);
        break;
      case 'heading': {
        const level = typeof a.level === 'number' ? a.level : 2;
        const mark = level <= 1 ? '#' : level === 2 ? '##' : '###';
        const head = en ?? ar;
        if (!head) break;
        // the Arabic under an English heading: the line straight under a `##` is its subtitle
        out.push(en && ar ? `${mark} ${en}\n${ar}` : `${mark} ${head}`);
        break;
      }
      case 'blockquote': case 'quote': case 'ayah': {
        const isVerse = (str(a.role) ?? (b.block_type === 'ayah' ? 'verse' : 'quote')) === 'verse';
        const cite = [str(a.ref), str(a.source) && sourceName(str(a.source)!), str(a.locator)].filter(Boolean).join(' · ');
        const rows = [ar && (isVerse ? verse(ar) : ar), en && `*${en}*`, cite && `**${cite}**`].filter(Boolean) as string[];
        if (rows.length) out.push(panel(rows));
        break;
      }
      case 'callout': {
        const rows = [str(a.label) && `**${str(a.label)!.toUpperCase()}**`, ar, en].filter(Boolean) as string[];
        if (rows.length) out.push(panel(rows));
        break;
      }
      case 'step': {
        const n = typeof a.n === 'number' ? a.n : out.filter((x) => /^\d+\. /.test(x)).length + 1;
        const head = ar ?? en;
        if (!head) break;
        out.push(ar && en ? `${n}. ${ar}\n\n${en}` : `${n}. ${head}`);
        break;
      }
      case 'listItem': {
        const indent = '  '.repeat(typeof a.level === 'number' ? a.level : 0);
        if (en) out.push(`${indent}- ${en}`);
        if (ar) out.push(`${indent}${en ? '  ' : ''}- ${ar}`);
        break;
      }
      case 'table': {
        const cols = Array.isArray(a.columns) ? a.columns.map(String) : [];
        let rows = Array.isArray(a.rows) ? (a.rows as unknown[]).map((r) => (Array.isArray(r) ? r.map(String) : [String(r)])) : [];
        if (!rows.length && en) rows = en.split(/\s*\|\|\s*/).map((r) => r.split(/\s*\|\s*/));
        const all = cols.length ? [cols, ...rows] : rows;
        if (all.length) out.push(all.map((r) => `| ${r.map((c) => c.replace(/\|/g, '/')).join(' | ')} |`).join('\n'));
        break;
      }
      case 'horizontalRule':
        out.push('---');
        break;
      default:
        // any other block reads as its words: English, then the Arabic
        if (en) out.push(en);
        if (ar) out.push(ar);
    }
  }
  return out.join('\n\n');
}

/// Where a document sits in the muṣḥaf ("40:1–3"), when it sits anywhere.
export function passageOf(d: Pick<ReaderDocRow, 'passage_ref' | 'surah' | 'ayah_from' | 'ayah_to'>): string | null {
  if (d.passage_ref?.trim()) return d.passage_ref.trim();
  if (d.surah == null) return null;
  if (d.ayah_from == null) return String(d.surah);
  return d.ayah_to != null && d.ayah_to !== d.ayah_from ? `${d.surah}:${d.ayah_from}–${d.ayah_to}` : `${d.surah}:${d.ayah_from}`;
}

export function minutesOf(body: string): number {
  return Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 220));
}

/// A content document as the one reader reads it.
export function readerDocument(d: ReaderDocRow, blocks: ReaderBlockRow[]): ReaderDocument {
  let meta: Record<string, unknown> = {};
  try { meta = JSON.parse(d.meta_json ?? '{}'); } catch { /* keep empty */ }
  let tags: string[] = [];
  try { const t = JSON.parse(d.tags_json ?? '[]'); if (Array.isArray(t)) tags = t.map(String); } catch { /* none */ }
  // a first heading that repeats the title is the title: the head shows it (its Arabic, when the doc has none)
  const first = blocks.find((b) => b.block_type !== 'markdown' || (b.content_text ?? '').trim());
  const fold = (x: string | null) => (x ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  let titleAr = d.title_ar;
  let rest = blocks;
  if (first?.block_type === 'heading' && fold(first.content_text) === fold(d.title)) {
    titleAr = titleAr ?? first.content_ar;
    rest = blocks.filter((b) => b !== first);
  }
  const body = blocksToMarkdown(rest);
  const minutes = d.reading_time_min ?? minutesOf(body);
  return {
    docId: d.doc_id, slug: d.slug, title: d.title, titleAr,
    kicker: str(meta.kicker) ?? kindLabel(d.doc_type), badge: passageOf(d),
    facts: [`${minutes} min read`], tags: tags.slice(0, 8), minutes, body,
  };
}
