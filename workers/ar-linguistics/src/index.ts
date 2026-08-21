// ─── km-ar-linguistics-worker entry point ─────────────────────────────────────
// Owns DB_AL (km_arabic_linguistic). Single prefix: ar_ling_*.
// QR and AR call this worker for all linguistic truth (roots, lemmas, sarf,
// nahw, balagha). Never binds DB_QR or DB_AR.

import { Router } from '../../shared/src/router';
import { sense, readRows, type SenseRequest, type RowsRequest } from '../../shared/src/sense';
import { dbHealth } from '../../shared/src/http';
import { ok } from '../../shared/src/response';
import type { ArLinguisticsEnv } from './env';

import { rootRoutes } from './routes/roots';
import { lemmaRoutes } from './routes/lemmas';
import { morphologyRoutes } from './routes/morphology';
import { nahwRoutes } from './routes/nahw';
import { balaghaRoutes } from './routes/balagha';
import { lexiconRoutes } from './routes/lexicon';
import { lexiconFiveLensRoutes } from './routes/lexicon_five_lens';
import { lexiconV2Routes } from './routes/lexicon_v2';
import { lexiconDisplayRoutes } from './routes/lexicon_display';
import { lexiconMufradatRoutes } from './routes/lexicon_mufradat';
import { lexiconLisanRoutes } from './routes/lexicon_lisan';
import { lexiconLaneRoutes }  from './routes/lexicon_lane';
import { scholarshipRoutes }  from './routes/scholarship';
import { expressionRoutes } from './routes/expressions';
import { nearSynonymRoutes } from './routes/near_synonyms';
import { sourceRagRoutes } from './routes/source_rag';
import { wordViewRoutes } from './routes/word_view';
import { wordAnalysisRoutes } from './routes/word_analysis';
import { grammarRoutes } from './routes/grammar';
import { registryRoutes } from './routes/registry';

const router = new Router<ArLinguisticsEnv>();

// Health
router.get('/health', async (_req, env) =>
  ok({ domain: 'ar-linguistics', db: 'DB_AL', db_ok: await dbHealth(env.DB_AL) }),
);

// Domain routes
rootRoutes(router);
lemmaRoutes(router);
morphologyRoutes(router);
nahwRoutes(router);
balaghaRoutes(router);
lexiconRoutes(router);
lexiconFiveLensRoutes(router);
lexiconV2Routes(router);
lexiconDisplayRoutes(router);    // /al/lex/v2/display/* — per-lexicon render contract (D1-backed, 0039)
lexiconMufradatRoutes(router);
lexiconLisanRoutes(router);
lexiconLaneRoutes(router);
scholarshipRoutes(router);
expressionRoutes(router);
nearSynonymRoutes(router);
sourceRagRoutes(router);
wordViewRoutes(router);          // /al/verb-government/:root, /al/root-antonyms/:root, /al/expressions/by-root/:root
wordAnalysisRoutes(router);      // /al/word-analysis?roots= — deep root layer for the word modal
grammarRoutes(router);           // /al/gram/* — ṣarf/naḥw/balāgha corpus (books, spine, pages, search)
registryRoutes(router);          // /al/registry/* — the carrier registry and what the carriers hold

// Every route here is a live D1 read, and none of them carried a single
// freshness header — no Cache-Control, no ETag, no Last-Modified. Nothing was
// caching them server-side (no cf-cache-status on any response), but a client
// is entitled to *heuristically* cache a response that says nothing about its
// own freshness, and URLSession does exactly that: the iOS reader could keep
// serving an article from URLCache long after the worker started returning a
// corrected one. Say it explicitly instead of relying on the absence of a
// cache, so a data fix is visible on the next request everywhere.
// The sensor engine's reader for this database. Internal-only: reached
// through km-core-worker's service binding, never via a public module path.
// The rows a carrier holds for one scope — same bridge, same whitelist.
router.post('/al/internal/rows', async (req, env) => {
  const body = await req.json<RowsRequest>().catch(() => null);
  if (!body) return ok({ ok: false, error: 'bad request' });
  return ok(await readRows(env.DB_AL, body));
});

router.post('/al/internal/sense', async (req, env) => {
  const body = await req.json<SenseRequest>().catch(() => null);
  if (!body) return ok({ ok: false, error: 'bad request' });
  // An id-bound carrier keys on this database's own ULID. km_core holds the
  // scope as a string and cannot resolve it — so the database that owns the
  // ids does, here, where the mapping actually lives.
  if (body.bind_kind === 'id' && body.bind_value) {
    const col = body.scope_kind === 'lemma' ? 'lemma_ar' : 'root_text';
    const table = body.scope_kind === 'lemma' ? 'ar_ling_root_lemma' : 'ar_ling_roots';
    const row = await env.DB_AL
      .prepare(`SELECT id FROM ${table} WHERE ${col} = ? LIMIT 1`)
      .bind(body.bind_value).first<{ id: string }>()
      .catch(() => null);
    if (!row?.id) return ok({ ok: false, error: `no ${body.scope_kind ?? 'root'} id for ${body.bind_value}` });
    body.bind_value = row.id;
  }
  return ok(await sense(env.DB_AL, body));
});

export default {
  fetch: async (request: Request, env: ArLinguisticsEnv) => {
    const res = await router.handle(request, env);
    const headers = new Headers(res.headers);
    headers.set('Cache-Control', 'no-store');
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  },
} satisfies ExportedHandler<ArLinguisticsEnv>;
