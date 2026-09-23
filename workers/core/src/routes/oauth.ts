import type { Router } from '../../../shared/src/router';
import { ok, badRequest, unauthorized, forbidden } from '../../../shared/src/response';
import type { CoreEnv } from '../env';
import { UserRepo } from '../repositories/user.repo';
import { issueSessionToken } from '../jwt';
import { verifyGoogleIdToken, verifyAppleIdToken, type OAuthIdentity } from '../oauth/verify';
import type { User } from '../schemas/user.schema';

function clientIds(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function displayNameFor(identity: OAuthIdentity): string {
  if (identity.name?.trim()) return identity.name.trim();
  if (identity.email) {
    const local = identity.email.split('@')[0];
    if (local) return local;
  }
  return 'New user';
}

async function loginWithIdentity(
  env: CoreEnv,
  identity: OAuthIdentity,
  nameOverride?: string,
): Promise<Response> {
  const repo = new UserRepo(env.DB_CORE);
  let user: User | null = await repo.findByOAuthSubject(identity.provider, identity.subject);

  if (!user && identity.email) {
    user = await repo.findByEmail(identity.email);
    if (user) {
      await repo.linkOAuth(user.id, identity.provider, identity.subject, identity.picture);
    }
  }

  if (!user) {
    if (!identity.email) {
      return badRequest(
        'This account did not share an email address, so it cannot be created automatically.',
      );
    }
    user = await repo.createOAuthUser({
      email: identity.email,
      display_name: nameOverride?.trim() || displayNameFor(identity),
      avatar_url: identity.picture,
      email_verified: identity.emailVerified,
      provider: identity.provider,
      subject: identity.subject,
    });
  }

  if (user.status !== 'active') {
    return forbidden('This account is not active. Contact an administrator.');
  }

  const expiry = parseInt(env.JWT_EXPIRY_SECONDS ?? '3600', 10);
  const { token, expires_in } = await issueSessionToken(user, env.JWT_SECRET, expiry, { db: env.DB_CORE });
  return ok({ token, expires_in, user });
}

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function oauthRoutes(router: Router<CoreEnv>) {

  router.get('/core/auth/providers', async (_req, env) => {
    const google = clientIds(env.GOOGLE_CLIENT_ID);
    const apple = clientIds(env.APPLE_CLIENT_ID);
    const appleRedirect = (env.APPLE_REDIRECT_URI ?? '').trim();
    return ok({
      google: {
        enabled: google.length > 0,
        client_id: google[0] ?? '',
      },
      apple: {

        enabled: apple.length > 0 && appleRedirect.length > 0,
        client_id: apple[0] ?? '',
        redirect_uri: appleRedirect,
        scope: 'name email',
      },
    });
  });

  router.post('/core/auth/oauth/google', async (req, env) => {
    const ids = clientIds(env.GOOGLE_CLIENT_ID);
    if (ids.length === 0) return badRequest('Google sign-in is not configured');

    const body = await readJson(req);
    const idToken = body && typeof body['id_token'] === 'string' ? body['id_token'].trim() : '';
    if (!idToken) return badRequest('id_token is required');

    const identity = await verifyGoogleIdToken(idToken, ids);
    if (!identity) return unauthorized('Google token could not be verified');
    return loginWithIdentity(env, identity);
  });

  router.post('/core/auth/oauth/apple', async (req, env) => {
    const ids = clientIds(env.APPLE_CLIENT_ID);
    if (ids.length === 0) return badRequest('Apple sign-in is not configured');

    const body = await readJson(req);
    const idToken = body && typeof body['id_token'] === 'string' ? body['id_token'].trim() : '';
    if (!idToken) return badRequest('id_token is required');
    const name = body && typeof body['name'] === 'string' ? body['name'] : undefined;

    const identity = await verifyAppleIdToken(idToken, ids);
    if (!identity) return unauthorized('Apple token could not be verified');
    return loginWithIdentity(env, identity, name);
  });
}
