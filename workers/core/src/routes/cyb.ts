import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import type { CoreEnv } from '../env';
import { CybRepo } from '../repositories/cyb.repo';
import { SenseRepo, CarrierRowsRepo } from '../repositories/sense.repo';

export function cybRoutes(router: Router<CoreEnv>) {

  router.get('/core/cyb/process', async (req, env) => {
    const domain = new URL(req.url).searchParams.get('domain') ?? undefined;
    const processes = await new CybRepo(env.DB_CORE).process(domain);
    return ok({ processes });
  });

  router.get('/core/cyb/domains', async (_req, env) => {
    const domains = await new CybRepo(env.DB_CORE).domains();
    return ok({ domains });
  });

  router.get('/core/cyb/layers', async (req, env) => {
    const domain = new URL(req.url).searchParams.get('domain') ?? undefined;
    const layers = await new CybRepo(env.DB_CORE).layers(domain);
    return ok({ layers });
  });

  router.get('/core/cyb/monitor', async (_req, env) => {
    const repo = new CybRepo(env.DB_CORE);
    const [
      config, gauges, ticks,
      distTotal, distBySeverity, distByKind,
      jobsByReadiness, jobs,
      sensorTotal, sensorByState, sensorByAxis,
      nodesByScale, sourceByCoverage,
    ] = await Promise.all([
      repo.config(), repo.gauges(), repo.ticks(8),
      repo.disturbanceTotal(), repo.disturbanceBySeverity(), repo.disturbanceByKind(),
      repo.jobsByReadiness(), repo.allJobs(),
      repo.sensorTotal(), repo.sensorCountByState(), repo.sensorCountByAxis(),
      repo.nodesByScale(), repo.sourceCountByCoverage(),
    ]);

    const count = (rows: { key: string; n: number }[], key: string) =>
      rows.find((r) => r.key === key)?.n ?? 0;
    const sum = (rows: { key: string; n: number }[]) => rows.reduce((a, r) => a + r.n, 0);

    return ok({

      config: config.reduce<Record<string, { value: string; note: string | null }>>((acc, c) => {
        acc[c.key] = { value: c.value, note: c.note };
        return acc;
      }, {}),

      loop: {
        sensors: sensorTotal,
        disturbances: distTotal,
        jobs: sum(jobsByReadiness),
        jobs_ready: count(jobsByReadiness, 'ready'),
        jobs_blocked: count(jobsByReadiness, 'blocked'),
        jobs_done: count(jobsByReadiness, 'done'),
        nodes: sum(nodesByScale),
        gauges: gauges.length,
      },
      gauges,
      ticks,
      disturbances: { total: distTotal, by_severity: distBySeverity, by_kind: distByKind },
      jobs: { by_readiness: jobsByReadiness, list: jobs },
      sensors: { total: sensorTotal, by_state: sensorByState, by_axis: sensorByAxis },
      nodes: { by_scale: nodesByScale },
      sources: { by_coverage: sourceByCoverage },
    });
  });

  router.get('/core/cyb/tree', async (req, env) => {
    const url = new URL(req.url);
    const node = url.searchParams.get('node') ?? undefined;
    const lane = url.searchParams.get('lane') ?? undefined;
    const roots = await new CybRepo(env.DB_CORE).tree(node, lane);
    return ok({ roots });
  });

  router.get('/core/cyb/node/:id', async (_req, env, { id }) => {
    const repo = new CybRepo(env.DB_CORE);
    const node = await repo.findNode(id);
    if (!node) return notFound(`cyb node ${id}`);
    const [sensors, jobs, gauges, subtree] = await Promise.all([
      repo.nodeSensors(id), repo.jobsForNode(id), repo.nodeGauges(id), repo.tree(id),
    ]);
    return ok({ node, sensors, jobs, gauges, children: subtree[0]?.children ?? [] });
  });

  router.get('/core/cyb/jobs', async (_req, env) => {
    const repo = new CybRepo(env.DB_CORE);
    const [list, byReadiness] = await Promise.all([repo.allJobs(), repo.jobsByReadiness()]);
    return ok({ list, by_readiness: byReadiness });
  });

  router.get('/core/cyb/sources', async (req, env) => {
    const loop = new URL(req.url).searchParams.get('loop') ?? undefined;
    const repo = new CybRepo(env.DB_CORE);
    const [list, byCoverage] = await Promise.all([repo.sources(loop), repo.sourceCountByCoverage()]);
    return ok({ list, by_coverage: byCoverage });
  });

  router.get('/core/cyb/reading/:id', async (_req, env, { id }) => {
    const repo = new CybRepo(env.DB_CORE);
    const rows = await repo.readings(id);
    if (!rows.length) return notFound(`cyb node ${id} not found`);
    return ok({ node_id: id, readings: rows });
  });

  router.get('/core/cyb/rows/:id', async (req, env, { id }) => {
    const layer = new URL(req.url).searchParams.get('layer') ?? undefined;
    const rows = await new CarrierRowsRepo(env).rowsForNode(id, layer);
    if (!rows) return notFound(`cyb node ${id} not found`);
    return ok({ node_id: id, layer: layer ?? null, carriers: rows });
  });

  router.get('/core/cyb/scope/:scopeType/:scopeId', async (req, env,
                                                           { scopeType, scopeId }) => {
    const params = new URL(req.url).searchParams;
    const layer = params.get('layer') ?? undefined;
    const domain = params.get('domain') ?? 'quran';
    const rows = await new CarrierRowsRepo(env)
      .rowsForScope(scopeType, decodeURIComponent(scopeId), layer, domain);
    return ok({ scope_type: scopeType, scope_id: scopeId,
                layer: layer ?? null, carriers: rows });
  });

  router.post('/core/cyb/sense/:id', async (_req, env, { id }) => {
    const report = await new SenseRepo(env).senseNode(id);
    if (!report) return notFound(`cyb node ${id} not found`);
    return ok(report);
  });

  router.get('/core/cyb/sense/:id', async (_req, env, { id }) => {
    const report = await new SenseRepo(env).senseNode(id, true);
    if (!report) return notFound(`cyb node ${id} not found`);
    return ok({ ...report, dry_run: true });
  });
}
