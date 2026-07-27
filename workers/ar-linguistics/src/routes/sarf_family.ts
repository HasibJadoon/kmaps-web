// ─── /al/sarf/* — the ṣarf-family panel, one book or all books ──────────────
//
// The morphology family for a root as each lexicon draws it: which forms the
// book records, under which bāb, in which pole of meaning, with the book's own
// levelling claims and nominals. Authored by the lexicon-builder pipeline into
// `sarf_family` blocks (see docs/quran-morphology-step-process.md); served here
// with every `GT:category:term` code resolved against ar_ling_gram_term, so the
// client gets { code, name_ar, name_en, name_ur, short_* } where the block
// stores a bare id.
//
// Endpoints:
//   GET /al/sarf/roots                            roots that have a ṣarf family
//   GET /al/sarf/root/:root_text                  all books, chronological
//   GET /al/sarf/root/:root_text/source/:slug     one book
//
// Both display modes read the same rows through the same resolver — the
// all-books view is the single-book view repeated plus the cross-book
// `pole_families` table, so a form can never render one way in one mode and
// another way in the other.
//
// `:root_text` is normalised with rootNorm() before it touches D1, so 'بين',
// 'بَيْن' and 'ب ي ن' all reach the same row.
//
// Deliberately untouched: the per-lexicon dictionary routes (lexicon_lane,
// lexicon_lisan, lexicon_mufradat, lexicon_five_lens, lexicon_display). This
// module adds a panel; it replaces nothing.

import type { Router } from '../../../shared/src/router';
import { ok, badRequest, notFound } from '../../../shared/src/response';
import { cached } from '../../../shared/src/cache';
import { rootNorm } from '../../../shared/src/morph-normalize';
import type { ArLinguisticsEnv } from '../env';
import { SarfFamilyRepo } from '../repositories/sarf_family.repo';

/** Every response carries the schema generation the blocks were authored to,
 *  so a client can refuse a shape it doesn't know rather than mis-render it. */
const SCHEMA_VERSION = 'v2';

export function sarfFamilyRoutes(router: Router<ArLinguisticsEnv>) {

  // ── GET /al/sarf/roots ──────────────────────────────────────────────────
  // Coverage index: which roots have a ṣarf family and in how many books.
  // Registered before `/al/sarf/root/:root_text` — 'roots' and 'root' are
  // distinct literals so they cannot collide, but keeping the literal first
  // matches the house pattern (shared/src/router.ts returns the first match).
  router.get('/al/sarf/roots', (req, env) => cached(req, async () => {
    const roots = await new SarfFamilyRepo(env.DB_AL).coverage();
    return ok({ schema_version: SCHEMA_VERSION, roots, total: roots.length });
  }));

  // ── GET /al/sarf/root/:root_text ────────────────────────────────────────
  // All-books view. Books are ordered by the author's death year — the order
  // a reader of the tradition expects — with undated moderns last.
  router.get('/al/sarf/root/:root_text', (req, env, params) => cached(req, async () => {
    const norm = rootNorm(params.root_text);
    if (!norm) return badRequest('root_text is empty after normalisation');

    const repo   = new SarfFamilyRepo(env.DB_AL);
    const blocks = await repo.blocksByRoot(norm);
    if (blocks.length === 0) return notFound(`Ṣarf family for root '${norm}'`);

    const view = await repo.resolveBlocks(blocks, norm);
    return ok({
      root:             params.root_text,
      root_norm:        view.root_norm,
      schema_version:   SCHEMA_VERSION,
      scope:            'all_books',
      source_count:     view.source_count,
      pole_families:    view.pole_families,
      books:            view.books,
      unresolved_codes: view.unresolved_codes,
    });
  }));

  // ── GET /al/sarf/root/:root_text/source/:source_slug ────────────────────
  // Single-book view. 404s rather than falling back to another book: showing
  // al-Jawharī's family under al-Khalīl's name looks right and is wrong.
  router.get('/al/sarf/root/:root_text/source/:source_slug', (req, env, params) => cached(req, async () => {
    const norm = rootNorm(params.root_text);
    if (!norm) return badRequest('root_text is empty after normalisation');

    const repo   = new SarfFamilyRepo(env.DB_AL);
    const blocks = await repo.blocksByRootAndSource(norm, params.source_slug);
    if (blocks.length === 0) {
      return notFound(`Ṣarf family for root '${norm}' in source '${params.source_slug}'`);
    }

    const view = await repo.resolveBlocks(blocks, norm);
    // One family panel per book by construction (UNIQUE root_entry_id,
    // block_path). If a book ever grows a second, block_seq decides which is
    // the family and the rest ride along in `additional_blocks`.
    const [book, ...additional] = view.books;
    return ok({
      root:             params.root_text,
      root_norm:        view.root_norm,
      schema_version:   SCHEMA_VERSION,
      scope:            'single_book',
      source:           book.source,
      block:            book.block,
      sarf_family:      book.sarf_family,
      pole_families:    view.pole_families,
      unresolved_codes: view.unresolved_codes,
      ...(additional.length ? { additional_blocks: additional } : {}),
    });
  }));
}
