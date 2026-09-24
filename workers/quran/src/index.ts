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
import { tafsirAudioRoutes } from './routes/tafsir-audio';
import { lexiconRoutes } from './routes/lexicon';
import { depGraphRoutes } from './routes/dep-graphs';
import { mushafRoutes } from './routes/mushaf';
import { adminSyncRoutes } from './routes/admin-sync';
import { xrefRoutes } from './routes/xref';

const router = new Router<QuranEnv>();

router.get('/health', async (_req, env) =>
  ok({ domain: 'quran', db: 'DB_QR', db_ok: await dbHealth(env.DB_QR) }),
);

// The gateway forwards /api/<module>/… with the module segment intact, so a
// worker only ever sees a prefixed path. Bare /health is reachable over the
// service binding but 404s from outside; this alias is the public one.
router.get('/qr/health', async (_req, env) =>
  ok({ domain: 'quran', db: 'DB_QR', db_ok: await dbHealth(env.DB_QR) }),
);

menuRoutes(router);
surahRoutes(router);
readerRoutes(router);
vocabularyRoutes(router);
morphologyRoutes(router);
wordGridRoutes(router);
lexiconDisplayRoutes(router);
worldviewRoutes(router);
ayahRoutes(router);
wordRoutes(router);
translationRoutes(router);
studyRoutes(router);
pageRoutes(router);
mushafRoutes(router);
tafsirRoutes(router);
tafsirDisplayRoutes(router);
tafsirAudioRoutes(router);
irabRoutes(router);
iraabDisplayRoutes(router);
lexiconRoutes(router);
depGraphRoutes(router);
adminSyncRoutes(router);
xrefRoutes(router);

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

router.post('/qr/internal/study-surahs', async (_req, env) => {
  const { results } = await env.DB_QR
    .prepare(`SELECT p.surah,
                     COUNT(*) AS passages,
                     MIN(s.name_en) AS name_en,
                     MIN(s.name_ar) AS name_ar,
                     MIN(s.name_transliteration) AS name_tr
                FROM qr_surah_study_passage p
                LEFT JOIN qr_surah s ON s.id = p.surah
               GROUP BY p.surah
               ORDER BY p.surah`)
    .all<{ surah: number; passages: number; name_en: string | null; name_ar: string | null }>();
  return ok({ ok: true, surahs: results ?? [] });
});

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
