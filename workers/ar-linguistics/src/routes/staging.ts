// ─── /al/staging/* — the AL staging spine (read-only) ────────────────────────
// Backs the Data Matrix / Staging Spine tabs of the Cybernetics Control Monitor.
//   • GET /al/staging/summary — headline counts + status breakdown + sub-layers
//   • GET /al/staging/matrix  — root × sub_code claim counts (+ promoted) + cols
// Every number is a live read of ar_ling_root_stage × ar_ling_reg_sub_layer.

import type { Router } from '../../../shared/src/router';
import { ok } from '../../../shared/src/response';
import type { ArLinguisticsEnv } from '../env';
import { StagingRepo } from '../repositories/staging.repo';

export function stagingRoutes(router: Router<ArLinguisticsEnv>) {
  // GET /al/staging/summary
  router.get('/al/staging/summary', async (_req, env) => {
    const repo = new StagingRepo(env.DB_AL);
    const [counts, byStatus, rootRollups, subLayers] = await Promise.all([
      repo.counts(), repo.statusCounts(), repo.rootRollups(), repo.subLayers(),
    ]);
    return ok({ counts, by_status: byStatus, roots: rootRollups, sub_layers: subLayers });
  });

  // GET /al/staging/matrix
  router.get('/al/staging/matrix', async (_req, env) => {
    const repo = new StagingRepo(env.DB_AL);
    const [cells, subLayers, rootRollups] = await Promise.all([
      repo.matrix(), repo.subLayers(), repo.rootRollups(),
    ]);
    return ok({ cells, sub_layers: subLayers, roots: rootRollups });
  });
}
