export interface CachedOptions {

  browser?: number;

  edge?: number;
}

function etagOf(body: ArrayBuffer): string {
  const bytes = new Uint8Array(body);
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i]!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `"${h.toString(16)}-${bytes.length.toString(16)}"`;
}

function matchesEtag(header: string | null, etag: string): boolean {
  if (!header) return false;
  if (header.trim() === '*') return true;
  return header
    .split(',')
    .map((t) => t.trim().replace(/^W\//, ''))
    .includes(etag);
}

function notModified(headers: Headers): Response {
  const keep = new Headers();
  for (const h of ['ETag', 'Cache-Control', 'Last-Modified', 'Vary']) {
    const v = headers.get(h);
    if (v) keep.set(h, v);
  }
  return new Response(null, { status: 304, headers: keep });
}

export async function cached(
  req: Request,
  build: () => Promise<Response>,
  opts: CachedOptions = {},
): Promise<Response> {
  const browser = opts.browser ?? 60;
  const edge    = opts.edge ?? 600;

  const url = new URL(req.url);
  const refresh = url.searchParams.get('refresh') === '1';

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

  if (response.ok) {

    const body = await response.arrayBuffer();
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', `public, max-age=${browser}, s-maxage=${edge}`);
    headers.set('ETag', etagOf(body));

    const cacheable = new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

    await cache.put(cacheKey, cacheable.clone());

    if (matchesEtag(inm, headers.get('ETag')!)) return notModified(headers);
    return cacheable;
  }
  return response;
}
