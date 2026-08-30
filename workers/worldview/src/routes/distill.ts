import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest } from '../../../shared/src/response';
import type { WorldviewEnv } from '../env';
import { DistillRepo } from '../repositories/distill.repo';

const DEFAULT_USER = 'CORE:00000000000000000000000000';

export function distillRoutes(router: Router<WorldviewEnv>) {

  router.post('/worldview/distill/generate', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.title)  return badRequest('title required');
    if (!Array.isArray(b.items) || b.items.length === 0)
      return badRequest('items array required');

    const batch = await new DistillRepo(env.DB_WV).generate({
      title:          String(b.title),
      source_id:      (b.source_id      as string | null) ?? null,
      source_unit_id: (b.source_unit_id as string | null) ?? null,
      batch_type:     b.batch_type ? String(b.batch_type) : undefined,
      core_user_ref:  b.core_user_ref ? String(b.core_user_ref) : DEFAULT_USER,
      core_ws_ref:    (b.core_ws_ref    as string | null) ?? null,
      items: (b.items as Array<Record<string, unknown>>).map(item => ({
        item_type:           item.item_type          ? String(item.item_type) : undefined,
        content_md:          String(item.content_md ?? ''),
        source_note_id:      (item.source_note_id      as string | null) ?? null,
        source_highlight_id: (item.source_highlight_id as string | null) ?? null,
      })),
    });

    return created(batch);
  });

  router.get('/worldview/distill/batch', async (req, env) => {
    const url     = new URL(req.url);
    const batchId = url.searchParams.get('batchId');
    if (!batchId) return badRequest('batchId required');

    const batch = await new DistillRepo(env.DB_WV).batchById(batchId);
    return batch ? ok(batch) : notFound(`batch ${batchId}`);
  });

  router.get('/worldview/distill/by-unit', async (req, env) => {
    const url       = new URL(req.url);
    const sourceId  = url.searchParams.get('source_id');
    const unitId    = url.searchParams.get('source_unit_id');
    if (!sourceId) return badRequest('source_id required');

    const batch = await new DistillRepo(env.DB_WV).batchByUnit(sourceId, unitId);
    return batch ? ok(batch) : notFound(`batch for source ${sourceId}`);
  });

  router.post('/worldview/distill/decision', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.item_id)  return badRequest('item_id required');
    if (!b.decision) return badRequest('decision required');

    const validDecisions = ['approved', 'edited', 'rejected'];
    if (!validDecisions.includes(String(b.decision)))
      return badRequest(`decision must be one of: ${validDecisions.join(', ')}`);

    const item = await new DistillRepo(env.DB_WV).recordDecision({
      item_id:        String(b.item_id),
      decision:       String(b.decision) as 'approved' | 'edited' | 'rejected',
      final_content:  (b.final_content  as string | null) ?? null,
      decision_note:  (b.decision_note  as string | null) ?? null,
      core_user_ref:  b.core_user_ref ? String(b.core_user_ref) : DEFAULT_USER,
    });

    return item ? ok(item) : notFound(`item ${b.item_id}`);
  });

  router.post('/worldview/distill/approve', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.batch_id) return badRequest('batch_id required');

    const batch = await new DistillRepo(env.DB_WV).approveBatch(
      String(b.batch_id),
      b.core_user_ref ? String(b.core_user_ref) : DEFAULT_USER,
    );
    return batch ? ok(batch) : notFound(`batch ${b.batch_id}`);
  });
}
