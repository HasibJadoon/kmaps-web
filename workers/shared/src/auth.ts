import type { AuthContext } from './types';
import { unauthorized, forbidden } from './response';

interface JwtPayload {
  sub: string;
  wid?: string;
  role?: string;
  iat: number;
  exp: number;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}

function b64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function verifyJwt(
  token: string,
  secret: string,
): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;

    const key = await importKey(secret);
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const sig = b64url(sigB64);
    const valid = await crypto.subtle.verify('HMAC', key, sig, data);
    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))) as JwtPayload;
    // a token with no expiry would never die: refuse it
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export function extractBearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}

export async function authenticate(
  request: Request,
  jwtSecret: string,
): Promise<AuthContext | null> {
  const token = extractBearerToken(request);
  if (!token) return null;

  const payload = await verifyJwt(token, jwtSecret);
  if (!payload) return null;

  return {
    userId: payload.sub,
    workspaceId: payload.wid,
    role: payload.role,
    isAdmin: payload.role === 'admin',
  };
}

export async function requireAuth(
  request: Request,
  jwtSecret: string,
): Promise<AuthContext | Response> {
  const ctx = await authenticate(request, jwtSecret);
  if (!ctx) return unauthorized('Valid Bearer token required');
  return ctx;
}

export async function requireAdmin(
  request: Request,
  jwtSecret: string,
): Promise<AuthContext | Response> {
  const ctx = await requireAuth(request, jwtSecret);
  if (ctx instanceof Response) return ctx;
  if (!ctx.isAdmin) return forbidden('Admin role required');
  return ctx;
}

/** The caller's user id as forwarded by the gateway in X-KM-User-Id, or
 *  null when the header is absent or blank. Domain workers hold no JWT
 *  secret; the gateway has already verified the token. */
export function actorRef(req: Request): string | null {
  const id = req.headers.get('X-KM-User-Id');
  return id && id.trim() ? id.trim() : null;
}

/** Whether the gateway forwarded a reviewer (an admin) — for a domain worker's reviewer-only routes,
 *  which hold no JWT secret. Only the gateway reaches a domain worker, and it strips any X-KM-
 *  header a caller sent before setting its own. */
export function forwardedReviewer(req: Request): boolean {
  const role = req.headers.get('X-KM-Role');
  return !!actorRef(req) && (role === 'admin' || role === 'superadmin');
}
