import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { WorldviewEnv } from '../env';
import { NodeRepo } from '../repositories/node.repo';

export function nodeRoutes(router: Router<WorldviewEnv>) {

  router.get('/wv/nodes', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new NodeRepo(env.DB_WV).list(
        url.searchParams.get('type'),
        url.searchParams.get('tradition'),
        parsePagination(url),
      ),
    );
  });

  router.get('/wv/nodes/:id', async (_req, env, { id }) => {
    const node = await new NodeRepo(env.DB_WV).findById(id);
    return node ? ok(node) : notFound(`node ${id}`);
  });

  router.get('/wv/nodes/:id/edges', async (_req, env, { id }) => {
    return ok(await new NodeRepo(env.DB_WV).edges(id));
  });

  router.post('/wv/nodes', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.node_type || !b.title) return badRequest('node_type and title required');
    return created(await new NodeRepo(env.DB_WV).createNode({
      node_type:    String(b.node_type),
      title:        String(b.title),
      summary:      (b.summary as string | null) ?? null,
      tradition_id: (b.tradition_id as string | null) ?? null,
    }));
  });

}
