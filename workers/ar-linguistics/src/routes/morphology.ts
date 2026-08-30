import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArLinguisticsEnv } from '../env';
import { MorphologyRepo } from '../repositories/morphology.repo';

export function morphologyRoutes(router: Router<ArLinguisticsEnv>) {

  router.get('/al/morphology', async (req, env) => {
    const url = new URL(req.url);
    const lemmaId = url.searchParams.get('lemma');
    if (!lemmaId) return badRequest('lemma (AL:ULID) param required');
    return ok(await new MorphologyRepo(env.DB_AL).byLemma(lemmaId));
  });

  router.get('/al/morphology/:id', async (_req, env, { id }) => {
    const entry = await new MorphologyRepo(env.DB_AL).findById(id);
    return entry ? ok(entry) : notFound(`morphology entry ${id}`);
  });

  router.get('/al/morphology/paradigms', async (req, env) => {
    const url = new URL(req.url);
    const category = url.searchParams.get('category') ?? undefined;
    return paginated(
      await new MorphologyRepo(env.DB_AL).listParadigms(category, parsePagination(url)),
    );
  });
}
