import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { WorldviewEnv } from '../env';
import { InsightRepo } from '../repositories/insight.repo';

export function insightRoutes(router: Router<WorldviewEnv>) {

  router.get('/wv/insights', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new InsightRepo(env.DB_WV).queue(
        url.searchParams.get('status'),
        url.searchParams.get('batch'),
        parsePagination(url),
      ),
    );
  });

  router.get('/wv/insights/:id', async (_req, env, { id }) => {
    const row = await new InsightRepo(env.DB_WV).findById(id);
    return row ? ok(row) : notFound(`insight ${id}`);
  });

  router.post('/wv/insights', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.suggestion_type || !b.payload_json)
      return badRequest('suggestion_type and payload_json required');
    return created(await new InsightRepo(env.DB_WV).create({
      suggestion_type:  String(b.suggestion_type),
      payload_json:     typeof b.payload_json === 'string'
                          ? b.payload_json
                          : JSON.stringify(b.payload_json),
      batch_id:         (b.batch_id as string | null) ?? null,
      source_chunk_ref: (b.source_chunk_ref as string | null) ?? null,
    }));
  });

}
