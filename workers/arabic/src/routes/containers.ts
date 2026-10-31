import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArabicEnv } from '../env';
import { ContainerRepo } from '../repositories/container.repo';
import { withContainerTypeLabel } from '../lib/value-labels';

export function containerRoutes(router: Router<ArabicEnv>) {

  router.get('/ar/containers', async (req, env) => {
    const url  = new URL(req.url);
    const page = await new ContainerRepo(env.DB_AR).list(url.searchParams.get('type'), parsePagination(url));
    return paginated({ ...page, rows: page.rows.map(withContainerTypeLabel) });
  });

  router.get('/ar/containers/:id', async (_req, env, { id }) => {
    const row = await new ContainerRepo(env.DB_AR).findById(id);
    return row ? ok(withContainerTypeLabel(row)) : notFound(`container ${id}`);
  });

  router.post('/ar/containers', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.title || !b.container_type)
      return badRequest('title and container_type required');
    return created(await new ContainerRepo(env.DB_AR).create({
      title:          String(b.title),
      container_type: String(b.container_type),
      parent_id:      (b.parent_id as string | null) ?? null,
      sort_order:     typeof b.sort_order === 'number' ? b.sort_order : 0,
    }));
  });

  router.patch('/ar/containers/:id', async (req, env, { id }) => {
    const b   = await req.json() as Record<string, unknown>;
    const row = await new ContainerRepo(env.DB_AR).update(id, {
      title:      b.title      !== undefined ? String(b.title)  : undefined,
      status:     b.status     !== undefined ? String(b.status) : undefined,
      sort_order: typeof b.sort_order === 'number' ? b.sort_order : undefined,
    });
    return row ? ok(row) : notFound(`container ${id}`);
  });
}
