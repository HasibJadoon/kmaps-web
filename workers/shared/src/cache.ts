// ─── Edge cache helper ──────────────────────────────────────────────────────
// Wraps a Worker route handler so its response is served from Cloudflare's
// Cache API for `maxAgeSec` seconds. Use this for read-mostly aggregate
// endpoints (source listings, catalog totals) that hammer D1 with full-scan
// queries every call. The data only changes on ingest; a few minutes of
// staleness is acceptable in exchange for ~7× faster TTFB.
//
// The cache key is the full request URL, so different query strings get
// independent cache entries.
//
// Every cached response also carries a strong `ETag` over its body, and a
// conditional request that already holds that tag gets a bodyless 304. This is
// what lets the iOS store revalidate a 174 KB sentence-structure payload for
// the cost of the headers instead of refetching it.

export interface CachedOptions {
  /** Browser-side TTL in seconds. Default 60. */
  browser?: number;
  /** Cloudflare edge TTL in seconds. Default 600 (10 min). */
  edge?: number;
}

/** FNV-1a over the body bytes — a content hash, not a security digest. */
function etagOf(body: ArrayBuffer): string {
  const bytes = new Uint8Array(body);
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `"${h.toString(16)}-${bytes.length.toString(16)}"`;
}

/** A conditional request matches if any tag in `If-None-Match` is ours, or `*`. */
function matchesEtag(header: string | null, etag: string): boolean {
  if (!header) return false;
  if (header.trim() === '*') return true;
  return header
    .split(',')
    .map((t) => t.trim().replace(/^W\//, ''))
    .includes(etag);
}

/** 304s carry no body, and only the headers that describe the entity. */
function notModified(headers: Headers): Response {
  const keep = new Headers();
  for (const h of ['ETag', 'Cache-Control', 'Last-Modified', 'Vary']) {
    const v = headers.get(h);
    if (v) keep.set(h, v);
  }
  return new Response(null, { status: 304, headers: keep });
}

/**
 * Run `build()` only if the request URL isn't already in the Workers cache.
 * The built Response gets a `Cache-Control: public, max-age=…, s-maxage=…`
 * header and an `ETag`, and is stored for future requests.
 *
 * Honours a `?refresh=1` query param: bypasses the cache and re-runs the
 * build, replacing the stored entry. Useful after an ingestion run.
 */
export async function cached(
  req: Request,
  build: () => Promise<Response>,
  opts: CachedOptions = {},
): Promise<Response> {
  const browser = opts.browser ?? 60;
  const edge    = opts.edge ?? 600;

  const url = new URL(req.url);
  const refresh = url.searchParams.get('refresh') === '1';

  // Strip `refresh` from the cache key so the cached entry remains
  // reachable after a forced rebuild.
  url.searchParams.delete('refresh');
  const cacheKey = new Request(url.toString(), { method: 'GET' });

  const cache = (caches as unknown as { default: Cache }).default;
  const inm = req.headers.get('If-None-Match');

  if (!refresh) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      const tag = hit.headers.get('ETag');
      if (tag && matchesEtag(inm, tag)) return notModified(hit.headers);
      return hit;
    }
  }

  const response = await build();
  // Only cache 2xx responses. Errors should remain transient.
  if (response.ok) {
    // Buffer once: the ETag is over the bytes, and both the stored copy and
    // the returned one are built from the same buffer.
    const body = await response.arrayBuffer();
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', `public, max-age=${browser}, s-maxage=${edge}`);
    headers.set('ETag', etagOf(body));

    const cacheable = new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    // Clone before putting — the cached copy needs its own readable stream.
    await cache.put(cacheKey, cacheable.clone());

    // A refresh still answers 304 when the rebuilt body is byte-identical to
    // what the caller already holds; nothing changed, so nothing needs sending.
    if (matchesEtag(inm, headers.get('ETag')!)) return notModified(headers);
    return cacheable;
  }
  return response;
}
