import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { WorldviewEnv } from '../env';
import { ComparisonRepo } from '../repositories/comparison.repo';

export function comparisonRoutes(router: Router<WorldviewEnv>) {

  router.get('/wv/comparisons', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new ComparisonRepo(env.DB_WV).list({
        comparison_type: url.searchParams.get('comparison_type'),
        unit_id:         url.searchParams.get('unit_id')   ?? undefined,
        source_id:       url.searchParams.get('source_id') ?? undefined,
        ...parsePagination(url),
      }),
    );
  });

  router.get('/wv/comparisons/:id', async (_req, env, { id }) => {
    const detail = await new ComparisonRepo(env.DB_WV).findById(id);
    return detail ? ok(detail) : notFound(`comparison ${id}`);
  });

  router.post('/wv/comparisons', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.title) return badRequest('title required');
    return created(await new ComparisonRepo(env.DB_WV).create({
      title:           String(b.title),
      slug:            b.slug            ? String(b.slug)            : undefined,
      comparison_type: b.comparison_type ? String(b.comparison_type) : undefined,
      description_md:  (b.description_md as string | null) ?? null,
    }));
  });

  router.patch('/wv/comparisons/:id', async (req, env, { id }) => {
    const b = await req.json() as Record<string, unknown>;
    const row = await new ComparisonRepo(env.DB_WV).patch(id, {
      title:           b.title           as string | undefined,
      comparison_type: b.comparison_type as string | undefined,
      description_md:  b.description_md  as string | null | undefined,
    });
    return row ? ok(row) : notFound(`comparison ${id}`);
  });

  router.post('/wv/comparisons/:id/axes', async (req, env, { id }) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.axis_label) return badRequest('axis_label required');
    return created(await new ComparisonRepo(env.DB_WV).addAxis({
      comparison_id:   id,
      axis_label:      String(b.axis_label),
      moral_axis_id:   (b.moral_axis_id as string | null) ?? null,
      axis_description: (b.axis_description as string | null) ?? null,
      sort_order:      b.sort_order != null ? Number(b.sort_order) : 0,
    }));
  });

  router.post('/wv/comparisons/:id/rows', async (req, env, { id }) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.entity_type || !b.entity_id || !b.row_label)
      return badRequest('entity_type, entity_id, and row_label required');
    return created(await new ComparisonRepo(env.DB_WV).addRow({
      comparison_id: id,
      entity_type:   String(b.entity_type),
      entity_id:     String(b.entity_id),
      row_label:     String(b.row_label),
      sort_order:    b.sort_order != null ? Number(b.sort_order) : 0,
    }));
  });

  router.put('/wv/comparisons/cells', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.comparison_id || !b.row_id || !b.axis_id)
      return badRequest('comparison_id, row_id, and axis_id required');
    const cell = await new ComparisonRepo(env.DB_WV).upsertCell({
      comparison_id: String(b.comparison_id),
      row_id:        String(b.row_id),
      axis_id:       String(b.axis_id),
      cell_text:     (b.cell_text     as string | null) ?? null,
      stance:        (b.stance        as string | null) ?? null,
      evidence_ids:  (b.evidence_ids  as string | null) ?? null,
      tension_note:  (b.tension_note  as string | null) ?? null,
    });
    return ok(cell);
  });

  router.patch('/wv/comparisons/cells/:cellId', async (req, env, { cellId }) => {
    const b    = await req.json() as Record<string, unknown>;
    const cell = await new ComparisonRepo(env.DB_WV).patchCell(cellId, {
      cell_text:    b.cell_text    as string | null | undefined,
      stance:       b.stance       as string | null | undefined,
      tension_note: b.tension_note as string | null | undefined,
    });
    return cell ? ok(cell) : notFound(`cell ${cellId}`);
  });
}
