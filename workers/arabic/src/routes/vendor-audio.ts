import type { Router } from '../../../shared/src/router';
import { notFound, ok, unauthorized, internalError } from '../../../shared/src/response';
import type { ArabicEnv } from '../env';

// Publisher companion audio out of the km-arabic-vendor bucket — third-party
// recordings we hold under licence to one reader, not ours to hand out. That is
// the whole difference from routes/audio.ts, which serves our own recordings to
// anyone: this bucket has no anonymous door.
//
// The awkwardness is that AVPlayer and <audio> send no Authorization header, so
// "behind the token" cannot mean what it means everywhere else. Instead the
// token buys a signed URL, and the URL is what the player is given: unguessable,
// good for one key, and dead within the hour. The signature is over the key and
// the expiry together, so neither can be edited without invalidating it.
//
// Who the caller is was settled at the gateway: '/ar/vendor-audio' is absent
// from publicGetPaths, so an unauthenticated request never reaches this worker,
// and what does arrive carries X-KM-User-Id. This worker holds no JWT_SECRET —
// no domain worker does — so it verifies nothing and re-checks the header only
// as a second lock on the same door.

const TTL_SECONDS = 60 * 60;

function b64url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function signingKey(secret: string, usage: ('sign' | 'verify')[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, usage,
  );
}

export function vendorAudioRoutes(router: Router<ArabicEnv>) {

  // Behind the token: hand back a URL the player can actually use.
  router.get('/ar/vendor-audio/:key+', async (req, env, params) => {
    if (!req.headers.get('X-KM-User-Id')) return unauthorized('Valid Bearer token required');

    const key = params.key;
    if (!key || key.includes('..')) return notFound('audio');
    // A missing secret is a deployment fault, not a missing recording: say so
    // rather than reporting the audio absent.
    if (!env.VENDOR_URL_SECRET) return internalError('vendor signing key not configured');

    // Fail here rather than handing out a URL that 404s a second later.
    const head = await env.AR_VENDOR.head(key);
    if (!head) return notFound(`audio ${key}`);

    const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
    const mac = await crypto.subtle.sign(
      'HMAC',
      await signingKey(env.VENDOR_URL_SECRET, ['sign']),
      new TextEncoder().encode(`${key}:${exp}`),
    );

    const path = key.split('/').map(encodeURIComponent).join('/');
    return ok({
      url: `/ar/vendor-stream/${path}?exp=${exp}&sig=${b64url(mac)}`,
      expiresAt: new Date(exp * 1000).toISOString(),
      size: head.size,
    });
  });

  // Anonymous at the gateway — it has to be, the player carries no token — but
  // useless without a signature this worker minted.
  router.get('/ar/vendor-stream/:key+', async (req, env, params) => {
    const key = params.key;
    if (!key || key.includes('..')) return notFound('audio');
    if (!env.VENDOR_URL_SECRET) return internalError('vendor signing key not configured');

    const url = new URL(req.url);
    const exp = Number(url.searchParams.get('exp'));
    const sig = url.searchParams.get('sig');
    if (!sig || !Number.isFinite(exp)) return unauthorized('signed URL required');
    if (exp < Math.floor(Date.now() / 1000)) return unauthorized('signed URL expired');

    const valid = await crypto.subtle.verify(
      'HMAC',
      await signingKey(env.VENDOR_URL_SECRET, ['verify']),
      fromB64url(sig),
      new TextEncoder().encode(`${key}:${exp}`),
    );
    if (!valid) return unauthorized('signed URL invalid');

    // From here down this is routes/audio.ts: same problem, same shape. A
    // player seeking into a forty-minute lesson must not refetch the file.
    const rangeHeader = req.headers.get('range');
    const m = rangeHeader?.match(/^bytes=(\d*)-(\d*)$/);
    const range = m && (m[1] || m[2])
      ? (m[1]
          ? { offset: Number(m[1]), length: m[2] ? Number(m[2]) - Number(m[1]) + 1 : undefined }
          : { suffix: Number(m[2]) })
      : undefined;

    const object = await env.AR_VENDOR.get(key, range ? { range } : undefined);
    if (!object) return notFound(`audio ${key}`);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    // Private, and no longer than the signature lives: a shared cache must not
    // keep a copy that outlives the permission that fetched it.
    headers.set('cache-control', `private, max-age=${TTL_SECONDS}`);
    headers.set('accept-ranges', 'bytes');

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
