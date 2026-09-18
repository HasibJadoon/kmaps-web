import { Router } from '../../shared/src/router';
import { dbHealth } from '../../shared/src/http';
import { ok } from '../../shared/src/response';
import type { ArabicEnv } from './env';

import { audioRoutes } from './routes/audio';
import { vendorAudioRoutes } from './routes/vendor-audio';
import { textRoutes } from './routes/text';
import { readingRoutes } from './routes/reading';
import { acquisitionRoutes } from './routes/acquisition';
import { containerRoutes } from './routes/containers';
import { libraryRoutes } from './routes/library';
import { curriculumRoutes } from './routes/curriculum';
import { vocabularyRoutes } from './routes/vocabulary';
import { lessonRoutes } from './routes/lessons';
import { grammarRoutes } from './routes/grammar';
import { exerciseRoutes } from './routes/exercises';
import { dailyRoutes } from './routes/daily';

const router = new Router<ArabicEnv>();

router.get('/health', async (_req, env) =>
  ok({ domain: 'arabic', db: 'DB_AR', db_ok: await dbHealth(env.DB_AR) }),
);

// Literal-prefix routes first: the router is first-match-wins, and a
// ':id' pattern registered earlier would swallow them.
audioRoutes(router);
vendorAudioRoutes(router);
acquisitionRoutes(router);
textRoutes(router);
readingRoutes(router);

containerRoutes(router);
libraryRoutes(router);
curriculumRoutes(router);
lessonRoutes(router);
vocabularyRoutes(router);
grammarRoutes(router);
exerciseRoutes(router);
dailyRoutes(router);

export default {
  fetch: (request: Request, env: ArabicEnv) => router.handle(request, env),
} satisfies ExportedHandler<ArabicEnv>;
