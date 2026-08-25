// ─── /al/lemmas routes ────────────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, created, notFound, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArLinguisticsEnv } from '../env';
import { LemmaRepo } from '../repositories/lemma.repo';
import { LemmaResolveRepo } from '../repositories/lemma-resolve.repo';
import { validateLemmaCreate } from '../schemas/lemma.schema';

/** One request cannot ask for more lemmas than a long surah holds; past that it
 *  is a scan, and belongs in a batch job rather than a service call. */
const MAX_RESOLVE_IDS = 500;

export function lemmaRoutes(router: Router<ArLinguisticsEnv>) {

  // GET /al/lemmas/resolve?ids=AL:…,AL:… → { [lemma_id]: ResolvedLemma }
  //
  // The lemma tier for a whole passage in one call: senses, arcs, governance,
  // furuq, expressions and the form slot, every one of them scoped to the id
  // rather than to the root — so km_quran can render the layer while storing
  // none of it. Registered before /al/lemmas/:id so the literal path wins.
  router.get('/al/lemmas/resolve', async (req, env) => {
    const url = new URL(req.url);
    const raw = url.searchParams.get('ids');
    if (!raw) return badRequest('ids (comma-separated AL lemma id list) param required');
    const ids = [...new Set(raw.split(',').map(s => s.trim()).filter(Boolean))];
    if (!ids.length) return badRequest('no valid lemma ids supplied');
    if (ids.length > MAX_RESOLVE_IDS) {
      return badRequest(`too many ids (${ids.length}); max ${MAX_RESOLVE_IDS} per request`);
    }
    return ok(await new LemmaResolveRepo(env.DB_AL).byIds(ids));
  });

  // GET /al/lemmas/search?q=كتاب
  router.get('/al/lemmas/search', async (req, env) => {
    const url = new URL(req.url);
    const q = url.searchParams.get('q');
    if (!q) return badRequest('q param required');
    return paginated(await new LemmaRepo(env.DB_AL).search(q, parsePagination(url)));
  });

  // GET /al/lemmas?root=AL:ULID — lemmas for a root
  router.get('/al/lemmas', async (req, env) => {
    const url = new URL(req.url);
    const rootId = url.searchParams.get('root');
    if (!rootId) return badRequest('root (AL:ULID) param required');
    return ok(await new LemmaRepo(env.DB_AL).byRoot(rootId));
  });

  // GET /al/lemmas/:id
  router.get('/al/lemmas/:id', async (_req, env, { id }) => {
    const lemma = await new LemmaRepo(env.DB_AL).findById(id);
    return lemma ? ok(lemma) : notFound(`lemma ${id}`);
  });

  // POST /al/lemmas — admin
  router.post('/al/lemmas', async (req, env) => {
    const body = await req.json();
    const result = validateLemmaCreate(body);
    if ('error' in result) return badRequest(result.error);
    return created(await new LemmaRepo(env.DB_AL).create(result.data));
  });
}
