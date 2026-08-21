// ─── /core/cyb/* — cybernetics control-plane read API ─────────────────────────
// Public, read-only. Powers the three Qurʾān-domain views:
//   • Control Monitor  → GET /core/cyb/monitor  (the closed loop, live)
//   • Quran Map        → GET /core/cyb/tree     (drill Qurʾān→Surah→Passage→…)
//   • Quran Ladder     → GET /core/cyb/tree     (same forest, rendered as a tree)
//   • node detail      → GET /core/cyb/node/:id (sensors · jobs · gauges · kids)
//   • mining queue     → GET /core/cyb/jobs     (the cyb_job queue)
//   • source registry  → GET /core/cyb/sources  (per-loop mining sources)
//
// Every number is a live read of cyb_* in DB_CORE — no hardcoded data. Domain
// detail (staging matrix, memlets, SRS) is served by the owning domain workers.

import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import type { CoreEnv } from '../env';
import { CybRepo } from '../repositories/cyb.repo';
import { SenseRepo } from '../repositories/sense.repo';

export function cybRoutes(router: Router<CoreEnv>) {
  // GET /core/cyb/process?domain=quran — the study process register: the ordered
  // steps, what each covers, and the layers and skills that do it.
  router.get('/core/cyb/process', async (req, env) => {
    const domain = new URL(req.url).searchParams.get('domain') ?? undefined;
    const processes = await new CybRepo(env.DB_CORE).process(domain);
    return ok({ processes });
  });

  // GET /core/cyb/layers?domain=quran — the layer registry, the one taxonomy.
  router.get('/core/cyb/layers', async (req, env) => {
    const domain = new URL(req.url).searchParams.get('domain') ?? undefined;
    const layers = await new CybRepo(env.DB_CORE).layers(domain);
    return ok({ layers });
  });

  // GET /core/cyb/monitor — the whole control loop as one snapshot.
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
      // ① reference · setpoint law
      config: config.reduce<Record<string, { value: string; note: string | null }>>((acc, c) => {
        acc[c.key] = { value: c.value, note: c.note };
        return acc;
      }, {}),
      // headline loop counters
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

  // GET /core/cyb/tree?node=<id>&lane=<lane> — recursion tree (Map + Ladder).
  // No node → the full forest (all top-level nodes with descendants).
  router.get('/core/cyb/tree', async (req, env) => {
    const url = new URL(req.url);
    const node = url.searchParams.get('node') ?? undefined;
    const lane = url.searchParams.get('lane') ?? undefined;
    const roots = await new CybRepo(env.DB_CORE).tree(node, lane);
    return ok({ roots });
  });

  // GET /core/cyb/node/:id — one node with its sensors, jobs, gauges, children.
  router.get('/core/cyb/node/:id', async (_req, env, { id }) => {
    const repo = new CybRepo(env.DB_CORE);
    const node = await repo.findNode(id);
    if (!node) return notFound(`cyb node ${id}`);
    const [sensors, jobs, gauges, subtree] = await Promise.all([
      repo.nodeSensors(id), repo.jobsForNode(id), repo.nodeGauges(id), repo.tree(id),
    ]);
    return ok({ node, sensors, jobs, gauges, children: subtree[0]?.children ?? [] });
  });

  // GET /core/cyb/jobs — the mining queue (cyb_job), ready→blocked→done.
  router.get('/core/cyb/jobs', async (_req, env) => {
    const repo = new CybRepo(env.DB_CORE);
    const [list, byReadiness] = await Promise.all([repo.allJobs(), repo.jobsByReadiness()]);
    return ok({ list, by_readiness: byReadiness });
  });

  // GET /core/cyb/sources?loop=<loop_key> — the mining source registry.
  router.get('/core/cyb/sources', async (req, env) => {
    const loop = new URL(req.url).searchParams.get('loop') ?? undefined;
    const repo = new CybRepo(env.DB_CORE);
    const [list, byCoverage] = await Promise.all([repo.sources(loop), repo.sourceCountByCoverage()]);
    return ok({ list, by_coverage: byCoverage });
  });

  // POST /core/cyb/sense/:id — the actuator, mechanised. Re-reads the node's
  // sensors against the real carriers through their owning workers, updates
  // readings, recomputes the node's per-axis percent, and sets *_measured.
  // Coverage is honest: what the engine cannot yet bind comes back in
  // `skipped` with its reason — never as a zero.
  router.post('/core/cyb/sense/:id', async (_req, env, { id }) => {
    const report = await new SenseRepo(env).senseNode(id);
    if (!report) return notFound(`cyb node ${id} not found`);
    return ok(report);
  });

  // GET is the dry run: the same readers against the same carriers, writing
  // nothing — what the sensors *would* say, before committing them to it.
  router.get('/core/cyb/sense/:id', async (_req, env, { id }) => {
    const report = await new SenseRepo(env).senseNode(id, true);
    if (!report) return notFound(`cyb node ${id} not found`);
    return ok({ ...report, dry_run: true });
  });
}
