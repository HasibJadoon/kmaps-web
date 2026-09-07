import type { Router } from '../../../shared/src/router';
import { notFound } from '../../../shared/src/response';
import type { ArabicEnv } from '../env';

// Acquisition audio out of the km-arabic-audio bucket — the recordings a
// listening unit sits on. Read-only and long-cached: keys carry a content hash,
// so a changed recording is a new key, never a rewrite.
//
// This mirrors workers/content/src/routes/assets.ts deliberately; the two are
// the same problem and should stay the same shape.

export function audioRoutes(router: Router<ArabicEnv>) {
  router.get('/ar/audio/:key+', async (req, env, params) => {
    const key = params.key;
    if (!key || key.includes('..')) return notFound('audio');

    const object = await env.AR_AUDIO.get(key);
    if (!object) return notFound(`audio ${key}`);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    if (!headers.has('cache-control')) headers.set('cache-control', 'public, max-age=86400');
    // Range support matters here in a way it does not for images: a player
    // seeking into a 40-minute lecture must not refetch the whole file.
    headers.set('accept-ranges', 'bytes');

    // Honour If-None-Match by hand — see the note in the content worker; handing
    // R2 the request headers as `onlyIf` returned null against the real bucket.
    if (req.headers.get('if-none-match') === object.httpEtag) {
      return new Response(null, { status: 304, headers });
    }
    return new Response(object.body, { status: 200, headers });
  });
}
