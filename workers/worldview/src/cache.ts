import { queryOne, execute } from '../../shared/src/db';
import type { WorldviewEnv } from './env';

// ── Built responses, kept per version of the data behind them ─────────────────
// Many Worldview reads shape the same answer from the same rows every time: an
// arc's hub counts every passage of every phase; the timeline, the debates, the
// rhetoric cards join a dozen tables. The answer changes only when the data
// does, so it is built once per *version* of its family of tables and kept.
//
// D1 lives in one region (ENAM) and a reader may be half a world away, where
// every query is a ~200 ms round trip. So a kept answer is served without
// asking D1 at all, from three layers, nearest first:
//
//   1. this isolate's memory
//   2. the edge cache of this data centre (caches.default)
//   3. wv_atlas_cache in D1 (migration 009) — for a version already built
//
// An answer checked against its family's version in the last FRESH_MS is
// served as is. An older one is still served at once, and checked (and, if the
// data moved, rebuilt) in the background — stale-while-revalidate. Past
// STALE_MS the reader waits for a fresh one.
//
// A family's version is a cheap query (row counts, max rowid, max updated_at),
// plus the hour, as a floor for anything a version cannot see. A write through
// this worker (POST/PATCH/PUT/DELETE) moves the corpus and store families on at
// once: their epoch, kept in the edge cache, is part of every answer's
// freshness, so the writer's next read is never served from before the write.
//
// Only answers that are the same for every reader are kept whole. A reader's
// own marks ("mine") are laid on after, per request.

export type Family = 'atlas' | 'landing' | 'corpus' | 'store';

const VERSION_SQL: Record<Family, string> = {
  atlas: `SELECT (SELECT count(*) || ':' || ifnull(max(updated_at), '') FROM wv_atlas) || '|' ||
                 (SELECT ifnull(max(updated_at), '') FROM wv_sources) || '|' ||
                 (SELECT count(*) FROM wv_term) AS v`,
  // its own family, so the Atlas's version never depends on this table (migration 013)
  landing: `SELECT count(*) || ':' || ifnull(max(updated_at), '') AS v FROM wv_landing_atlas_item`,
  corpus: `SELECT (SELECT ifnull(max(rowid), 0) FROM wv_corpus_block) || '|' ||
                  (SELECT count(*) || ':' || ifnull(max(rowid), 0) FROM wv_term_links) || '|' ||
                  (SELECT count(*) || ':' || ifnull(max(rowid), 0) FROM wv_insight_suggestions) || '|' ||
                  (SELECT count(*) FROM wv_scriptural_corpora) || '|' ||
                  (SELECT ifnull(max(updated_at), '') FROM wv_sources) AS v`,
  store: `SELECT (SELECT ifnull(max(rowid), 0) FROM wv_timeline_events) || '|' ||
                 (SELECT count(*) || ':' || ifnull(max(rowid), 0) FROM wv_term) || '|' ||
                 (SELECT ifnull(max(rowid), 0) FROM wv_rhetoric_terms) || '|' ||
                 (SELECT ifnull(max(rowid), 0) FROM wv_rhetoric_usages) || '|' ||
                 (SELECT ifnull(max(rowid), 0) FROM wv_topics) || '|' ||
                 (SELECT ifnull(max(updated_at), '') FROM wv_sources) || '|' ||
                 (SELECT ifnull(max(rowid), 0) FROM wv_people) || '|' ||
                 (SELECT count(*) || ':' || ifnull(max(rowid), 0) FROM wv_nodes) || '|' ||
                 (SELECT count(*) || ':' || ifnull(max(rowid), 0) FROM wv_node_edges) || '|' ||
                 (SELECT ifnull(max(rowid), 0) FROM wv_map_features) || '|' ||
                 (SELECT count(*) || ':' || ifnull(max(rowid), 0) FROM wv_traditions) || '|' ||
                 (SELECT ifnull(max(rowid), 0) FROM wv_domains) AS v`,
};

const FRESH_MS = 60_000;               // served without asking D1
const STALE_MS = 24 * 3_600_000;       // served at once, checked behind
const MEM_CAP = 48 * 1024 * 1024;      // characters of kept bodies per isolate
const EDGE = 'https://wv-cache.k-maps.com/';

interface Entry { version: string; body: string; checked: number }

const MEM = new Map<string, Entry>();
let memSize = 0;
const INFLIGHT = new Map<string, Promise<string>>();

function remember(k: string, e: Entry): void {
  const old = MEM.get(k);
  if (old) { memSize -= old.body.length; MEM.delete(k); }
  MEM.set(k, e);                        // re-inserted last: the map is oldest-first
  memSize += e.body.length;
  for (const [key, v] of MEM) {
    if (memSize <= MEM_CAP) break;
    MEM.delete(key); memSize -= v.body.length;
  }
}

function forget(prefixes: string[]): void {
  for (const [k, v] of MEM) if (prefixes.some((p) => k.startsWith(p))) { MEM.delete(k); memSize -= v.body.length; }
}

// ── the edge cache (per data centre) ─────────────────────────────────────────
const edgeUrl = (k: string) => EDGE + encodeURIComponent(k);
const edge = (): Cache | null => { try { return (caches as unknown as { default: Cache }).default; } catch { return null; } };

async function edgeGet(k: string): Promise<Entry | null> {
  const c = edge(); if (!c) return null;
  try {
    const r = await c.match(edgeUrl(k));
    if (!r) return null;
    return { version: r.headers.get('x-v') ?? '', checked: Number(r.headers.get('x-checked') ?? 0), body: await r.text() };
  } catch { return null; }
}

function edgePut(env: WorldviewEnv, k: string, e: Entry): void {
  const c = edge(); if (!c) return;
  const p = c.put(edgeUrl(k), new Response(e.body, {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=604800',
               'x-v': e.version, 'x-checked': String(e.checked) },
  })).catch(() => { /* a miss next time, nothing worse */ });
  if (env.CTX) env.CTX.waitUntil(p);
}

// When a family was last written through this worker, in this data centre.
async function epoch(family: Family): Promise<number> {
  if (family === 'atlas' || family === 'landing') return 0;     // written by script/migration, straight to D1
  const c = edge(); if (!c) return 0;
  try {
    const r = await c.match(edgeUrl(`epoch:${family}`));
    return r ? Number(await r.text()) : 0;
  } catch { return 0; }
}

async function version(env: WorldviewEnv, family: Family): Promise<string> {
  const v = await queryOne<{ v: string }>(env.DB_WV, VERSION_SQL[family]);
  return `${v?.v ?? ''}|${Math.floor(Date.now() / 3_600_000)}`;
}

/** Check a kept answer against its family's version; rebuild it if the data moved. */
function refresh(env: WorldviewEnv, family: Family, k: string, kept: Entry | null, build: () => Promise<string>,
                 seen?: { layer?: Layer }): Promise<string> {
  const running = INFLIGHT.get(k);
  if (running) return running;
  const p = (async () => {
    const ver = await version(env, family);
    const now = Date.now();
    if (kept && kept.version === ver) {
      if (seen) seen.layer = 'd1';
      const e = { ...kept, checked: now };
      remember(k, e); edgePut(env, k, e);
      return e.body;
    }
    let body: string | null = null;
    try {
      const row = await queryOne<{ body: string }>(env.DB_WV,
        `SELECT body FROM wv_atlas_cache WHERE key = ? AND version = ?`, [k, ver]);
      body = row?.body ?? null;
      if (body !== null && seen) seen.layer = 'd1';
    } catch { /* no cache table: build */ }
    if (body === null) {
      if (seen) seen.layer = 'built';
      body = await build();
      const write = execute(env.DB_WV,
        `INSERT OR REPLACE INTO wv_atlas_cache (key, version, body, built_at) VALUES (?, ?, ?, datetime('now'))`,
        [k, ver, body]).catch(() => { /* serving it matters more than keeping it */ });
      if (env.CTX) env.CTX.waitUntil(write); else await write;
    }
    const e = { version: ver, body, checked: now };
    remember(k, e); edgePut(env, k, e);
    return body;
  })().finally(() => INFLIGHT.delete(k));
  INFLIGHT.set(k, p);
  return p;
}

/** Which layer answered the last memoText call on this request's env. */
export type Layer = 'mem' | 'edge' | 'stale' | 'd1' | 'built';

/** A value built once per version of its family, as JSON text. */
export async function memoText(env: WorldviewEnv, family: Family, key: string, build: () => Promise<string>,
                               seen?: { layer?: Layer }): Promise<string> {
  const k = `${family}:${key}`;
  const [wrote, mem] = await Promise.all([epoch(family), Promise.resolve(MEM.get(k))]);
  let kept = mem ?? null;
  let fromEdge = false;
  if (!kept || Date.now() - kept.checked >= FRESH_MS) {      // another isolate may have checked it since
    const e = await edgeGet(k);
    if (e && (!kept || e.checked > kept.checked)) { kept = e; fromEdge = true; }
  }
  if (kept && kept.checked <= wrote) kept = null;             // from before a write: not to be served
  if (kept) {
    if (fromEdge) remember(k, kept);
    const age = Date.now() - kept.checked;
    if (age < FRESH_MS) { if (seen) seen.layer = fromEdge ? 'edge' : 'mem'; return kept.body; }
    if (age < STALE_MS && env.CTX) {
      env.CTX.waitUntil(refresh(env, family, k, kept, build).catch(() => { /* next reader retries */ }));
      if (seen) seen.layer = 'stale';
      return kept.body;
    }
  }
  return refresh(env, family, k, kept, build, seen);
}

/** A value built once per version of its family. */
export async function memo<T>(env: WorldviewEnv, family: Family, key: string, build: () => Promise<T>): Promise<T> {
  return JSON.parse(await memoText(env, family, key, async () => JSON.stringify(await build()))) as T;
}

// Which GET paths are the same for every reader, and the family each reads.
const CACHEABLE: Array<[RegExp, Family]> = [
  [/^\/atlas(\/home|\/room|\/shelf|\/detail|\/search|\/centuries|\/century|\/fields)?$/, 'atlas'],
  [/^\/landing-atlas$/, 'landing'],
  [/^\/arcs$/, 'corpus'],
  [/^\/arcs\/[^/]+$/, 'corpus'],
  [/^\/arcs\/[^/]+\/phases\/[^/]+$/, 'corpus'],
  [/^\/arcs\/[^/]+\/phases\/[^/]+\/(concepts|review)$/, 'corpus'],
  [/^\/corpus\/blocks\/[^/]+\/voice$/, 'corpus'],
  [/^\/search$/, 'corpus'],
  [/^\/timeline(\/views|\/centuries)?$/, 'store'],
  [/^\/timeline\/[^/]+$/, 'store'],
  [/^\/debates$/, 'store'],
  [/^\/tradition-shelf$/, 'store'],
  [/^\/rhetoric\/(cards|terms|devices|facets)$/, 'store'],
  [/^\/rhetoric\/terms\/[^/]+(\/cards)?$/, 'store'],
  [/^\/terms(\/tree|\/kinds)?$/, 'store'],
  [/^\/terms\/[^/]+$/, 'store'],
  [/^\/domains(\/facets)?$/, 'store'],
  [/^\/domains\/[^/]+$/, 'store'],
  [/^\/people$/, 'store'],
  [/^\/people\/[^/]+$/, 'store'],
  [/^\/concepts$/, 'store'],
  [/^\/graphs$/, 'store'],
  [/^\/graphs\/[^/]+$/, 'store'],
  [/^\/clusters(\/[^/]+)?$/, 'store'],
  [/^\/maps$/, 'store'],
  [/^\/maps\/[^/]+$/, 'store'],
  [/^\/sources$/, 'store'],
  [/^\/sources\/[^/]+(\/units)?$/, 'store'],
  [/^\/traditions$/, 'store'],
  [/^\/traditions\/[^/]+$/, 'store'],
  [/^\/authors(\/[^/]+)?$/, 'store'],
];

function route(url: URL): { family: Family; key: string } | null {
  const path = url.pathname.replace(/^\/(wv|worldview)(?=\/)/, '');
  const hit = CACHEABLE.find(([re]) => re.test(path));
  if (!hit) return null;
  const params = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  const qs = new URLSearchParams(params).toString();
  return { family: hit[1], key: qs ? `${path}?${qs}` : path };
}

// A short, stable tag for an answer: FNV-1a over the key and the body's length
// and ends — enough to tell two versions of one answer apart.
function etag(key: string, body: string): string {
  const s = `${key}|${body.length}|${body.slice(0, 256)}|${body.slice(-256)}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return `W/"${(h >>> 0).toString(36)}${body.length.toString(36)}"`;
}

/** Serve a request through the cache when it is a public read; move the
 *  reading families on after any write. */
export async function withCache(
  request: Request, env: WorldviewEnv, handle: (r: Request) => Promise<Response>,
): Promise<Response> {
  if (request.method !== 'GET') {
    const res = await handle(request);
    if (res.ok && request.method !== 'OPTIONS') {
      forget(['corpus:', 'store:']);
      const c = edge();
      const now = String(Date.now());
      const marks = c ? ['corpus', 'store'].map((f) => c.put(edgeUrl(`epoch:${f}`),
        new Response(now, { headers: { 'cache-control': 'public, max-age=604800' } })).catch(() => {})) : [];
      await Promise.all(marks);
      const drop = execute(env.DB_WV, `DELETE FROM wv_atlas_cache WHERE key LIKE 'corpus:%' OR key LIKE 'store:%'`).catch(() => {});
      if (env.CTX) env.CTX.waitUntil(drop); else await drop;
    }
    return res;
  }
  const r = route(new URL(request.url));
  if (!r) return handle(request);
  let status = 200;
  const seen: { layer?: Layer } = {};
  const body = await memoText(env, r.family, r.key, async () => {
    const res = await handle(request);
    status = res.status;
    const text = await res.text();
    if (!res.ok) throw Object.assign(new Error('uncacheable'), { res: new Response(text, { status: res.status, headers: res.headers }) });
    return text;
  }, seen).catch((e) => { if (e?.res) return e.res as Response; throw e; });
  if (body instanceof Response) return body;
  const tag = etag(r.key, body);
  const headers = { 'content-type': 'application/json; charset=utf-8', 'x-wv-cache': seen.layer ?? 'kept', etag: tag,
                    // the app keeps the payload on the same terms: fresh a minute,
                    // then shown while it revalidates, for up to a day
                    'x-kmaps-cache-control': `max-age=${FRESH_MS / 1000}, stale-while-revalidate=${(STALE_MS - FRESH_MS) / 1000}`,
                    'cache-control': 'no-cache' };   // browsers revalidate each time (ETag → 304)
  if (request.headers.get('if-none-match') === tag) return new Response(null, { status: 304, headers });
  return new Response(body, { status, headers });
}
