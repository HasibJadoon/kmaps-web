import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { cached } from '../../../shared/src/cache';
import type { ArLinguisticsEnv } from '../env';
import { normalizeSurahName } from '../data/surah_names';
import { SourcesRepo } from '../repositories/sources.repo';
import { softFail } from '../../../shared/src/soft-fail';

const SOURCE_SLUG = 'raghib_mufradat';

interface MufradatSourceMeta {
  slug:      string;
  title_ar:  string;
  title_en:  string;
  author:    string;
  period:    string;
  origin:    'ketabonline';
}

async function fetchMufradatMeta(db: D1Database): Promise<MufradatSourceMeta> {
  const row = await new SourcesRepo(db).bySlug(SOURCE_SLUG);
  return {
    slug:     SOURCE_SLUG,
    title_ar: row?.title_ar ?? 'مفردات القرآن',
    title_en: row?.title_en ?? 'Mufradat al-Quran',
    author:   row?.author_name ?? 'الراغب الأصفهاني',
    period:   row?.period_label ?? 'كلاسيكي',
    origin:   'ketabonline',
  };
}

interface ProseToken_Text { kind: 'text'; value: string; }
interface ProseToken_Quran {
  kind: 'quran';
  surah: string;
  surah_num: number | null;
  ayah: number;
  ayah_to: number | null;
  raw: string;
}
interface ProseToken_Footnote {
  kind: 'footnote';
  num: number;
  has_text: boolean;
  text: string | null;
  printed_page: number | null;
}
interface ProseToken_ParenQuote { kind: 'paren_quote'; value: string; }
interface ProseToken_LineBreak { kind: 'br'; }
type ProseToken =
  | ProseToken_Text | ProseToken_Quran | ProseToken_Footnote
  | ProseToken_ParenQuote | ProseToken_LineBreak;

type MufradatParagraph =
  | { kind: 'prose'; tokens: ProseToken[] }
  | { kind: 'poetry'; cue: string | null; verses: string[]; attribution: string | null }
  | { kind: 'hadith'; cue: string | null; tokens: ProseToken[] }
  | { kind: 'qira_variant'; reader: string | null; tokens: ProseToken[] }
  | { kind: 'editorial'; tokens: ProseToken[] };

interface MufradatSection {
  id: string;
  seq: number;
  heading_ar: string | null;
  page_no: number | null;
  paragraphs: MufradatParagraph[];

  translation_en?: string | null;
  translation_ur?: string | null;
}

interface MufradatFamilyForm {
  badge: string;
  head_html: string;
  masdar_html?: string | null;
  gloss_en?: string | null;
  gloss_ur?: string | null;
  citation_html?: string | null;
}
interface MufradatFamilyPole {
  key: string;
  title_ar: string;
  title_en: string;
  forms: MufradatFamilyForm[];
}
interface MufradatFamilyDerivation {
  quote_ar: string;
  en_html: string;
  ur_html: string;
  inferred_en_html?: string | null;
  inferred_ur_html?: string | null;
}
interface MufradatFamily {
  meaning_core: { ar: string; en: string; ur: string };
  poles: MufradatFamilyPole[];
  derivation?: MufradatFamilyDerivation | null;
}
interface MufradatEntryGloss {
  letters_spaced?: string | null;
  letters_dotted?: string | null;
  root_type_ar?: string | null;
  gloss_en?: string | null;
  gloss_ar?: string | null;
  gloss_ur?: string | null;
}

interface MufradatReadView {
  kind: 'mufradat';
  meta: MufradatSourceMeta;
  entry: {
    id: string; root_text: string; root_norm: string;
    page_start: number | null; page_end: number | null; volume_no: number | null;
    source_url: string | null; source_native_id: string | null;
  };
  canonical: {
    id: string; root_text: string; root_letters: string; root_type: string;
    frequency_quran: number | null; meaning_core_en: string | null;
  } | null;
  sections: MufradatSection[];
  family: MufradatFamily | null;
  entry_gloss: MufradatEntryGloss | null;
  footnotes: { num: number; text: string | null; printed_page: number | null }[];
  quran_citations: {
    surah: string; surah_num: number | null; ayah: number; ayah_to: number | null;
    raw: string; count: number;
  }[];
  stats: {
    paragraphs: number; poetry: number; hadith: number; qira_variants: number;
    quran_citations: number; footnote_markers: number;
  };
}

export function lexiconMufradatRoutes(router: Router<ArLinguisticsEnv>) {

  router.get(
    `/al/lex/v2/read/${SOURCE_SLUG}/:root_norm`,
    (req, env, params) => cached(req, async () => {
      const root_norm = (params.root_norm ?? '').trim();
      if (!root_norm) return badRequest('root_norm required');

      let entry = await env.DB_AL.prepare(
        `SELECT id, root_text, root_norm, root_id, raw_text,
                page_start, page_end, volume_no, source_url, source_native_id,
                family_json, entry_gloss_json
         FROM ar_ling_lexicon_entry
         WHERE source_slug = ? AND root_norm = ? LIMIT 1`
      ).bind(SOURCE_SLUG, root_norm).first<any>().catch(() => undefined);
      if (entry === undefined) {
        entry = await env.DB_AL.prepare(
          `SELECT id, root_text, root_norm, root_id, raw_text,
                  page_start, page_end, volume_no, source_url, source_native_id
           FROM ar_ling_lexicon_entry
           WHERE source_slug = ? AND root_norm = ? LIMIT 1`
        ).bind(SOURCE_SLUG, root_norm).first<any>();
      }
      if (!entry) return notFound('entry not found in Mufradat');

      let sectionsRaw = (await env.DB_AL.prepare(
        `SELECT id, section_seq, heading_ar, heading_norm, section_type,
                text_ar, page_no, translation_en, translation_ur
         FROM ar_ling_lexicon_entry_section
         WHERE source_slug = ? AND root_norm = ?
         ORDER BY section_seq`
      ).bind(SOURCE_SLUG, root_norm).all<any>().then(r => r.results ?? [])
        .catch(softFail(null)));
      if (sectionsRaw === null) {
        sectionsRaw = (await env.DB_AL.prepare(
          `SELECT id, section_seq, heading_ar, heading_norm, section_type,
                  text_ar, page_no
           FROM ar_ling_lexicon_entry_section
           WHERE source_slug = ? AND root_norm = ?
           ORDER BY section_seq`
        ).bind(SOURCE_SLUG, root_norm).all<any>()).results ?? [];
      }

      const blocks = (await env.DB_AL.prepare(
        `SELECT id, section_id, parent_block_id, block_seq, block_type,
                title_ar, text_plain, data_json
         FROM ar_ling_lexicon_block
         WHERE source_slug = ? AND root_norm = ?
         ORDER BY block_seq`
      ).bind(SOURCE_SLUG, root_norm).all<any>()).results ?? [];

      const canonical = entry.root_id
        ? await env.DB_AL.prepare(
            `SELECT id, root_text, root_letters, root_type,
                    frequency_quran, meaning_core_en
             FROM ar_ling_roots WHERE id = ? LIMIT 1`
          ).bind(entry.root_id).first()
        : null;

      const meta = await fetchMufradatMeta(env.DB_AL);
      const view = composeView(entry, sectionsRaw, blocks, canonical, meta);
      return ok(view);
    }),
  );
}

function composeView(
  entry: any,
  rawSections: any[],
  rawBlocks: any[],
  canonical: any | null,
  meta: MufradatSourceMeta,
): MufradatReadView {

  const fnBacking = collectFootnoteBacking(rawBlocks);

  const entryStartPage = Number(entry.page_start) || 1;

  const sections: MufradatSection[] = rawSections.map(s => {
    const sectionBlocks = rawBlocks
      .filter(b => b.section_id === s.id)
      .sort((a, b) => a.block_seq - b.block_seq);
    const paragraphs = composeParagraphs(s.text_ar ?? '', sectionBlocks, fnBacking);

    let curPage = entryStartPage;
    let lastN = 0;
    for (const p of paragraphs) {
      if (!('tokens' in p)) continue;
      for (const tok of p.tokens) {
        if (tok.kind !== 'footnote') continue;
        if (tok.num <= lastN) curPage++;
        lastN = tok.num;
        tok.printed_page = curPage;

        const text =
          fnBacking.byPageNum.get(`${curPage}:${tok.num}`) ??
          fnBacking.byNum.get(tok.num) ?? null;
        tok.text = text;
        tok.has_text = !!text;
      }
    }
    return {
      id: s.id,
      seq: s.section_seq,
      heading_ar: s.heading_ar,
      page_no: s.page_no,
      paragraphs,
      translation_en: s.translation_en ?? null,
      translation_ur: s.translation_ur ?? null,
    };
  });

  const family = parseJsonColumn<MufradatFamily>(entry.family_json);
  const entry_gloss = parseJsonColumn<MufradatEntryGloss>(entry.entry_gloss_json);

  const seedFootnotes = fnBacking.allRows;

  const fnPanelMap = new Map<string, {
    num: number; text: string | null; printed_page: number | null;
  }>();
  const citationsMap = new Map<string, {
    surah: string; surah_num: number | null; ayah: number; ayah_to: number | null;
    raw: string; count: number;
  }>();

  let poetry = 0, hadith = 0, qira = 0, pCount = 0, fnMarkers = 0;
  for (const sec of sections) {
    for (const p of sec.paragraphs) {
      pCount++;
      if (p.kind === 'poetry') poetry++;
      else if (p.kind === 'hadith') hadith++;
      else if (p.kind === 'qira_variant') qira++;
      const tokens = ('tokens' in p) ? p.tokens : [];
      for (const t of tokens) {
        if (t.kind === 'footnote') {
          fnMarkers++;
          const key = `${t.printed_page ?? '?'}:${t.num}`;
          if (!fnPanelMap.has(key)) {
            fnPanelMap.set(key, {
              num: t.num, text: t.text, printed_page: t.printed_page,
            });
          }
        } else if (t.kind === 'quran') {
          const key = `${t.surah_num ?? t.surah}:${t.ayah}-${t.ayah_to ?? ''}`;
          const cur = citationsMap.get(key);
          if (cur) cur.count++;
          else citationsMap.set(key, {
            surah: t.surah, surah_num: t.surah_num, ayah: t.ayah,
            ayah_to: t.ayah_to, raw: t.raw, count: 1,
          });
        }
      }
    }
  }

  return {
    kind: 'mufradat',
    meta,
    entry: {
      id: entry.id, root_text: entry.root_text, root_norm: entry.root_norm,
      page_start: entry.page_start, page_end: entry.page_end, volume_no: entry.volume_no,
      source_url: entry.source_url, source_native_id: entry.source_native_id,
    },
    canonical: canonical as any,
    sections,
    family,
    entry_gloss,
    footnotes: mergeFootnotes([...fnPanelMap.values()], seedFootnotes),
    quran_citations: [...citationsMap.values()]
      .sort((a, b) => (a.surah_num ?? 999) - (b.surah_num ?? 999) || a.ayah - b.ayah),
    stats: {
      paragraphs: pCount, poetry, hadith, qira_variants: qira,
      quran_citations: citationsMap.size, footnote_markers: fnMarkers,
    },
  };
}

function parseJsonColumn<T>(raw: unknown): T | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object') return raw as T;
  try { return JSON.parse(String(raw)) as T; } catch { return null; }
}

type FnRow = { num: number; text: string | null; printed_page: number | null };

function mergeFootnotes(referenced: FnRow[], backing: FnRow[]): FnRow[] {
  const byNum = new Map<number, FnRow>();
  for (const r of backing)    if (!byNum.has(r.num)) byNum.set(r.num, r);
  for (const r of referenced) byNum.set(r.num, r);
  return [...byNum.values()].sort((a, b) =>
    (a.printed_page ?? 0) - (b.printed_page ?? 0) || a.num - b.num);
}

function composeParagraphs(
  _sectionText: string,
  blocks: any[],
  _fnBacking: FootnoteBacking,
): MufradatParagraph[] {
  const out: MufradatParagraph[] = [];
  let proseBuf: string[] = [];

  const flushProse = () => {
    const text = proseBuf.join(' ').replace(/\s+/g, ' ').trim();
    proseBuf = [];
    if (!text) return;
    const split = splitOutEditorial(text);
    for (const piece of split) {
      if (piece.kind === 'editorial') {
        out.push({ kind: 'editorial', tokens: tokenizeProse(piece.text) });
        continue;
      }
      const paras = sentenceSplit(piece.text);
      for (const p of paras) out.push(classifyParagraph(p));
    }
  };

  for (const b of blocks) {
    const type = b.block_type as string;
    const txt = (b.text_plain ?? '').trim();
    if (!txt) continue;
    if (type === 'root_header' || type === 'page_break' ||
        type === 'chapter_header' || type === 'entry_header' || type === 'footnote') {
      continue;
    }
    if (type === 'poetry_quote') {
      flushProse();
      out.push(buildPoetry(txt));
      continue;
    }
    if (type === 'hadith_quote') {
      flushProse();
      out.push({ kind: 'hadith', cue: null, tokens: tokenizeProse(txt) });
      continue;
    }
    proseBuf.push(txt);
  }
  flushProse();
  return out;
}

function sentenceSplit(flat: string): string[] {
  if (!flat) return [];
  return flat.split(/(?<=[.!؟۔])\s+/u).map(p => p.trim()).filter(Boolean);
}

const HADITH_CUE = /(وفي الحديث|الحديث الشريف|روي عن النبي)/u;
const QIRA_CUE   = /(?:في )?قراءة (عبد الله|ابن مسعود|أُبي|أبي|الحسن|من قرأ|من قرأها)/u;

function classifyParagraph(text: string): MufradatParagraph {
  const qm = text.match(QIRA_CUE);
  if (qm && qm.index !== undefined && qm.index < 30) {
    return { kind: 'qira_variant', reader: qm[1] ?? null, tokens: tokenizeProse(text) };
  }
  const hm = text.match(HADITH_CUE);
  if (hm && hm.index !== undefined && hm.index < 80) {
    return { kind: 'hadith', cue: hm[1] ?? null, tokens: tokenizeProse(text) };
  }
  return { kind: 'prose', tokens: tokenizeProse(text) };
}

function buildPoetry(text: string): MufradatParagraph {

  const lines = text
    .split(/\n+|\s+\.{3,}\s+|\s+\*\s+/u)
    .map(s => s.replace(/^\s+|\s+$/g, ''))
    .filter(Boolean);
  return { kind: 'poetry', cue: null, verses: lines, attribution: null };
}

function splitOutEditorial(text: string): { kind: 'prose' | 'editorial'; text: string }[] {

  const re = /\[((?:[^\[\]]){4,200})\](\s*(?:(?:\(\(\s*[0-9٠-٩]+\s*\)\)|«\s*[0-9٠-٩]+\s*»)\s*)*\.?)/gu;
  const out: { kind: 'prose' | 'editorial'; text: string }[] = [];
  let cur = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) != null) {
    const inner = m[1];
    const trailing = m[2] ?? '';
    if (/[\/:]\s*[0-9٠-٩]/.test(inner)) continue;
    if (m.index > cur) out.push({ kind: 'prose', text: text.slice(cur, m.index) });
    const editorialBody = trailing.trim()
      ? `${inner.trim()} ${trailing.trim()}`.replace(/\s*\.\s*$/, '')
      : inner.trim();
    out.push({ kind: 'editorial', text: editorialBody });
    cur = m.index + m[0].length;
  }
  if (cur < text.length) out.push({ kind: 'prose', text: text.slice(cur) });
  return out.filter(p => p.text.trim().length > 0);
}

const D = '[0-9٠-٩]';
const SURAH_NAME = '[\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\u200F\\s]{1,30}?';

const Q_RX  = new RegExp(`\\[\\s*(${SURAH_NAME})\\s*[\\/:]\\s*(${D}{1,3})(?:\\s*[-،]\\s*(${D}{1,3}))?\\s*\\]`, 'gu');
const FN_PAREN = new RegExp(`\\(\\s*\\(\\s*(${D}+)\\s*\\)\\s*\\)`, 'gu');
const FN_GUIL  = new RegExp(`«\\s*(${D}+)\\s*»`, 'gu');

const PAREN_QT = new RegExp(
  `\\(\\s*\\(\\s*(?![0-9٠-٩\\s]*\\)\\s*\\))([^()]*[\\u0600-\\u06FF][^()]*?)\\)\\s*\\)`,
  'gu',
);

function toAscii(s: string): string {
  return s.replace(/[٠-٩]/g, ch => String.fromCharCode(0x30 + ch.charCodeAt(0) - 0x660));
}

interface Match {
  start: number; end: number;
  token: ProseToken;
}

function tokenizeProse(text: string, _fnBacking: FootnoteBacking | null = null): ProseToken[] {
  if (!text) return [];
  const flat = text.replace(/\s+/g, ' ').trim();
  const matches: Match[] = [];

  const scan = (rx: RegExp, build: (m: RegExpExecArray) => ProseToken | null) => {
    rx.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(flat)) != null) {
      const tok = build(m);
      if (tok) matches.push({ start: m.index, end: m.index + m[0].length, token: tok });
    }
  };

  scan(Q_RX, m => {
    const surah = m[1].trim();
    const ayah = parseInt(toAscii(m[2]), 10);
    const ayah_to = m[3] ? parseInt(toAscii(m[3]), 10) : null;
    if (!Number.isFinite(ayah)) return null;
    return {
      kind: 'quran', surah,
      surah_num: normalizeSurahName(surah),
      ayah, ayah_to, raw: m[0],
    };
  });

  scan(FN_PAREN, m => {
    const n = parseInt(toAscii(m[1]), 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return { kind: 'footnote', num: n, has_text: false, text: null, printed_page: null };
  });
  scan(FN_GUIL, m => {
    const n = parseInt(toAscii(m[1]), 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return { kind: 'footnote', num: n, has_text: false, text: null, printed_page: null };
  });
  scan(PAREN_QT, m => ({ kind: 'paren_quote', value: m[1].trim() }));

  matches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const accepted: Match[] = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.start < lastEnd) continue;
    accepted.push(m);
    lastEnd = m.end;
  }

  const out: ProseToken[] = [];
  let cur = 0;
  for (const m of accepted) {
    if (m.start > cur) {
      const slice = flat.slice(cur, m.start);
      if (slice.trim()) out.push({ kind: 'text', value: slice });
    }
    out.push(m.token);
    cur = m.end;
  }
  if (cur < flat.length) {
    const tail = flat.slice(cur);
    if (tail.trim()) out.push({ kind: 'text', value: tail });
  }
  return out;
}

interface FootnoteBacking {

  byPageNum: Map<string, string>;

  byNum: Map<number, string>;

  allRows: Array<{ printed_page: number | null; num: number; text: string }>;
}

function collectFootnoteBacking(blocks: any[]): FootnoteBacking {
  const byPageNum = new Map<string, string>();
  const byNum = new Map<number, string>();
  const allRows: FootnoteBacking['allRows'] = [];
  for (const b of blocks) {
    if (b.block_type !== 'footnote') continue;
    let num: number | null = null;
    let page: number | null = null;
    try {
      const dj = JSON.parse(b.data_json || '{}');
      const rawN = dj.footnote_no ?? dj.footnote_num ?? dj.num;
      const rawP = dj.printed_page;
      if (rawN != null) num = parseInt(toAscii(String(rawN)), 10);
      if (rawP != null) page = parseInt(toAscii(String(rawP)), 10);
    } catch {  }
    if (num == null) {
      const probe = (b.title_ar || b.text_plain || '').trim();
      const m = probe.match(/^[(\[«]?\s*([0-9٠-٩]+)/);
      if (m) num = parseInt(toAscii(m[1]), 10);
    }
    if (page == null && b.printed_page != null) page = Number(b.printed_page);
    if (num == null || !Number.isFinite(num)) continue;
    const text = (b.text_plain ?? '').trim();
    if (!text) continue;
    byNum.set(num, text);
    if (page != null && Number.isFinite(page)) byPageNum.set(`${page}:${num}`, text);
    allRows.push({ printed_page: page ?? null, num, text });
  }

  allRows.sort((a, b) =>
    (a.printed_page ?? 0) - (b.printed_page ?? 0) || a.num - b.num);
  return { byPageNum, byNum, allRows };
}
