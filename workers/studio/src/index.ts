import { Router } from '../../shared/src/router';
import { dbHealth } from '../../shared/src/http';
import { ok } from '../../shared/src/response';
import type { StudioEnv } from './env';

import { templateRoutes } from './routes/templates';
import { episodeRoutes } from './routes/episodes';
import { sessionRoutes } from './routes/sessions';
import { captureRoutes } from './routes/capture';
import { homeRoutes } from './routes/home';
import { overlayRoutes } from './routes/overlay';

const router = new Router<StudioEnv>();

router.get('/health', async (_req, env) =>
  ok({ domain: 'studio', db: 'DB_ST', db_ok: await dbHealth(env.DB_ST) }),
);

// The gateway forwards /api/<module>/… with the module segment intact, so a
// worker only ever sees a prefixed path. Bare /health is reachable over the
// service binding but 404s from outside; this alias is the public one.
router.get('/st/health', async (_req, env) =>
  ok({ domain: 'studio', db: 'DB_ST', db_ok: await dbHealth(env.DB_ST) }),
);

templateRoutes(router);
episodeRoutes(router);
sessionRoutes(router);
captureRoutes(router);
homeRoutes(router);
overlayRoutes(router);

export default {
  fetch: (request: Request, env: StudioEnv) => router.handle(request, env),
} satisfies ExportedHandler<StudioEnv>;

export { EpisodeSession } from './session.do';
