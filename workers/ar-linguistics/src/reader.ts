// The app's one reader (owner, 2026-11-18: "one universal reader — the same for the Arabic linguistics books, the
// lexicons, all the places"): AL readings served as ReaderDocuments — a head and a body in the reader markdown the app
// draws (kmaps-ios KMReader: `::folio[…]` page markers, `[^n]:` footnotes, `{#id}` anchors, `##` bands, `|` tables).

export interface ReaderAddress { title: string; module: string; path: string }
export interface ReaderContentsItem { title: string; anchor?: string; level?: number; address?: ReaderAddress }
export interface ReaderDocument {
  docId: string; title: string; titleAr?: string | null; kicker?: string | null; kickerAr?: string | null;
  badge?: string | null; facts?: string[]; tags?: string[]; minutes?: number; body: string; tint?: string | null;
  prev?: ReaderAddress | null; next?: ReaderAddress | null; contents?: ReaderContentsItem[]; more?: ReaderAddress | null;
  cite?: string | null;
  marks?: { ref: string; domain: string } | null;
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export const arabicNum = (n: number | string): string => String(n).replace(/\d/g, (d) => AR_DIGITS[+d]!);

/// "ج١ · ص ٥" — where a printed page sits; the volume only when the book has volumes.
export function folio(volume: number | null, page: number | null, part?: string | null): string {
  // a part label that is only a number is the volume ("1" → ج١)
  const label = part?.trim() ? (/^[0-9٠-٩]+$/.test(part.trim()) ? `ج${arabicNum(part.trim())}` : part.trim()) : null;
  const bits = [label ?? (volume ? `ج${arabicNum(volume)}` : null), page != null ? `ص ${arabicNum(page)}` : null];
  return bits.filter(Boolean).join(' · ');
}

/// An edition's footnotes as reader footnotes: "(1) text" → `[^1]: text`; a line with no number keeps a mark.
export function footnoteLines(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = l.match(/^[([]?([0-9٠-٩]+)[)\]]?\s*[-–.:]?\s*(.+)$/);
    return m ? `[^${m[1]}]: ${m[2]}` : `[^*]: ${l}`;
  });
}

export interface GramChunk {
  id: string; volume_no: number | null; part_label: string | null; page_no: number | null;
  text_ar: string | null; footnotes_ar: string | null;
}

/// A window of a grammar book's printed pages as reader markdown: each page opens with its folio (its anchor the
/// chunk's id), its text as paragraphs, its footnotes under it.
export function gramPagesMarkdown(pages: GramChunk[]): string {
  return pages.map((p) => {
    const parts = [`::folio[${folio(p.volume_no, p.page_no, p.part_label)}] {#${p.id}}`];
    const paras = (p.text_ar ?? '').split(/\r\n|\r|\n/).map((x) => x.trim()).filter(Boolean);
    parts.push(...paras);
    const notes = footnoteLines(p.footnotes_ar);
    if (notes.length) parts.push('---', ...notes);
    return parts.join('\n\n');
  }).join('\n\n');
}
