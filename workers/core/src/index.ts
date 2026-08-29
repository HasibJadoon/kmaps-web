// ─── km-core-worker entry point ───────────────────────────────────────────────
// Owns DB_CORE (km_core). Issues and verifies JWT tokens. Manages users,
// workspaces, roles, and resource grants. Calls no other domain Worker.

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
import { talkRoutes } from './routes/talk';
import { dsRoutes } from './routes/ds';
import { cybRoutes } from './routes/cyb';
import { studySessionRoutes } from './routes/study-session';

const router = new Router<CoreEnv>();

// Health
router.get('/health', async (_req, env) =>
  ok({ domain: 'core', db: 'DB_CORE', db_ok: await dbHealth(env.DB_CORE) }),
);

// Domain routes
authRoutes(router);
oauthRoutes(router);
userRoutes(router);
workspaceRoutes(router);
workspaceRoleRoutes(router);
activityRoutes(router);
grantRoutes(router);
srsRoutes(router);           // /core/srs/* — the one spaced-repetition engine (FSRS)
srsRegistryRoutes(router);   // GET/POST/DELETE /core/srs/registry — SRS enrollment index
srsSessionRoutes(router);    // /core/srs/sessions/* — reviewing together, one shared question
quizRoutes(router);          // /core/quiz/* — a question asked to a room, scored on speed
learnRoutes(router);         // /core/learn/* — the path: where you are, unit by unit
talkRoutes(router);          // /core/talk/* — cards to start a conversation
cybRoutes(router);
dsRoutes(router);                // /core/ds/* — the composed display spec: layers + plane + cards           // GET /core/cyb/* — cybernetics control plane (monitor · tree · jobs)
studySessionRoutes(router);  // /core/study/sessions — the study axis's one carrier

export { ReviewSession } from './review-session.do';
export { QuizSession } from './quiz-session.do';

export default {
  fetch: (request: Request, env: CoreEnv) => router.handle(request, env),
} satisfies ExportedHandler<CoreEnv>;
