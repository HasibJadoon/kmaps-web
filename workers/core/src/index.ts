import { Router } from '../../shared/src/router';
import { dbHealth } from '../../shared/src/http';
import { ok } from '../../shared/src/response';
import type { CoreEnv } from './env';

import { authRoutes } from './routes/auth';
import { oauthRoutes } from './routes/oauth';
import { userRoutes } from './routes/users';
import { workspaceRoutes } from './routes/workspaces';
import { workspaceRoleRoutes } from './routes/workspace-roles';
import { activityRoutes } from './routes/activity';
import { grantRoutes } from './routes/grants';
import { srsRoutes } from './routes/srs';
import { srsRegistryRoutes } from './routes/srs-registry';
import { srsSessionRoutes } from './routes/srs-session';
import { quizRoutes } from './routes/quiz';
import { learnRoutes } from './routes/learn';
import { bankRoutes } from './routes/bank';
import { bankPlayRoutes } from './routes/bank-play';
import { talkRoutes } from './routes/talk';
import { dsRoutes } from './routes/ds';
import { cybRoutes } from './routes/cyb';
import { studySessionRoutes } from './routes/study-session';

const router = new Router<CoreEnv>();

router.get('/health', async (_req, env) =>
  ok({ domain: 'core', db: 'DB_CORE', db_ok: await dbHealth(env.DB_CORE) }),
);

authRoutes(router);
oauthRoutes(router);
userRoutes(router);
workspaceRoutes(router);
workspaceRoleRoutes(router);
activityRoutes(router);
grantRoutes(router);
srsRoutes(router);
srsRegistryRoutes(router);
srsSessionRoutes(router);
quizRoutes(router);
learnRoutes(router);
bankRoutes(router);
bankPlayRoutes(router);
talkRoutes(router);
cybRoutes(router);
dsRoutes(router);
studySessionRoutes(router);

export { ReviewSession } from './review-session.do';
export { QuizSession } from './quiz-session.do';

export default {
  fetch: (request: Request, env: CoreEnv) => router.handle(request, env),
} satisfies ExportedHandler<CoreEnv>;
