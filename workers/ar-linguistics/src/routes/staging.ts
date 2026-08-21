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
    const [claims, memlets, questions, options, media, subLayers, memletKinds, questionKinds] =
      await Promise.all([
        repo.rootClaims(root), repo.rootMemlets(root), repo.rootQuestions(root),
        repo.rootOptions(root), repo.rootMedia(root), repo.subLayers(),
        repo.memletKinds(), repo.questionKinds(),
      ]);
    return ok({
      root, claims, memlets, questions, options, media,
      sub_layers: subLayers, memlet_kinds: memletKinds, question_kinds: questionKinds,
    });
  });

  // GET /al/staging/root/:root/fill/:band — live per-root row counts for ONE
  // band, read straight off the carriers.
  //
  // Deliberately not part of the root payload. Opening a root used to count
  // every carrier in the registry, and a root screen shows one band at a time,
  // so the rest of that work was thrown away. The band is fetched when it is
  // opened.
  //
  // `sub_layers` carries the registry's fill_state/carrier_state, which are
  // global facts about a table ("ar_ling_roots has rows") and say nothing about
  // THIS root — rendering them per-root is what made Core identity read
  // "filled" over an empty carrier and Permutation read "empty" over a real
  // row. A sub_code absent from this list has no audited carrier binding: that
  // is unknown, not zero.
  router.get('/al/staging/root/:root/fill/:band', async (_req, env, { root, band }) => {
    const repo = new StagingRepo(env.DB_AL);
    return ok({ root, band, root_fill: await repo.rootFill(root, { band }) });
  });

  // GET /al/staging/root/:root/fill/scope/:scope — every band of one scope.
  // The layer *list* shows eight layers at once, so fetching band by band would
  // leave seven of them unread; one scope is still only what is on screen.
  router.get('/al/staging/root/:root/fill/scope/:scope', async (_req, env, { root, scope }) => {
    const repo = new StagingRepo(env.DB_AL);
    return ok({ root, scope, root_fill: await repo.rootFill(root, { scope }) });
  });

  // GET /al/staging/root/:root/rows/:sub — what the carrier actually holds.
  //
  // The leaf rendered mirrored staging claims, so `00-CORE` showed "empty
  // carrier" for نزل while `ar_ling_roots` held its row. These are the carrier's
  // own rows, from the same tables the fill count is taken from.
  router.get('/al/staging/root/:root/rows/:sub', async (_req, env, { root, sub }) => {
    const repo = new StagingRepo(env.DB_AL);
    return ok({ root, sub_code: sub, carriers: await repo.rootRows(root, sub) });
  });
}
