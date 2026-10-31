import type { StudioEnv } from './env';

export interface CoreUser {
  id: string;
  email: string;
  display_name: string;
}

export async function resolveUserByEmail(
  env: StudioEnv,
  email: string,
): Promise<CoreUser | null> {
  let res: Response;
  try {
    res = await env.CORE.fetch(new Request('https://km-core/core/internal/user-by-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }));
  } catch {
    return null;
  }
  if (!res.ok) return null;

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return null;
  }

  const data = (body as { data?: unknown } | null)?.data ?? body;
  if (!data || typeof data !== 'object') return null;

  const row = data as Record<string, unknown>;
  if (typeof row['id'] !== 'string' || typeof row['email'] !== 'string') return null;

  return {
    id: row['id'],
    email: row['email'],
    display_name:
      typeof row['display_name'] === 'string' && row['display_name'].trim()
        ? row['display_name']
        : row['email'],
  };
}

// ───────────────────────────────────────────────────────── workspace access

export interface Membership {
  workspace_id: string;
  /** 'owner' | 'admin' | 'member' | 'viewer' | 'guest' */
  role: string;
}

/// One membership lookup per request, memoised on the request object.
///
/// CORE owns identity, so ST never reads core_workspace_members itself — it
/// asks over the service binding. The `wid` claim names only the workspace the
/// session landed in; a user can belong to several, so scoping uses the full
/// set rather than that one value.
const CACHE = new WeakMap<Request, Promise<Membership[]>>();

export function membershipsFor(
  env: StudioEnv,
  req: Request,
  userRef: string,
): Promise<Membership[]> {
  const hit = CACHE.get(req);
  if (hit) return hit;

  const fresh = (async (): Promise<Membership[]> => {
    try {
      const res = await env.CORE.fetch(
        new Request('https://km-core/core/internal/memberships', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userRef }),
        }),
      );
      if (!res.ok) return [];
      const body = await res.json<{ data?: { workspaces?: Membership[] } }>();
      const rows = body?.data?.workspaces;
      return Array.isArray(rows) ? rows : [];
    } catch {
      // CORE unreachable: fall back to owner-only scoping rather than
      // opening every workspace.
      return [];
    }
  })();

  CACHE.set(req, fresh);
  return fresh;
}

export function workspaceIds(rows: Membership[]): string[] {
  return rows.map((r) => r.workspace_id);
}

/// Editing an episode needs a managing role in its workspace.
export function canManage(rows: Membership[], workspaceRef: string | null): boolean {
  if (!workspaceRef) return false;
  const row = rows.find((r) => r.workspace_id === workspaceRef);
  return !!row && (row.role === 'owner' || row.role === 'admin');
}

export function isMember(rows: Membership[], workspaceRef: string | null): boolean {
  if (!workspaceRef) return false;
  return rows.some((r) => r.workspace_id === workspaceRef);
}
