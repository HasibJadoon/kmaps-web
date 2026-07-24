// ─── /al/gram/* routes ───────────────────────────────────────────────────────
//
// Classical Arabic grammar corpus — ṣarf (SF), naḥw (NH), balāgha (BL).
// Reads the discipline-tagged tables produced by the Shamela4 authority ingest:
//   ar_ling_gram_bab      — the spine (abwāب tree per book, matn order preserved)
//   ar_ling_gram_chunk   — page-level verbatim text (page/volume anchored)
//   ar_ling_gram_chunks_fts — FTS5 (unicode61 remove_diacritics 2)
//   ar_ling_source       — book + edition metadata (provenance)
//
// Endpoints (all under the public `al` gateway → reachable at /api/al/gram/*):
//   GET /al/gram/books                       all books grouped by discipline
//   GET /al/gram/book/:slug                  one book: meta + spine tree
//   GET /al/gram/pages/:slug?bab=&page=&limit=  paginated page text
//   GET /al/gram/search?q=&discipline=&source=&limit=  diacritic-insensitive FTS
//
// Response shapes are stable and slug-agnostic — the UI never branches on source.

import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import { cached } from '../../../shared/src/cache';
import type { ArLinguisticsEnv } from '../env';

const DISC_LABEL: Record<string, { ar: string; en: string }> = {
  SF: { ar: 'الصرف', en: 'Morphology' },
  NH: { ar: 'النحو', en: 'Syntax' },
  BL: { ar: 'البلاغة', en: 'Rhetoric' },
};

interface BabRow {
  id: string; parent_id: string | null; title_ar: string;
  depth: number; matn_order: number; volume_no: number | null;
  page_start: number | null; discipline: string;
}

export function grammarRoutes(router: Router<ArLinguisticsEnv>): void {
  // ── Books grouped by discipline ────────────────────────────────────────────
  // Edge-cached: the corpus only changes on ingest.
  router.get('/al/gram/books', (req, env) => cached(req, async () => {
    // per-book bab counts by discipline (book primary discipline = modal bab discipline)
    const babAgg = (await env.DB_AL.prepare(
      `SELECT source_slug, discipline, COUNT(*) AS n
         FROM ar_ling_gram_bab GROUP BY source_slug, discipline`,
    ).all<{ source_slug: string; discipline: string; n: number }>()).results ?? [];

    const pageAgg = (await env.DB_AL.prepare(
      `SELECT source_slug, COUNT(*) AS pages, MAX(volume_no) AS volumes
         FROM ar_ling_gram_chunk GROUP BY source_slug`,
    ).all<{ source_slug: string; pages: number; volumes: number | null }>()).results ?? [];

    const meta = (await env.DB_AL.prepare(
      `SELECT slug, title_ar, author_name, author_death_ah, genre
         FROM ar_ling_source
        WHERE slug IN (SELECT DISTINCT source_slug FROM ar_ling_gram_bab)`,
    ).all<{ slug: string; title_ar: string; author_name: string | null; author_death_ah: number | null; genre: string | null }>()).results ?? [];

    const pageBy = new Map(pageAgg.map(p => [p.source_slug, p]));
    const babTotal = new Map<string, number>();
    const primary = new Map<string, { disc: string; n: number }>();
    for (const r of babAgg) {
      babTotal.set(r.source_slug, (babTotal.get(r.source_slug) ?? 0) + r.n);
      const cur = primary.get(r.source_slug);
      if (!cur || r.n > cur.n) primary.set(r.source_slug, { disc: r.discipline, n: r.n });
    }

    const books = meta.map(m => {
      const disc = primary.get(m.slug)?.disc ?? 'SF';
      const pg = pageBy.get(m.slug);
      return {
        slug: m.slug,
        title_ar: m.title_ar,
        author: m.author_name ?? '',
        death_ah: m.author_death_ah ?? null,
        discipline: disc,
        discipline_label: DISC_LABEL[disc] ?? DISC_LABEL.SF,
        bab_count: babTotal.get(m.slug) ?? 0,
        page_count: pg?.pages ?? 0,
        volumes: pg?.volumes ?? null,
      };
    }).sort((a, b) => (a.death_ah ?? 9999) - (b.death_ah ?? 9999));

    const groups = (['SF', 'NH', 'BL'] as const).map(d => ({
      discipline: d,
      label: DISC_LABEL[d],
      books: books.filter(b => b.discipline === d),
      book_count: books.filter(b => b.discipline === d).length,
      page_count: books.filter(b => b.discipline === d).reduce((s, b) => s + b.page_count, 0),
    }));

    return ok({ groups, total_books: books.length });
  }));

  // ── One book: metadata + full spine tree ───────────────────────────────────
  router.get('/al/gram/book/:slug', (req, env, params) => cached(req, async () => {
    const slug = params.slug;
    const meta = await env.DB_AL.prepare(
      `SELECT s.slug, s.title_ar, s.author_name, s.author_death_ah, s.genre,
              e.edition_label, e.note_md AS betaka
         FROM ar_ling_source s
         LEFT JOIN ar_ling_source_edition e ON e.source_id = s.id
        WHERE s.slug = ? LIMIT 1`,
    ).bind(slug).first<Record<string, unknown>>();
    if (!meta) return badRequest(`unknown book: ${slug}`);

    const babs = (await env.DB_AL.prepare(
      `SELECT id, parent_id, title_ar, depth, matn_order, volume_no, page_start, discipline
         FROM ar_ling_gram_bab WHERE source_slug = ? ORDER BY matn_order`,
    ).bind(slug).all<BabRow>()).results ?? [];

    // nest by parent_id — UI renders the tree directly
    const byId = new Map(babs.map(b => [b.id, { ...b, children: [] as unknown[] }]));
    const roots: unknown[] = [];
    for (const b of byId.values()) {
      const parent = b.parent_id ? byId.get(b.parent_id) : null;
      if (parent) (parent.children as unknown[]).push(b); else roots.push(b);
    }

    const pageCount = await env.DB_AL.prepare(
      `SELECT COUNT(*) AS n FROM ar_ling_gram_chunk WHERE source_slug = ?`,
    ).bind(slug).first<{ n: number }>();

    return ok({ book: { ...meta, page_count: pageCount?.n ?? 0 }, spine: roots, bab_count: babs.length });
  }));

  // ── Page text (paginated; optional bab filter) ─────────────────────────────
  router.get('/al/gram/pages/:slug', (req, env, params) => cached(req, async () => {
    const url = new URL(req.url);
    const slug = params.slug;
    const bab = url.searchParams.get('bab');
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10) || 20));
    const offset = (page - 1) * limit;

    const where = bab ? 'source_slug = ? AND bab_id = ?' : 'source_slug = ?';
    const binds = bab ? [slug, bab] : [slug];

    const total = await env.DB_AL.prepare(
      `SELECT COUNT(*) AS n FROM ar_ling_gram_chunk WHERE ${where}`,
    ).bind(...binds).first<{ n: number }>();

    const rows = (await env.DB_AL.prepare(
      `SELECT id, bab_id, volume_no, part_label, page_no, seq, text_ar, footnotes_ar
         FROM ar_ling_gram_chunk WHERE ${where}
        ORDER BY seq LIMIT ? OFFSET ?`,
    ).bind(...binds, limit, offset).all<Record<string, unknown>>()).results ?? [];

    return ok({ pages: rows, page, limit, total: total?.n ?? 0, has_more: offset + rows.length < (total?.n ?? 0) });
  }));

  // ── Full-text search (diacritic-insensitive) ───────────────────────────────
  router.get('/al/gram/search', async (req, env) => {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    if (q.length < 2) return badRequest('q must be at least 2 characters');
    const discipline = url.searchParams.get('discipline'); // SF | NH | BL
    const source = url.searchParams.get('source');         // slug
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') ?? '25', 10) || 25));

    // FTS query: quote the phrase so punctuation/spaces are literal-ish; callers
    // can pass explicit OR/NEAR operators themselves.
    const match = /["*]/.test(q) ? q : `"${q}"`;
    const conds = ['ar_ling_gram_chunks_fts MATCH ?'];
    const binds: unknown[] = [match];
    if (discipline) { conds.push('discipline = ?'); binds.push(discipline); }
    if (source)     { conds.push('source_slug = ?'); binds.push(source); }

    const rows = (await env.DB_AL.prepare(
      `SELECT id, source_slug, discipline,
              snippet(ar_ling_gram_chunks_fts, 4, '‹mark›', '‹/mark›', '…', 14) AS snippet
         FROM ar_ling_gram_chunks_fts
        WHERE ${conds.join(' AND ')}
        ORDER BY rank LIMIT ?`,
    ).bind(...binds, limit).all<{ id: string; source_slug: string; discipline: string; snippet: string }>()).results ?? [];

    // enrich with page anchor + book title (single round-trip)
    const ids = rows.map(r => r.id);
    let anchors: Record<string, { page_no: number | null; volume_no: number | null; title_ar: string }> = {};
    if (ids.length) {
      const ph = ids.map(() => '?').join(',');
      const a = (await env.DB_AL.prepare(
        `SELECT c.id, c.page_no, c.volume_no, s.title_ar
           FROM ar_ling_gram_chunk c
           JOIN ar_ling_source s ON s.slug = c.source_slug
          WHERE c.id IN (${ph})`,
      ).bind(...ids).all<{ id: string; page_no: number | null; volume_no: number | null; title_ar: string }>()).results ?? [];
      anchors = Object.fromEntries(a.map(x => [x.id, x]));
    }

    const results = rows.map(r => ({
      id: r.id,
      source_slug: r.source_slug,
      discipline: r.discipline,
      discipline_label: DISC_LABEL[r.discipline] ?? DISC_LABEL.SF,
      title_ar: anchors[r.id]?.title_ar ?? '',
      page_no: anchors[r.id]?.page_no ?? null,
      volume_no: anchors[r.id]?.volume_no ?? null,
      snippet: r.snippet,
    }));

    return ok({ query: q, count: results.length, results });
  });
}
