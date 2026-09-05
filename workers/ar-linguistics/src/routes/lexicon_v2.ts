import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { cached } from '../../../shared/src/cache';
import type { ArLinguisticsEnv } from '../env';
import { SourcesRepo, type LexiconSource } from '../repositories/sources.repo';
import { rootQueryCandidates } from '../lib/root_query';

function v2RouteMeta(s: import('../repositories/sources.repo').LexiconSource) {
  const base = {
    slug:     s.slug,
    title_ar: s.title_ar,
    title_short_ar: s.title_short_ar ?? s.title_ar,
    title_en: s.title_en ?? s.title_ar,
    author:   s.author_name ?? '',
    period:   s.period_label ?? '',
    origin:   s.origin ?? '',
    author_death_ah: s.author_death_ah ?? null,
    author_death_ce: s.author_death_ce ?? null,
  };

  return s.bilingual ? { ...base, bilingual: true } : base;
}

const AR_INDIC_TO_ASCII = (s: string) =>
  s.replace(/[٠-٩]/g, ch => String.fromCharCode(0x30 + ch.charCodeAt(0) - 0x660));

function footnoteMarkerNums(text: string): number[] {
  const fnRe = /«\s*([0-9٠-٩]+)\s*»|\(\s*\(\s*([0-9٠-٩]+)\s*\)\s*\)/gu;
  const marker_nums: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = fnRe.exec(text)) != null) {
    const raw = m[1] ?? m[2];
    if (!raw) continue;
    const n = +AR_INDIC_TO_ASCII(raw);
    if (Number.isFinite(n) && n > 0) marker_nums.push(n);
  }
  return marker_nums;
}

function computeSectionBody(text_ar: string | null | undefined, split = true): {
  text: string; paragraphs: string[]; footnote_refs: number[]; marker_nums: number[];
} {
  if (!text_ar) return { text: '', paragraphs: [], footnote_refs: [], marker_nums: [] };
  const text = text_ar.replace(/\s+/g, ' ').trim();

  const paragraphs = split
    ? text.split(/(?<=[.!؟۔])\s+/u).map(p => p.trim()).filter(Boolean)
    : [text];

  const marker_nums = footnoteMarkerNums(text);
  const fnSet = new Set<number>(marker_nums);
  return {
    text, paragraphs, marker_nums,
    footnote_refs: [...fnSet].sort((a, b) => a - b),
  };
}

/** A section whose paragraphs are stored rows (one block per sense) is served
 *  exactly as stored — no request-time splitting or whitespace collapsing. */
function sectionBodyFromStoredParagraphs(paragraphs: string[]): {
  text: string; paragraphs: string[]; footnote_refs: number[]; marker_nums: number[];
} {
  const clean = paragraphs.map(p => String(p ?? '').trim()).filter(Boolean);
  const text = clean.join('\n');
  const marker_nums = footnoteMarkerNums(text);
  return {
    text, paragraphs: clean, marker_nums,
    footnote_refs: [...new Set<number>(marker_nums)].sort((a, b) => a - b),
  };
}

interface TermLabel { id: string; ar: string; en: string; ur: string; short_ar: string | null }

function sarfTermRefs(data: any): string[] {
  const out: string[] = [];
  const push = (v: unknown) => { if (typeof v === 'string' && v.startsWith('GT:')) out.push(v); };
  push(data?.root_type);
  for (const form of (Array.isArray(data?.forms) ? data.forms : [])) {
    push(form?.bab); push(form?.form_tier); push(form?.masdar_term);
    push(form?.ism_fail_term); push(form?.ism_maf_term); push(form?.root_type);
    for (const alt of (Array.isArray(form?.bab_alt) ? form.bab_alt : [])) push(alt);
    for (const t of (Array.isArray(form?.trans) ? form.trans : [])) push(t);
  }
  return Array.from(new Set(out));
}

function trilingual(v: any): { ar: string | null; en: string | null; ur: string | null } | null {
  if (!v || typeof v !== 'object') return null;
  const pick = (k: string) => (typeof v[k] === 'string' && v[k].trim() ? v[k] : null);
  const out = { ar: pick('ar'), en: pick('en'), ur: pick('ur') };
  return out.ar || out.en || out.ur ? out : null;
}

async function resolveSarfFamilies(env: ArLinguisticsEnv, blocks: any[]) {
  const parsed = blocks
    .filter(b => b.block_type === 'sarf_family')
    .map(b => {
      let data: any = null;
      try { data = JSON.parse(b.data_json ?? '{}'); } catch { data = null; }
      return { block: b, data };
    });
  if (!parsed.length) return [];

  const ids = Array.from(new Set(parsed.flatMap(p => sarfTermRefs(p.data))));
  const terms = new Map<string, TermLabel>();
  if (ids.length) {
    const rows = (await env.DB_AL.prepare(
      `SELECT id, name_ar, name_en, name_ur, short_ar
         FROM ar_ling_gram_term
        WHERE id IN (${ids.map(() => '?').join(',')})`
    ).bind(...ids).all()).results ?? [];
    for (const r of rows as any[]) {
      terms.set(r.id, { id: r.id, ar: r.name_ar, en: r.name_en, ur: r.name_ur, short_ar: r.short_ar ?? null });
    }
  }

  const term = (id: unknown): TermLabel | null =>
    typeof id === 'string' && id.startsWith('GT:')
      ? terms.get(id) ?? { id, ar: id, en: id, ur: id, short_ar: null }
      : null;

  return parsed.map(({ block, data }) => ({
    block_id: block.id,
    section_id: block.section_id ?? null,
    title_ar: block.title_ar ?? null,
    scope: data?.scope ?? 'book',
    root_type: term(data?.root_type),
    core: trilingual(data?.block_meta?.core),

    distinctive_note: trilingual(data?.block_meta?.distinctive_note),
    authors_own_words: trilingual(data?.block_meta?.authors_own_words),
    poles: (Array.isArray(data?.poles) ? data.poles : []).map((p: any) => ({
      key: p?.key ?? null,
      ...(trilingual(p?.label) ?? { ar: null, en: null, ur: null }),
    })),
    forms: (Array.isArray(data?.forms) ? data.forms : []).map((f: any) => ({
      form_id: f?.form_id ?? null,
      roman: f?.roman ?? '',

      lemma: typeof f?.lemma === 'string' && f.lemma.trim() ? f.lemma : null,
      section_id: f?.section_id ?? null,
      block_ids: (Array.isArray(f?.block_ids) ? f.block_ids : [])
        .filter((x: any) => typeof x === 'string'),
      bab: term(f?.bab),
      bab_alt: (Array.isArray(f?.bab_alt) ? f.bab_alt : []).map(term).filter(Boolean),

      form_tier: term(f?.form_tier),
      root_type: term(f?.root_type),
      madi: f?.madi ?? null,
      mudari: f?.mudari ?? null,
      voice: f?.voice ?? null,
      passive_form: f?.passive_form ?? null,
      masdar_term: term(f?.masdar_term),
      masadir: (Array.isArray(f?.masadir) ? f.masadir : []).filter((m: any) => typeof m === 'string'),
      ism_fail: f?.ism_fail ?? null,
      ism_fail_term: term(f?.ism_fail_term),
      ism_maf: f?.ism_maf ?? null,
      ism_maf_term: term(f?.ism_maf_term),
      trans: (Array.isArray(f?.trans) ? f.trans : []).map(term).filter(Boolean),

      trans_note: trilingual(f?.trans_note)
        ?? (typeof f?.trans_note === 'string' && f.trans_note.trim()
              ? { ar: f.trans_note, en: null, ur: null } : null),
      pole: f?.pole ?? null,
      pole_family: f?.pole_family ?? null,
      levels_with: (Array.isArray(f?.levels_with) ? f.levels_with : [])
        .filter((x: any) => typeof x === 'string'),
      gloss: trilingual(f?.gloss),
      senses: (Array.isArray(f?.senses) ? f.senses : [])
        .map((s: any) => ({ sense: trilingual(s?.sense), example: trilingual(s?.example) }))
        .filter((s: any) => s.sense || s.example),
      ayah: f?.ayah ?? null,
      shahid: trilingual(f?.shahid)
        ?? (typeof f?.shahid === 'string' && f.shahid.trim() ? { ar: f.shahid, en: null, ur: null } : null),
    })),

    levelling_groups: (Array.isArray(data?.levelling_groups) ? data.levelling_groups : [])
      .map((g: any) => ({
        key: g?.key ?? null,
        members: (Array.isArray(g?.members) ? g.members : []).filter((m: any) => typeof m === 'string'),
        claim: trilingual(g?.claim),
        qualifier: trilingual(g?.qualifier),
      }))
      .filter((g: any) => g.members.length),
    note: typeof data?.note === 'string' && data.note.trim() ? data.note : null,
  }));
}

interface Footnote {
  num: number;

  ordinal: number | null;

  printed_page: number | null;
  text: string;
  block_id: string;
  section_id: string | null;
}

function collectFootnotes(blocks: any[]): Footnote[] {
  const out: Footnote[] = [];
  for (const b of blocks) {
    if (b.block_type !== 'footnote') continue;
    let num: number | null = null;
    let ordinal: number | null = null;
    let printed_page: number | null = null;
    try {
      const dj = JSON.parse(b.data_json || '{}');
      const raw = dj.footnote_no ?? dj.footnote_num ?? dj.num;
      if (raw != null) num = +AR_INDIC_TO_ASCII(String(raw));
      if (dj.fn_ordinal != null) ordinal = +dj.fn_ordinal;
      if (dj.printed_page != null) printed_page = +dj.printed_page;
    } catch {  }
    if (num == null) {

      const probe = (b.title_ar || b.text_plain || '').trim();
      const m = probe.match(/^[(\[«]?\s*([0-9٠-٩]+)/);
      if (m) num = +AR_INDIC_TO_ASCII(m[1]);
    }
    if (num == null || !Number.isFinite(num)) continue;
    out.push({
      num,
      ordinal: Number.isFinite(ordinal as number) ? ordinal : null,
      printed_page: Number.isFinite(printed_page as number)
        ? printed_page : (b.printed_page ?? null),
      text: (b.text_plain || '').trim(),
      block_id: b.id,
      section_id: b.section_id ?? null,
    });
  }

  return out.sort((a, b) =>
    (a.ordinal ?? Infinity) - (b.ordinal ?? Infinity) || a.num - b.num);
}

function bindFootnoteMarks(sections: any[], footnotes: Footnote[]):
    'ordinal' | 'by_number' {
  const byOrdinal = new Map<number, Footnote>();
  for (const f of footnotes) if (f.ordinal != null) byOrdinal.set(f.ordinal, f);

  let k = 0, ordinalHolds = byOrdinal.size > 0;
  for (const s of sections) {
    for (const num of (s.body?.marker_nums ?? [])) {
      k += 1;
      if (byOrdinal.get(k)?.num !== num) ordinalHolds = false;
    }
  }

  const firstByNum = new Map<number, Footnote>();
  for (const f of footnotes) if (!firstByNum.has(f.num)) firstByNum.set(f.num, f);

  k = 0;
  for (const s of sections) {
    const marks = (s.body?.marker_nums ?? []).map((num: number) => {
      k += 1;
      const f = ordinalHolds ? byOrdinal.get(k) : firstByNum.get(num);
      return {
        num,
        ordinal: ordinalHolds ? k : (f?.ordinal ?? null),
        printed_page: f?.printed_page ?? null,
        block_id: f?.block_id ?? null,

        resolved: !!f,
      };
    });
    if (s.body) s.body.footnote_marks = marks;
  }
  return ordinalHolds ? 'ordinal' : 'by_number';
}

export function lexiconV2Routes(router: Router<ArLinguisticsEnv>) {

  router.get('/al/lex/v2/sources', (req, env) => cached(req, async () => {
    const rows = (await env.DB_AL.prepare(
      `SELECT source_slug, COUNT(*) AS roots
       FROM ar_ling_lexicon_entry
       GROUP BY source_slug`
    ).all<{ source_slug: string; roots: number }>()).results ?? [];

    const counts = new Map(rows.map(r => [r.source_slug, Number(r.roots)]));
    const allSources = await new SourcesRepo(env.DB_AL).inDisplayOrder();
    const sources = allSources
      .filter(s => (counts.get(s.slug) ?? 0) > 0)
      .map(s => ({
        ...v2RouteMeta(s),
        roots: counts.get(s.slug) ?? 0,
      }));

    return ok({ sources, total: sources.length });
  }));

  router.get('/al/lex/v2/roots', (req, env) => cached(req, async () => {
    const url = new URL(req.url);
    const source = url.searchParams.get('source');
    const prefix = (url.searchParams.get('prefix') ?? '').trim();
    const page   = Math.max(1, Number(url.searchParams.get('page') ?? '1') | 0);

    const limit  = Math.min(10000, Math.max(1, Number(url.searchParams.get('limit') ?? '50') | 0));
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const binds: unknown[] = [];
    if (source) { where.push('source_slug = ?'); binds.push(source); }
    if (prefix) { where.push('root_norm LIKE ?'); binds.push(prefix + '%'); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const total = (await env.DB_AL.prepare(
      `SELECT COUNT(*) AS n FROM ar_ling_lexicon_entry ${whereSql}`
    ).bind(...binds).first<{ n: number }>())?.n ?? 0;

    const rows = (await env.DB_AL.prepare(
      `SELECT id, source_slug, root_text, root_norm, root_id,
              page_start, page_end, volume_no
       FROM ar_ling_lexicon_entry
       ${whereSql}
       ORDER BY root_norm, source_slug
       LIMIT ? OFFSET ?`
    ).bind(...binds, limit, offset).all()).results ?? [];

    return ok({ rows, total, page, limit, has_more: offset + rows.length < total });
  }));

  router.get('/al/lex/v2/roots/:root_norm', (req, env, params) => cached(req, async () => {
    const requested = (params.root_norm ?? '').trim();
    if (!requested) return badRequest('root_norm required');

    let root_norm = requested;
    let entries: any[] = [];
    for (const candidate of rootQueryCandidates(requested)) {
      entries = (await env.DB_AL.prepare(
        `SELECT id, source_slug, root_text, root_norm, root_id,
                page_start, page_end, volume_no
         FROM ar_ling_lexicon_entry
         WHERE root_norm = ?
         ORDER BY source_slug`
      ).bind(candidate).all()).results ?? [];
      if (entries.length) { root_norm = candidate; break; }
    }

    if (!entries.length) return notFound('root not found');

    const counts = (await env.DB_AL.prepare(
      `SELECT source_slug,
              (SELECT COUNT(*) FROM ar_ling_lexicon_entry_section s
                 WHERE s.root_norm = ? AND s.source_slug = e.source_slug) AS sections,
              (SELECT COUNT(*) FROM ar_ling_lexicon_block b
                 WHERE b.root_norm = ? AND b.source_slug = e.source_slug) AS blocks,
              (SELECT COUNT(*) FROM ar_ling_lexicon_quran_ref q
                 WHERE q.root_norm = ? AND q.source_slug = e.source_slug) AS quran_refs
       FROM ar_ling_lexicon_entry e
       WHERE root_norm = ?`
    ).bind(root_norm, root_norm, root_norm, root_norm).all()).results ?? [];

    const canonical = (await env.DB_AL.prepare(
      `SELECT id, root_text, root_letters, root_type, weak_pattern,
              frequency_quran, meaning_core_en, meaning_core_ar
       FROM ar_ling_roots WHERE root_text = ? LIMIT 1`
    ).bind(root_norm).first()) ?? null;

    const snippetRows = (await env.DB_AL.prepare(
      `SELECT source_slug, text_plain FROM (
         SELECT source_slug, text_plain,
                ROW_NUMBER() OVER (
                  PARTITION BY source_slug
                  ORDER BY CASE block_type WHEN 'definition' THEN 0 ELSE 1 END,
                           block_seq
                ) AS rn
         FROM ar_ling_lexicon_block
         WHERE root_norm = ?
           AND text_plain IS NOT NULL
           AND length(trim(text_plain)) > 25
           AND block_type NOT IN ('root_header', 'chapter_header', 'header')
       ) WHERE rn = 1`
    ).bind(root_norm).all()).results ?? [];
    const snippetBySlug = new Map(
      snippetRows.map((r: any) => [
        r.source_slug as string,
        String(r.text_plain).replace(/\s+/g, ' ').trim().slice(0, 240),
      ]),
    );

    const slugs = entries.map((e: any) => e.source_slug as string);
    const sourceRows = await new SourcesRepo(env.DB_AL).bySlugs(slugs);
    const sourceBySlug = new Map(sourceRows.map(s => [s.slug, s]));

    const sortYear = (m: { author_death_ce: number | null; author_death_ah: number | null }) =>
      m.author_death_ce != null ? m.author_death_ce
      : m.author_death_ah != null ? Math.round(m.author_death_ah * 0.970229 + 621.5643)
      : Number.MAX_SAFE_INTEGER;

    const sources = entries.map((e: any) => {
      const c = counts.find((x: any) => x.source_slug === e.source_slug) ?? {};
      const sourceRow = sourceBySlug.get(e.source_slug as string);
      return {
        ...e,
        ...(sourceRow ? v2RouteMeta(sourceRow) : {}),
        sections: Number((c as any).sections ?? 0),
        blocks:   Number((c as any).blocks ?? 0),
        quran_refs: Number((c as any).quran_refs ?? 0),
        snippet: snippetBySlug.get(e.source_slug as string) ?? null,
      };
    }).sort((a: any, b: any) => sortYear(a) - sortYear(b));

    return ok({ root_norm, canonical, sources });
  }));

  router.get('/al/lex/v2/entry/:source_slug/:root_norm', (req, env, params) => cached(req, async () => {
    const slug = params.source_slug ?? '';
    const requested = (params.root_norm ?? '').trim();
    if (!slug || !requested) return badRequest('slug + root_norm required');

    let entry: any = null;
    let root_norm = requested;
    for (const candidate of rootQueryCandidates(requested)) {

      entry = await env.DB_AL.prepare(
        `SELECT id, source_slug, root_text, root_norm, root_id,
                raw_text, entry_text_ar, entry_text_en,
                page_start, page_end, volume_no, source_url,
                source_native_id, status
         FROM ar_ling_lexicon_entry
         WHERE source_slug = ? AND root_norm = ? LIMIT 1`
      ).bind(slug, candidate).first<any>();
      if (entry) { root_norm = candidate; break; }
    }
    if (!entry) return notFound('entry not found');

    const sections = (await env.DB_AL.prepare(
      `SELECT id, section_seq, heading_ar, heading_norm, heading_bare,
              section_type, text_ar, text_en, page_no, source_native_section_id,
              lane_itype
       FROM ar_ling_lexicon_entry_section
       WHERE source_slug = ? AND root_norm = ?
       ORDER BY section_seq`
    ).bind(slug, root_norm).all()).results ?? [];

    const blocks = (await env.DB_AL.prepare(
      `SELECT id, section_id, book_page_id, parent_block_id, block_path,
              block_seq, depth, block_type, lang, title_ar,
              text_plain, text_html, data_json,
              origin, origin_ref, printed_page
       FROM ar_ling_lexicon_block
       WHERE source_slug = ? AND root_norm = ?
       ORDER BY block_seq`
    ).bind(slug, root_norm).all()).results ?? [];

    const links = blocks.length
      ? (await env.DB_AL.prepare(
          `SELECT id, from_block_id, link_kind, to_root_norm, to_surah,
                  to_ayah, to_ayah_to, to_block_id, to_url, label, weight,
                  position_offset
           FROM ar_ling_lexicon_block_link
           WHERE source_slug = ?
             AND from_block_id IN (
               SELECT id FROM ar_ling_lexicon_block
               WHERE source_slug = ? AND root_norm = ?
             )`
        ).bind(slug, slug, root_norm).all()).results ?? []
      : [];

    const tags = blocks.length
      ? (await env.DB_AL.prepare(
          `SELECT block_id, tag, source, weight
           FROM ar_ling_lexicon_block_tag
           WHERE block_id IN (
             SELECT id FROM ar_ling_lexicon_block
             WHERE source_slug = ? AND root_norm = ?
           )`
        ).bind(slug, root_norm).all()).results ?? []
      : [];

    const quran_refs = (await env.DB_AL.prepare(
      `SELECT id, block_id, section_id, surah, ayah, raw_ref, context_snippet
       FROM ar_ling_lexicon_quran_ref
       WHERE source_slug = ? AND root_norm = ?
       ORDER BY surah, ayah`
    ).bind(slug, root_norm).all()).results ?? [];

    const sources_of_entry = (await env.DB_AL.prepare(
      `SELECT id, source_kind, source_native_id, source_url
       FROM ar_ling_lexicon_entry_source
       WHERE source_slug = ? AND root_entry_id = ?`
    ).bind(slug, entry.id).all()).results ?? [];

    const canonicalSelect =
      `SELECT id, root_text, root_letters, root_type, weak_pattern,
              frequency_quran, frequency_hadith, meaning_core_en
         FROM ar_ling_roots`;
    const canonical =
      (entry.root_id
        ? await env.DB_AL.prepare(`${canonicalSelect} WHERE id = ? LIMIT 1`)
            .bind(entry.root_id).first()
        : null)
      ?? await env.DB_AL.prepare(
           `${canonicalSelect} WHERE root_normalized = ? OR root_text = ? LIMIT 1`
         ).bind(root_norm, root_norm).first();

    const profile = await new SourcesRepo(env.DB_AL).profileBySlug(slug);

    const PROSE_BLOCKS = new Set(['definition', 'entry_header']);
    const isStub = (s: any) => {
        const body = (s.text_ar ?? s.text_en ?? '').trim();
        return body === '' || body === (s.heading_ar ?? '').trim();
    };
    const looseProse = blocks.filter((b: any) =>
      PROSE_BLOCKS.has(b.block_type) && !b.section_id && (b.text_plain ?? '').trim());

    let sections_source: 'sections' | 'blocks' | 'block_tree' = 'sections';
    let effectiveSections = sections;

    const LEAF_BLOCKS = new Set(['definition', 'poetry_quote', 'hadith_quote', 'quran_quote']);

    const squash = (s: string | null | undefined) => (s ?? '').replace(/[\s:]+/gu, '');
    if (sections.length && !sections.every(isStub)) {
      const built: any[] = [];
      let covered = true;
      for (const s of sections) {
        const leaves = blocks

          .filter((b: any) => b.section_id === s.id && LEAF_BLOCKS.has(b.block_type)
                              && (b.origin === 'book_native' || b.origin === 'derived_segmentation')
                              && (b.title_ar ?? '').trim() && (b.text_plain ?? '').trim())
          .sort((a: any, b: any) => (a.block_seq ?? 0) - (b.block_seq ?? 0));

        if (!leaves.length
            || squash(leaves.map((b: any) => b.text_plain).join('')) !== squash((s as any).text_ar)) {
          covered = false;
          break;
        }
        for (const b of leaves) {
          built.push({
            id: b.id,
            section_seq: built.length + 1,
            heading_ar: b.title_ar,
            heading_norm: null,
            heading_bare: null,
            section_type: b.block_type,
            text_ar: b.text_plain,
            text_en: null,
            page_no: b.printed_page ?? s.page_no ?? null,
            source_native_section_id: null,
            parent_section_id: s.id,
          });
        }
      }

      const bareHeading = (s: any) => {
        const h = squash(s.heading_ar);
        return !h || h === squash(entry?.root_text) || h === squash(entry?.root_norm);
      };
      if (covered && built.length
          && (built.length > sections.length || sections.every(bareHeading))) {
        sections_source = 'block_tree';
        effectiveSections = built;
      }
    }

    if (sections_source === 'sections' && !sections.length) {

      const withText = blocks.filter((b: any) => LEAF_BLOCKS.has(b.block_type)
                                                 && (b.text_plain ?? '').trim());
      const preferred = withText.some((b: any) => b.origin === 'derived_segmentation')
        ? 'derived_segmentation' : 'book_native';
      const leaves = withText
        .filter((b: any) => b.origin === preferred)
        .sort((a: any, b: any) => (a.block_seq ?? 0) - (b.block_seq ?? 0));
      if (leaves.length) {

        const isArabic = (t: string) => /\p{Script=Arabic}/u.test(t);
        sections_source = 'block_tree';
        effectiveSections = leaves.map((b: any, i: number) => {
          const text = b.text_plain as string;
          return {
            id: b.id,
            section_seq: i + 1,
            heading_ar: b.title_ar ?? null,
            heading_norm: null,
            heading_bare: null,
            section_type: b.block_type,
            text_ar: isArabic(text) ? text : null,
            text_en: isArabic(text) ? null : text,
            page_no: b.printed_page ?? null,
            source_native_section_id: null,
            parent_section_id: null,
          };
        });
      }
    }

    // Prose blocks that carry no section: senses whose entry header the source
    // tables never listed are grouped under that header; a root-level
    // cross-reference ("See art. …") or an author's note stands alone.
    const blockById = new Map<string, any>((blocks as any[]).map((b: any) => [b.id, b]));
    const looseSection = (group: any[], seq: number) => {
      const first = group[0];
      let data: any = null;
      try { data = JSON.parse(first.data_json ?? '{}'); } catch { data = null; }
      const parent = first.parent_block_id ? blockById.get(first.parent_block_id) : null;
      const header = parent?.block_type === 'entry_header' ? parent : null;
      let hdata: any = null;
      try { hdata = header ? JSON.parse(header.data_json ?? '{}') : null; } catch { hdata = null; }
      const kind = typeof data?.entry_kind === 'string' ? data.entry_kind : null;
      const itype = hdata?.itype != null && /^\d+$/.test(String(hdata.itype)) ? String(hdata.itype) : null;
      const texts = group.map((b: any) => String(b.text_plain ?? '').trim()).filter(Boolean);
      return {
        id: header?.id ?? first.id,
        section_seq: seq,

        heading_ar: data?.lemma ?? header?.title_ar ?? first.title_ar ?? null,
        heading_norm: null,
        heading_bare: null,
        section_type: data?.form ? `form_${data.form}` : (itype ? `form_${itype}` : (kind ?? 'definition')),

        text_ar: null,
        text_en: texts.join('\n'),
        paragraphs: texts,
        block_ids: group.map((b: any) => b.id),
        page_no: first.printed_page ?? header?.printed_page ?? null,
        source_native_section_id: null,
        _seq: first.block_seq ?? 0,
      };
    };
    const looseGroups = (): any[][] => {
      const groups = new Map<string, any[]>();
      for (const b of looseProse as any[]) {
        if (b.block_type !== 'definition') continue;
        const parent = b.parent_block_id ? blockById.get(b.parent_block_id) : null;
        const key = parent?.block_type === 'entry_header' ? parent.id : b.id;
        const list = groups.get(key);
        if (list) list.push(b); else groups.set(key, [b]);
      }
      return [...groups.values()].map(g => g.sort((a, b) => (a.block_seq ?? 0) - (b.block_seq ?? 0)));
    };

    const attachedProse = new Map<string, any[]>();
    if (sections.length && sections.every(isStub)) {
      for (const b of blocks as any[]) {
        if (b.block_type !== 'definition' || !b.section_id) continue;
        if (!String(b.text_plain ?? '').trim()) continue;
        const list = attachedProse.get(b.section_id);
        if (list) list.push(b); else attachedProse.set(b.section_id, [b]);
      }
    }
    if (sections_source === 'sections' && attachedProse.size) {
      sections_source = 'blocks';
      // One stored block per sense: the block rows ARE the paragraphs.
      const items: any[] = sections
        .filter((s: any) => attachedProse.has(s.id))
        .map((s: any) => {
          const bs = attachedProse.get(s.id)!
            .sort((a: any, b: any) => (a.block_seq ?? 0) - (b.block_seq ?? 0));
          return {
            id: s.id,
            section_seq: 0,
            heading_ar: s.heading_ar,
            heading_norm: s.heading_norm ?? null,
            heading_bare: s.heading_bare ?? null,
            section_type: s.lane_itype ? `form_${s.lane_itype}` : (s.section_type ?? 'definition'),
            text_ar: null,
            text_en: bs.map((b: any) => b.text_plain).join('\n'),
            paragraphs: bs.map((b: any) => String(b.text_plain ?? '').trim()).filter(Boolean),
            block_ids: bs.map((b: any) => b.id),
            page_no: bs[0]?.printed_page ?? s.page_no ?? null,
            source_native_section_id: null,
            _seq: bs[0]?.block_seq ?? 0,
          };
        });
      for (const g of looseGroups()) items.push(looseSection(g, 0));
      items.sort((a, b) => a._seq - b._seq);
      effectiveSections = items.map((s, i) => { const { _seq, ...rest } = s; return { ...rest, section_seq: i + 1 }; });
    }

    if (sections_source === 'sections' && sections.length && sections.every(isStub) && looseProse.length) {
      sections_source = 'blocks';
      effectiveSections = looseGroups().map((g, i) => {
        const { _seq, ...rest } = looseSection(g, i + 1);
        return rest;
      });
    }

    // composer_key = 'stored_blocks': the display profile declares that this
    // source's blocks are its printed paragraphs — every section is served from
    // its stored leaf blocks, never re-split from text_ar.
    if (profile?.composer_key === 'stored_blocks' && sections_source === 'sections') {
      const bySection = new Map<string, any[]>();
      for (const b of blocks as any[]) {
        if (!b.section_id || !LEAF_BLOCKS.has(b.block_type) || b.origin !== 'book_native') continue;
        if (!String(b.text_plain ?? '').trim()) continue;
        const list = bySection.get(b.section_id);
        if (list) list.push(b); else bySection.set(b.section_id, [b]);
      }
      if (bySection.size) {
        sections_source = 'blocks';
        effectiveSections = effectiveSections.map((s: any) => {
          const bs = (bySection.get(s.id) ?? []).sort((a: any, b: any) => (a.block_seq ?? 0) - (b.block_seq ?? 0));
          if (!bs.length) return s;
          return {
            ...s,
            paragraphs: bs.map((b: any) => String(b.text_plain ?? '').trim()).filter(Boolean),
            block_ids: bs.map((b: any) => b.id),
            page_no: s.page_no ?? bs[0]?.printed_page ?? null,
          };
        });
      }
    }

    const sectionsWithBody = effectiveSections.map((s: any) => {
      const lang = s.text_ar ? 'ar' : (s.text_en ? 'en' : null);
      const { paragraphs: stored, ...rest } = s;
      // Rows that already carry their paragraphs are served as stored.
      if (Array.isArray(stored) && stored.length) {
        return { ...rest, lang, body: sectionBodyFromStoredParagraphs(stored) };
      }

      const split = sections_source !== 'blocks' && lang !== 'en';
      return { ...rest, lang, body: computeSectionBody(s.text_ar ?? s.text_en, split) };
    });

    const footnotes = collectFootnotes(blocks);

    const footnote_binding = bindFootnoteMarks(sectionsWithBody, footnotes);

    const sarf_families = await resolveSarfFamilies(env, blocks);

    const sourceRow = await new SourcesRepo(env.DB_AL).bySlug(slug);
    return ok({
      meta: sourceRow ? v2RouteMeta(sourceRow) : { slug },
      entry,
      canonical,
      sections: sectionsWithBody,

      sections_source,
      blocks,
      sarf_families,
      links,
      tags,
      quran_refs,
      footnotes,

      footnote_binding,
      sources_of_entry,
      stats: {
        sections: sectionsWithBody.length,
        blocks: blocks.length,
        links: links.length,
        tags: tags.length,
        quran_refs: quran_refs.length,
        footnotes: footnotes.length,
        sarf_families: sarf_families.length,
      },
    });
  }));

  async function enrichRowsWithMeta(env: ArLinguisticsEnv, rows: any[]) {
    if (!rows.length) return [];
    const slugs = Array.from(new Set(rows.map(r => r.source_slug as string)));
    const sourceRows = await new SourcesRepo(env.DB_AL).bySlugs(slugs);
    const bySlug = new Map(sourceRows.map(s => [s.slug, s]));
    return rows.map(r => ({
      ...r,
      meta: bySlug.get(r.source_slug as string)
        ? v2RouteMeta(bySlug.get(r.source_slug as string) as LexiconSource)
        : undefined,
    }));
  }

  router.get('/al/lex/v2/search', async (req, env) => {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    const mode = (url.searchParams.get('mode') ?? 'root') as 'root' | 'word' | 'fts';
    const sourcesParam = url.searchParams.get('sources');
    const wanted = sourcesParam ? new Set(sourcesParam.split(',').filter(Boolean)) : null;
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? '50') | 0));

    if (!q) return ok({ results: [], total: 0, mode, q });

    if (mode === 'root') {
      const sourceFilter = wanted ? `AND source_slug IN (${[...wanted].map(() => '?').join(',')})` : '';
      const sql = `SELECT id, source_slug, root_text, root_norm,
                          page_start, page_end, volume_no
                   FROM ar_ling_lexicon_entry
                   WHERE root_norm LIKE ? ${sourceFilter}
                   ORDER BY root_norm, source_slug LIMIT ?`;
      const binds: unknown[] = [q + '%'];
      if (wanted) binds.push(...wanted);
      binds.push(limit);
      const rows = (await env.DB_AL.prepare(sql).bind(...binds).all()).results ?? [];
      return ok({
        results: await enrichRowsWithMeta(env, rows),
        total: rows.length, mode, q,
      });
    }

    if (mode === 'word') {
      const sourceFilter = wanted ? `AND source_slug IN (${[...wanted].map(() => '?').join(',')})` : '';
      const sql = `SELECT s.id AS section_id, s.source_slug, s.root_text, s.root_norm,
                          s.section_seq, s.heading_ar, s.heading_norm, s.heading_bare,
                          s.section_type, s.page_no,
                          substr(s.text_ar, 1, 160) AS preview
                   FROM ar_ling_lexicon_entry_section s
                   WHERE (s.heading_ar LIKE ? OR s.heading_norm LIKE ? OR s.heading_bare LIKE ?)
                         ${sourceFilter}
                   ORDER BY s.root_norm LIMIT ?`;
      const like = '%' + q + '%';
      const binds: unknown[] = [like, like, like];
      if (wanted) binds.push(...wanted);
      binds.push(limit);
      const rows = (await env.DB_AL.prepare(sql).bind(...binds).all()).results ?? [];
      return ok({
        results: await enrichRowsWithMeta(env, rows),
        total: rows.length, mode, q,
      });
    }

    if (mode === 'fts') {

      try {
        const sql = `SELECT s.id AS section_id, s.source_slug, s.root_text, s.root_norm,
                            s.section_seq, s.heading_ar, s.page_no,
                            snippet(ar_ling_lexicon_entry_section_fts, 1, '<mark>', '</mark>', '…', 12) AS snippet
                     FROM ar_ling_lexicon_entry_section_fts f
                     JOIN ar_ling_lexicon_entry_section s ON s.rowid = f.rowid
                     WHERE ar_ling_lexicon_entry_section_fts MATCH ?
                     ${wanted ? `AND s.source_slug IN (${[...wanted].map(() => '?').join(',')})` : ''}
                     LIMIT ?`;
        const binds: unknown[] = [q];
        if (wanted) binds.push(...wanted);
        binds.push(limit);
        const rows = (await env.DB_AL.prepare(sql).bind(...binds).all()).results ?? [];
        return ok({
          results: await enrichRowsWithMeta(env, rows),
          total: rows.length, mode, q,
        });
      } catch (e) {
        return ok({ results: [], total: 0, mode, q, error: 'fts unavailable' });
      }
    }

    return badRequest('unknown mode');
  });
}
