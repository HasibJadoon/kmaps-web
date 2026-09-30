import { withSwr, familyVersionsNow, type SwrRoute } from '../../shared/src/swr';
import { FAMILIES } from './cache-families';
import { Router } from '../../shared/src/router';
import { sense, readRows, type SenseRequest, type RowsRequest } from '../../shared/src/sense';
import { dbHealth } from '../../shared/src/http';
import { ok } from '../../shared/src/response';
import type { ArLinguisticsEnv } from './env';

import { rootRoutes } from './routes/roots';
import { lookupRoutes } from './routes/lookup';
import { lemmaRoutes } from './routes/lemmas';
import { morphologyRoutes } from './routes/morphology';
import { nahwRoutes } from './routes/nahw';
import { balaghaRoutes } from './routes/balagha';
import { lexiconRoutes } from './routes/lexicon';
import { lexiconFiveLensRoutes } from './routes/lexicon_five_lens';
import { lexemeRoutes } from './routes/lexemes';
import { drillSourceRoutes } from './routes/drill-source';
import { lexiconV2Routes } from './routes/lexicon_v2';
import { lexiconHeaderRoutes } from './routes/lexicon_header';
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
import { dsRoutes } from './routes/ds';

const router = new Router<ArLinguisticsEnv>();

router.get('/health', async (_req, env) =>
  ok({ domain: 'ar-linguistics', db: 'DB_AL', db_ok: await dbHealth(env.DB_AL) }),
);

// The gateway forwards /api/<module>/… with the module segment intact, so a
// worker only ever sees a prefixed path. Bare /health is reachable over the
// service binding but 404s from outside; this alias is the public one.
// The version beacon (see quran /qr/corpus-version): never kept.
router.get('/al/corpus-version', async (_req, env) => {
  const families = await familyVersionsNow(env.DB_AL, FAMILIES);
  return new Response(JSON.stringify({ ok: true, data: { version: `${families.books}|${families.rest}`, families } }),
    { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'max-age=30' } });
});

router.get('/al/health', async (_req, env) =>
  ok({ domain: 'ar-linguistics', db: 'DB_AL', db_ok: await dbHealth(env.DB_AL) }),
);

rootRoutes(router);
lookupRoutes(router);
lemmaRoutes(router);
morphologyRoutes(router);
nahwRoutes(router);
balaghaRoutes(router);
lexiconRoutes(router);
lexiconFiveLensRoutes(router);
lexiconV2Routes(router);
lexemeRoutes(router);
lexiconHeaderRoutes(router);
lexiconMufradatRoutes(router);
lexiconLisanRoutes(router);
lexiconLaneRoutes(router);
scholarshipRoutes(router);
expressionRoutes(router);
nearSynonymRoutes(router);
sourceRagRoutes(router);
wordViewRoutes(router);
wordAnalysisRoutes(router);
grammarRoutes(router);
registryRoutes(router);
dsRoutes(router);
drillSourceRoutes(router);

router.post('/al/internal/rows', async (req, env) => {
  const body = await req.json<RowsRequest>().catch(() => null);
  if (!body) return ok({ ok: false, error: 'bad request' });
  return ok(await readRows(env.DB_AL, body));
});

router.post('/al/internal/sense', async (req, env) => {
  const body = await req.json<SenseRequest>().catch(() => null);
  if (!body) return ok({ ok: false, error: 'bad request' });

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

// ── Which reads are kept, and for how long (shared/src/swr.ts) ────────────────
// Every AL read is the same for every reader. A response that says nothing
// about its freshness is one a client caches by guesswork (a phone once kept an
// old بين for hours), so every answer says it: kept reads carry their windows,
// an ETag, and a key on the version of the tables they read (cache-families.ts)
// — a write moves it, and the next read rebuilds. ?refresh=1 rebuilds at once.
// Everything not kept is no-store.
//   books — the lexicon books (lex/v2, Lane, Lisān, Mufradāt readers, the
//           book headers) and the grammar books: kept a month.
//   mixed — everything else (registry, roots, lemmas, word analysis…), on
//           every table's version: a day, then rebuilt behind, a month at most.
const BOOKS = { fresh: 30 * 86400, stale: 90 * 86400, family: 'books' };
const MIXED = { fresh: 86400, stale: 30 * 86400, family: ['books', 'rest'] };
const KEPT: SwrRoute[] = [
  { re: /^\/al\/lex\/v2\//, ...BOOKS },
  { re: /^\/al\/gram\//, ...BOOKS },
  { re: /^\/al\/lexicon\/(blocks\/[^/]+\/backlinks|[^/]+\/[^/]+\/header)$/, ...BOOKS },
  { re: /^\/al\/(?!health|corpus-version)[a-z_-]+(\/|$)/, ...MIXED },
];

export default {
  fetch: (request: Request, env: ArLinguisticsEnv, ctx: ExecutionContext) =>
    withSwr(request, ctx, KEPT, async (r) => {
      const res = await router.handle(r, env);
      const headers = new Headers(res.headers);
      headers.set('Cache-Control', 'no-store');
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
    }, { tag: 'x-al-cache', db: env.DB_AL, families: FAMILIES }),
} satisfies ExportedHandler<ArLinguisticsEnv>;
