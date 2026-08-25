// ─── /al/registry/* — the AL carrier registry, and what the carriers hold ────
// `ar_ling_stg_claim` was dropped on 2026-08-21 — its senses, uṣūl
// and scholarship were carried into ar_ling_root_sense / _asl / _scholarship,
// and the summary and matrix that only ever counted claims went with it.
//   • GET /al/registry/layer-model            — scope → layer → sub-layer registry
//   • GET /al/registry/root/:root             — memlets, questions, options, media
//   • GET /al/registry/root/:root/fill/:band  — live carrier counts, one band
//   • GET /al/registry/root/:root/fill/scope/:scope — one scope's bands
//   • GET /al/registry/root/:root/rows/:sub   — what a carrier actually holds

import type { Router } from '../../../shared/src/router';
import { ok } from '../../../shared/src/response';
import type { ArLinguisticsEnv } from '../env';
import { RegistryRepo } from '../repositories/registry.repo';

export function registryRoutes(router: Router<ArLinguisticsEnv>) {
  // GET /al/registry/summary — the registry, and the corpus behind it.
  //
  // The status breakdown and the per-root rollups counted staged and promoted
  // claims. There are none: a row is in its carrier or it does not exist.
  router.get('/al/registry/summary', async (_req, env) => {
    const repo = new RegistryRepo(env.DB_AL);
    const [counts, subLayers] = await Promise.all([repo.counts(), repo.subLayers()]);
    return ok({ counts, by_status: [], roots: [], sub_layers: subLayers });
  });

  // GET /al/registry/matrix — root × sub_code, which was a claim count and is
  // now nothing. The per-root reading comes from the carriers themselves, via
  // the fill routes below.
  router.get('/al/registry/matrix', async (_req, env) => {
    const repo = new RegistryRepo(env.DB_AL);
    return ok({ cells: [], sub_layers: await repo.subLayers(), roots: [] });
  });

  // GET /al/registry/layer-model — the registry tree the Root Dashboard drills:
  // the three scopes (root · lemma · word), the bands of sub-layers inside each,
  // and every sub-layer's carrier tables and fill state. Registry only — the
  // per-root numbers come from the matrix and the control plane's sensors.
  router.get('/al/registry/layer-model', async (_req, env) => {
    const repo = new RegistryRepo(env.DB_AL);
    return ok(await repo.layerModel());
  });

  // GET /al/registry/root/:root — deep drill for one root: the Membean-style
  // memlet cards, the question bank, and the registry they hang off. The claims
  // this used to lead with were staging rows; a sub-layer's contents now come
  // from its carrier, through the rows route below.
  router.get('/al/registry/root/:root', async (_req, env, { root }) => {
    const repo = new RegistryRepo(env.DB_AL);
    const [memlets, questions, options, media, subLayers, memletKinds, questionKinds] =
      await Promise.all([
        repo.rootMemlets(root), repo.rootQuestions(root),
        repo.rootOptions(root), repo.rootMedia(root), repo.subLayers(),
        repo.memletKinds(), repo.questionKinds(),
      ]);
    return ok({
      root, claims: [], memlets, questions, options, media,
      sub_layers: subLayers, memlet_kinds: memletKinds, question_kinds: questionKinds,
    });
  });

  // GET /al/registry/root/:root/fill/:band — live per-root row counts for ONE
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
  router.get('/al/registry/root/:root/fill/:band', async (_req, env, { root, band }) => {
    const repo = new RegistryRepo(env.DB_AL);
    return ok({ root, band, root_fill: await repo.rootFill(root, { band }) });
  });

  // GET /al/registry/root/:root/fill/scope/:scope — every band of one scope.
  // The layer *list* shows eight layers at once, so fetching band by band would
  // leave seven of them unread; one scope is still only what is on screen.
  router.get('/al/registry/root/:root/fill/scope/:scope', async (_req, env, { root, scope }) => {
    const repo = new RegistryRepo(env.DB_AL);
    return ok({ root, scope, root_fill: await repo.rootFill(root, { scope }) });
  });

  // GET /al/registry/root/:root/rows?scope=root&per=6 — every sub-layer's rows
  // for this root, in one read.
  //
  // Reading a root one carrier at a time made the screen a click per layer:
  // twenty sub-layers, twenty round trips, and no way to see at a glance what
  // the root actually holds. This is the whole scope at once, a few rows per
  // layer, with each carrier's real `total` alongside so a preview never reads
  // as the whole of it.
  //
  // Declared before /rows/:sub so the two never race; they are different
  // segment counts, but the intent is worth stating.
  router.get('/al/registry/root/:root/rows', async (req, env, { root }) => {
    const url = new URL(req.url);
    const scope = url.searchParams.get('scope') ?? 'root';
    const per = Number(url.searchParams.get('per') ?? 6);
    const repo = new RegistryRepo(env.DB_AL);
    return ok({
      root, scope,
      carriers: await repo.rootRowsScope(root, scope, Number.isFinite(per) ? per : 6),
    });
  });

  // GET /al/registry/root/:root/rows/:sub — what the carrier actually holds.
  //
  // The leaf rendered mirrored staging claims, so `00-CORE` showed "empty
  // carrier" for نزل while `ar_ling_roots` held its row. These are the carrier's
  // own rows, from the same tables the fill count is taken from.
  router.get('/al/registry/root/:root/rows/:sub', async (_req, env, { root, sub }) => {
    const repo = new RegistryRepo(env.DB_AL);
    return ok({ root, sub_code: sub, carriers: await repo.rootRows(root, sub) });
  });
}
