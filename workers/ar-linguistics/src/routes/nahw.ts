import type { Router } from '../../../shared/src/router';
import { ok, notFound, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArLinguisticsEnv } from '../env';
import { NahwRepo } from '../repositories/nahw.repo';

export function nahwRoutes(router: Router<ArLinguisticsEnv>) {

  router.get('/al/nahw', async (req, env) => {
    const url = new URL(req.url);
    const category = url.searchParams.get('category') ?? undefined;
    return paginated(await new NahwRepo(env.DB_AL).list(category, parsePagination(url)));
  });

  router.get('/al/nahw/:id', async (_req, env, { id }) => {
    const concept = await new NahwRepo(env.DB_AL).findById(id);
    return concept ? ok(concept) : notFound(`nahw concept ${id}`);
  });

}
