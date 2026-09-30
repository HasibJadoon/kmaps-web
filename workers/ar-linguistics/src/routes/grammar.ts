import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import { cached } from '../../../shared/src/cache';
import type { ArLinguisticsEnv } from '../env';

const DISC_LABEL: Record<string, { ar: string; en: string }> = {
  SF: { ar: 'الصرف', en: 'Morphology' },
  NH: { ar: 'النحو', en: 'Syntax' },
  BL: { ar: 'البلاغة', en: 'Rhetoric' },
};

/// The colour a category is drawn in: whatever most of its terms already wear.
function commonColour(terms: { badge_color: string | null }[]): string | null {
  const counts = new Map<string, number>();
  for (const term of terms) {
    if (!term.badge_color) continue;
    counts.set(term.badge_color, (counts.get(term.badge_color) ?? 0) + 1);
  }
  let best: string | null = null;
  let seen = 0;
  for (const [colour, n] of counts) {
    if (n > seen) { best = colour; seen = n; }
  }
  return best;
}

interface BabRow {
  id: string; parent_id: string | null; title_ar: string;
  depth: number; matn_order: number; volume_no: number | null;
  page_start: number | null; discipline: string;
}

/// The three sciences as the GT registry files them — its category table keys
/// them in the long form, so this is the one place that spells them out.
/// Above this many أبواب, a book's table of contents is served a level at a
/// time. Below it, one payload is smaller than the round trips.
const LAZY_SPINE_ABOVE = 200;

/// The registry files a category under its discipline's short code (NH/SF/BL, migration 0109);
/// the tree answers with the long public code its callers already read.
const GT_DISCIPLINE: Record<string, { code: string; ar: string; en: string; color: string }> = {
  NH: { code: 'nahw',    ar: 'النحو',    en: 'Naḥw',    color: '#d8b657' },
  SF: { code: 'sarf',    ar: 'الصرف',    en: 'Ṣarf',    color: '#5bbf95' },
  BL: { code: 'balagha', ar: 'البلاغة',  en: 'Balāgha', color: '#d98a8a' },
};

/// Terms and categories carry their own `badge_color`; nothing in the app
/// should be inventing a colour for a concept that the registry has already
/// coloured. Where a term has none, it takes its category's, and a category
/// with none takes the most common colour among its own terms.
interface TermRow {
  id: string; category_key: string; term_key: string;
  parent_term_id: string | null; term_order: number;
  name_ar: string; name_en: string;
  short_ar: string | null; short_en: string | null;
  badge_color: string | null; icon: string | null;
  examples: number; sources: number; babs: number;
}

export function grammarRoutes(router: Router<ArLinguisticsEnv>): void {

  /// The whole grammar-term registry as a tree: science → category → term →
  /// sub-term. This is the registry of concepts — what the maps are drawn from
  /// and what a concept page is about — as opposed to the syllabus, which is
  /// one way of *teaching* them.
  /// Labels for a list of registry term ids (`GT:jumud:mushtaqq,…`), keyed by
  /// id — what a word card needs to name the grammatical facts stored against a
  /// word, in Arabic, English and Urdu. Unknown ids are simply absent.
  router.get('/al/gram/terms/resolve', (req, env) => cached(req, async () => {
    const raw = new URL(req.url).searchParams.get('ids') ?? '';
    const ids = [...new Set(raw.split(',').map(s => s.trim()).filter(Boolean))];
    if (!ids.length) return badRequest('ids (comma-separated GT term ids) param required');
    if (ids.length > 200) return badRequest(`too many ids (${ids.length}); max 200`);
    const rows = (await env.DB_AL.prepare(
      `SELECT id, category_key, term_key, name_ar, name_en, name_ur
         FROM ar_ling_gram_term
        WHERE status = 'live' AND id IN (${ids.map(() => '?').join(',')})`,
    ).bind(...ids).all<Record<string, unknown>>()).results ?? [];
    return ok(Object.fromEntries(rows.map(r => [r.id as string, r])));
  }));

  router.get('/al/gram/terms', (req, env) => cached(req, async () => {
    const categories = (await env.DB_AL.prepare(
      `SELECT category_key, discipline, name_ar, name_en, name_ur,
              applies_to, display_order, icon
         FROM ar_ling_gram_category
        ORDER BY discipline, display_order, category_key`,
    ).all<Record<string, unknown>>()).results ?? [];

    const terms = (await env.DB_AL.prepare(
      `SELECT t.id, t.category_key, t.term_key, t.parent_term_id, t.term_order,
              t.name_ar, t.name_en, t.short_ar, t.short_en, t.badge_color, t.icon,
              (SELECT COUNT(*) FROM ar_ling_gram_term_example e WHERE e.term_id = t.id) AS examples,
              (SELECT COUNT(*) FROM ar_ling_gram_term_source s WHERE s.term_id = t.id) AS sources,
              (SELECT COUNT(*) FROM ar_ling_gram_term_toc c WHERE c.term_id = t.id) AS babs
         FROM ar_ling_gram_term t
        WHERE t.status = 'live'
        ORDER BY t.category_key, t.term_order, t.name_ar`,
    ).all<TermRow>()).results ?? [];

    const byCategory = new Map<string, TermRow[]>();
    for (const term of terms) {
      const list = byCategory.get(term.category_key) ?? [];
      list.push(term);
      byCategory.set(term.category_key, list);
    }

    const shaped = categories.map((category) => {
      const key = category.category_key as string;
      const own = byCategory.get(key) ?? [];
      const colour = commonColour(own);

      const kids = new Map<string | null, TermRow[]>();
      for (const term of own) {
        const list = kids.get(term.parent_term_id) ?? [];
        list.push(term);
        kids.set(term.parent_term_id, list);
      }
      const build = (parent: string | null): unknown[] =>
        (kids.get(parent) ?? []).map((term) => ({
          id: term.id,
          termKey: term.term_key,
          nameAr: term.name_ar,
          nameEn: term.name_en,
          shortAr: term.short_ar,
          shortEn: term.short_en,
          color: term.badge_color ?? colour,
          icon: term.icon,
          examples: term.examples ?? 0,
          sources: term.sources ?? 0,
          babs: term.babs ?? 0,
          children: build(term.id),
        }));

      return {
        categoryKey: key,
        discipline: category.discipline,
        nameAr: category.name_ar,
        nameEn: category.name_en,
        appliesTo: category.applies_to,
        icon: category.icon,
        color: colour,
        total: own.length,
        terms: build(null),
      };
    });

    const disciplines = Object.entries(GT_DISCIPLINE).map(([short, label]) => {
      const mine = shaped.filter((c) => c.discipline === short && c.total > 0)
        .map((c) => ({ ...c, discipline: label.code }));
      return {
        code: label.code,
        nameAr: label.ar,
        nameEn: label.en,
        color: label.color,
        terms: mine.reduce((sum, c) => sum + c.total, 0),
        categories: mine,
      };
    }).filter((d) => d.categories.length > 0);

    return ok({ disciplines, total: terms.length });
  }, { browser: 300, edge: 900 }));

  router.get('/al/gram/books', (req, env) => cached(req, async () => {

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

  router.get('/al/gram/book/:slug', (req, env, params) => cached(req, async () => {
    const url = new URL(req.url);
    const slug = params.slug;
    const meta = await env.DB_AL.prepare(
      `SELECT s.slug, s.title_ar, s.author_name, s.author_death_ah, s.genre,
              e.edition_label, e.note_md AS betaka
         FROM ar_ling_source s
         LEFT JOIN ar_ling_source_edition e ON e.source_id = s.id
        WHERE s.slug = ? LIMIT 1`,
    ).bind(slug).first<Record<string, unknown>>();
    if (!meta) return badRequest(`unknown book: ${slug}`);

    const total = await env.DB_AL.prepare(
      `SELECT COUNT(*) AS n FROM ar_ling_gram_bab WHERE source_slug = ?`,
    ).bind(slug).first<{ n: number }>();
    const babCount = total?.n ?? 0;

    // A table of contents is not the book, but for دراسات لأسلوب القرآن it is
    // eight hundred headings and a hundred and fifty kilobytes — sent whole on
    // open, and drawn whole into the rail. Past a threshold the spine arrives
    // one level at a time: the chapters now, a chapter's own headings when the
    // reader opens it.
    const lazy = babCount > LAZY_SPINE_ABOVE;
    const parent = url.searchParams.get('parent');
    // دراسات لأسلوب القرآن has 795 headings at the top level — a flat TOC that
    // no amount of level-laziness shortens. So the level is paged too.
    const take = Math.min(400, Math.max(20, parseInt(url.searchParams.get('limit') ?? '150', 10) || 150));
    const skip = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0', 10) || 0);

    const babs = (await env.DB_AL.prepare(
      lazy
        ? `SELECT id, parent_id, title_ar, depth, matn_order, volume_no, page_start, discipline,
                  (SELECT COUNT(*) FROM ar_ling_gram_bab k WHERE k.parent_id = b.id) AS child_count
             FROM ar_ling_gram_bab b
            WHERE source_slug = ? AND ${parent ? 'parent_id = ?' : 'parent_id IS NULL'}
            ORDER BY matn_order LIMIT ? OFFSET ?`
        : `SELECT id, parent_id, title_ar, depth, matn_order, volume_no, page_start, discipline,
                  page_extent, 0 AS child_count
             FROM ar_ling_gram_bab WHERE source_slug = ? ORDER BY matn_order`,
    ).bind(...(lazy
                 ? (parent ? [slug, parent, take, skip] : [slug, take, skip])
                 : [slug])).all<BabRow>()).results ?? [];

    let roots: unknown[] = babs.map(b => ({ ...b, children: [] as unknown[] }));
    if (!lazy) {
      const byId = new Map(babs.map(b => [b.id, { ...b, children: [] as unknown[] }]));
      roots = [];
      for (const b of byId.values()) {
        const up = b.parent_id ? byId.get(b.parent_id) : null;
        if (up) (up.children as unknown[]).push(b); else roots.push(b);
      }
    }

    const levelCount = lazy
      ? (await env.DB_AL.prepare(
          `SELECT COUNT(*) AS n FROM ar_ling_gram_bab
            WHERE source_slug = ? AND ${parent ? 'parent_id = ?' : 'parent_id IS NULL'}`,
        ).bind(...(parent ? [slug, parent] : [slug])).first<{ n: number }>())?.n ?? 0
      : babCount;

    const pageCount = await env.DB_AL.prepare(
      `SELECT COUNT(*) AS n FROM ar_ling_gram_chunk WHERE source_slug = ?`,
    ).bind(slug).first<{ n: number }>();

    return ok({
      book: { ...meta, page_count: pageCount?.n ?? 0 },
      spine: roots,
      bab_count: babCount,
      level_count: levelCount,
      offset: skip,
      has_more: lazy && skip + roots.length < levelCount,
      // The client should ask for a chapter's own headings with ?parent=<id>
      // rather than expect them in this payload.
      lazy,
      parent: parent ?? null,
    });
  }));

  router.get('/al/gram/pages/:slug', (req, env, params) => cached(req, async () => {
    const url = new URL(req.url);
    const slug = params.slug;
    const bab = url.searchParams.get('bab');
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10) || 20));
    const offset = (page - 1) * limit;

    let where = bab ? 'source_slug = ? AND bab_id = ?' : 'source_slug = ?';
    let binds: unknown[] = bab ? [slug, bab] : [slug];
    let windowed = false;

    // A heading that begins half way down a page owns no page of its own: the
    // chunk belongs to whichever heading opened that page. Roughly a fifth of
    // the corpus's أبواب are like that, and asking for one used to answer "no
    // pages" — which is false. The book does not stop there; the reader simply
    // has to start where the heading starts. So when a باب has no chunks, the
    // window from its own first page to the next heading's is served instead.
    if (bab) {
      const own = await env.DB_AL.prepare(
        `SELECT COUNT(*) AS n FROM ar_ling_gram_chunk WHERE source_slug = ? AND bab_id = ?`,
      ).bind(slug, bab).first<{ n: number }>();

      if (!own?.n) {
        const here = await env.DB_AL.prepare(
          `SELECT matn_order, volume_no, page_start, page_extent FROM ar_ling_gram_bab WHERE id = ?`,
        ).bind(bab).first<{ matn_order: number; volume_no: number | null;
                           page_start: number | null; page_extent: number | null }>();

        if (here?.page_start) {
          const next = await env.DB_AL.prepare(
            `SELECT volume_no, page_start FROM ar_ling_gram_bab
              WHERE source_slug = ? AND matn_order > ? AND page_start IS NOT NULL
              ORDER BY matn_order LIMIT 1`,
          ).bind(slug, here.matn_order).first<{ volume_no: number | null; page_start: number | null }>();

          // A book with volumes restarts its page numbers, so the comparison is
          // on the pair, not on the page.
          const from = (here.volume_no ?? 1) * 100000 + here.page_start;
          // Several headings can share one page — a book that lists أتى، أجر،
          // ألا one after another on ص٢٦١ gives them all the same page_start —
          // so a window that ends where the next one begins would be empty.
          // The page a heading opens on always belongs to it.
          // جمهرة's index counts how many pages each باب runs to. Where we have
          // that number it beats guessing from the next heading — several
          // headings share a page, and the next one may open on this very page.
          const measured = here.page_extent ? from + Math.ceil(here.page_extent) : 0;
          const nextStart = next?.page_start
            ? (next.volume_no ?? 1) * 100000 + next.page_start
            : Number.MAX_SAFE_INTEGER;
          const to = Math.max(measured || nextStart, from + 1);
          where = `source_slug = ?
                   AND (COALESCE(volume_no, 1) * 100000 + COALESCE(page_no, 0)) >= ?
                   AND (COALESCE(volume_no, 1) * 100000 + COALESCE(page_no, 0)) < ?`;
          binds = [slug, from, to];
          windowed = true;
        }
      }
    }

    const total = await env.DB_AL.prepare(
      `SELECT COUNT(*) AS n FROM ar_ling_gram_chunk WHERE ${where}`,
    ).bind(...binds).first<{ n: number }>();

    const rows = (await env.DB_AL.prepare(
      `SELECT id, bab_id, volume_no, part_label, page_no, seq, text_ar, footnotes_ar
         FROM ar_ling_gram_chunk WHERE ${where}
        ORDER BY seq LIMIT ? OFFSET ?`,
    ).bind(...binds, limit, offset).all<Record<string, unknown>>()).results ?? [];

    return ok({
      pages: rows, page, limit, total: total?.n ?? 0,
      has_more: offset + rows.length < (total?.n ?? 0),
      // True when the chapter had no pages of its own and the reader is being
      // shown the stretch of book that begins at its heading.
      windowed,
    });
  }));

  router.get('/al/gram/search', async (req, env) => {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    if (q.length < 2) return badRequest('q must be at least 2 characters');
    const discipline = url.searchParams.get('discipline');
    const source = url.searchParams.get('source');
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') ?? '25', 10) || 25));

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

    const ids = rows.map(r => r.id);

    let anchors: Record<string, { bab_id: string | null; page_no: number | null; volume_no: number | null; title_ar: string }> = {};
    if (ids.length) {
      const ph = ids.map(() => '?').join(',');
      const a = (await env.DB_AL.prepare(
        `SELECT c.id, c.bab_id, c.page_no, c.volume_no, s.title_ar
           FROM ar_ling_gram_chunk c
           JOIN ar_ling_source s ON s.slug = c.source_slug
          WHERE c.id IN (${ph})`,
      ).bind(...ids).all<{ id: string; bab_id: string | null; page_no: number | null; volume_no: number | null; title_ar: string }>()).results ?? [];
      anchors = Object.fromEntries(a.map(x => [x.id, x]));
    }

    const results = rows.map(r => ({
      id: r.id,
      source_slug: r.source_slug,
      discipline: r.discipline,
      discipline_label: DISC_LABEL[r.discipline] ?? DISC_LABEL.SF,
      title_ar: anchors[r.id]?.title_ar ?? '',
      bab_id: anchors[r.id]?.bab_id ?? null,
      page_no: anchors[r.id]?.page_no ?? null,
      volume_no: anchors[r.id]?.volume_no ?? null,
      snippet: r.snippet,
    }));

    return ok({ query: q, count: results.length, results });
  });

  /// A registry term with the shawāhid that were mined for it. The term is the
  /// unit a reader actually studies — the definition says what it is, the
  /// Qurʾānic examples say what it looks like — so both travel together, and
  /// each example carries the page of the work it was read out of, because a
  /// shāhid without a reference is an assertion.
  router.get('/al/gram/term/:id', (req, env, params) => cached(req, async () => {
    const id = params.id;

    const term = await env.DB_AL.prepare(
      `SELECT id, category_key, term_key, discipline, name_ar, name_en, name_ur,
              short_ar, short_en, definition_ar, definition_en, badge_color, icon
         FROM ar_ling_gram_term WHERE id = ? AND status = 'live'`,
    ).bind(id).first<Record<string, unknown>>();
    if (!term) return badRequest(`unknown term ${id}`);

    // source_ref is 'slug#chunk_id'; the chunk carries the volume and page.
    const examples = (await env.DB_AL.prepare(
      `SELECT e.id, e.example_ar, e.example_kind, e.qr_ref, e.source_ref,
              e.gloss_en, e.gloss_ur,
              c.volume_no, c.page_no, c.bab_id, s.title_ar AS source_title_ar,
              s.author_name AS source_author
         FROM ar_ling_gram_term_example e
         LEFT JOIN ar_ling_gram_chunk c
                ON c.id = substr(e.source_ref, instr(e.source_ref, '#') + 1)
         LEFT JOIN ar_ling_source s ON s.slug = c.source_slug
        WHERE e.term_id = ?
        ORDER BY e.example_kind, e.sort_order`,
    ).bind(id).all<Record<string, unknown>>()).results ?? [];

    const babIds = [...new Set(examples.map(e => e.bab_id).filter(Boolean))] as string[];
    let babs: Record<string, string> = {};
    if (babIds.length) {
      const ph = babIds.map(() => '?').join(',');
      const rows = (await env.DB_AL.prepare(
        `SELECT id, title_ar FROM ar_ling_gram_bab WHERE id IN (${ph})`,
      ).bind(...babIds).all<{ id: string; title_ar: string }>()).results ?? [];
      babs = Object.fromEntries(rows.map(b => [b.id, b.title_ar]));
    }

    // Everything else the registry knows about this concept: what it rules,
    // where it is treated, and what it sits beside.
    const [rules, sources, relations, tocs, kids] = await Promise.all([
      env.DB_AL.prepare(
        `SELECT id, statement_ar, statement_en, caveat_ar, caveat_en, applies_when
           FROM ar_ling_gram_term_rule
          WHERE term_id = ? AND status = 'live'
          ORDER BY sort_order`,
      ).bind(id).all<Record<string, unknown>>(),
      env.DB_AL.prepare(
        `SELECT ts.source_slug, ts.page_ref, s.title_ar, s.author_name
           FROM ar_ling_gram_term_source ts
           LEFT JOIN ar_ling_source s ON s.slug = ts.source_slug
          WHERE ts.term_id = ?`,
      ).bind(id).all<Record<string, unknown>>(),
      env.DB_AL.prepare(
        `SELECT r.relation_kind, r.note_ar, t.id, t.name_ar, t.name_en, t.badge_color
           FROM ar_ling_gram_term_relation r
           JOIN ar_ling_gram_term t ON t.id = r.to_term_id AND t.status = 'live'
          WHERE r.from_term_id = ?`,
      ).bind(id).all<Record<string, unknown>>(),
      // Where the books themselves treat it — the seam that makes a term open
      // into the library rather than dead-ending in a definition.
      env.DB_AL.prepare(
        `SELECT c.bab_id, c.bab_title_ar, c.source_slug, c.page_start,
                c.match_kind, c.state, s.title_ar AS source_title_ar
           FROM ar_ling_gram_term_toc c
           LEFT JOIN ar_ling_source s ON s.slug = c.source_slug
          WHERE c.term_id = ? AND c.state <> 'rejected'
          ORDER BY c.source_rank, c.match_rank
          LIMIT 40`,
      ).bind(id).all<Record<string, unknown>>(),
      env.DB_AL.prepare(
        `SELECT id, name_ar, name_en, short_ar, badge_color
           FROM ar_ling_gram_term
          WHERE parent_term_id = ? AND status = 'live'
          ORDER BY term_order, name_ar`,
      ).bind(id).all<Record<string, unknown>>(),
    ]);

    return ok({
      term,
      rules: rules.results ?? [],
      sources: sources.results ?? [],
      relations: relations.results ?? [],
      treatedIn: tocs.results ?? [],
      children: kids.results ?? [],
      examples: examples.map(e => ({
        id: e.id,
        example_ar: e.example_ar,
        example_kind: e.example_kind,
        qr_ref: e.qr_ref,
        gloss_en: e.gloss_en,
        gloss_ur: e.gloss_ur,
        source_title_ar: e.source_title_ar,
        source_author: e.source_author,
        volume_no: e.volume_no,
        page_no: e.page_no,
        bab_title_ar: e.bab_id ? babs[e.bab_id as string] ?? null : null,
      })),
      quran_count: examples.filter(e => e.example_kind === 'quran').length,
    });
  }, { browser: 60, edge: 300 }));
  /// المسائل الخلافية — where the two schools actually parted.
  ///
  /// The Kūfan primary shelf closes after al-Farrāʾ because the books are lost,
  /// so an attribution to نحاة الكوفة has, on its own, nothing behind it. Ibn
  /// al-Anbārī's الإنصاف is the substitute the tradition leaves: 118 masāʾil,
  /// each stating the Kūfan position and the Baṣran one. This hands them over
  /// side by side, so a claim can be read against its own advocate.
  ///
  /// `?school=kufa|basra` keeps only the masāʾil where that side is on record;
  /// `?q=` searches the masʾala titles.
  router.get('/al/gram/khilaf', (req, env) => cached(req, async () => {
    const url = new URL(req.url);
    const school = url.searchParams.get('school');
    const q = (url.searchParams.get('q') ?? '').trim();

    const where: string[] = [];
    const args: unknown[] = [];
    if (school === 'kufa')  where.push('k.kufa_ar IS NOT NULL');
    if (school === 'basra') where.push('k.basra_ar IS NOT NULL');
    if (q) { where.push('k.title_ar LIKE ?'); args.push(`%${q}%`); }

    const rows = (await env.DB_AL.prepare(
      `SELECT k.id, k.masala_no, k.title_ar, k.kufa_ar, k.basra_ar, k.verdict,
              k.volume_no, k.page_start, k.bab_id, k.source_slug,
              s.title_short_ar AS source_title_ar, s.author_name AS source_author
         FROM ar_ling_gram_khilaf k
         LEFT JOIN ar_ling_source s ON s.slug = k.source_slug
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY k.masala_no`,
    ).bind(...args).all<Record<string, unknown>>()).results ?? [];

    return ok({
      total: rows.length,
      // said plainly, because a gap here is a gap in the book's own wording
      // rather than a row we failed to write
      with_both: rows.filter(r => r.kufa_ar && r.basra_ar).length,
      masail: rows,
    });
  }, { browser: 60, edge: 600 }));
}
