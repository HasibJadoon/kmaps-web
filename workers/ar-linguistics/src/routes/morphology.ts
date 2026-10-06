import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArLinguisticsEnv } from '../env';
import { MorphologyRepo } from '../repositories/morphology.repo';

export function morphologyRoutes(router: Router<ArLinguisticsEnv>) {

  router.get('/al/morphology', async (req, env) => {
    const url = new URL(req.url);
    const lemmaId = url.searchParams.get('lemma');
    if (!lemmaId) return badRequest('lemma (global lemma id) param required');
    return ok(await new MorphologyRepo(env.DB_AL).byLemma(lemmaId));
  });

  // before /:id, which would otherwise take "paradigms" as an id
  router.get('/al/morphology/paradigms', async (req, env) => {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') ?? url.searchParams.get('category') ?? undefined;
    const root = url.searchParams.get('root') ?? undefined;
    return paginated(
      await new MorphologyRepo(env.DB_AL).listParadigms({ type, root }, parsePagination(url)),
    );
  });

  router.get('/al/morphology/:id', async (_req, env, { id }) => {
    const entry = await new MorphologyRepo(env.DB_AL).findById(id);
    return entry ? ok(entry) : notFound(`morphology entry ${id}`);
  });

}
