import type { Router } from '../../../shared/src/router';
import { notFound } from '../../../shared/src/response';
import type { ContentEnv } from '../env';

// Public lesson media out of the kmaps-assets bucket — the photographs a deck
// slide sits on. Read-only and long-cached: objects are versioned by key, so a
// changed picture is a new key, never a rewrite.

export function assetRoutes(router: Router<ContentEnv>) {
  router.get('/cm/assets/:key+', async (req, env, params) => {
    const key = params.key;
    if (!key || key.includes('..')) return notFound('asset');

    const object = await env.KMAPS_ASSETS.get(key);
    if (!object) return notFound(`asset ${key}`);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    if (!headers.has('cache-control')) headers.set('cache-control', 'public, max-age=86400');

    // Honour If-None-Match by hand, so a repeat view costs a 304, not the bytes.
    // (Handing R2 the request headers as `onlyIf` returned null against the
    // real bucket for a key that exists; the local emulation did not.)
    if (req.headers.get('if-none-match') === object.httpEtag) {
      return new Response(null, { status: 304, headers });
    }
    return new Response(object.body, { status: 200, headers });
  });
}
