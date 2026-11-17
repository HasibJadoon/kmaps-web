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
  siblings?: ReaderAddress[]; siblingsLabel?: string | null; lanes?: string[]; search?: ReaderAddress | null;
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

// MARK: dictionary entries

export interface LexEntryPayload {
  meta: { slug: string; title_ar?: string; title_short_ar?: string; author?: string; author_death_ah?: number | null; bilingual?: boolean };
  entry: { root_text?: string; root_norm?: string; page_start?: number | null; page_end?: number | null; volume_no?: number | null };
  canonical?: { meaning_core_ar?: string | null; meaning_core_en?: string | null } | null;
  sections: Array<{ id: string; heading_ar: string | null; page_no: number | null; lang: string | null; text_en?: string | null;
                    body: { paragraphs: string[] } }>;
  blocks: Array<{ id: string; section_id: string | null; block_type: string; title_ar: string | null; text_plain: string | null;
                  data_json: string | null; printed_page: number | null }>;
  quran_refs: Array<{ surah: number; ayah: number; context_snippet: string | null }>;
  footnotes: Array<{ num: number; text: string; section_id: string | null }>;
}

const dataOf = (j: string | null): Record<string, unknown> => { try { return JSON.parse(j ?? '{}') ?? {}; } catch { return {}; } };
const one = (s: string) => s.replace(/\s*\n+\s*/g, ' ').trim();

/// A dictionary's article on a root as reader markdown: a band per section (its heading and printed page, anchored to
/// the section), its paragraphs, its English and Urdu as lane lines, its footnotes under it; then the entry's
/// shawāhid, Qurʾān citations and the editor's corrections. Returns the lanes it carries.
export function lexEntryMarkdown(p: LexEntryPayload): { body: string; lanes: string[] } {
  const out: string[] = [];
  const lanes = new Set<string>();
  const bySection = new Map<string, LexEntryPayload['blocks']>();
  for (const b of p.blocks) if (b.section_id) (bySection.get(b.section_id) ?? bySection.set(b.section_id, []).get(b.section_id)!).push(b);
  const root = (p.entry.root_text ?? p.entry.root_norm ?? '').trim();
  const bilingual = !!p.meta.bilingual;

  p.sections.forEach((s) => {
    const page = s.page_no != null ? ` · ص ${arabicNum(s.page_no)}` : '';
    const heading = (s.heading_ar ?? '').trim();
    // a section headed by the bare root is the article itself: no band of its own
    if (heading && heading !== root) out.push(`## ${heading}${page} {#${s.id}}`);
    else if (page) out.push(`::folio[${page.slice(3)}] {#${s.id}}`);
    for (const para of s.body.paragraphs) if (para.trim()) out.push(one(para));
    const own = bySection.get(s.id) ?? [];
    const en = (s.lang === 'ar' ? s.text_en : null) ?? own.map((b) => dataOf(b.data_json)).map((d) => (d.en ?? d.core_en) as string | undefined).find(Boolean);
    const ur = own.map((b) => dataOf(b.data_json)).map((d) => (d.ur ?? d.core_ur) as string | undefined).find(Boolean);
    if (en && !bilingual) { out.push(`@en ${one(en)}`); lanes.add('en'); }
    if (ur) { out.push(`@ur ${one(ur)}`); lanes.add('ur'); }
    const notes = p.footnotes.filter((f) => f.section_id === s.id);
    for (const f of notes) out.push(`[^${f.num}]: ${one(f.text)}`);
  });

  const loose = p.footnotes.filter((f) => !f.section_id || !p.sections.some((s) => s.id === f.section_id));
  if (loose.length) out.push('## :text.alignright: الحواشي', ...loose.map((f) => `[^${f.num}]: ${one(f.text)}`));

  const poetry = p.blocks.filter((b) => b.block_type === 'poetry_quote' && (b.text_plain ?? '').trim());
  if (poetry.length) {
    out.push('## :music.note.list: الشواهد');
    for (const b of poetry) {
      const poet = dataOf(b.data_json).poet as string | undefined;
      out.push([`> ${one(b.text_plain!)}`, poet ? `> **${poet}**` : null].filter(Boolean).join('\n'));
    }
  }

  if (p.quran_refs.length) {
    out.push('## :book.closed: Qurʾān in this entry');
    for (const q of p.quran_refs) {
      out.push(`- **${q.surah}:${q.ayah}**${q.context_snippet ? ` — ${one(q.context_snippet)}` : ''}`);
    }
  }

  const fixes = p.blocks.filter((b) => b.block_type === 'editor_note' || dataOf(b.data_json).defect != null);
  if (fixes.length) {
    out.push('## :pencil.and.outline: Corrections');
    for (const b of fixes) {
      const d = dataOf(b.data_json);
      const line = [d.printed && `printed «${d.printed}»`, d.corrected && `read «${d.corrected}»`, d.reason].filter(Boolean).join(' — ');
      out.push(`- ${line || one(b.text_plain ?? '')}`);
    }
  }
  return { body: out.join('\n\n'), lanes: [...lanes] };
}

/// A dictionary's own header on a root (the derived blocks its ds layout names — this book's reading, its thesis, its
/// senses and family) as reader markdown: a small heading per block with its words, the English/Urdu as lanes, the
/// children (a sense under its form) as bullets. Empty when the entry has no header.
export function lexHeaderMarkdown(layout: { sections?: { blocks?: string[] }[] },
  rows: Array<{ id: string; parent_block_id: string | null; title_ar: string | null; text_plain: string | null; data_json: string | null }>): string {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const kids = new Map<string, string[]>();
  for (const r of rows) if (r.parent_block_id) (kids.get(r.parent_block_id) ?? kids.set(r.parent_block_id, []).get(r.parent_block_id)!).push(r.id);
  const tri = (d: Record<string, unknown>) => {
    const t = (d.tri ?? d.exampleTri ?? d.example_tri) as Record<string, string> | undefined;
    return { en: (t?.en ?? d.en) as string | undefined, ur: (t?.ur ?? d.ur) as string | undefined };
  };
  const out: string[] = [];
  for (const sec of layout.sections ?? []) {
    for (const id of sec.blocks ?? []) {
      const b = byId.get(id);
      if (!b) continue;
      const d = dataOf(b.data_json), t = tri(d);
      if (b.title_ar?.trim()) out.push(`### ${one(b.title_ar)}`);
      if (b.text_plain?.trim()) out.push(one(b.text_plain));
      if (t.en) out.push(`@en ${one(t.en)}`);
      if (t.ur) out.push(`@ur ${one(t.ur)}`);
      for (const k of kids.get(id) ?? []) {
        const c = byId.get(k);
        if (!c) continue;
        const line = [c.title_ar, c.text_plain].filter((x) => x?.trim()).map((x) => one(x!)).join(' — ');
        if (line) out.push(`- ${line}`);
      }
    }
  }
  return out.length ? ['## :sparkles: This book on the root', ...out].join('\n\n') : '';
}
