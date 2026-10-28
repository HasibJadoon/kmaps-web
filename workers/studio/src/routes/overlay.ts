import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import { query } from '../../../shared/src/db';
import type { StudioEnv } from '../env';

interface ReleaseRow { version: string; manifest_json: string; created_at: string }

const TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8',
  json: 'application/json', svg: 'image/svg+xml',
};

export function overlayRoutes(router: Router<StudioEnv>) {

  /// The live renderer release: its version and every file it serves, by
  /// path and content hash. Studio fetches what it does not have yet and
  /// draws every other file from the copy bundled in the app.
  router.get('/st/overlay/current', async (_req, env) => {
    const [row] = await query<ReleaseRow>(env.DB_ST,
      `SELECT version, manifest_json, created_at FROM st_overlay_release
        WHERE live = 1 ORDER BY created_at DESC, version DESC LIMIT 1`);
    if (!row) return notFound('overlay release');
    return ok({ version: row.version, files: JSON.parse(row.manifest_json), created_at: row.created_at });
  });

  /// One file's bytes, by its SHA-256. A hash names one content for ever,
  /// so the answer may be cached for good. `?path=` gives its type.
  router.get('/st/overlay/blob/:sha', async (req, env, { sha }) => {
    if (!/^[0-9a-f]{64}$/.test(sha)) return notFound('overlay file');
    const obj = await env.OVERLAY.get(`overlay/${sha}`);
    if (!obj) return notFound('overlay file');
    const ext = (new URL(req.url).searchParams.get('path') ?? '').split('.').pop() ?? '';
    return new Response(obj.body, { headers: {
      'Content-Type': obj.httpMetadata?.contentType ?? TYPES[ext] ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    } });
  });
}
