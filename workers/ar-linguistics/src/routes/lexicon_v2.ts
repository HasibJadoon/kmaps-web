// ─── /al/lex/v2/* routes ─────────────────────────────────────────────────────
//
// Source-agnostic root-based lexicon API. Reads from the new clean tables:
//   ar_ling_lexicon_entry
//   ar_ling_lexicon_entry_section
//   ar_ling_lexicon_block
//   ar_ling_lexicon_block_link
//   ar_ling_lexicon_block_tag
//   ar_ling_lexicon_quran_ref
//   ar_ling_lexicon_entry_source
//
// Endpoints:
//   GET /al/lex/v2/sources                                    list of lexicons
//   GET /al/lex/v2/roots?prefix=&page=&limit=&source=          paginated roots
//   GET /al/lex/v2/roots/:root_norm                            multi-source compare
//   GET /al/lex/v2/entry/:source_slug/:root_norm               one root in one source
//   GET /al/lex/v2/search?q=&mode=root|word|fts&sources=       unified search
//
// Response shape is stable across sources — UI never branches on slug.

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { cached } from '../../../shared/src/cache';
import type { ArLinguisticsEnv } from '../env';
import { SourcesRepo, type LexiconSource } from '../repositories/sources.repo';

// ── Per-source display metadata (D1-backed) ──────────────────────────────────
// SOURCES (a hardcoded Record<slug, {…}>) used to live here. The same data
// now lives in ar_ling_source after migrations 0016 + 0017, accessed via
// SourcesRepo. v2RouteMeta() below builds the projection v2 callers expect:
// { slug, title_ar, title_en, author, period, origin, bilingual? }.
//
// Two fields beyond the base toResponseMeta() shape:
//   - origin: pipeline producer (lane / ketabonline / thahabi / saaid / qomra)
//   - bilingual: optional flag — true only when the source has English columns
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
  // Match the previous behaviour: include `bilingual: true` ONLY when set.
  // Callers downstream check `if (meta.bilingual)` so an absent key signals
  // monolingual; emitting `bilingual: false` would be a noisier API change.
  return s.bilingual ? { ...base, bilingual: true } : base;
}

// ── Helpers — body normalization & footnote extraction ───────────────────────

const AR_INDIC_TO_ASCII = (s: string) =>
  s.replace(/[٠-٩]/g, ch => String.fromCharCode(0x30 + ch.charCodeAt(0) - 0x660));

/**
 * Turn an ingested `text_ar` (one line per fragment) into reader prose:
 *  - body.text        whitespace-collapsed single string
 *  - body.paragraphs  split at sentence-ending `.`, `؟`, `!`, `۔`
 *  - body.footnote_refs   distinct footnote marker numbers found in text
 *
 * No content is invented; the function only joins fragments and detects
 * inline markers that the UI already parses (« N », (( N )), [Sura/Aya]).
 */
function computeSectionBody(text_ar: string | null | undefined): {
  text: string; paragraphs: string[]; footnote_refs: number[];
} {
  if (!text_ar) return { text: '', paragraphs: [], footnote_refs: [] };
  const text = text_ar.replace(/\s+/g, ' ').trim();

  // Split at sentence terminators followed by whitespace. The lookbehind
  // keeps the terminator attached to the preceding paragraph.
  const paragraphs = text
    .split(/(?<=[.!؟۔])\s+/u)
    .map(p => p.trim())
    .filter(Boolean);

  // Inline footnote markers — « N », (( N )), (N), or "N-" at line start.
  const fnRe = /«\s*([0-9٠-٩]+)\s*»|\(\s*\(\s*([0-9٠-٩]+)\s*\)\s*\)/gu;
  const fnSet = new Set<number>();
  let m: RegExpExecArray | null;
  while ((m = fnRe.exec(text)) != null) {
    const raw = m[1] ?? m[2];
    if (!raw) continue;
    const n = +AR_INDIC_TO_ASCII(raw);
    if (Number.isFinite(n) && n > 0) fnSet.add(n);
  }
  return { text, paragraphs, footnote_refs: [...fnSet].sort((a, b) => a - b) };
}

// ── Ṣarf family, resolved ────────────────────────────────────────────────────
//
// Every book draws its own ṣarf tree for a root — al-Rāghib's بين is not
// al-Jawharī's — so the family is a *book-scoped block*, one per (source, root),
// and there are as many of them as there are sources that treat the root.
//
// Its `data_json` names grammar terms by id (`GT:form_family:bab_daraba`,
// `GT:transitivity:intransitive`). Those ids are useless to a renderer, so they
// are resolved here against `ar_ling_gram_term` into trilingual labels and the
// block is emitted display-ready. The raw block still rides in `blocks`.

interface TermLabel { id: string; ar: string; en: string; ur: string; short_ar: string | null }

/** Every `GT:` id reachable inside one ṣarf block. */
function sarfTermRefs(data: any): string[] {
  const out: string[] = [];
  const push = (v: unknown) => { if (typeof v === 'string' && v.startsWith('GT:')) out.push(v); };
  push(data?.root_type);
  for (const form of (Array.isArray(data?.forms) ? data.forms : [])) {
    push(form?.bab); push(form?.masdar_term); push(form?.ism_fail_term); push(form?.root_type);
    for (const alt of (Array.isArray(form?.bab_alt) ? form.bab_alt : [])) push(alt);
    for (const t of (Array.isArray(form?.trans) ? form.trans : [])) push(t);
  }
  return Array.from(new Set(out));
}

/** `{ar,en,ur}` as stored, with the empties nulled rather than sent as "". */
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

  // One lookup for the whole entry. A ṣarf block names a couple of dozen terms
  // at most, well inside D1's bound-parameter cap.
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
  // An id with no registry row reports as itself rather than vanishing — a
  // missing term is a data gap worth seeing, not worth hiding.
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
    // What makes *this book's* reading of the family its own — the reason the
    // panel is per source at all.
    distinctive_note: trilingual(data?.block_meta?.distinctive_note),
    authors_own_words: trilingual(data?.block_meta?.authors_own_words),
    poles: (Array.isArray(data?.poles) ? data.poles : []).map((p: any) => ({
      key: p?.key ?? null,
      ...(trilingual(p?.label) ?? { ar: null, en: null, ur: null }),
    })),
    forms: (Array.isArray(data?.forms) ? data.forms : []).map((f: any) => ({
      form_id: f?.form_id ?? null,
      roman: f?.roman ?? '',
      bab: term(f?.bab),
      bab_alt: (Array.isArray(f?.bab_alt) ? f.bab_alt : []).map(term).filter(Boolean),
      madi: f?.madi ?? null,
      mudari: f?.mudari ?? null,
      masdar_term: term(f?.masdar_term),
      masadir: (Array.isArray(f?.masadir) ? f.masadir : []).filter((m: any) => typeof m === 'string'),
      ism_fail: f?.ism_fail ?? null,
      ism_fail_term: term(f?.ism_fail_term),
      trans: (Array.isArray(f?.trans) ? f.trans : []).map(term).filter(Boolean),
      // Authored trilingually in some books and as a bare string in others.
      trans_note: trilingual(f?.trans_note)
        ?? (typeof f?.trans_note === 'string' && f.trans_note.trim()
              ? { ar: f.trans_note, en: null, ur: null } : null),
      pole: f?.pole ?? null,
      gloss: trilingual(f?.gloss),
      senses: (Array.isArray(f?.senses) ? f.senses : [])
        .map((s: any) => ({ sense: trilingual(s?.sense), example: trilingual(s?.example) }))
        .filter((s: any) => s.sense || s.example),
      ayah: f?.ayah ?? null,
      shahid: trilingual(f?.shahid)
        ?? (typeof f?.shahid === 'string' && f.shahid.trim() ? { ar: f.shahid, en: null, ur: null } : null),
    })),
  }));
}

/**
 * Pull footnote backing text from `block_type='footnote'` blocks.
 * The ingestion convention is `data_json.footnote_no` for the marker number
 * and `text_plain` for the body. Missing or malformed entries are skipped.
 */
function collectFootnotes(blocks: any[]): { num: number; text: string; block_id: string; section_id: string | null; }[] {
  const out: { num: number; text: string; block_id: string; section_id: string | null; }[] = [];
  for (const b of blocks) {
    if (b.block_type !== 'footnote') continue;
    let num: number | null = null;
    try {
      const dj = JSON.parse(b.data_json || '{}');
      const raw = dj.footnote_no ?? dj.footnote_num ?? dj.num;
      if (raw != null) num = +AR_INDIC_TO_ASCII(String(raw));
    } catch { /* fallthrough */ }
    if (num == null) {
      // Fallback: pluck a leading digit from text or title.
      const probe = (b.title_ar || b.text_plain || '').trim();
      const m = probe.match(/^[(\[«]?\s*([0-9٠-٩]+)/);
      if (m) num = +AR_INDIC_TO_ASCII(m[1]);
    }
    if (num == null || !Number.isFinite(num)) continue;
    out.push({
      num,
      text: (b.text_plain || '').trim(),
      block_id: b.id,
      section_id: b.section_id ?? null,
    });
  }
  return out.sort((a, b) => a.num - b.num);
}

// SOURCE_ORDER (the v2-specific catalogue ordering) used to live here as
// a hardcoded array. The same ordering now lives in ar_ling_source.source_order
// (seeded by 0017). Note: lexicon.ts uses a slightly different order — qomra
// editions appear later because lexicon.ts targets the classical/source-chunk
// reader, while v2 prefers the cleanly imported ketabonline editions. Both
// orderings come from the same column now; the ordering is opinionated about
// v2-relevant sources via the seed migration.

export function lexiconV2Routes(router: Router<ArLinguisticsEnv>) {

  // ── GET /al/lex/v2/sources ──────────────────────────────────────────────
  // Edge-cached: source list + per-source root counts only change on ingest.
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

  // ── GET /al/lex/v2/roots?source=&prefix=&page=&limit= ────────────────────
  // Edge-cached per (source, prefix, page, limit) query — the root index
  // for big lexicons (Lisan ~9K rows) is requested every time the user
  // opens a book and only changes on ingest.
  router.get('/al/lex/v2/roots', (req, env) => cached(req, async () => {
    const url = new URL(req.url);
    const source = url.searchParams.get('source');
    const prefix = (url.searchParams.get('prefix') ?? '').trim();
    const page   = Math.max(1, Number(url.searchParams.get('page') ?? '1') | 0);
    // Up to 10K rows per page — the left-rail root index for the larger
    // lexicons (Lisan, Taj, Qamus ~9K each) loads in a single request.
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

  // ── GET /al/lex/v2/roots/:root_norm — multi-source compare ───────────────
  router.get('/al/lex/v2/roots/:root_norm', (req, env, params) => cached(req, async () => {
    const root_norm = (params.root_norm ?? '').trim();
    if (!root_norm) return badRequest('root_norm required');

    const entries = (await env.DB_AL.prepare(
      `SELECT id, source_slug, root_text, root_norm, root_id,
              page_start, page_end, volume_no
       FROM ar_ling_lexicon_entry
       WHERE root_norm = ?
       ORDER BY source_slug`
    ).bind(root_norm).all()).results ?? [];

    if (!entries.length) return notFound('root not found');

    // Per-source section + block counts for the compare view headers
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

    // Per-source snippet — the first clean prose line the readers would show.
    // Prefer a `definition` block; fall back to the earliest non-header prose
    // block. Taken from `text_plain` (composed clean text) so it works for
    // every origin, including Lane (XML) and Sinai (JSON) whose raw_text is
    // unreadable. One window-function query, not one per source.
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

    // Resolve every source's meta in one bulk D1 query, then map by slug.
    const slugs = entries.map((e: any) => e.source_slug as string);
    const sourceRows = await new SourcesRepo(env.DB_AL).bySlugs(slugs);
    const sourceBySlug = new Map(sourceRows.map(s => [s.slug, s]));

    // Order the sources chronologically — earliest author first. Hijri years
    // are normalised to CE (H·0.970229 + 621.5643) so classical (AH) and
    // modern (CE) authors sort on one axis; authors with no death year (living
    // scholars, K-Maps synthesis) fall to the end.
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

  // ── GET /al/lex/v2/entry/:source_slug/:root_norm — full block tree ────────
  // This is the heaviest read in the system — a full entry can be 100s of KB
  // of blocks + sections + refs + links + tags + footnotes. Edge-cached per
  // (slug, root) so navigating between roots and re-opening books is instant.
  router.get('/al/lex/v2/entry/:source_slug/:root_norm', (req, env, params) => cached(req, async () => {
    const slug = params.source_slug ?? '';
    const root_norm = (params.root_norm ?? '').trim();
    if (!slug || !root_norm) return badRequest('slug + root_norm required');

    // Bilingual sources (Lane, Sinai) carry their entry in the *_en columns; the
    // Arabic lexica use the *_ar ones. Serve both and let the reader pick.
    const entry = await env.DB_AL.prepare(
      `SELECT id, source_slug, root_text, root_norm, root_id,
              raw_text, entry_text_ar, entry_text_en,
              page_start, page_end, volume_no, source_url,
              source_native_id, status
       FROM ar_ling_lexicon_entry
       WHERE source_slug = ? AND root_norm = ? LIMIT 1`
    ).bind(slug, root_norm).first<any>();
    if (!entry) return notFound('entry not found');

    const sections = (await env.DB_AL.prepare(
      `SELECT id, section_seq, heading_ar, heading_norm, heading_bare,
              section_type, text_ar, text_en, page_no, source_native_section_id
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

    // D1 caps bound parameters at ~100 per prepared statement. For dense
    // root entries (e.g. Lisan al-Arab's index for the letter `ا`, which
    // can have thousands of blocks) the old IN-list approach blew past
    // that limit and crashed the handler — surfacing as a 500. Use a
    // correlated subquery that re-derives the block set from
    // (source_slug, root_norm) so we bind only those two params again.
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

    // Canonical root metadata (the spine that ties sources together).
    //
    // `ar_ling_lexicon_entry.root_id` is NULL for almost every entry — only Lane
    // and the five-lens rows were ever back-linked — so keying on it alone
    // returned null canonical for al-Rāghib, al-Jawharī, Ibn Fāris and the rest,
    // and the reader's whole headword block (shape, Qurʾānic frequency, core
    // sense) came up empty for the books people actually read. The root row
    // exists; only the link is missing. Fall back to matching it by the
    // normalized root, which is what the two tables already agree on.
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

    // ── Normalize each section into a reader-ready `body` ──────────────
    // Ingestion split prose into fragment blocks (one per citation, footnote
    // marker, even a stray period). `section.text_ar` is the joined truth.
    // We compute `body.text` (whitespace-collapsed) and `body.paragraphs`
    // (split at Arabic/Latin sentence terminators) so the UI can render
    // flowing prose without re-stitching the fragments.
    // Bilingual sources (Sinai) carry their prose in text_en; `lang` lets the reader
    // set the reading direction from data rather than assuming Arabic.
    const sectionsWithBody = sections.map((s: any) => ({
      ...s,
      lang: s.text_ar ? 'ar' : (s.text_en ? 'en' : null),
      body: computeSectionBody(s.text_ar ?? s.text_en),
    }));

    // ── Collect footnote backing text (when ingestion preserved it) ────
    const footnotes = collectFootnotes(blocks);

    // The book's own ṣarf tree for this root, with its term ids resolved.
    const sarf_families = await resolveSarfFamilies(env, blocks);

    const sourceRow = await new SourcesRepo(env.DB_AL).bySlug(slug);
    return ok({
      meta: sourceRow ? v2RouteMeta(sourceRow) : { slug },
      entry,
      canonical,
      sections: sectionsWithBody,
      blocks,
      sarf_families,
      links,
      tags,
      quran_refs,
      footnotes,
      sources_of_entry,
      stats: {
        sections: sections.length,
        blocks: blocks.length,
        links: links.length,
        tags: tags.length,
        quran_refs: quran_refs.length,
        footnotes: footnotes.length,
        sarf_families: sarf_families.length,
      },
    });
  }));

  // ── /al/lex/v2/search rows → meta enrichment ──────────────────────────
  // Three search modes (root / word / fts) all return rows tagged with
  // source_slug. Centralise the metadata-bulk-fetch + map so each mode
  // stays a single `rows.map(... meta: bySlug.get(r.source_slug))`.
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

  // ── GET /al/lex/v2/search?q=&mode=root|word|fts&sources=&limit= ─────────
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
      // FTS5 on entry_sections (preferred) — falls back to text LIKE if no
      // FTS5 match. We don't include block FTS yet (heavier query).
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
