function base64url(bytes: Uint8Array): string {
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function signJwt(
  payload: Record<string, unknown>,
  secret: string,
): Promise<string> {
  const enc = new TextEncoder();
  const header = base64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = base64url(enc.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${header}.${body}`));
  return `${header}.${body}.${base64url(new Uint8Array(sig))}`;
}

/// The workspace a session opens in. A user can belong to several; this is the
/// one the client lands on, not a permission boundary — authorisation is by
/// membership, resolved per request. Prefers a workspace the user owns, then
/// the most recently touched one they belong to.
async function defaultWorkspaceId(
  db: D1Database,
  userId: string,
): Promise<string | null> {
  try {
    const row = await db
      .prepare(
        `SELECT w.id
           FROM core_workspaces w
           LEFT JOIN core_workspace_members m
             ON m.workspace_id = w.id AND m.user_id = ? AND m.status = 'active'
          WHERE w.status = 'active' AND (w.owner_id = ? OR m.user_id IS NOT NULL)
          ORDER BY (w.owner_id = ?) DESC, w.updated_at DESC
          LIMIT 1`,
      )
      .bind(userId, userId, userId)
      .first<{ id: string }>();
    return row?.id ?? null;
  } catch {
    // A session is still valid without a workspace hint.
    return null;
  }
}

export async function issueSessionToken(
  user: { id: string; role: string },
  secret: string,
  expirySeconds: number,
  opts: { mustChangePassword?: boolean; db?: D1Database } = {},
): Promise<{ token: string; expires_in: number }> {
  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    sub: user.id,
    role: user.role,
    iat: now,
    exp: now + expirySeconds,
  };

  // The gateway forwards this as X-KM-Workspace-Id; without it the header is
  // always empty and every downstream worker falls back to owner-only scoping.
  if (opts.db) {
    const wid = await defaultWorkspaceId(opts.db, user.id);
    if (wid) payload['wid'] = wid;
  }

  if (opts.mustChangePassword) payload['mcp'] = 1;
  const token = await signJwt(payload, secret);
  return { token, expires_in: expirySeconds };
}
