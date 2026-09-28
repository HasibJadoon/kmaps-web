import type { Router } from '../../../shared/src/router';
import { ok, unauthorized, badRequest, err } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import type { CoreEnv } from '../env';
import { UserRepo } from '../repositories/user.repo';
import { AuthRepo } from '../repositories/auth.repo';
import { issueSessionToken } from '../jwt';

const REFRESH_TTL_DAYS = 30;

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function startSession(
  env: CoreEnv,
  userId: string,
  sessionType: 'web' | 'mobile',
  deviceInfo: string | undefined,
): Promise<string> {
  const refresh = randomToken();
  const sessionToken = await sha256Hex(refresh);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400 * 1000).toISOString();
  await new AuthRepo(env.DB_CORE).createSession({
    userId,
    sessionToken,
    sessionType,
    deviceInfo,
    expiresAt,
  });
  return refresh;
}

export function deviceInfoOf(b: Record<string, unknown>): string | undefined {
  return typeof b['device_info'] === 'string' ? b['device_info'] : undefined;
}

export function authRoutes(router: Router<CoreEnv>) {

  // Accounts are Google or Apple only (oauth.ts): a first sign-in creates the
  // account, a later one links by email. There is no password to log in with,
  // register with or change, and no other way to create a user.
  const gone = async () => err('gone', 'Sign in with Google or Apple — accounts are created on first sign-in.', 410);
  router.post('/core/auth/login', gone);
  router.post('/core/auth/token', gone);
  router.post('/core/auth/register', gone);

  router.post('/core/auth/refresh', async (req, env) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Request body must be valid JSON');
    }
    const b = (body ?? {}) as Record<string, unknown>;
    const refresh = typeof b['refresh_token'] === 'string' ? b['refresh_token'] : '';
    if (!refresh) return badRequest('refresh_token is required');

    const authRepo = new AuthRepo(env.DB_CORE);
    const session = await authRepo.findSession(await sha256Hex(refresh));
    if (!session) return unauthorized('Refresh token is invalid or expired');

    const user = await new UserRepo(env.DB_CORE).findById(session.user_id);
    if (!user || user.status !== 'active') return unauthorized('Account unavailable');

    await authRepo.touchSession(session.id);
    const expiry = parseInt(env.JWT_EXPIRY_SECONDS ?? '3600', 10);
    const { token, expires_in } = await issueSessionToken(user, env.JWT_SECRET, expiry, { db: env.DB_CORE });
    return ok({ token, expires_in });
  });

  router.post('/core/auth/logout', async (req, env) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const b = (body ?? {}) as Record<string, unknown>;
    const refresh = typeof b['refresh_token'] === 'string' ? b['refresh_token'] : '';
    if (refresh) {
      const authRepo = new AuthRepo(env.DB_CORE);
      const session = await authRepo.findSession(await sha256Hex(refresh));
      if (session) await authRepo.revokeSession(session.id);
    }
    return ok({ revoked: true });
  });

  router.get('/core/auth/me', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const user = await new UserRepo(env.DB_CORE).findById(ctx.userId);
    if (!user) return unauthorized('Account not found');
    return ok({ user });
  });

  router.post('/core/auth/verify', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    return ok(ctx);
  });

  router.post('/core/auth/change-password', gone);

  router.get('/core/auth/bootstrap', async (_req, env) => {
    const adminExists = await new UserRepo(env.DB_CORE).adminExists();
    return ok({ needs_setup: !adminExists });
  });

  router.post('/core/auth/bootstrap', gone);
}
