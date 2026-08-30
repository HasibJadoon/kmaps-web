import type { Router } from '../../../shared/src/router';
import { ok, created, notFound, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArLinguisticsEnv } from '../env';
import { RootRepo } from '../repositories/root.repo';
import { SenseRepo } from '../repositories/sense.repo';
import { validateRootCreate } from '../schemas/root.schema';

export function rootRoutes(router: Router<ArLinguisticsEnv>) {

  router.get('/al/roots', async (req, env) => {
    return paginated(await new RootRepo(env.DB_AL).list(parsePagination(new URL(req.url))));
  });

  router.get('/al/roots/search', async (req, env) => {
    const url = new URL(req.url);
    const q = url.searchParams.get('q');
    if (!q) return badRequest('q param required');
    return paginated(await new RootRepo(env.DB_AL).search(q, parsePagination(url)));
  });

  router.get('/al/roots/glosses', async (req, env) => {
    const raw = new URL(req.url).searchParams.get('roots');
    if (!raw) return badRequest('roots param required (comma-separated)');
    const roots = [...new Set(raw.split(',').map((r) => r.trim()).filter(Boolean))].slice(0, 200);
    return ok({ roots: await new RootRepo(env.DB_AL).glosses(roots) });
  });

  router.get('/al/roots/:root/senses', async (_req, env, { root }) => {
    const repo = new SenseRepo(env.DB_AL);
    const [senses, arcs, steps, attestations] = await Promise.all([
      repo.senses(root), repo.arcs(root), repo.steps(root), repo.attestations(root),
    ]);
    return ok({ root, senses, arcs, steps, attestations });
  });

  router.get('/al/roots/:id', async (_req, env, { id }) => {
    const root = await new RootRepo(env.DB_AL).findById(id);
    return root ? ok(root) : notFound(`root ${id}`);
  });

  router.post('/al/roots', async (req, env) => {
    const body = await req.json();
    const result = validateRootCreate(body);
    if ('error' in result) return badRequest(result.error);
    return created(await new RootRepo(env.DB_AL).create(result.data));
  });
}
