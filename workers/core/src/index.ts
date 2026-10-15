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
import { learnerRoutes } from './routes/learner';
import { drillBankRoutes } from './routes/drills';
import { drillClassRoutes } from './routes/drill-class';
import { appsRoutes } from './routes/apps';
import { scoresRoutes } from './routes/scores';
import { drillFeedbackRoutes } from './routes/drill-feedback';
import { srsSessionRoutes } from './routes/srs-session';
import { quizRoutes } from './routes/quiz';
import { learnRoutes } from './routes/learn';
import { bankRoutes } from './routes/bank';
import { bankPlayRoutes } from './routes/bank-play';
import { bankScopeRoutes, bankShareRoutes } from './routes/bank-scope';
import { talkRoutes } from './routes/talk';
import { tableRoutes } from './routes/table';
import { dsRoutes } from './routes/ds';
import { cybRoutes } from './routes/cyb';
import { studySessionRoutes } from './routes/study-session';

const router = new Router<CoreEnv>();

router.get('/health', async (_req, env) =>
  ok({ domain: 'core', db: 'DB_CORE', db_ok: await dbHealth(env.DB_CORE) }),
);

// The gateway forwards /api/<module>/… with the module segment intact, so a
// worker only ever sees a prefixed path. Bare /health is reachable over the
// service binding but 404s from outside; this alias is the public one.
router.get('/core/health', async (_req, env) =>
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
drillClassRoutes(router);
appsRoutes(router);
scoresRoutes(router);
drillFeedbackRoutes(router);
srsSessionRoutes(router);
quizRoutes(router);
learnRoutes(router);
bankRoutes(router);
bankPlayRoutes(router);
bankScopeRoutes(router);
bankShareRoutes(router);
talkRoutes(router);
tableRoutes(router);
cybRoutes(router);
dsRoutes(router);
studySessionRoutes(router);
learnerRoutes(router);
drillBankRoutes(router);

export { ReviewSession } from './review-session.do';
export { QuizSession } from './quiz-session.do';
export { TableSession } from './table-session.do';

/// Internal — membership lookup for other workers.
///
/// Authorisation in ST (and anywhere else that scopes by workspace) is by
/// membership, not by the single `wid` claim: a user can belong to several
/// workspaces and the token names only the one they landed in. The gateway
/// 404s any path containing `/internal/`, so this is reachable solely over a
/// service binding.
router.post('/core/internal/memberships', async (req, env) => {
  const body = await req.json<{ user_id?: string }>().catch(() => null);
  const userId = body?.user_id?.trim();
  if (!userId) return ok({ workspaces: [] });

  const rows = await env.DB_CORE.prepare(
    `SELECT w.id AS workspace_id,
            CASE WHEN w.owner_id = ? THEN 'owner'
                 ELSE COALESCE(m.membership_role, 'member') END AS role
       FROM core_workspaces w
       LEFT JOIN core_workspace_members m
         ON m.workspace_id = w.id AND m.user_id = ? AND m.status = 'active'
      WHERE w.status = 'active' AND (w.owner_id = ? OR m.user_id IS NOT NULL)`,
  )
    .bind(userId, userId, userId)
    .all<{ workspace_id: string; role: string }>();

  return ok({ workspaces: rows.results ?? [] });
});

export default {
  fetch: (request: Request, env: CoreEnv) => router.handle(request, env),
} satisfies ExportedHandler<CoreEnv>;
