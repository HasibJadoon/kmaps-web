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

export function cybRoutes(router: Router<CoreEnv>) {
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
}
