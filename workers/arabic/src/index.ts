import { Router } from '../../shared/src/router';
import { dbHealth } from '../../shared/src/http';
import { ok } from '../../shared/src/response';
import type { ArabicEnv } from './env';

import { containerRoutes } from './routes/containers';
import { libraryRoutes } from './routes/library';
import { curriculumRoutes } from './routes/curriculum';
import { vocabularyRoutes } from './routes/vocabulary';
import { lessonRoutes } from './routes/lessons';
import { grammarRoutes } from './routes/grammar';
import { exerciseRoutes } from './routes/exercises';
import { srsRoutes } from './routes/srs';

const router = new Router<ArabicEnv>();

router.get('/health', async (_req, env) =>
  ok({ domain: 'arabic', db: 'DB_AR', db_ok: await dbHealth(env.DB_AR) }),
);

containerRoutes(router);
libraryRoutes(router);
curriculumRoutes(router);
lessonRoutes(router);
vocabularyRoutes(router);
grammarRoutes(router);
exerciseRoutes(router);
srsRoutes(router);

export default {
  fetch: (request: Request, env: ArabicEnv) => router.handle(request, env),
} satisfies ExportedHandler<ArabicEnv>;
