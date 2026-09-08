import type { Router } from '../../../shared/src/router';
import { notFound } from '../../../shared/src/response';
import type { WorldviewEnv } from '../env';

// Recitation audio out of the km-worldview-audio bucket — the voice a poem is
// read against. Read-only and long-cached: keys carry a content hash, so a
// changed recording is a new key, never a rewrite.
//
// This mirrors workers/arabic/src/routes/audio.ts deliberately; they are the
// same problem and should stay the same shape. Range matters just as much: the
// poetry view seeks to the couplet you tap, and that must not refetch the file.

export function audioRoutes(router: Router<WorldviewEnv>) {
  router.get('/wv/audio/:key+', async (req, env, params) => {
    const key = params.key;
    if (!key || key.includes('..')) return notFound('audio');

    // Range support matters here in a way it does not for images: a player
    // seeking into a 40-minute lecture must not refetch the whole file, and
    // "back a line" in the reader is a seek. R2 serves the byte range itself.
    const rangeHeader = req.headers.get('range');
    const m = rangeHeader?.match(/^bytes=(\d*)-(\d*)$/);
    const range = m && (m[1] || m[2])
      ? (m[1]
          ? { offset: Number(m[1]), length: m[2] ? Number(m[2]) - Number(m[1]) + 1 : undefined }
          : { suffix: Number(m[2]) })
      : undefined;

    const object = await env.WV_AUDIO.get(key, range ? { range } : undefined);
    if (!object) return notFound(`audio ${key}`);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    if (!headers.has('cache-control')) headers.set('cache-control', 'public, max-age=86400');
    headers.set('accept-ranges', 'bytes');

    // Honour If-None-Match by hand — see the note in the content worker; handing
    // R2 the request headers as `onlyIf` returned null against the real bucket.
    if (req.headers.get('if-none-match') === object.httpEtag) {
      return new Response(null, { status: 304, headers });
    }
    if (range && object.range && 'offset' in object.range) {
      const start = object.range.offset ?? 0;
      const length = object.range.length ?? object.size - start;
      headers.set('content-range', `bytes ${start}-${start + length - 1}/${object.size}`);
      headers.set('content-length', String(length));
      return new Response(object.body, { status: 206, headers });
    }
    return new Response(object.body, { status: 200, headers });
  });
}
