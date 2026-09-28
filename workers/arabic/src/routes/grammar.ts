import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArabicEnv } from '../env';
import { GrammarRepo } from '../repositories/grammar.repo';

export function grammarRoutes(router: Router<ArabicEnv>) {

  router.get('/ar/grammar', async (req, env) => {
    const url         = new URL(req.url);
    const containerId = url.searchParams.get('container');
    if (!containerId) return badRequest('container (AR:ULID) param required');
    return paginated(
      await new GrammarRepo(env.DB_AR).byContainer(containerId, parsePagination(url)),
    );
  });

  router.get('/ar/grammar/:id', async (_req, env, { id }) => {
    const row = await new GrammarRepo(env.DB_AR).findById(id);
    return row ? ok(row) : notFound(`grammar item ${id}`);
  });

  router.post('/ar/grammar', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.container_id || !b.lx_nahw_ref || !b.label)
      return badRequest('container_id, lx_nahw_ref, label required');
    return created(await new GrammarRepo(env.DB_AR).create({
      container_id: String(b.container_id),
      lx_nahw_ref:  String(b.lx_nahw_ref),
      label:        String(b.label),
      example_ar:   (b.example_ar as string | null) ?? null,
      explanation:  (b.explanation as string | null) ?? null,
      sort_order:   typeof b.sort_order === 'number' ? b.sort_order : 0,
    }));
  });
}
