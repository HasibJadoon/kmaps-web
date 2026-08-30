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
  const url =
    `https://km-core/core/users/by-email?email=${encodeURIComponent(email)}`;

  let res: Response;
  try {
    res = await env.CORE.fetch(url);
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
