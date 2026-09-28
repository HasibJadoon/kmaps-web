import { queryOne, execute } from '../../shared/src/db';
import type { WorldviewEnv } from './env';

// ── Built responses, kept per version of the data behind them ─────────────────
// Many Worldview reads shape the same answer from the same rows every time: an
// arc's hub counts every passage of every phase; the timeline, the debates, the
// rhetoric cards join a dozen tables. The answer changes only when the data
// does, so it is built once per *version* of its family of tables and kept —
// in this isolate's memory, and in wv_atlas_cache (migration 009) for the next.
//
// A family's version is a cheap query (row counts, max rowid, max updated_at),
// plus the hour, as a floor for anything a version cannot see. Any write through
// this worker (POST/PATCH/PUT/DELETE) drops the reading families at once.
//
// Only answers that are the same for every reader are kept: the reader's own
// passages and backlinks (which mark a link "mine") are never cached.

export type Family = 'atlas' | 'corpus' | 'store';

const VERSION_SQL: Record<Family, string> = {
  atlas: `SELECT (SELECT count(*) || ':' || ifnull(max(updated_at), '') FROM wv_atlas) || '|' ||
                 (SELECT ifnull(max(updated_at), '') FROM wv_sources) || '|' ||
                 (SELECT count(*) FROM wv_term) AS v`,
  corpus: `SELECT (SELECT ifnull(max(rowid), 0) FROM wv_corpus_block) || '|' ||
                  (SELECT ifnull(max(rowid), 0) FROM wv_term_links) || '|' ||
                  (SELECT count(*) FROM wv_scriptural_corpora) || '|' ||
                  (SELECT ifnull(max(updated_at), '') FROM wv_sources) AS v`,
  store: `SELECT (SELECT ifnull(max(rowid), 0) FROM wv_timeline_events) || '|' ||
                 (SELECT count(*) || ':' || ifnull(max(rowid), 0) FROM wv_term) || '|' ||
                 (SELECT ifnull(max(rowid), 0) FROM wv_rhetoric_terms) || '|' ||
                 (SELECT ifnull(max(rowid), 0) FROM wv_rhetoric_usages) || '|' ||
                 (SELECT ifnull(max(rowid), 0) FROM wv_topics) || '|' ||
                 (SELECT ifnull(max(updated_at), '') FROM wv_sources) || '|' ||
                 (SELECT ifnull(max(rowid), 0) FROM wv_people) AS v`,
};

const MEM = new Map<string, { version: string; body: string }>();

async function version(env: WorldviewEnv, family: Family): Promise<string> {
  const v = await queryOne<{ v: string }>(env.DB_WV, VERSION_SQL[family]);
  return `${v?.v ?? ''}|${Math.floor(Date.now() / 3_600_000)}`;
}

/** A value built once per version of its family, as JSON text. */
export async function memoText(env: WorldviewEnv, family: Family, key: string, build: () => Promise<string>): Promise<string> {
  const k = `${family}:${key}`;
  const ver = await version(env, family);
  const mem = MEM.get(k);
  if (mem && mem.version === ver) return mem.body;
  try {
    const row = await queryOne<{ body: string }>(env.DB_WV,
      `SELECT body FROM wv_atlas_cache WHERE key = ? AND version = ?`, [k, ver]);
    if (row) { MEM.set(k, { version: ver, body: row.body }); return row.body; }
  } catch { /* no cache table: build */ }
  const body = await build();
  MEM.set(k, { version: ver, body });
  try {
    await execute(env.DB_WV,
      `INSERT OR REPLACE INTO wv_atlas_cache (key, version, body, built_at) VALUES (?, ?, ?, datetime('now'))`,
      [k, ver, body]);
  } catch { /* serving it matters more than keeping it */ }
  return body;
}

/** A value built once per version of its family. */
export async function memo<T>(env: WorldviewEnv, family: Family, key: string, build: () => Promise<T>): Promise<T> {
  return JSON.parse(await memoText(env, family, key, async () => JSON.stringify(await build()))) as T;
}

// Which GET paths are the same for every reader, and the family each reads.
const CACHEABLE: Array<[RegExp, Family]> = [
  [/^\/arcs$/, 'corpus'],
  [/^\/arcs\/[^/]+$/, 'corpus'],
  [/^\/arcs\/[^/]+\/phases\/[^/]+$/, 'corpus'],
  [/^\/arcs\/[^/]+\/phases\/[^/]+\/concepts$/, 'corpus'],
  [/^\/corpus\/blocks\/[^/]+\/voice$/, 'corpus'],
  [/^\/timeline(\/views|\/centuries)?$/, 'store'],
  [/^\/timeline\/[^/]+$/, 'store'],
  [/^\/debates$/, 'store'],
  [/^\/tradition-shelf$/, 'store'],
  [/^\/rhetoric\/(cards|terms|devices|facets)$/, 'store'],
  [/^\/rhetoric\/terms\/[^/]+(\/cards)?$/, 'store'],
  [/^\/terms(\/tree|\/kinds)?$/, 'store'],
  [/^\/domains(\/facets)?$/, 'store'],
  [/^\/people$/, 'store'],
  [/^\/concepts$/, 'store'],
  [/^\/graphs$/, 'store'],
  [/^\/maps$/, 'store'],
];

function route(url: URL): { family: Family; key: string } | null {
  const path = url.pathname.replace(/^\/(wv|worldview)(?=\/)/, '');
  const hit = CACHEABLE.find(([re]) => re.test(path));
  if (!hit) return null;
  const params = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  const qs = new URLSearchParams(params).toString();
  return { family: hit[1], key: qs ? `${path}?${qs}` : path };
}

/** Serve a request through the cache when it is a public read; drop the
 *  reading caches after any write. */
export async function withCache(
  request: Request, env: WorldviewEnv, handle: (r: Request) => Promise<Response>,
): Promise<Response> {
  if (request.method !== 'GET') {
    const res = await handle(request);
    if (res.ok && request.method !== 'OPTIONS') {
      for (const k of [...MEM.keys()]) if (k.startsWith('corpus:') || k.startsWith('store:')) MEM.delete(k);
      try { await execute(env.DB_WV, `DELETE FROM wv_atlas_cache WHERE key LIKE 'corpus:%' OR key LIKE 'store:%'`); } catch { /* none */ }
    }
    return res;
  }
  const r = route(new URL(request.url));
  if (!r) return handle(request);
  let status = 200;
  const body = await memoText(env, r.family, r.key, async () => {
    const res = await handle(request);
    status = res.status;
    const text = await res.text();
    if (!res.ok) throw Object.assign(new Error('uncacheable'), { res: new Response(text, { status: res.status, headers: res.headers }) });
    return text;
  }).catch((e) => { if (e?.res) return e.res as Response; throw e; });
  if (body instanceof Response) return body;
  return new Response(body, { status, headers: { 'content-type': 'application/json; charset=utf-8', 'x-wv-cache': 'kept' } });
}
