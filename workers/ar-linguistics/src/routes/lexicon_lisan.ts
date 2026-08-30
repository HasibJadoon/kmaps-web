import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import type { ArLinguisticsEnv } from '../env';
import { SourcesRepo } from '../repositories/sources.repo';

type FootnoteSource = 'inline_brackets' | 'footnote_blocks' | 'none';
type QuranBlockShape = 'inline_verse' | 'cue_only_verse_in_braces';
type Origin = 'ketabonline' | 'thahabi' | 'saaid' | 'qomra' | 'lane';

interface SourceConfig {
  slug: string;
  title_ar: string;
  title_en: string;
  author: string;
  period: string;
  origin: Origin;

  footnote_source: FootnoteSource;

  quran_block_shape: QuranBlockShape;
}

const LISAN_SLUGS: readonly string[] = [
  'ibn_manzur_lisan_arab',
  'jawhari_sihah',
  'khalil_kitab_ayn',
  'maqayis_lugha',
  'ubab_zakhir',

  'zabidi_taj_arus',
  'fayyumi_misbah_munir',
  'ibn_durayd_jamharat_lugha',
  'qamus_muhit',
] as const;

interface ProseToken_Text { kind: 'text'; value: string; }
interface ProseToken_Footnote {
  kind: 'footnote';
  num: number;
  has_text: boolean;
  text: string | null;
  pivot: string | null;
}
interface ProseToken_Quran {
  kind: 'quran';
  surah: number | null;
  ayah: number | null;
  raw: string;
}
interface ProseToken_Authority {
  kind: 'authority';
  name: string;
  label: string;
  authority_kind: AuthorityKind;
}
interface ProseToken_LineBreak { kind: 'br'; }
type ProseToken =
  | ProseToken_Text | ProseToken_Footnote | ProseToken_Quran
  | ProseToken_Authority | ProseToken_LineBreak;

type LisanParagraph =
  | { kind: 'prose';   tokens: ProseToken[] }
  | { kind: 'quran';   verse_text: string; surah: number | null; ayah: number | null; tokens: ProseToken[] }
  | { kind: 'hadith';  cue: string | null; tokens: ProseToken[] }
  | { kind: 'poetry';  cue: string | null; verses: string[]; attribution: string | null };

interface LisanSection {
  id: string;
  seq: number;
  heading_ar: string | null;
  page_no: number | null;
  paragraphs: LisanParagraph[];
}

interface LisanReadView {
  kind: 'lisan';
  meta: {
    slug: string;
    title_ar: string;
    title_en: string;
    author: string;
    period: string;
    origin: Origin;
  };
  entry: {
    id: string; root_text: string; root_norm: string;
    page_start: number | null; page_end: number | null; volume_no: number | null;
    source_url: string | null; source_native_id: string | null;
  };
  canonical: unknown | null;
  sections: LisanSection[];
  footnotes: { num: number; text: string; pivot: string | null }[];
  quran_citations: {
    surah: number; ayah: number; raw: string;
    context_snippet: string | null; count: number;
  }[];
  hadith_quotes: { id: string; text: string; cue: string | null; page: number | null }[];
  poetry_shawahid: {
    id: string; verses: string[]; attribution: string | null; cue: string | null;
    page: number | null;
  }[];
  authorities: {
    name: string; name_label: string; kind: AuthorityKind;
    count: number; first_page: number | null;
  }[];
  stats: {
    paragraphs: number; hadith: number; poetry: number;
    quran_citations: number; footnotes: number;
    authorities: number; authority_total: number;
  };
}

export function lexiconLisanRoutes(router: Router<ArLinguisticsEnv>) {
  for (const slug of LISAN_SLUGS) {
    registerSourceRoute(router, slug);
  }
}

async function resolveSourceConfig(db: D1Database, slug: string): Promise<SourceConfig> {
  const row = await new SourcesRepo(db).bySlug(slug);
  return {
    slug,
    title_ar: row?.title_ar ?? slug,
    title_en: row?.title_en ?? slug,
    author:   row?.author_name ?? '',
    period:   row?.period_label ?? '',
    origin:   (row?.origin as Origin) ?? 'ketabonline',
    footnote_source:   (row?.footnote_source as FootnoteSource) ?? 'none',
    quran_block_shape: (row?.quran_block_shape as QuranBlockShape) ?? 'inline_verse',
  };
}

function registerSourceRoute(router: Router<ArLinguisticsEnv>, slug: string) {
  router.get(
    `/al/lex/v2/read/${slug}/:root_norm`,
    async (_req, env, params) => {
      const root_norm = (params.root_norm ?? '').trim();
      if (!root_norm) return badRequest('root_norm required');

      const cfg = await resolveSourceConfig(env.DB_AL, slug);

      const entry = await env.DB_AL.prepare(
        `SELECT id, root_text, root_norm, root_id, raw_text,
                page_start, page_end, volume_no, source_url, source_native_id
         FROM ar_ling_lexicon_entry
         WHERE source_slug = ? AND root_norm = ? LIMIT 1`
      ).bind(cfg.slug, root_norm).first<any>();
      if (!entry) return notFound(`entry not found in ${cfg.title_en}`);

      const sectionsRaw = (await env.DB_AL.prepare(
        `SELECT id, section_seq, heading_ar, heading_norm, section_type,
                text_ar, page_no
         FROM ar_ling_lexicon_entry_section
         WHERE source_slug = ? AND root_norm = ?
         ORDER BY section_seq`
      ).bind(cfg.slug, root_norm).all<any>()).results ?? [];

      const blocks = (await env.DB_AL.prepare(
        `SELECT id, section_id, parent_block_id, block_seq, block_type,
                title_ar, text_plain, data_json, printed_page
         FROM ar_ling_lexicon_block
         WHERE source_slug = ? AND root_norm = ?
         ORDER BY block_seq`
      ).bind(cfg.slug, root_norm).all<any>()).results ?? [];

      const quranRefs = (await env.DB_AL.prepare(
        `SELECT block_id, surah, ayah, raw_ref, context_snippet
         FROM ar_ling_lexicon_quran_ref
         WHERE source_slug = ? AND root_norm = ?
         ORDER BY surah, ayah`
      ).bind(cfg.slug, root_norm).all<any>()).results ?? [];

      const canonical = entry.root_id
        ? await env.DB_AL.prepare(
            `SELECT id, root_text, root_letters, root_type,
                    frequency_quran, meaning_core_en
             FROM ar_ling_roots WHERE id = ? LIMIT 1`
          ).bind(entry.root_id).first()
        : null;

      const view = composeView(cfg, entry, sectionsRaw, blocks, quranRefs, canonical);
      return ok(view);
    },
  );
}

function composeView(
  cfg: SourceConfig,
  entry: any,
  rawSections: any[],
  rawBlocks: any[],
  quranRefs: any[],
  canonical: any | null,
): LisanReadView {

  const standaloneFootnotes: { num: number; text: string; pivot: string | null }[] = [];
  if (cfg.footnote_source === 'footnote_blocks') {
    let n = 1;
    for (const b of rawBlocks) {
      if (b.block_type !== 'footnote') continue;
      const text = (b.text_plain ?? '').trim();
      if (!text) continue;
      let parsedNum: number | null = null;
      try {
        const dj = JSON.parse(b.data_json || '{}');
        const raw = dj.footnote_no ?? dj.footnote_num ?? dj.num;
        if (raw != null) parsedNum = +String(raw).replace(/[٠-٩]/g, ch =>
          String.fromCharCode(0x30 + ch.charCodeAt(0) - 0x660));
      } catch {  }
      standaloneFootnotes.push({
        num: parsedNum ?? n, text, pivot: null,
      });
      n++;
    }
  }

  const braceVerseByBlockId = new Map<string, { text: string; refs: { surah: number; ayah: number; raw: string }[] }>();
  if (cfg.quran_block_shape === 'cue_only_verse_in_braces') {
    for (const b of rawBlocks) {
      const t = (b.text_plain ?? '').trim();
      if (!t.startsWith('{') || !t.endsWith('}')) continue;
      braceVerseByBlockId.set(b.id, {
        text: t.slice(1, -1).trim(), refs: [],
      });
    }
    for (const r of quranRefs) {
      const v = r.block_id ? braceVerseByBlockId.get(r.block_id) : null;
      if (v) v.refs.push({ surah: r.surah, ayah: r.ayah, raw: r.raw_ref });
    }
  }

  const refsByBlock = new Map<string, { surah: number; ayah: number; raw: string }[]>();
  for (const r of quranRefs) {
    if (!r.block_id) continue;
    const arr = refsByBlock.get(r.block_id) ?? [];
    arr.push({ surah: r.surah, ayah: r.ayah, raw: r.raw_ref });
    refsByBlock.set(r.block_id, arr);
  }

  const allFootnotes: { num: number; text: string; pivot: string | null }[] = [];
  let footnoteCounter = 1;

  const hadith_quotes: LisanReadView['hadith_quotes'] = [];
  const poetry_shawahid: LisanReadView['poetry_shawahid'] = [];
  const authorityHits = new Map<string, {
    name: string; name_label: string; kind: AuthorityKind;
    count: number; first_page: number | null;
  }>();
  const citationsAgg = new Map<string, {
    surah: number; ayah: number; raw: string; context_snippet: string | null; count: number;
  }>();
  for (const r of quranRefs) {
    const key = `${r.surah}:${r.ayah}`;
    const cur = citationsAgg.get(key);
    if (cur) cur.count++;
    else citationsAgg.set(key, {
      surah: r.surah, ayah: r.ayah, raw: r.raw_ref,
      context_snippet: r.context_snippet, count: 1,
    });
  }

  let pCount = 0, hadithCount = 0, poetryCount = 0;

  const sections: LisanSection[] = rawSections.map(s => {
    const sectionBlocks = rawBlocks
      .filter(b => b.section_id === s.id)
      .sort((a, b) => a.block_seq - b.block_seq);

    const paragraphs: LisanParagraph[] = [];

    let prevProseTail = '';

    for (const b of sectionBlocks) {
      if (b.block_type === 'root_header') continue;

      if (cfg.footnote_source === 'footnote_blocks' && b.block_type === 'footnote') continue;

      if (cfg.quran_block_shape === 'cue_only_verse_in_braces' && braceVerseByBlockId.has(b.id)) {
        continue;
      }
      const text = (b.text_plain ?? '').trim();
      if (!text) continue;

      if (isNoiseText(text)) continue;

      if (b.block_type === 'hadith_quote' && hasHadithCue(text)) {
        const cue = detectHadithCue(text);
        const { tokens, footnotes } = tokenize(text, b, refsByBlock, footnoteCounter);
        footnoteCounter += footnotes.length;
        allFootnotes.push(...footnotes);
        paragraphs.push({ kind: 'hadith', cue, tokens });
        hadithCount++;
        hadith_quotes.push({
          id: b.id, text,
          cue, page: b.printed_page ?? null,
        });
      } else if (b.block_type === 'poetry_quote'
                 && (looksLikePoetry(text) || prevBlockEndsWithPoetryCue(prevProseTail))) {
        const { verses, attribution, cue: ownCue } = parsePoetry(text);

        const cue = ownCue ?? extractTrailingPoetryCue(prevProseTail);
        paragraphs.push({ kind: 'poetry', cue, verses, attribution });
        poetryCount++;
        poetry_shawahid.push({
          id: b.id, verses, attribution, cue, page: b.printed_page ?? null,
        });
      } else if (b.block_type === 'quran_quote') {

        if (cfg.quran_block_shape === 'cue_only_verse_in_braces') {

          const cueIdx = sectionBlocks.indexOf(b);
          const next   = cueIdx >= 0 ? sectionBlocks[cueIdx + 1] : null;
          const braceV = next ? braceVerseByBlockId.get(next.id) : null;
          if (braceV) {

            const refs = braceV.refs;
            paragraphs.push({
              kind: 'quran',
              verse_text: braceV.text,
              surah: refs[0]?.surah ?? null,
              ayah:  refs[0]?.ayah  ?? null,
              tokens: [{ kind: 'text', value: braceV.text }],
            });
          } else {

            const { tokens, footnotes } = tokenize(text, b, refsByBlock, footnoteCounter);
            footnoteCounter += footnotes.length;
            allFootnotes.push(...footnotes);
            paragraphs.push({ kind: 'prose', tokens });
          }
        } else {

          const refs = refsByBlock.get(b.id) ?? [];
          const { tokens, footnotes } = tokenize(text, b, refsByBlock, footnoteCounter);
          footnoteCounter += footnotes.length;
          allFootnotes.push(...footnotes);
          paragraphs.push({
            kind: 'quran',
            verse_text: stripInlineMarkers(text),
            surah: refs[0]?.surah ?? null,
            ayah:  refs[0]?.ayah  ?? null,
            tokens,
          });
        }
      } else {

        const { tokens, footnotes } = tokenize(text, b, refsByBlock, footnoteCounter);
        footnoteCounter += footnotes.length;
        allFootnotes.push(...footnotes);
        paragraphs.push({ kind: 'prose', tokens });

        prevProseTail = text.length > 120 ? text.slice(-120) : text;
      }
      pCount++;

      for (const { name, label, kind } of detectAuthorities(text)) {
        const cur = authorityHits.get(name);
        if (cur) cur.count++;
        else authorityHits.set(name, {
          name, name_label: label, kind, count: 1,
          first_page: b.printed_page ?? null,
        });
      }
    }

    return {
      id: s.id,
      seq: s.section_seq,
      heading_ar: s.heading_ar ?? null,
      page_no: s.page_no ?? null,
      paragraphs,
    };
  });

  const authorities = [...authorityHits.values()].sort((a, b) => b.count - a.count);
  const quran_citations = [...citationsAgg.values()].sort(
    (a, b) => a.surah - b.surah || a.ayah - b.ayah,
  );

  if (standaloneFootnotes.length > 0) {
    allFootnotes.push(...standaloneFootnotes);
  }

  return {
    kind: 'lisan',
    meta: {
      slug: cfg.slug,
      title_ar: cfg.title_ar,
      title_en: cfg.title_en,
      author: cfg.author,
      period: cfg.period,
      origin: cfg.origin,
    },
    entry: {
      id: entry.id, root_text: entry.root_text, root_norm: entry.root_norm,
      page_start: entry.page_start, page_end: entry.page_end, volume_no: entry.volume_no,
      source_url: entry.source_url, source_native_id: entry.source_native_id,
    },
    canonical: canonical as any,
    sections,
    footnotes: allFootnotes,
    quran_citations,
    hadith_quotes,
    poetry_shawahid,
    authorities,
    stats: {
      paragraphs: pCount,
      hadith: hadithCount,
      poetry: poetryCount,
      quran_citations: quran_citations.length,
      footnotes: allFootnotes.length,
      authorities: authorities.length,
      authority_total: authorities.reduce((s, a) => s + a.count, 0),
    },
  };
}

const NOISE_CHARS = '[]{}*.,:;()\\-–—‎‏0123456789 \t\'"';
function isNoiseText(text: string): boolean {
  if (!text) return true;
  if (text.length > 5) return false;
  for (let i = 0; i < text.length; i++) {
    if (NOISE_CHARS.indexOf(text[i]) === -1) return false;
  }
  return true;
}

const INLINE_FN_RX = /\[\[([\s\S]*?)\]\]/g;
const PIVOT_RX     = /^\s*\.\s*قوله\s*[:：]?\s*\[?([^\]]+)\]?\s*/;

function extractInlineFootnotes(text: string): {
  cleaned: string;
  notes: { pivot: string | null; text: string }[];
} {
  const notes: { pivot: string | null; text: string }[] = [];
  const cleaned = text.replace(INLINE_FN_RX, (_full, body: string) => {
    const m = PIVOT_RX.exec(body);
    let pivot: string | null = null;
    let rest = body.trim();
    if (m) {
      pivot = m[1].trim();
      rest  = body.slice(m[0].length).trim();
    }
    rest = rest.replace(/\(\*\)\s*$/, '').replace(/^\.+/, '').trim();
    notes.push({ pivot, text: rest });
    return 'FN';
  });
  return { cleaned, notes };
}

function stripInlineMarkers(text: string): string {
  return text.replace(INLINE_FN_RX, '').replace(/\s+/g, ' ').trim();
}

function tokenize(
  text: string,
  block: any,
  refsByBlock: Map<string, { surah: number; ayah: number; raw: string }[]>,
  startNum: number,
): { tokens: ProseToken[]; footnotes: { num: number; text: string; pivot: string | null }[] } {
  const { cleaned, notes } = extractInlineFootnotes(text);
  const footnotes = notes.map((n, i) => ({
    num: startNum + i,
    text: n.text,
    pivot: n.pivot,
  }));

  const tokens: ProseToken[] = [];
  const parts = cleaned.split(/(FN)/);
  let fnIdx = 0;
  for (const part of parts) {
    if (part === 'FN') {
      const fn = footnotes[fnIdx++];
      if (fn) tokens.push({
        kind: 'footnote', num: fn.num,
        has_text: !!fn.text, text: fn.text || null, pivot: fn.pivot,
      });
      continue;
    }
    if (!part) continue;

    pushTextWithAuthorities(part, tokens);
  }
  return { tokens, footnotes };
}

function pushTextWithAuthorities(part: string, out: ProseToken[]) {
  const hits = scanAuthoritySpans(part);
  if (hits.length === 0) {
    out.push({ kind: 'text', value: part });
    return;
  }
  let cur = 0;
  for (const h of hits) {
    if (h.start > cur) out.push({ kind: 'text', value: part.slice(cur, h.start) });
    out.push({ kind: 'authority', name: h.name, label: h.label, authority_kind: h.kind });
    cur = h.end;
  }
  if (cur < part.length) out.push({ kind: 'text', value: part.slice(cur) });
}

const HADITH_CUES = [
  'وفي الحديث', 'وفي حديث', 'في الحديث', 'الحديث', 'النبي',
  'رسول الله', 'صلى الله عليه', 'حدثنا', 'روى عن',
];
const DIACR_RX = /[ً-ْٰۖ-ۭـ]/g;
function stripDiac(s: string): string { return s.replace(DIACR_RX, ''); }

function hasHadithCue(text: string): boolean {
  const t = stripDiac(text);
  return HADITH_CUES.some(c => t.includes(c));
}
function detectHadithCue(text: string): string | null {
  const t = stripDiac(text);
  for (const c of HADITH_CUES) {
    const i = t.indexOf(c);
    if (i >= 0 && i < 80) return c;
  }
  return null;
}

const POETRY_CUES = [
  'قال الشاعر', 'قول الشاعر', 'وأنشد', 'أنشد', 'قال الراجز',
  'قال امرؤ القيس', 'قال جرير', 'قال الفرزدق', 'قال ذو الرمة',
  'قال لبيد', 'قال الأعشى', 'قال الكميت', 'قال رؤبة', 'قال العجاج',
  'قال ابن مقبل', 'قال الهذلي', 'قال زهير', 'قال النابغة',
  'قال طرفة', 'قال عنترة', 'قال الخنساء',
];

const GENERIC_QAILA_RX = /قال\s+[ء-ي\s]{2,30}:\s*$/;
const HEMISTICH_DIVIDER = /\s+\.{3,}\s+|\s+\*\s+|\n+/;

function looksLikePoetry(text: string): boolean {
  const t = stripDiac(text);
  if (POETRY_CUES.some(c => t.includes(c))) return true;

  if (HEMISTICH_DIVIDER.test(text)) return true;
  return false;
}

function prevBlockEndsWithPoetryCue(tail: string): boolean {
  if (!tail) return false;
  const t = stripDiac(tail).trim();

  for (const cue of POETRY_CUES) {
    if (t.endsWith(cue) || t.endsWith(cue + ':') || t.endsWith(cue + ' :')) return true;
  }
  return GENERIC_QAILA_RX.test(t);
}

function extractTrailingPoetryCue(tail: string): string | null {
  if (!tail) return null;
  const t = stripDiac(tail).trim();
  for (const cue of POETRY_CUES) {
    const i = t.lastIndexOf(cue);
    if (i >= 0 && i > t.length - cue.length - 6) return cue;
  }
  const m = t.match(/(قال\s+[ء-ي\s]{2,30})\s*:\s*$/);
  return m ? m[1].trim() : null;
}

function parsePoetry(text: string): {
  verses: string[]; attribution: string | null; cue: string | null;
} {
  const t = stripDiac(text);
  let cue: string | null = null;
  let attribution: string | null = null;
  for (const c of POETRY_CUES) {
    if (t.includes(c)) { cue = c; break; }
  }

  const attrMatch = t.match(/قال\s+([^\s:]+(?:\s+[^\s:]+){0,2})\s*:/);
  if (attrMatch) attribution = attrMatch[1].trim();

  const verses = text.split(HEMISTICH_DIVIDER)
    .map(v => v.replace(/^\s+|\s+$/g, ''))
    .filter(v => v.length > 4);
  return { verses, attribution, cue };
}

type AuthoritySpec = { name: string; kind: AuthorityKind; variants: string[]; anchored?: boolean };
type AuthorityKind =
  | 'lexicographer' | 'grammarian' | 'quran_reader'
  | 'hadith_scholar' | 'companion' | 'tabii' | 'poet' | 'prophet';

const AUTHORITIES: AuthoritySpec[] = [

  { name: 'al-Azhari',            kind: 'lexicographer', variants: ['الأزهري', 'أبو منصور الأزهري'] },
  { name: 'Ibn al-A‘rabi',        kind: 'lexicographer', variants: ['ابن الأعرابي'] },
  { name: 'Ibn Barri',            kind: 'lexicographer', variants: ['ابن بري'] },
  { name: 'Ibn Sidah',            kind: 'lexicographer', variants: ['ابن سيده', 'ابن سيدة'] },
  { name: 'al-Jawhari',           kind: 'lexicographer', variants: ['الجوهري'] },
  { name: 'Abu ‘Ubayd',           kind: 'lexicographer', variants: ['أبو عبيد القاسم بن سلام', 'أبو عبيد'] },
  { name: 'al-Asma‘i',            kind: 'lexicographer', variants: ['الأصمعي'] },
  { name: 'Tha‘lab',              kind: 'lexicographer', variants: ['ثعلب', 'أبو العباس ثعلب'] },
  { name: 'Shammar',              kind: 'lexicographer', variants: ['شمر'], anchored: true },
  { name: 'al-Lihyani',           kind: 'lexicographer', variants: ['اللحياني'] },
  { name: 'Abu Zayd al-Ansari',   kind: 'lexicographer', variants: ['أبو زيد الأنصاري', 'أبو زيد'] },
  { name: 'Abu Hanifa Dinawari',  kind: 'lexicographer', variants: ['أبو حنيفة الدينوري', 'أبو حنيفة'] },
  { name: 'Ibn al-Sikkit',        kind: 'lexicographer', variants: ['ابن السكيت'] },
  { name: 'al-Khalil',            kind: 'lexicographer', variants: ['الخليل بن أحمد', 'الخليل'] },
  { name: 'Ibn Durayd',           kind: 'lexicographer', variants: ['ابن دريد'] },
  { name: 'Ibn Faris',            kind: 'lexicographer', variants: ['ابن فارس'] },
  { name: 'al-Saghani',           kind: 'lexicographer', variants: ['الصاغاني'] },
  { name: 'al-Zabidi',            kind: 'lexicographer', variants: ['الزبيدي'] },
  { name: 'al-Mubarrad',          kind: 'lexicographer', variants: ['المبرد', 'أبو العباس المبرد'] },
  { name: 'Yunus ibn Habib',      kind: 'lexicographer', variants: ['يونس بن حبيب', 'يونس'], anchored: true },
  { name: 'Abu Misḥal',           kind: 'lexicographer', variants: ['أبو مسحل'] },
  { name: 'al-Riyashi',           kind: 'lexicographer', variants: ['الرياشي'] },
  { name: 'Ibn Hamdun',           kind: 'lexicographer', variants: ['ابن حمدون'] },

  { name: 'Sibawayh',             kind: 'grammarian',    variants: ['سيبويه'] },
  { name: 'al-Farra',             kind: 'grammarian',    variants: ['الفراء', 'أبو زكريا الفراء'] },
  { name: 'al-Akhfash',           kind: 'grammarian',    variants: ['الأخفش الأكبر', 'الأخفش الأوسط', 'الأخفش'] },
  { name: 'Ibn Jinni',            kind: 'grammarian',    variants: ['ابن جني'] },
  { name: 'al-Zajjaj',            kind: 'grammarian',    variants: ['الزجاج', 'أبو إسحاق الزجاج'] },
  { name: 'al-Zajjaji',           kind: 'grammarian',    variants: ['الزجاجي'] },
  { name: 'al-Mazini',            kind: 'grammarian',    variants: ['أبو عثمان المازني', 'المازني'] },
  { name: 'Abu ‘Ali al-Farisi',   kind: 'grammarian',    variants: ['أبو علي الفارسي', 'الفارسي'] },
  { name: 'Ibn al-Anbari',        kind: 'grammarian',    variants: ['ابن الأنباري', 'أبو بكر بن الأنباري'] },
  { name: 'Ibn al-Sarraj',        kind: 'grammarian',    variants: ['ابن السراج'] },
  { name: 'al-Jarmi',             kind: 'grammarian',    variants: ['الجرمي'] },
  { name: 'al-Mubarrad',          kind: 'grammarian',    variants: ['المبرد'] },
  { name: 'al-Suhayli',           kind: 'grammarian',    variants: ['السهيلي'] },

  { name: 'al-Kisa’i',            kind: 'quran_reader',  variants: ['الكسائي'] },
  { name: 'Nafi‘',                kind: 'quran_reader',  variants: ['نافع المدني', 'نافع'], anchored: true },
  { name: 'Ibn Kathir (qari)',    kind: 'quran_reader',  variants: ['ابن كثير المكي'] },
  { name: 'Abu ‘Amr',             kind: 'quran_reader',  variants: ['أبو عمرو بن العلاء', 'أبو عمرو'] },
  { name: '‘Asim',                kind: 'quran_reader',  variants: ['عاصم بن أبي النجود', 'عاصم'], anchored: true },
  { name: 'Hamza',                kind: 'quran_reader',  variants: ['حمزة الزيات', 'حمزة'], anchored: true },
  { name: 'Ibn ‘Amir',            kind: 'quran_reader',  variants: ['ابن عامر الشامي', 'ابن عامر'] },
  { name: 'Ya‘qub',               kind: 'quran_reader',  variants: ['يعقوب الحضرمي', 'يعقوب'], anchored: true },
  { name: 'Khalaf',               kind: 'quran_reader',  variants: ['خلف العاشر', 'خلف'], anchored: true },
  { name: 'Abu Ja‘far',           kind: 'quran_reader',  variants: ['أبو جعفر المدني', 'أبو جعفر'] },
  { name: 'al-Hasan al-Basri (q)',kind: 'quran_reader',  variants: ['قراءة الحسن', 'الحسن البصري'] },

  { name: 'Ibn al-Athir',         kind: 'hadith_scholar',variants: ['ابن الأثير'] },
  { name: 'al-Khattabi',          kind: 'hadith_scholar',variants: ['الخطابي'] },
  { name: 'al-Tabari',            kind: 'hadith_scholar',variants: ['الطبري', 'أبو جعفر الطبري'] },
  { name: 'al-Zuhri',             kind: 'hadith_scholar',variants: ['الزهري', 'ابن شهاب'] },
  { name: 'al-Harbi',             kind: 'hadith_scholar',variants: ['إبراهيم الحربي', 'الحربي'] },
  { name: 'Ibn Qutayba',          kind: 'hadith_scholar',variants: ['ابن قتيبة'] },
  { name: 'al-Jahiz',             kind: 'hadith_scholar',variants: ['الجاحظ'] },
  { name: 'al-Zamakhshari',       kind: 'hadith_scholar',variants: ['الزمخشري'] },
  { name: 'Ibn ‘Adi',             kind: 'hadith_scholar',variants: ['ابن عدي'] },
  { name: 'al-Bayhaqi',           kind: 'hadith_scholar',variants: ['البيهقي'] },
  { name: 'Ibn al-Mubarak',       kind: 'hadith_scholar',variants: ['ابن المبارك'] },

  { name: 'Ibn ‘Abbas',           kind: 'companion',     variants: ['ابن عباس', 'عبد الله بن عباس'] },
  { name: 'Ibn Mas‘ud',           kind: 'companion',     variants: ['ابن مسعود', 'عبد الله بن مسعود'] },
  { name: 'Ibn ‘Umar',            kind: 'companion',     variants: ['ابن عمر', 'عبد الله بن عمر'] },
  { name: '‘Ali ibn Abi Talib',   kind: 'companion',     variants: ['علي بن أبي طالب'] },
  { name: '‘Umar ibn al-Khattab', kind: 'companion',     variants: ['عمر بن الخطاب'] },
  { name: 'Abu Bakr',             kind: 'companion',     variants: ['أبو بكر الصديق'] },
  { name: '‘Uthman',              kind: 'companion',     variants: ['عثمان بن عفان'] },
  { name: '‘A’isha',              kind: 'companion',     variants: ['عائشة'] },
  { name: 'Abu Hurayra',          kind: 'companion',     variants: ['أبو هريرة'] },
  { name: 'Anas',                 kind: 'companion',     variants: ['أنس بن مالك'] },
  { name: 'Jabir',                kind: 'companion',     variants: ['جابر بن عبد الله'] },
  { name: 'Ubayy',                kind: 'companion',     variants: ['أبي بن كعب'] },
  { name: 'Zayd ibn Thabit',      kind: 'companion',     variants: ['زيد بن ثابت'] },
  { name: 'Mu‘adh ibn Jabal',     kind: 'companion',     variants: ['معاذ بن جبل'] },

  { name: 'al-Hasan al-Basri',    kind: 'tabii',         variants: ['الحسن البصري'] },
  { name: 'Ibn Sirin',            kind: 'tabii',         variants: ['ابن سيرين'] },
  { name: 'Mujahid',              kind: 'tabii',         variants: ['مجاهد'], anchored: true },
  { name: 'Qatada',               kind: 'tabii',         variants: ['قتادة'], anchored: true },
  { name: '‘Ikrima',              kind: 'tabii',         variants: ['عكرمة'] },
  { name: 'al-Suddi',             kind: 'tabii',         variants: ['السدي'] },
  { name: 'al-Sha‘bi',            kind: 'tabii',         variants: ['الشعبي'] },
  { name: 'Sa‘id ibn al-Musayyib',kind: 'tabii',         variants: ['سعيد بن المسيب'] },
  { name: 'Ibrahim al-Nakha‘i',   kind: 'tabii',         variants: ['إبراهيم النخعي', 'النخعي'] },
  { name: 'al-A‘mash',            kind: 'tabii',         variants: ['الأعمش'] },

  { name: 'Imru’ al-Qays',        kind: 'poet',          variants: ['امرؤ القيس'] },
  { name: 'al-Nabigha',           kind: 'poet',          variants: ['النابغة الذبياني', 'النابغة'] },
  { name: 'Zuhayr',               kind: 'poet',          variants: ['زهير بن أبي سلمى', 'زهير'], anchored: true },
  { name: '‘Antara',              kind: 'poet',          variants: ['عنترة بن شداد', 'عنترة'] },
  { name: 'Tarafa',               kind: 'poet',          variants: ['طرفة بن العبد', 'طرفة'] },
  { name: 'Labid',                kind: 'poet',          variants: ['لبيد بن ربيعة', 'لبيد'] },
  { name: 'al-A‘sha',             kind: 'poet',          variants: ['الأعشى'], anchored: true },
  { name: '‘Amr ibn Kulthum',     kind: 'poet',          variants: ['عمرو بن كلثوم'] },
  { name: 'al-Harith ibn Hilliza',kind: 'poet',          variants: ['الحارث بن حلزة'] },
  { name: 'al-Khansa',            kind: 'poet',          variants: ['الخنساء'] },
  { name: 'Hassan ibn Thabit',    kind: 'poet',          variants: ['حسان بن ثابت'] },
  { name: 'Ka‘b ibn Zuhayr',      kind: 'poet',          variants: ['كعب بن زهير'] },
  { name: 'al-Nabigha al-Ja‘di',  kind: 'poet',          variants: ['النابغة الجعدي'] },
  { name: 'al-Shanfara',          kind: 'poet',          variants: ['الشنفرى'] },
  { name: 'Ta’abbata Sharran',    kind: 'poet',          variants: ['تأبط شرا'] },
  { name: '‘Adi ibn Zayd',        kind: 'poet',          variants: ['عدي بن زيد'] },
  { name: 'al-Aswad ibn Ya‘fur',  kind: 'poet',          variants: ['الأسود بن يعفر'] },

  { name: 'Jarir',                kind: 'poet',          variants: ['جرير'], anchored: true },
  { name: 'al-Farazdaq',          kind: 'poet',          variants: ['الفرزدق'] },
  { name: 'al-Akhtal',            kind: 'poet',          variants: ['الأخطل'] },
  { name: 'Dhu al-Rumma',         kind: 'poet',          variants: ['ذو الرمة'] },
  { name: '‘Umar ibn Abi Rabi‘a', kind: 'poet',          variants: ['عمر بن أبي ربيعة'] },
  { name: 'al-Kumayt',            kind: 'poet',          variants: ['الكميت'] },
  { name: 'al-‘Ajjaj',            kind: 'poet',          variants: ['العجاج'] },
  { name: 'Ru’ba',                kind: 'poet',          variants: ['رؤبة بن العجاج', 'رؤبة'] },
  { name: 'Dhu al-Isba‘',         kind: 'poet',          variants: ['ذو الإصبع العدواني'] },

  { name: 'Abu Nuwas',            kind: 'poet',          variants: ['أبو نواس'] },
  { name: 'Bashshar',             kind: 'poet',          variants: ['بشار بن برد'] },
  { name: 'Abu Tammam',           kind: 'poet',          variants: ['أبو تمام'] },
  { name: 'al-Buhturi',           kind: 'poet',          variants: ['البحتري'] },
  { name: 'al-Mutanabbi',         kind: 'poet',          variants: ['المتنبي'] },
  { name: 'al-Ma‘arri',           kind: 'poet',          variants: ['أبو العلاء المعري', 'المعري'] },
  { name: 'Ibn al-Rumi',          kind: 'poet',          variants: ['ابن الرومي'] },

  { name: 'The Prophet ﷺ',        kind: 'prophet',       variants: ['النبي صلى الله عليه وسلم', 'النبي ﷺ', 'رسول الله'] },

  { name: 'al-Layth',              kind: 'lexicographer', variants: ['الليث بن المظفر', 'الليث'], anchored: true },
  { name: 'Ibn Shumayl (short)',   kind: 'lexicographer', variants: ['ابن شميل'] },
  { name: 'Abu al-Haytham',        kind: 'lexicographer', variants: ['أبو الهيثم الرازي', 'أبو الهيثم'] },
  { name: 'Abu Saʿid al-Sirafi',   kind: 'grammarian',    variants: ['أبو سعيد السيرافي', 'أبو سعيد'] },
  { name: 'Ibn Buzurj',            kind: 'lexicographer', variants: ['ابن بزرج'] },
  { name: 'Abu Hatim al-Sijistani',kind: 'lexicographer', variants: ['أبو حاتم السجستاني', 'أبو حاتم'] },
  { name: 'Ibn Muqbil',            kind: 'poet',          variants: ['تميم بن أبي بن مقبل', 'ابن مقبل'] },
  { name: 'Abu al-Najm al-ʿIjli',  kind: 'poet',          variants: ['أبو النجم العجلي', 'أبو النجم'] },
  { name: 'Kuraʿ al-Naml',         kind: 'lexicographer', variants: ['كراع النمل', 'كراع'], anchored: true },
  { name: 'Ibn Kaysan',            kind: 'grammarian',    variants: ['ابن كيسان'] },
  { name: 'al-Shammakh',           kind: 'poet',          variants: ['الشماخ بن ضرار', 'الشماخ'] },
  { name: 'Ibn Khalawayh',         kind: 'grammarian',    variants: ['ابن خالويه'] },
  { name: 'Abu Dhu’ayb al-Hudhali',kind: 'poet',          variants: ['أبو ذؤيب الهذلي', 'أبو ذؤيب'] },
  { name: 'al-Raʿi al-Numayri',    kind: 'poet',          variants: ['الراعي النميري', 'الراعي'], anchored: true },
  { name: 'Abu ʿUbayda Maʿmar',    kind: 'lexicographer', variants: ['أبو عبيدة معمر', 'أبو عبيدة'] },
  { name: 'Abu Misḥal al-Aʿrabi',  kind: 'lexicographer', variants: ['أبو مسحل الأعرابي'] },
  { name: 'Abu Bakr al-Anbari',    kind: 'grammarian',    variants: ['أبو بكر بن الأنباري'] },

  { name: 'anon. poet',            kind: 'poet',          variants: ['الشاعر'], anchored: true },
  { name: 'anon. rajaz',           kind: 'poet',          variants: ['الراجز'], anchored: true },
];

interface ScanSpec {
  variant: string; stripped: string; canonical: string;
  kind: AuthorityKind; anchored: boolean;
}
const SCAN_SPECS: ScanSpec[] = [];
for (const a of AUTHORITIES) {
  for (const v of a.variants) {
    SCAN_SPECS.push({
      variant: v, stripped: stripDiac(v), canonical: a.name, kind: a.kind,
      anchored: a.anchored ?? false,
    });
  }
}

SCAN_SPECS.sort((a, b) => b.stripped.length - a.stripped.length);

function isBoundary(ch: string | undefined): boolean {
  if (!ch) return true;
  return /\s|[.,،؛:!؟?()\[\]«»"'\-—]/.test(ch);
}

function scanAuthoritySpans(part: string): Array<{
  start: number; end: number; name: string; label: string; kind: AuthorityKind;
}> {

  const stripped: string[] = [];
  const map: number[] = [];
  for (let i = 0; i < part.length; i++) {
    const ch = part[i];
    if (!/[ً-ْٰۖ-ۭـ]/.test(ch)) {
      stripped.push(ch);
      map.push(i);
    }
  }
  const sn = stripped.join('');

  const hits: Array<{ start: number; end: number; name: string; label: string; kind: AuthorityKind }> = [];
  const taken: boolean[] = new Array(sn.length).fill(false);

  for (const spec of SCAN_SPECS) {
    let from = 0;
    while (true) {
      const i = sn.indexOf(spec.stripped, from);
      if (i < 0) break;
      const j = i + spec.stripped.length;
      from = i + 1;

      if (taken.slice(i, j).some(Boolean)) continue;
      if (spec.anchored) {
        if (!isBoundary(sn[i - 1]) || !isBoundary(sn[j])) continue;
      }
      for (let k = i; k < j; k++) taken[k] = true;
      hits.push({
        start: map[i],
        end:   (map[j - 1] ?? part.length - 1) + 1,
        name:  spec.canonical,
        label: spec.variant,
        kind:  spec.kind,
      });
    }
  }
  hits.sort((a, b) => a.start - b.start);
  return hits;
}

function detectAuthorities(text: string): Array<{ name: string; label: string; kind: AuthorityKind }> {
  return scanAuthoritySpans(text).map(h => ({ name: h.name, label: h.label, kind: h.kind }));
}
