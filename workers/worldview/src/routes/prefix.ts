// ─── One route, both prefixes ─────────────────────────────────────────────────
//
// `/wv/*` and `/worldview/*` were never aliases of each other. They grew as two
// different route sets — traditions, nodes, positions and comparisons only ever
// answered on `/wv/`; counts, units, annotations, topics and illustrations only
// on `/worldview/` — with six endpoints dual by hand.
//
// The apps then picked one each: iOS calls `/api/wv/` exclusively and Angular
// calls `/api/worldview/` exclusively. So each app could reach only half of its
// own API, and neither could tell, because the missing half returned a plain
// 404 rather than anything that looked like a mistake.
//
// The gateway already forwards both (`modules.ts` maps `wv` and `worldview` to
// the same binding), so the split is entirely ours. `dual()` registers a path
// under both, from one declaration. New routes should use it; the older files
// keep their hand-written pairs until they are touched.

import type { Router, RouteHandler } from '../../../shared/src/router';
import type { WorldviewEnv } from '../env';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

/**
 * Register `path` — written WITHOUT a prefix, e.g. `'/domains/:slug'` — under
 * both `/wv` and `/worldview`.
 */
export function dual(
  router: Router<WorldviewEnv>,
  method: Method,
  path: string,
  handler: RouteHandler<WorldviewEnv>,
): void {
  router[method](`/wv${path}`, handler);
  router[method](`/worldview${path}`, handler);
}
