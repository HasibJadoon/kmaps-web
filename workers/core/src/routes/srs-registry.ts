import type { Router } from '../../../shared/src/router';
import { ok, created, badRequest, notFound } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import type { CoreEnv } from '../env';
import { SrsRegistryRepo } from '../repositories/srs-registry.repo';
import { validateSrsCardInput } from '../schemas/srs-registry.schema';

export function srsRegistryRoutes(router: Router<CoreEnv>) {

  router.get('/core/srs/registry', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const module = new URL(req.url).searchParams.get('module') ?? undefined;
    const rows = await new SrsRegistryRepo(env.DB_CORE).userCards(ctx.userId, module);
    return ok(rows);
  });

  router.post('/core/srs/registry', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Request body must be valid JSON');
    }

    const merged = {
      ...(body && typeof body === 'object' ? body as Record<string, unknown> : {}),
      userRef: ctx.userId,
    };
    const result = validateSrsCardInput(merged);
    if ('error' in result) return badRequest(result.error);

    const repo = new SrsRegistryRepo(env.DB_CORE);
    const existing = await repo.findCardByResource(ctx.userId, result.data.resourceRef);
    const card = await repo.upsertCard(result.data);
    return existing ? ok(card) : created(card);
  });

  router.delete('/core/srs/registry/:id', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const removed = await new SrsRegistryRepo(env.DB_CORE).deleteCard(ctx.userId, id);
    return removed ? ok({ deleted: id }) : notFound(`registry card ${id}`);
  });
}
