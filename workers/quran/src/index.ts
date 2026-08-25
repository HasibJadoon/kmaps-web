// ─── km-quran-worker entry point ──────────────────────────────────────────────
// Owns DB_QR (km_quran). All cross-domain reads go through service bindings
// AR_LINGUISTICS, WORLDVIEW, and CONTENT — never by binding their D1 databases.

import { Router } from '../../shared/src/router';
import { sense, readRows, type SenseRequest, type RowsRequest } from '../../shared/src/sense';
import { dbHealth } from '../../shared/src/http';
import { ok } from '../../shared/src/response';
import type { QuranEnv } from './env';

import { surahRoutes } from './routes/surahs';
import { ayahRoutes } from './routes/ayahs';
import { wordRoutes } from './routes/words';
import { translationRoutes } from './routes/translations';
import { studyRoutes } from './routes/study';
import { pageRoutes } from './routes/pages';
import { menuRoutes } from './routes/menu';
import { readerRoutes } from './routes/reader';
import { vocabularyRoutes } from './routes/vocabulary';
import { morphologyRoutes } from './routes/morphology';
import { wordGridRoutes } from './routes/word-grid';
import { lexiconDisplayRoutes } from './routes/lexicon-display';
import { worldviewRoutes } from './routes/worldview';
import { tafsirRoutes } from './routes/tafsir';
import { irabRoutes } from './routes/irab';
import { iraabDisplayRoutes } from './routes/iraab-display';
import { tafsirDisplayRoutes } from './routes/tafsir-display';
import { lexiconRoutes } from './routes/lexicon';
import { depGraphRoutes } from './routes/dep-graphs';
import { mushafRoutes } from './routes/mushaf';
import { adminSyncRoutes } from './routes/admin-sync';

const router = new Router<QuranEnv>();

// Health
router.get('/health', async (_req, env) =>
  ok({ domain: 'quran', db: 'DB_QR', db_ok: await dbHealth(env.DB_QR) }),
);

// Domain routes
menuRoutes(router);          // GET /qr/menu — navigation dataset
surahRoutes(router);         // GET /qr/surahs, /qr/surahs/:id
readerRoutes(router);        // GET /qr/surahs/:id/reader — combined ayah+translation payload
vocabularyRoutes(router);    // GET /qr/surahs/:id/vocabulary — POS-grouped words
morphologyRoutes(router);    // GET /qr/surahs/:id/morphology — per-word morphology grid
wordGridRoutes(router);      // GET /qr/word-grid?scope= — lightweight scope-based word grid
lexiconDisplayRoutes(router);// GET /qr/lexicon/root/:root — root display record (render layer)
worldviewRoutes(router);     // GET /qr/surahs/:id/worldview — Quran-scoped worldview projection data
ayahRoutes(router);          // GET /qr/ayahs, /qr/ayahs/search, /qr/ayahs/:s/:a
wordRoutes(router);          // GET /qr/words, by-lemma, by-root
translationRoutes(router);   // GET /qr/translation-sources, /qr/translations
studyRoutes(router);         // GET /qr/study/surahs/:id — grid, passages, lesson, vocab, expressions
pageRoutes(router);          // GET /qr/pages/:page, /qr/surahs/:id/pages
mushafRoutes(router);        // GET /qr/mushaf/pages/:page — Quran.com-style Mushaf layout
tafsirRoutes(router);        // GET /qr/tafsir, /qr/scholars, /qr/works
tafsirDisplayRoutes(router); // GET /qr/tafsir/display, /qr/tafsir/display/sources, /search, /compare
irabRoutes(router);          // GET /qr/irab/book-sources, /qr/irab/book-entries
iraabDisplayRoutes(router);  // GET /qr/iraab/display, /qr/iraab/display/sources, /qr/iraab/display/search
lexiconRoutes(router);       // GET /qr/lexicon/lemmas, /qr/lexicon/roots
depGraphRoutes(router);      // GET /qr/irab/dep-graph/:surah/:ayah — SVG from R2; /meta — D1 metadata
adminSyncRoutes(router);     // POST /qr/admin/sync/al-root-ref — backfill al_root_ref via AR_LINGUISTICS

// The sensor engine's reader for this database. Internal-only: reached
// through km-core-worker's service binding, never via a public module path.
// The rows a carrier holds for one scope — same bridge, same whitelist.
router.post('/qr/internal/rows', async (req, env) => {
  const body = await req.json<RowsRequest>().catch(() => null);
  if (!body) return ok({ ok: false, error: 'bad request' });
  return ok(await readRows(env.DB_QR, body));
});

router.post('/qr/internal/sense', async (req, env) => {
  const body = await req.json<SenseRequest>().catch(() => null);
  if (!body) return ok({ ok: false, error: 'bad request' });
  return ok(await sense(env.DB_QR, body));
});

// Where in the muṣḥaf a root lives, one row per sūra.
//
// km_core needs this when it makes a card, because `core_srs_card_surah` is
// what lets a root card pass a sūra filter at all: an āyah card says its sūra
// in its own `resource_ref`, and a root card's ref is `AL:root:<uid>`, which
// names no sūra anywhere. The table was read in two places and written in
// none, so every root card ever made was invisible to the filter.
//
// This is the only database that can answer it — km_quran owns the word
// occurrences — so core asks rather than binding a second D1, the same rule
// the sensor engine follows.
router.post('/qr/internal/root-spread', async (req, env) => {
  const body = await req.json<{ root?: string }>().catch(() => null);
  const root = typeof body?.root === 'string' ? body.root.trim() : '';
  if (!root) return ok({ ok: false, error: 'root is required' });

  const { results } = await env.DB_QR
    .prepare(`SELECT surah, COUNT(*) AS n_occur
                FROM qr_word_occurrence
               WHERE root = ?
               GROUP BY surah
               ORDER BY surah`)
    .bind(root)
    .all<{ surah: number; n_occur: number }>();

  return ok({ ok: true, root, spread: results ?? [] });
});

export default {
  fetch: (request: Request, env: QuranEnv) => router.handle(request, env),
} satisfies ExportedHandler<QuranEnv>;
