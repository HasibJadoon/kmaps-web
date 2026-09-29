import { Router } from '../../shared/src/router';
import { withSwr, type SwrRoute } from '../../shared/src/swr';
import { FAMILIES } from './cache-families';
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
import { vocabSeriesRoutes } from './routes/vocab-series';
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
import { atlasRoutes } from './routes/atlas';

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
vocabSeriesRoutes(router);
morphologyRoutes(router);
wordGridRoutes(router);
lexiconDisplayRoutes(router);
worldviewRoutes(router);
ayahRoutes(router);
wordRoutes(router);
translationRoutes(router);
studyRoutes(router);
atlasRoutes(router);
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

// What a studio brainstorm needs to know about one passage: its text, the
// assembled English rendering, and the authored passage sections (structure,
// concepts, flow). Read-only; called over the service binding by ST.
router.post('/qr/internal/passage-brief', async (req, env) => {
  const body = await req.json<{ surah?: number; from?: number; to?: number }>().catch(() => null);
  const surah = Number(body?.surah), from = Number(body?.from), to = Number(body?.to);
  if (!Number.isInteger(surah) || !Number.isInteger(from) || !Number.isInteger(to) || to < from) {
    return ok({ ok: false, error: 'surah, from and to are required' });
  }
  const span = `${surah}:${from}-${to}`;

  const [ayahs, translation, sections] = await Promise.all([
    env.DB_QR
      .prepare(`SELECT ayah, COALESCE(text_uthmani, text_uthmani_clean, text) AS text
                  FROM qr_ayah WHERE surah = ? AND ayah BETWEEN ? AND ? ORDER BY ayah`)
      .bind(surah, from, to)
      .all<{ ayah: number; text: string }>(),
    env.DB_QR
      .prepare(`SELECT final_fluent_en FROM qr_ss_translation_passage WHERE id = ?`)
      .bind(`QR:TLP:${span}`)
      .first<{ final_fluent_en: string | null }>(),
    env.DB_QR
      .prepare(`SELECT section_key, data_json FROM qr_passage_section
                 WHERE id LIKE ? ORDER BY id`)
      .bind(`QR:PS:${span}:%`)
      .all<{ section_key: string; data_json: string | null }>(),
  ]);

  return ok({
    ok: true,
    span,
    ayahs: ayahs.results ?? [],
    translation_en: translation?.final_fluent_en ?? null,
    sections: (sections.results ?? []).map((r) => ({ key: r.section_key, data: r.data_json })),
  });
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

// ── Which reads are kept, and for how long (shared/src/swr.ts) ────────────────
// Every QR read is the same for every reader, so each is kept and served from
// memory or this data centre's edge cache. Each is keyed on the version of the
// tables it is built from (cache-families.ts): a write to them moves the
// version, so the next read rebuilds, however long the window.
//   books    — the Qurʾān, the tafsīr and iʿrāb books, translations, the mushaf,
//              morphology, tafsīr audio: built only from book tables, kept a
//              month (served while rebuilt behind for two more).
//   authored — the study layers the builders are writing (steps, passages,
//              tasks, the surah's worldview, xref, term references): fresh a
//              minute, gone after an hour, on every table's version.
//   mixed    — vocabulary series and the morphology grid, which also read the
//              linguistics worker: a day, then behind, a month at most.
// First match wins.
const BOOKS = { fresh: 30 * 86400, stale: 90 * 86400, family: 'books' };
const AUTHORED = { fresh: 60, stale: 3600, family: ['books', 'rest'] };
const MIXED = { fresh: 86400, stale: 30 * 86400, family: ['books', 'rest'] };
const KEPT: SwrRoute[] = [
  { re: /^\/qr\/atlas\//, ...AUTHORED },
  { re: /^\/qr\/study\/morph\//, ...MIXED },
  { re: /^\/qr\/study\/(surahs|words)\//, ...AUTHORED },
  { re: /^\/qr\/surahs\/\d+\/worldview(\/|$)/, ...AUTHORED },
  { re: /^\/qr\/gram\/terms\//, ...AUTHORED },
  { re: /^\/qr\/xref$/, ...AUTHORED },
  { re: /^\/qr\/vocab(\/|$)/, ...MIXED },
  { re: /^\/qr\/(surahs|ayahs|words|pages|mushaf|menu|translations|tafsir|irab|iraab|lexicon|word-grid|scholars|works)(\/|$)/, ...BOOKS },
];

export default {
  fetch: (request: Request, env: QuranEnv, ctx: ExecutionContext) =>
    withSwr(request, ctx, KEPT, (r) => router.handle(r, env), { tag: 'x-qr-cache', db: env.DB_QR, families: FAMILIES }),
} satisfies ExportedHandler<QuranEnv>;
