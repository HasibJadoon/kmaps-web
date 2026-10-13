import { withCache } from './cache';
import { Router } from '../../shared/src/router';
import { dbHealth } from '../../shared/src/http';
import { ok } from '../../shared/src/response';
import type { WorldviewEnv } from './env';

import { traditionRoutes }  from './routes/traditions';
import { nodeRoutes }        from './routes/nodes';
import { countsRoutes }      from './routes/counts';
import { sourceRoutes }      from './routes/sources';
import { illustrationRoutes } from './routes/illustrations';
import { readingSessionRoutes } from './routes/reading-sessions';
import { timelineRoutes }    from './routes/timeline';
import { questionRoutes }    from './routes/questions';
import { brainstormRoutes }  from './routes/brainstorms';
import { comparisonRoutes }  from './routes/comparisons';
import { insightRoutes }     from './routes/insights';
import { distillRoutes }     from './routes/distill';
import { positionRoutes }    from './routes/positions';
import { domainRoutes }      from './routes/domains';
import { authorRoutes } from './routes/authors';
import { peopleRoutes }      from './routes/people';
import { mapRoutes }         from './routes/maps';
import { graphRoutes }       from './routes/graphs';
import { termRoutes }        from './routes/terms';
import { rhetoricRoutes }    from './routes/rhetoric';
import { audioRoutes }       from './routes/audio';
import { arcRoutes }         from './routes/arcs';
import { atlasRoutes }       from './routes/atlas';
import { intakeRoutes }      from './routes/intake';
import { debateRoutes }      from './routes/debates';
import { intakePipelineRoutes } from '../../shared/src/intake-pipeline';

const router = new Router<WorldviewEnv>();

// The intake's pipeline for this domain (shared/src/intake-pipeline.ts): literal paths, so first.
for (const prefix of ['/wv', '/worldview'])
  intakePipelineRoutes(router, { prefix, db: (e) => e.DB_WV, table: 'wv_intake_pipeline', stages: 'wv_intake_stage' });

router.get('/health', async (_req, env) =>
  ok({ domain: 'worldview', db: 'DB_WV', db_ok: await dbHealth(env.DB_WV) }),
);

// The gateway forwards /api/<module>/… with the module segment intact, so a
// worker only ever sees a prefixed path. Bare /health is reachable over the
// service binding but 404s from outside; this alias is the public one.
router.get('/wv/health', async (_req, env) =>
  ok({ domain: 'worldview', db: 'DB_WV', db_ok: await dbHealth(env.DB_WV) }),
);

countsRoutes(router);
audioRoutes(router);

traditionRoutes(router);
peopleRoutes(router);
authorRoutes(router);
domainRoutes(router);
termRoutes(router);
rhetoricRoutes(router);

mapRoutes(router);
graphRoutes(router);

nodeRoutes(router);

sourceRoutes(router);
arcRoutes(router);
atlasRoutes(router);
intakeRoutes(router);
debateRoutes(router);

illustrationRoutes(router);

readingSessionRoutes(router);

timelineRoutes(router);

questionRoutes(router);

distillRoutes(router);

brainstormRoutes(router);

positionRoutes(router);
comparisonRoutes(router);

insightRoutes(router);

export default {
  // public reads are served once per version of their data (cache.ts); writes drop them
  fetch: (request: Request, env: WorldviewEnv, ctx: ExecutionContext) => {
    const e: WorldviewEnv = { ...env, CTX: ctx };
    return withCache(request, e, (r) => router.handle(r, e));
  },
} satisfies ExportedHandler<WorldviewEnv>;
