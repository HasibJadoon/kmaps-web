import type { Router } from '../../../shared/src/router';
import { ok, notFound, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArLinguisticsEnv } from '../env';
import { BalaghaRepo } from '../repositories/balagha.repo';

export function balaghaRoutes(router: Router<ArLinguisticsEnv>) {

  router.get('/al/balagha', async (req, env) => {
    const url = new URL(req.url);
    const branch = url.searchParams.get('branch') ?? undefined;
    return paginated(
      await new BalaghaRepo(env.DB_AL).listConcepts(branch, parsePagination(url)),
    );
  });

  router.get('/al/balagha/:id', async (_req, env, { id }) => {
    const repo = new BalaghaRepo(env.DB_AL);
    const concept = await repo.findById(id);
    return concept ? ok({ ...concept, examples: await repo.examplesByConcept(id) }) : notFound(`balagha concept ${id}`);
  });

}
