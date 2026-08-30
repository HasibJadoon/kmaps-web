import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { cached } from '../../../shared/src/cache';
import type { ArLinguisticsEnv } from '../env';
import { SourcesRepo } from '../repositories/sources.repo';

const SOURCE_SLUG = 'lane_lexicon';

interface LaneSourceMeta {
  slug:      string;
  title_ar:  string;
  title_en:  string;
  author:    string;
  period:    string;
  origin:    'lane';
  bilingual: true;
}

async function fetchLaneMeta(db: D1Database): Promise<LaneSourceMeta> {
  const row = await new SourcesRepo(db).bySlug(SOURCE_SLUG);

  return {
    slug:      SOURCE_SLUG,
    title_ar:  row?.title_ar ?? 'معجم لين العربي الإنجليزي',
    title_en:  row?.title_en ?? "Lane's Arabic-English Lexicon",
    author:    row?.author_name ?? 'Edward William Lane',
    period:    row?.period_label ?? '19th century',
    origin:    'lane',
    bilingual: true,
  };
}

const SIGLA: Record<string, { ar: string; en: string }> = {
  'TA':  { ar: 'تاج العروس',                en: 'Taj al-Arus (al-Zabidi)' },
  'M':   { ar: 'المحكم',                    en: 'al-Muḥkam (Ibn Sidah)' },
  'L':   { ar: 'لسان العرب',                en: 'Lisan al-Arab (Ibn Manzur)' },
  'Ṣ':   { ar: 'الصحاح',                    en: 'al-Ṣiḥāḥ (al-Jawhari)' },
  'S':   { ar: 'الصحاح',                    en: 'al-Ṣiḥāḥ (al-Jawhari)' },
  'Ḳ':   { ar: 'القاموس المحيط',            en: 'al-Qāmūs al-Muḥīṭ (al-Firuzabadi)' },
  'K':   { ar: 'القاموس المحيط',            en: 'al-Qāmūs al-Muḥīṭ (al-Firuzabadi)' },
  'A':   { ar: 'أساس البلاغة',              en: 'Asās al-Balāgha (al-Zamakhshari)' },
  'T':   { ar: 'تهذيب اللغة',               en: 'Tahdhīb al-Lugha (al-Azhari)' },
  'O':   { ar: 'العباب الزاخر',             en: 'al-ʿUbāb al-Zākhir (al-Saghani)' },
  'Mṣb': { ar: 'المصباح المنير',            en: 'al-Miṣbāḥ al-Munīr (al-Fayyumi)' },
  'Mgh': { ar: 'المغرب',                    en: 'al-Mughrib (al-Muṭarrizi)' },
  'JK':  { ar: 'كتاب العين',                en: "Kitāb al-ʿAyn (al-Khalīl)" },
  'Msb': { ar: 'المصباح المنير',            en: 'al-Miṣbāḥ al-Munīr' },
  'IDrd':{ ar: 'ابن دريد',                  en: 'Ibn Durayd' },
  'AZ':  { ar: 'أبو زيد الأنصاري',          en: 'Abu Zayd al-Anṣārī' },
  'Az':  { ar: 'الأزهري',                   en: 'al-Azhari' },
  'Lḥ':  { ar: 'اللحياني',                  en: 'al-Liḥyānī' },
  'Lth': { ar: 'الليث',                     en: 'al-Layth (ibn al-Muẓaffar)' },
  'MF':  { ar: 'محب الدين الفاسي',          en: 'Muḥibb al-Dīn al-Fāsī' },
  'Fr':  { ar: 'الفراء',                    en: 'al-Farrāʾ' },
  'Zj':  { ar: 'الزجاج',                    en: 'al-Zajjāj' },
  'IAạr':{ ar: 'ابن الأعرابي',              en: 'Ibn al-Aʿrābī' },
  'Ṣgh': { ar: 'الصاغاني',                  en: 'al-Ṣāghānī' },
  'IB':  { ar: 'ابن بري',                   en: 'Ibn Barrī' },
  'ISh': { ar: 'ابن شميل',                  en: 'Ibn Shumayl' },
  'Mb':  { ar: 'المبرد',                    en: 'al-Mubarrad' },
  'AḤn': { ar: 'أبو حنيفة الدينوري',        en: 'Abū Ḥanīfa al-Dīnawarī' },
  'Sb':  { ar: 'سيبويه',                    en: 'Sibawayh' },
  'AObd':{ ar: 'أبو عبيد',                  en: 'Abū ʿUbayd' },
  'Aʿṣm':{ ar: 'الأصمعي',                   en: 'al-Aṣmaʿī' },
  'IAth':{ ar: 'ابن الأثير',                en: 'Ibn al-Athīr' },
  'IF':  { ar: 'ابن فارس',                  en: 'Ibn Fāris' },
  'IJ':  { ar: 'ابن جني',                   en: 'Ibn Jinnī' },
  'AHat':{ ar: 'أبو حاتم السجستاني',        en: 'Abū Ḥātim al-Sijistānī' },
  'Mz':  { ar: 'المزني',                    en: 'al-Muzanī' },
};

interface LaneToken_Text     { kind: 'text';     value: string; }
interface LaneToken_Arabic   { kind: 'arabic';   value: string; }
interface LaneToken_Headword { kind: 'headword'; value: string; }
interface LaneToken_Siglum   { kind: 'siglum';   code: string; name_en: string; name_ar: string; raw: string; }
interface LaneToken_CrossRef { kind: 'cross_ref'; target: string; }
interface LaneToken_Quran    { kind: 'quran'; surah: number; ayah: number; raw: string; }
interface LaneToken_Figurative{ kind: 'figurative'; }
interface LaneToken_Break    { kind: 'br'; }

type LaneToken =
  | LaneToken_Text | LaneToken_Arabic | LaneToken_Headword
  | LaneToken_Siglum | LaneToken_CrossRef | LaneToken_Quran
  | LaneToken_Figurative | LaneToken_Break;

interface LanePeer {

  label: string | null;

  kind: 'signification' | 'dissociation' | 'plain' | null;
  tokens: LaneToken[];
}

interface LaneVerbForm {
  section_id: string;
  form_num: number | null;
  form_label_ar: string | null;
  page_no: number | null;

  header_tokens: LaneToken[];

  senses: LanePeer[];
}

interface LaneReadView {
  kind: 'lane';
  meta: LaneSourceMeta;
  entry: {
    id: string; root_text: string; root_norm: string;
    page_start: number | null; page_end: number | null; volume_no: number | null;
    source_url: string | null; source_native_id: string | null;
  };
  canonical: unknown | null;
  forms: LaneVerbForm[];
  authorities: {
    code: string; name_en: string; name_ar: string;
    count: number;
  }[];
  quran_citations: {
    surah: number; ayah: number; raw: string;
    context_snippet: string | null; count: number;
  }[];
  cross_refs: { target: string; count: number }[];
  stats: {
    forms: number;
    senses: number;
    authorities: number; authority_total: number;
    quran_citations: number;
    cross_refs: number;
  };
}

export function lexiconLaneRoutes(router: Router<ArLinguisticsEnv>) {

  router.get(
    `/al/lex/v2/read/${SOURCE_SLUG}/:root_norm`,
    (req, env, params) => cached(req, async () => {
      const root_norm = (params.root_norm ?? '').trim();
      if (!root_norm) return badRequest('root_norm required');

      const entry = await env.DB_AL.prepare(
        `SELECT id, root_text, root_norm, root_id, raw_text,
                page_start, page_end, volume_no, source_url, source_native_id
         FROM ar_ling_lexicon_entry
         WHERE source_slug = ? AND root_norm = ? LIMIT 1`
      ).bind(SOURCE_SLUG, root_norm).first<any>();
      if (!entry) return notFound('entry not found in Lane');

      const sectionsRaw = (await env.DB_AL.prepare(
        `SELECT id, section_seq, heading_ar, heading_norm, section_type,
                text_ar, page_no
         FROM ar_ling_lexicon_entry_section
         WHERE source_slug = ? AND root_norm = ?
         ORDER BY section_seq`
      ).bind(SOURCE_SLUG, root_norm).all<any>()).results ?? [];

      const blocks = (await env.DB_AL.prepare(
        `SELECT id, section_id, parent_block_id, block_seq, block_type,
                title_ar, text_plain, text_html, data_json, printed_page
         FROM ar_ling_lexicon_block
         WHERE source_slug = ? AND root_norm = ?
         ORDER BY block_seq`
      ).bind(SOURCE_SLUG, root_norm).all<any>()).results ?? [];

      const quranRefs = (await env.DB_AL.prepare(
        `SELECT block_id, surah, ayah, raw_ref, context_snippet
         FROM ar_ling_lexicon_quran_ref
         WHERE source_slug = ? AND root_norm = ?
         ORDER BY surah, ayah`
      ).bind(SOURCE_SLUG, root_norm).all<any>()).results ?? [];

      const authorityLinks = (await env.DB_AL.prepare(
        `SELECT from_block_id, to_authority_code, label
         FROM ar_ling_lexicon_block_link
         WHERE source_slug = ? AND link_kind = 'authority'
           AND from_block_id IN (
             SELECT id FROM ar_ling_lexicon_block
             WHERE source_slug = ? AND root_norm = ?
           )`
      ).bind(SOURCE_SLUG, SOURCE_SLUG, root_norm).all<any>()).results ?? [];

      const rootLinks = (await env.DB_AL.prepare(
        `SELECT to_root_norm, label, COUNT(*) AS n
         FROM ar_ling_lexicon_block_link
         WHERE source_slug = ? AND link_kind = 'root'
           AND from_block_id IN (
             SELECT id FROM ar_ling_lexicon_block
             WHERE source_slug = ? AND root_norm = ?
           )
         GROUP BY to_root_norm`
      ).bind(SOURCE_SLUG, SOURCE_SLUG, root_norm).all<any>()).results ?? [];

      const canonical = entry.root_id
        ? await env.DB_AL.prepare(
            `SELECT id, root_text, root_letters, root_type,
                    frequency_quran, meaning_core_en
             FROM ar_ling_roots WHERE id = ? LIMIT 1`
          ).bind(entry.root_id).first()
        : null;

      const meta = await fetchLaneMeta(env.DB_AL);
      const view = composeView(entry, sectionsRaw, blocks, quranRefs,
                               authorityLinks, rootLinks, canonical, meta);
      return ok(view);
    }),
  );
}

function composeView(
  entry: any, rawSections: any[], rawBlocks: any[],
  quranRefs: any[], authorityLinks: any[], rootLinks: any[],
  canonical: any | null,
  meta: LaneSourceMeta,
): LaneReadView {

  const refsByBlock = new Map<string, { surah: number; ayah: number; raw: string }[]>();
  for (const r of quranRefs) {
    if (!r.block_id) continue;
    const arr = refsByBlock.get(r.block_id) ?? [];
    arr.push({ surah: r.surah, ayah: r.ayah, raw: r.raw_ref });
    refsByBlock.set(r.block_id, arr);
  }

  const authCounts = new Map<string, number>();
  for (const a of authorityLinks) {
    if (!a.to_authority_code) continue;
    authCounts.set(a.to_authority_code, (authCounts.get(a.to_authority_code) ?? 0) + 1);
  }

  const forms: LaneVerbForm[] = rawSections.map(s => {
    const sectionBlocks = rawBlocks
      .filter(b => b.section_id === s.id)
      .sort((a, b) => a.block_seq - b.block_seq);

    let header_tokens: LaneToken[] = [];
    const senses: LanePeer[] = [];
    let form_num: number | null = null;

    if (s.lane_itype && /^\d+$/.test(String(s.lane_itype))) {
      form_num = parseInt(s.lane_itype, 10);
    }

    for (const b of sectionBlocks) {
      if (b.block_type === 'page_break' || b.block_type === 'root_header') continue;

      if (b.block_type === 'entry_header') {
        const text = (b.text_plain ?? '').trim();
        if (!text) continue;
        const m = text.match(/^(\d+)\.\s+(.*)/);
        if (m) {
          if (form_num == null) form_num = parseInt(m[1], 10);
          header_tokens = [
            { kind: 'text',   value: m[1] + '. ' },
            { kind: 'arabic', value: m[2] },
          ];
        }
        continue;
      }

      if (b.block_type === 'definition') {

        const html = (b.text_html ?? '').trim();
        if (!html) {

          const fallback = (b.text_plain ?? '').trim();
          if (fallback) {
            senses.push({ label: null, kind: 'plain', tokens: tokenize(fallback, undefined) });
          }
          continue;
        }
        const peers = splitHtmlIntoPeers(html);
        for (const p of peers) {
          senses.push({ label: p.label, kind: p.kind, tokens: p.tokens });
        }
      }
    }

    return {
      section_id: s.id,
      form_num,
      form_label_ar: s.heading_ar ?? null,
      page_no: s.page_no ?? null,
      header_tokens,
      senses,
    };
  });

  const qAgg = new Map<string, {
    surah: number; ayah: number; raw: string;
    context_snippet: string | null; count: number;
  }>();
  for (const r of quranRefs) {
    const key = `${r.surah}:${r.ayah}`;
    const cur = qAgg.get(key);
    if (cur) cur.count++;
    else qAgg.set(key, {
      surah: r.surah, ayah: r.ayah, raw: r.raw_ref,
      context_snippet: r.context_snippet, count: 1,
    });
  }

  const authorities = [...authCounts.entries()]
    .map(([code, count]) => ({
      code, count,
      name_en: SIGLA[code]?.en ?? code,
      name_ar: SIGLA[code]?.ar ?? code,
    }))
    .sort((a, b) => b.count - a.count);

  const cross_refs = rootLinks
    .filter((r: any) => r.to_root_norm)
    .map((r: any) => ({ target: r.to_root_norm as string, count: Number(r.n) }))
    .sort((a, b) => b.count - a.count);

  const total_senses = forms.reduce((s, f) => s + f.senses.length, 0);

  return {
    kind: 'lane',
    meta,
    entry: {
      id: entry.id, root_text: entry.root_text, root_norm: entry.root_norm,
      page_start: entry.page_start, page_end: entry.page_end, volume_no: entry.volume_no,
      source_url: entry.source_url, source_native_id: entry.source_native_id,
    },
    canonical: canonical as any,
    forms,
    authorities,
    quran_citations: [...qAgg.values()].sort(
      (a, b) => a.surah - b.surah || a.ayah - b.ayah,
    ),
    cross_refs,
    stats: {
      forms: forms.length,
      senses: total_senses,
      authorities: authorities.length,
      authority_total: authorities.reduce((s, a) => s + a.count, 0),
      quran_citations: qAgg.size,
      cross_refs: cross_refs.length,
    },
  };
}

const SENSE_SPLIT_RX =
  /(?:Root:\s*\S+\s*-\s*Entry:\s*\d+\.\s*[＝―]\s*(Dissociation|Signification):\s*)([A-Z]\d*)/g;

function splitIntoPeers(text: string): {
  text: string; label: string | null; kind: 'signification' | 'dissociation' | 'plain' | null;
}[] {
  const peers: { text: string; label: string | null; kind: any }[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let prev: { label: string | null; kind: any } = { label: null, kind: 'plain' };
  SENSE_SPLIT_RX.lastIndex = 0;
  while ((m = SENSE_SPLIT_RX.exec(text)) != null) {
    const chunk = text.slice(lastIdx, m.index).trim();
    if (chunk) peers.push({ text: chunk, ...prev });
    prev = {
      label: m[2],
      kind: m[1].toLowerCase() === 'dissociation' ? 'dissociation' : 'signification',
    };
    lastIdx = m.index + m[0].length;
  }
  const tail = text.slice(lastIdx).trim();
  if (tail) peers.push({ text: tail, ...prev });
  return peers;
}

const BRACE_RX  = /\{([^}]+)\}/g;
const ARROW_RX  = /⇒\s+(\S+)/g;
const FIG_RX    = /[‡†]/g;
const CROSS_RX  = /(\S+)↓/g;

const SIGLA_RX  = /\(((?:[A-ZḤḲṢʿ][A-Za-zḥḳṣʿ]{0,4}(?:\s*,\s*[A-ZḤḲṢʿ][A-Za-zḥḳṣʿ]{0,4})*)\s*[;:]?)\)/g;

const QURAN_INLINE_RX = /\[(?:(?:Kur|Ḳur|Ḳur\.|Ḳ)\.?\s+)?([ivxlcdm]+)\.\s*(\d{1,3})\s*\]/gi;

function romanToInt(roman: string): number {
  const map: Record<string, number> = {
    i:1, v:5, x:10, l:50, c:100, d:500, m:1000,
  };
  const s = roman.toLowerCase();
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = map[s[i]] ?? 0;
    const next = map[s[i+1]] ?? 0;
    if (next > cur) { total -= cur; } else { total += cur; }
  }
  return total;
}

interface Mark { start: number; end: number; token: LaneToken; }

function tokenize(text: string,
                  refs: { surah: number; ayah: number; raw: string }[] | undefined): LaneToken[] {
  if (!text) return [];

  const flat = text.replace(/\s+/g, ' ').trim();
  const marks: Mark[] = [];

  const scan = (rx: RegExp, build: (m: RegExpExecArray) => LaneToken | LaneToken[] | null) => {
    rx.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(flat)) != null) {
      const t = build(m);
      if (!t) continue;
      const tokens = Array.isArray(t) ? t : [t];
      for (const tok of tokens) {
        marks.push({ start: m.index, end: m.index + m[0].length, token: tok });
      }
    }
  };

  scan(BRACE_RX, m => ({ kind: 'arabic', value: m[1].trim() }));
  scan(ARROW_RX, m => ({ kind: 'headword', value: m[1] }));

  scan(QURAN_INLINE_RX, m => {
    const surah = romanToInt(m[1]);
    const ayah  = parseInt(m[2], 10);
    if (!Number.isFinite(surah) || surah < 1 || surah > 114) return null;
    if (!Number.isFinite(ayah) || ayah < 1) return null;
    return { kind: 'quran', surah, ayah, raw: m[0] };
  });
  scan(SIGLA_RX, m => {
    const inner = m[1].replace(/[;:]/g, '').trim();
    const codes = inner.split(/\s*,\s*/).filter(Boolean);

    if (codes.length === 0) return null;
    return {
      kind: 'siglum',
      code: codes[0],
      name_en: SIGLA[codes[0]]?.en ?? codes[0],
      name_ar: SIGLA[codes[0]]?.ar ?? codes[0],
      raw: inner,
    };
  });
  scan(CROSS_RX, m => ({ kind: 'cross_ref', target: m[1] }));
  scan(FIG_RX, () => ({ kind: 'figurative' }));

  marks.sort((a, b) =>
    a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const accepted: Mark[] = [];
  let lastEnd = 0;
  for (const mk of marks) {
    if (mk.start < lastEnd) continue;
    accepted.push(mk); lastEnd = mk.end;
  }

  const out: LaneToken[] = [];
  let cur = 0;
  for (const mk of accepted) {
    if (mk.start > cur) {
      const slice = flat.slice(cur, mk.start);
      if (slice.trim()) out.push({ kind: 'text', value: slice });
    }
    out.push(mk.token);
    cur = mk.end;
  }
  if (cur < flat.length) {
    const tail = flat.slice(cur);
    if (tail.trim()) out.push({ kind: 'text', value: tail });
  }

  return out;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

function findMatchingClose(html: string, openEnd: number, tagName: string): number {
  const open = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
  const close = new RegExp(`</${tagName}>`, 'gi');
  open.lastIndex = openEnd + 1;
  close.lastIndex = openEnd + 1;
  let depth = 1;
  while (depth > 0) {
    const o = open.exec(html);
    const c = close.exec(html);
    if (!c) return -1;
    if (o && o.index < c.index) {
      depth++;
      close.lastIndex = c.index;
      continue;
    }
    depth--;
    if (depth === 0) return c.index;
    open.lastIndex = c.index + 1;
  }
  return -1;
}

function emitTextWithQuranRefs(text: string, out: LaneToken[]): void {
  if (!text) return;
  const flat = decodeEntities(text);
  QURAN_INLINE_RX.lastIndex = 0;
  let cur = 0;
  let m: RegExpExecArray | null;
  while ((m = QURAN_INLINE_RX.exec(flat)) != null) {
    const surah = romanToInt(m[1]);
    const ayah  = parseInt(m[2], 10);
    if (!Number.isFinite(surah) || surah < 1 || surah > 114) continue;
    if (!Number.isFinite(ayah) || ayah < 1) continue;
    if (m.index > cur) {
      const slice = flat.slice(cur, m.index);
      if (slice) out.push({ kind: 'text', value: slice });
    }
    out.push({ kind: 'quran', surah, ayah, raw: m[0] });
    cur = m.index + m[0].length;
  }
  if (cur < flat.length) {
    const tail = flat.slice(cur);
    if (tail) out.push({ kind: 'text', value: tail });
  }
}

function tokenizeHtml(html: string): LaneToken[] {
  const out: LaneToken[] = [];
  let i = 0;
  let textBuf = '';

  const flushText = () => {
    if (!textBuf) return;
    emitTextWithQuranRefs(textBuf, out);
    textBuf = '';
  };

  while (i < html.length) {
    const ch = html[i];
    if (ch !== '<') { textBuf += ch; i++; continue; }
    const tagEnd = html.indexOf('>', i);
    if (tagEnd === -1) { textBuf += ch; i++; continue; }
    const rawTag = html.slice(i, tagEnd + 1);
    const tag = rawTag.toLowerCase();

    if (tag.startsWith('<br')) {
      flushText();
      out.push({ kind: 'br' });
      i = tagEnd + 1;
      continue;
    }

    if (/^<span\s[^>]*class="ar(?:\s+long)?"/.test(tag)) {
      flushText();
      const close = findMatchingClose(html, tagEnd, 'span');
      if (close === -1) { i = tagEnd + 1; continue; }
      const inner = stripTags(html.slice(tagEnd + 1, close));
      if (inner) out.push({ kind: 'arabic', value: inner });
      i = close + '</span>'.length;
      continue;
    }

    if (/^<span\s[^>]*class="auth"/.test(tag)) {
      flushText();
      const close = findMatchingClose(html, tagEnd, 'span');
      if (close === -1) { i = tagEnd + 1; continue; }
      const inner = stripTags(html.slice(tagEnd + 1, close));
      const cleaned = inner.replace(/^\s*\(/, '').replace(/[;:,]?\s*\)\s*$/, '').trim();
      const codes = cleaned.split(/\s*,\s*/).map(c => c.replace(/\*$/, '').trim()).filter(Boolean);
      if (codes.length) {
        out.push({
          kind: 'siglum',
          code: codes[0],
          name_en: SIGLA[codes[0]]?.en ?? codes[0],
          name_ar: SIGLA[codes[0]]?.ar ?? codes[0],
          raw: cleaned,
        });
      }
      i = close + '</span>'.length;
      continue;
    }

    if (/^<span\s[^>]*class="add"/.test(tag)) {
      flushText();
      const close = findMatchingClose(html, tagEnd, 'span');
      if (close === -1) { i = tagEnd + 1; continue; }
      const inner = html.slice(tagEnd + 1, close);
      out.push(...tokenizeHtml(inner));
      i = close + '</span>'.length;
      continue;
    }

    if (/^<em\b/.test(tag)) {
      flushText();
      const close = findMatchingClose(html, tagEnd, 'em');
      if (close === -1) { i = tagEnd + 1; continue; }
      const inner = html.slice(tagEnd + 1, close);
      out.push(...tokenizeHtml(inner));
      i = close + '</em>'.length;
      continue;
    }

    if (/^<a\s/.test(tag)) {
      flushText();
      const hrefMatch = rawTag.match(/href="([^"]+)"/);
      const close = findMatchingClose(html, tagEnd, 'a');
      if (close === -1) { i = tagEnd + 1; continue; }
      const inner = html.slice(tagEnd + 1, close);
      const href = hrefMatch?.[1] ?? '';

      if (href.startsWith('#root-file:')) {

        const arMatch = inner.match(/<span[^>]*class="ar(?:\s+long)?"[^>]*>([^<]+)<\/span>/);
        const target = arMatch ? stripTags(arMatch[1]) : href.replace('#root-file:', '');
        out.push({ kind: 'cross_ref', target });
      } else {

        out.push(...tokenizeHtml(inner));
      }
      i = close + '</a>'.length;
      continue;
    }

    i = tagEnd + 1;
  }

  flushText();
  return out;
}

function splitHtmlIntoPeers(html: string): {
  tokens: LaneToken[]; label: string | null; kind: 'signification' | 'dissociation' | 'plain' | null;
}[] {
  const peers: { tokens: LaneToken[]; label: string | null; kind: any }[] = [];

  let body = html.replace(/<h3\b[^>]*class="entry"[^>]*>[\s\S]*?<\/h3>/i, '');

  const markerRx = /<div\s+class="(signification|dissociation)[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
  const senseRx  = /<div\s+class="sense[^"]*"[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/div>(?=\s*(?:<div\s+class="(?:signification|dissociation|sense)|$))/gi;

  const markers: { start: number; end: number; kind: 'signification' | 'dissociation' }[] = [];
  let mm: RegExpExecArray | null;
  while ((mm = markerRx.exec(body)) != null) {
    markers.push({ start: mm.index, end: mm.index + mm[0].length, kind: mm[1] as any });
  }

  const senses: { start: number; end: number; id: string; inner: string }[] = [];
  let ss: RegExpExecArray | null;
  senseRx.lastIndex = 0;
  while ((ss = senseRx.exec(body)) != null) {
    senses.push({ start: ss.index, end: ss.index + ss[0].length, id: ss[1], inner: ss[2] });
  }

  if (senses.length === 0) {
    const tokens = tokenizeHtml(body);
    if (tokens.length) peers.push({ tokens, label: null, kind: 'plain' });
    return peers;
  }

  for (const sense of senses) {

    const idParts = sense.id.split('_');
    const label = idParts.length > 1 ? idParts[idParts.length - 1] : sense.id;

    let kind: 'signification' | 'dissociation' | 'plain' = 'plain';
    for (let k = markers.length - 1; k >= 0; k--) {
      if (markers[k].end <= sense.start) {
        kind = markers[k].kind;
        break;
      }
    }

    const tokens = tokenizeHtml(sense.inner);
    if (tokens.length) peers.push({ tokens, label, kind });
  }

  return peers;
}
