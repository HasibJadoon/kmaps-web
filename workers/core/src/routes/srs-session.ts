import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import { randomCode } from '../../../shared/src/ulid';
import type { CoreEnv } from '../env';

export function srsSessionRoutes(router: Router<CoreEnv>): void {
  router.post('/core/srs/sessions', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    return ok({ code: randomCode() });
  });

  router.get('/core/srs/sessions/:code/live', async (req, env, { code }) => {
    if (req.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return badRequest('Expected a WebSocket upgrade request');
    }
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    const room = code.toUpperCase();
    const headers = new Headers(req.headers);

    headers.set('X-KM-User-Id', ctx.userId);

    const stub = env.REVIEW_SESSION.get(env.REVIEW_SESSION.idFromName(room));
    return stub.fetch(new Request(req.url, { method: 'GET', headers }));
  });
}
