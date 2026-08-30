import { Router } from '../../shared/src/router';
import { dbHealth } from '../../shared/src/http';
import { ok } from '../../shared/src/response';
import type { StudioEnv } from './env';

import { templateRoutes } from './routes/templates';
import { episodeRoutes } from './routes/episodes';
import { sessionRoutes } from './routes/sessions';
import { captureRoutes } from './routes/capture';

const router = new Router<StudioEnv>();

router.get('/health', async (_req, env) =>
  ok({ domain: 'studio', db: 'DB_ST', db_ok: await dbHealth(env.DB_ST) }),
);

templateRoutes(router);
episodeRoutes(router);
sessionRoutes(router);
captureRoutes(router);

export default {
  fetch: (request: Request, env: StudioEnv) => router.handle(request, env),
} satisfies ExportedHandler<StudioEnv>;

export { EpisodeSession } from './session.do';
