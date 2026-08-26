// ─── /core/logs/* — the activity log, read-only ───────────────────────────────
// The app surface over `core_daily_log` and `core_source_log`. Both tables are
// written from SQL; nothing here writes, so there is no POST, PATCH or DELETE.
// A viewer that cannot write cannot corrupt the record it exists to show.
//
// `/core/logs/overview` answers the whole activity screen in one request. The
// screen is opened to check "what have I been doing, and am I about to repeat
// myself", and that question needs six queries; making the phone issue six
// round-trips to render one view would show a skeleton for most of them.

import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import type { CoreEnv } from '../env';
import { LogRepo } from '../repositories/log.repo';

const EXPLORE_STATES = new Set(['want', 'exploring', 'explored', 'parked', 'rejected']);
const DOMAINS = new Set(['arabic', 'quran', 'worldview', 'other']);

const str = (v: string | null): string | null => (v && v.trim() ? v.trim() : null);

/** Clamp a query-string integer into a sane range. */
function int(raw: string | null, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

/**
 * Consecutive days ending today or yesterday. Yesterday still counts as alive:
 * a streak that breaks at midnight punishes the clock rather than the habit,
 * and this log exists to be encouraging enough to keep being written.
 */
function streak(days: string[], today: string, yesterday: string): number {
  if (!days.length) return 0;
  if (days[0] !== today && days[0] !== yesterday) return 0;

  let count = 1;
  let cursor = new Date(`${days[0]}T00:00:00Z`);
  for (const day of days.slice(1)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (day !== cursor.toISOString().slice(0, 10)) break;
    count += 1;
  }
  return count;
}

export function logRoutes(router: Router<CoreEnv>) {

  // GET /core/logs/overview?days=14 — everything the activity screen renders.
  router.get('/core/logs/overview', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    const url = new URL(req.url);
    const days = int(url.searchParams.get('days'), 14, 1, 365);
    const repo = new LogRepo(env.DB_CORE);

    const [entries, focus, logged, loops, threads, sourceTally, backlog] = await Promise.all([
      repo.recent(ctx.userId, days, 60),
      repo.focusTally(ctx.userId, days),
      repo.loggedDays(ctx.userId, 400),
      repo.loops(ctx.userId, 20),
      repo.openThreads(ctx.userId, 20),
      repo.sourceTally(ctx.userId),
      repo.unregistered(ctx.userId, 20),
    ]);

    // `logged` reaches back 400 days so the streak can run past the window the
    // screen shows; the window counters filter it back down to `days`.
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const cutoff = new Date(now);
    cutoff.setUTCDate(cutoff.getUTCDate() - days);
    const since = cutoff.toISOString().slice(0, 10);
    now.setUTCDate(now.getUTCDate() - 1);
    const yesterday = now.toISOString().slice(0, 10);

    return ok({
      window_days: days,
      today,
      since,
      streak: streak(logged, today, yesterday),
      totals: {
        entries: entries.length,
        minutes: focus.reduce((sum, f) => sum + (f.minutes ?? 0), 0),
        days_logged: logged.filter((d) => d >= since).length,
        loops: loops.length,
        open_threads: threads.length,
        unregistered_sources: backlog.length,
      },
      focus,
      entries,
      loops,
      open_threads: threads,
      source_tally: sourceTally,
      unregistered_sources: backlog,
    });
  });

  // GET /core/logs/activity?days=30 — the diary on its own, for paging deeper.
  router.get('/core/logs/activity', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    const url = new URL(req.url);
    const days  = int(url.searchParams.get('days'), 30, 1, 365);
    const limit = int(url.searchParams.get('limit'), 100, 1, 500);

    const entries = await new LogRepo(env.DB_CORE).recent(ctx.userId, days, limit);
    return ok({ window_days: days, count: entries.length, entries });
  });

  // GET /core/logs/unit/:ref — the pre-flight check for one unit.
  router.get('/core/logs/unit/:ref', async (req, env, { ref }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    const unitRef = decodeURIComponent(ref);
    if (!unitRef.trim()) return badRequest('a unit ref is required');

    const entries = await new LogRepo(env.DB_CORE).history(ctx.userId, unitRef);
    return ok({
      unit_ref: unitRef,
      touched: entries.length,
      days: new Set(entries.map((e) => e.log_date)).size,
      entries,
    });
  });

  // GET /core/logs/sources?state=want&domain=quran
  router.get('/core/logs/sources', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    const url = new URL(req.url);
    const state  = str(url.searchParams.get('state'));
    const domain = str(url.searchParams.get('domain'));
    if (state && !EXPLORE_STATES.has(state)) {
      return badRequest(`state must be one of ${[...EXPLORE_STATES].join(', ')}`);
    }
    if (domain && !DOMAINS.has(domain)) {
      return badRequest(`domain must be one of ${[...DOMAINS].join(', ')}`);
    }
    const limit = int(url.searchParams.get('limit'), 200, 1, 500);

    const repo = new LogRepo(env.DB_CORE);
    const [sources, tally] = await Promise.all([
      repo.sources(ctx.userId, state, domain, limit),
      repo.sourceTally(ctx.userId),
    ]);

    return ok({ filter: { state, domain }, count: sources.length, tally, sources });
  });
}
