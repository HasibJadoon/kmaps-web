// ── Public reads, kept and served without asking D1 ───────────────────────────
// The D1 databases live in one region (ENAM); a reader half a world away pays
// ~200 ms for every query. A read that is the same for everyone is therefore
// built once and kept — in this isolate's memory, and in the edge cache of the
// data centre the reader is served from — and served from there.
//
// Each route has a *fresh* window. Inside it a kept answer is served as is.
// After it the kept answer is still served at once, and rebuilt behind the
// response (stale-while-revalidate), so a reader never waits on D1 for a page
// someone has opened before. Past `stale`, or on a first visit, the reader
// waits for the build.
//
// Authored rows written straight into D1 show after one read past their
// route's fresh window: the read that finds it stale starts the rebuild, the
// next one sees it. `?refresh=1` rebuilds at once.
//
// Every kept answer carries an ETag (a client that sends it back gets a 304)
// and its windows as Cache-Control: max-age=fresh, stale-while-revalidate=rest,
// so the app keeps the payload on the same terms.

export interface SwrClass {
  /** Seconds a kept answer is served without rebuilding. */
  fresh: number;
  /** Seconds past which a kept answer is not served at all (default a week). */
  stale?: number;
}

export interface SwrRoute extends SwrClass { re: RegExp }

interface Entry { body: string; status: number; type: string; built: number }

const MEM = new Map<string, Entry>();
let memSize = 0;
const MEM_CAP = 48 * 1024 * 1024;
const INFLIGHT = new Map<string, Promise<Entry | Response>>();
const WEEK = 7 * 86400;

function remember(k: string, e: Entry): void {
  const old = MEM.get(k);
  if (old) { memSize -= old.body.length; MEM.delete(k); }
  MEM.set(k, e);
  memSize += e.body.length;
  for (const [key, v] of MEM) {
    if (memSize <= MEM_CAP) break;
    MEM.delete(key); memSize -= v.body.length;
  }
}

const edge = (): Cache | null => { try { return (caches as unknown as { default: Cache }).default; } catch { return null; } };

async function edgeGet(url: string): Promise<Entry | null> {
  const c = edge(); if (!c) return null;
  try {
    const r = await c.match(url);
    if (!r) return null;
    return { body: await r.text(), status: r.status, type: r.headers.get('content-type') ?? 'application/json; charset=utf-8',
             built: Number(r.headers.get('x-built') ?? 0) };
  } catch { return null; }
}

function edgePut(ctx: ExecutionContext | undefined, url: string, e: Entry): void {
  const c = edge(); if (!c) return;
  const p = c.put(url, new Response(e.body, {
    status: e.status,
    headers: { 'content-type': e.type, 'cache-control': `public, max-age=${WEEK}`, 'x-built': String(e.built) },
  })).catch(() => { /* a miss next time, nothing worse */ });
  if (ctx) ctx.waitUntil(p);
}

function etag(key: string, e: Entry): string {
  const s = `${key}|${e.built}|${e.body.length}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return `W/"${(h >>> 0).toString(36)}${e.body.length.toString(36)}"`;
}

/** The cache key of a request: its path and sorted query, without refresh. */
function keyOf(url: URL): string {
  const params = [...url.searchParams.entries()].filter(([k]) => k !== 'refresh').sort(([a], [b]) => a.localeCompare(b));
  const qs = new URLSearchParams(params).toString();
  return `https://swr-cache.k-maps.com${url.pathname}${qs ? `?${qs}` : ''}`;
}

/**
 * Serve a GET through the kept-answer cache when a route in `routes` matches its
 * path; anything else goes straight to `handle`. Only 200s are kept.
 */
export async function withSwr(
  request: Request, ctx: ExecutionContext | undefined, routes: SwrRoute[],
  handle: (r: Request) => Promise<Response>, tag = 'x-swr-cache',
): Promise<Response> {
  if (request.method !== 'GET') return handle(request);
  const url = new URL(request.url);
  const route = routes.find((r) => r.re.test(url.pathname));
  if (!route) return handle(request);

  const key = keyOf(url);
  const refresh = url.searchParams.get('refresh') === '1';
  const now = Date.now();
  const fresh = route.fresh * 1000, stale = (route.stale ?? WEEK) * 1000;

  const build = (): Promise<Entry | Response> => {
    const running = INFLIGHT.get(key);
    if (running) return running;
    const p = (async () => {
      const res = await handle(request);
      if (res.status !== 200) return res;                 // not kept: served as it came
      const e: Entry = { body: await res.text(), status: 200,
                         type: res.headers.get('content-type') ?? 'application/json; charset=utf-8', built: Date.now() };
      remember(key, e); edgePut(ctx, key, e);
      return e;
    })().finally(() => INFLIGHT.delete(key));
    INFLIGHT.set(key, p);
    return p;
  };

  let layer = 'built';
  let kept: Entry | null = null;
  if (!refresh) {
    const mem = MEM.get(key) ?? null;
    kept = mem;
    layer = 'mem';
    if (!kept || now - kept.built >= fresh) {             // another isolate may have rebuilt it since
      const e = await edgeGet(key);
      if (e && (!kept || e.built > kept.built)) { kept = e; layer = 'edge'; remember(key, e); }
    }
    if (kept && now - kept.built >= stale) kept = null;
    if (kept && now - kept.built >= fresh) {
      if (ctx) { ctx.waitUntil(build().catch(() => { /* next reader retries */ })); layer = 'stale'; }
      else kept = null;
    }
  }
  if (!kept) {
    const out = await build();
    if (out instanceof Response) return out;
    kept = out; layer = 'built';
  }

  const tagv = etag(key, kept);
  // The client keeps the payload too, on the same windows: fresh for `fresh`,
  // then shown while it revalidates, until `stale`.
  const cc = `max-age=${route.fresh}, stale-while-revalidate=${Math.max(0, (route.stale ?? WEEK) - route.fresh)}`;
  const headers = { 'content-type': kept.type, etag: tagv, 'cache-control': cc, [tag]: layer };
  if (request.headers.get('if-none-match') === tagv) return new Response(null, { status: 304, headers });
  return new Response(kept.body, { status: kept.status, headers });
}
