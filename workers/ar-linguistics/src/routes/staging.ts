// ─── /al/staging/* — the AL staging spine (read-only) ────────────────────────
// Backs the Data Matrix / Staging Spine tabs of the Cybernetics Control Monitor.
//   • GET /al/staging/summary     — headline counts + status breakdown + sub-layers
//   • GET /al/staging/matrix      — root × sub_code claim counts (+ promoted) + cols
//   • GET /al/staging/layer-model — scope → layer → sub-layer registry tree
// Every number is a live read of ar_ling_stg_claim × ar_ling_reg_sub_layer.

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

  // GET /al/staging/layer-model — the registry tree the Root Dashboard drills:
  // the three scopes (root · lemma · word), the bands of sub-layers inside each,
  // and every sub-layer's carrier tables and fill state. Registry only — the
  // per-root numbers come from the matrix and the control plane's sensors.
  router.get('/al/staging/layer-model', async (_req, env) => {
    const repo = new StagingRepo(env.DB_AL);
    return ok(await repo.layerModel());
  });

  // GET /al/staging/root/:root — deep drill for one root: the actual staged
  // claims (verbatim quote + trilingual gloss + source), the Membean-style
  // memlet cards, and the question bank. Backs the Root Dashboard's deep tabs.
  router.get('/al/staging/root/:root', async (_req, env, { root }) => {
    const repo = new StagingRepo(env.DB_AL);
    const [claims, memlets, questions, options, media, subLayers, memletKinds, questionKinds, fill] =
      await Promise.all([
        repo.rootClaims(root), repo.rootMemlets(root), repo.rootQuestions(root),
        repo.rootOptions(root), repo.rootMedia(root), repo.subLayers(),
        repo.memletKinds(), repo.questionKinds(), repo.rootFill(root),
      ]);
    return ok({
      root, claims, memlets, questions, options, media,
      sub_layers: subLayers, memlet_kinds: memletKinds, question_kinds: questionKinds,
      // Live per-root row counts read straight off the carriers. `sub_layers`
      // carries the registry's fill_state/carrier_state, which are global facts
      // about a table ("ar_ling_roots has rows") and say nothing about THIS
      // root — rendering them per-root is what made Core identity read "filled"
      // over an empty carrier and Permutation read "empty" over a real row.
      // A sub_code absent from this list has no audited carrier binding: that is
      // unknown, not zero.
      root_fill: fill,
    });
  });
}
