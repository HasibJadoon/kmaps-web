// ─── /ar/containers routes ────────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArabicEnv } from '../env';
import { ContainerRepo } from '../repositories/container.repo';

export function containerRoutes(router: Router<ArabicEnv>) {

  // GET /ar/containers?type=course
  router.get('/ar/containers', async (req, env) => {
    const url  = new URL(req.url);
    return paginated(
      await new ContainerRepo(env.DB_AR).list(
        url.searchParams.get('type'), parsePagination(url),
      ),
    );
  });

  // GET /ar/containers/:id
  router.get('/ar/containers/:id', async (_req, env, { id }) => {
    const row = await new ContainerRepo(env.DB_AR).findById(id);
    return row ? ok(row) : notFound(`container ${id}`);
  });

  // GET /ar/containers/:id/children
  router.get('/ar/containers/:id/children', async (_req, env, { id }) => {
    return ok(await new ContainerRepo(env.DB_AR).children(id));
  });

  // POST /ar/containers
  router.post('/ar/containers', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.title || !b.container_type)
      return badRequest('title and container_type required');
    return created(await new ContainerRepo(env.DB_AR).create({
      title:          String(b.title),
      container_type: String(b.container_type),
      slug:           b.slug       !== undefined ? String(b.slug)       : undefined,
      title_ar:       (b.title_ar   as string | null) ?? null,
      track_id:       (b.track_id   as string | null) ?? null,
      discipline:     (b.discipline as string | null) ?? null,
      level:          (b.level      as string | null) ?? null,
      description_md: (b.description_md as string | null) ?? null,
      sort_order:     typeof b.sort_order === 'number' ? b.sort_order : 0,
    }));
  });

  // PATCH /ar/containers/:id
  router.patch('/ar/containers/:id', async (req, env, { id }) => {
    const b   = await req.json() as Record<string, unknown>;
    const row = await new ContainerRepo(env.DB_AR).update(id, {
      title:          b.title       !== undefined ? String(b.title)    : undefined,
      title_ar:       b.title_ar    !== undefined ? String(b.title_ar) : undefined,
      level:          b.level       !== undefined ? String(b.level)    : undefined,
      description_md: b.description_md !== undefined ? String(b.description_md) : undefined,
      is_published:   typeof b.is_published === 'boolean'
        ? (b.is_published ? 1 : 0)
        : (typeof b.is_published === 'number' ? b.is_published : undefined),
      sort_order:     typeof b.sort_order === 'number' ? b.sort_order : undefined,
    });
    return row ? ok(row) : notFound(`container ${id}`);
  });
}
