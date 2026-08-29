// ─── /core/srs/sessions/* — reviewing together ────────────────────────────────
//
//   POST /core/srs/sessions            — mint a room code to share
//   GET  /core/srs/sessions/:code/live — WebSocket upgrade → ReviewSession
//
// There is no session table, deliberately. A code names a room; the room is a
// Durable Object that exists from the moment somebody joins it, and the thing
// worth keeping afterwards — who answered what, and how it rescheduled their
// card — is already written to `core_srs_review_log` by the ordinary grade
// path. A row here would only record that some people were once in a room
// together, which nothing asks.

import type { Router } from '../../../shared/src/router';
import { ok, badRequest, unauthorized } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import type { CoreEnv } from '../env';

// No I, L, O, 0 or 1 — a code gets read aloud across a room.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function randomCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

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
    // The Durable Object never re-verifies the token: it is not reachable from
    // outside this worker, and by here the JWT has already been checked. What
    // it does need is who this socket belongs to, because every rating is
    // applied to that person's own card and to nobody else's.
    headers.set('X-KM-User-Id', ctx.userId);

    const stub = env.REVIEW_SESSION.get(env.REVIEW_SESSION.idFromName(room));
    return stub.fetch(new Request(req.url, { method: 'GET', headers }));
  });
}
