import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest, paginated } from '../../../shared/src/response';
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

  router.get('/al/nahw/:id/children', async (_req, env, { id }) => {
    return ok(await new NahwRepo(env.DB_AL).children(id));
  });

  router.get('/al/nahw/key/:key', async (_req, env, { key }) => {
    const concept = await new NahwRepo(env.DB_AL).findByKey(key);
    return concept ? ok(concept) : notFound(`nahw key ${key}`);
  });
}
