import type { Router } from '../../../shared/src/router';
import { ok } from '../../../shared/src/response';
import type { ArLinguisticsEnv } from '../env';
import { RegistryRepo } from '../repositories/registry.repo';

export function registryRoutes(router: Router<ArLinguisticsEnv>) {

  router.get('/al/registry/summary', async (_req, env) => {
    const repo = new RegistryRepo(env.DB_AL);
    const [counts, subLayers] = await Promise.all([repo.counts(), repo.subLayers()]);
    return ok({ counts, by_status: [], roots: [], sub_layers: subLayers });
  });

  router.get('/al/registry/layer-model', async (_req, env) => {
    const repo = new RegistryRepo(env.DB_AL);
    return ok(await repo.layerModel());
  });

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

  // global facts about a table ("ar_ling_roots has rows") and say nothing about

  router.get('/al/registry/root/:root/fill/:band', async (_req, env, { root, band }) => {
    const repo = new RegistryRepo(env.DB_AL);
    return ok({ root, band, root_fill: await repo.rootFill(root, { band }) });
  });

  router.get('/al/registry/root/:root/fill/scope/:scope', async (_req, env, { root, scope }) => {
    const repo = new RegistryRepo(env.DB_AL);
    return ok({ root, scope, root_fill: await repo.rootFill(root, { scope }) });
  });

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

  router.get('/al/registry/root/:root/rows/:sub', async (_req, env, { root, sub }) => {
    const repo = new RegistryRepo(env.DB_AL);
    return ok({ root, sub_code: sub, carriers: await repo.rootRows(root, sub) });
  });
}
