// ─── LogRepo — read side of the two personal logs ─────────────────────────────
// `core_daily_log` records events (one row per thing done on a day) and
// `core_source_log` records resources (one row per book, corpus or site read or
// wanted). Both are written from SQL, not from the app: the app's activity
// screen is a viewer, so this repository is read-only by design and exposes no
// insert or update path.
//
// Scoping matches `core_study_session`: `user_ref` comes from the JWT and is
// never accepted from the client. Reads use `(user_ref = ? OR user_ref IS NULL)`
// because the 69 seeded source rows describe the corpus rather than a person —
// they are shared reference data with no owner.

import { query } from '../../../shared/src/db';

/** Rows where user_ref is null are shared reference data, visible to everyone. */
const MINE = '(user_ref = ? OR user_ref IS NULL)';

export interface DailyLogRow {
  id: string;
  log_date: string;
  project: string;
  focus: string;
  unit_kind: string | null;
  unit_ref: string | null;
  source_slug: string | null;
  whats_new: string;
  state: string;
  next_step: string | null;
  already_checked: string | null;
  minutes: number | null;
  energy: number | null;
  felt: string | null;
  session_url: string | null;
  created_at: string;
}

export interface SourceLogRow {
  id: string;
  title: string;
  author: string | null;
  domain: string;
  source_kind: string | null;
  source_slug: string | null;
  locator: string | null;
  registered_in: string;
  explore_state: string;
  priority: number | null;
  why: string | null;
  found_what: string | null;
  verdict: string | null;
  first_seen: string;
  last_touched: string | null;
}

export interface FocusTally { focus: string; entries: number; minutes: number; energy: number | null }
export interface DomainTally { domain: string; explore_state: string; n: number }
export interface LoopRow { unit_ref: string; days: number; first_day: string; last_day: string; latest: string }
export interface OpenThread { id: string; log_date: string; project: string; state: string; next_step: string }

const DAILY_COLS =
  'id, log_date, project, focus, unit_kind, unit_ref, source_slug, whats_new, state, ' +
  'next_step, already_checked, minutes, energy, felt, session_url, created_at';

const SOURCE_COLS =
  'id, title, author, domain, source_kind, source_slug, locator, registered_in, ' +
  'explore_state, priority, why, found_what, verdict, first_seen, last_touched';

export class LogRepo {
  constructor(private db: D1Database) {}

  // ── daily log ──────────────────────────────────────────────────────────────

  /** Recent entries, newest first. */
  recent(userRef: string, days: number, limit: number): Promise<DailyLogRow[]> {
    return query<DailyLogRow>(
      this.db,
      `SELECT ${DAILY_COLS} FROM core_daily_log
       WHERE ${MINE} AND log_date >= date('now', ?)
       ORDER BY log_date DESC, created_at DESC
       LIMIT ?`,
      [userRef, `-${days} days`, limit],
    );
  }

  /** Every prior row for one unit — the "have I done this before?" check. */
  history(userRef: string, unitRef: string): Promise<DailyLogRow[]> {
    return query<DailyLogRow>(
      this.db,
      `SELECT ${DAILY_COLS} FROM core_daily_log
       WHERE ${MINE} AND unit_ref = ?
       ORDER BY log_date DESC, created_at DESC`,
      [userRef, unitRef],
    );
  }

  /**
   * Units touched on more than one distinct day. Same-day rows are one sitting,
   * not a loop; a return visit weeks later is the thing worth surfacing. The
   * `latest` correlate carries the most recent note so the row explains itself
   * without a second request.
   */
  loops(userRef: string, limit: number): Promise<LoopRow[]> {
    return query<LoopRow>(
      this.db,
      `SELECT o.unit_ref                    AS unit_ref,
              COUNT(DISTINCT o.log_date)    AS days,
              MIN(o.log_date)               AS first_day,
              MAX(o.log_date)               AS last_day,
              (SELECT i.whats_new FROM core_daily_log i
                WHERE i.unit_ref = o.unit_ref
                  AND (i.user_ref = ? OR i.user_ref IS NULL)
                ORDER BY i.log_date DESC, i.created_at DESC LIMIT 1) AS latest
       FROM core_daily_log o
       WHERE (o.user_ref = ? OR o.user_ref IS NULL) AND o.unit_ref IS NOT NULL
       GROUP BY o.unit_ref
       HAVING days > 1
       ORDER BY days DESC, last_day DESC
       LIMIT ?`,
      [userRef, userRef, limit],
    );
  }

  /** What was promised and not closed. */
  openThreads(userRef: string, limit: number): Promise<OpenThread[]> {
    return query<OpenThread>(
      this.db,
      `SELECT id, log_date, project, state, next_step FROM core_daily_log
       WHERE ${MINE} AND next_step IS NOT NULL
         AND state IN ('partial','blocked','exploring')
       ORDER BY log_date DESC LIMIT ?`,
      [userRef, limit],
    );
  }

  /** Where the time actually went, by lane. */
  focusTally(userRef: string, days: number): Promise<FocusTally[]> {
    return query<FocusTally>(
      this.db,
      `SELECT focus,
              COUNT(*)                  AS entries,
              COALESCE(SUM(minutes), 0) AS minutes,
              ROUND(AVG(energy), 1)     AS energy
       FROM core_daily_log
       WHERE ${MINE} AND log_date >= date('now', ?)
       GROUP BY focus ORDER BY entries DESC`,
      [userRef, `-${days} days`],
    );
  }

  /** Distinct days logged in the window, newest first — the streak input. */
  async loggedDays(userRef: string, days: number): Promise<string[]> {
    const rows = await query<{ log_date: string }>(
      this.db,
      `SELECT DISTINCT log_date FROM core_daily_log
       WHERE ${MINE} AND log_date >= date('now', ?)
       ORDER BY log_date DESC`,
      [userRef, `-${days} days`],
    );
    return rows.map((r) => r.log_date);
  }

  // ── source log ─────────────────────────────────────────────────────────────

  sources(userRef: string, state: string | null, domain: string | null, limit: number): Promise<SourceLogRow[]> {
    const where = [MINE];
    const args: unknown[] = [userRef];
    if (state)  { where.push('explore_state = ?'); args.push(state); }
    if (domain) { where.push('domain = ?');        args.push(domain); }
    args.push(limit);
    return query<SourceLogRow>(
      this.db,
      `SELECT ${SOURCE_COLS} FROM core_source_log
       WHERE ${where.join(' AND ')}
       ORDER BY COALESCE(priority, 0) DESC, first_seen DESC
       LIMIT ?`,
      args,
    );
  }

  sourceTally(userRef: string): Promise<DomainTally[]> {
    return query<DomainTally>(
      this.db,
      `SELECT domain, explore_state, COUNT(*) AS n FROM core_source_log
       WHERE ${MINE} GROUP BY domain, explore_state ORDER BY domain, n DESC`,
      [userRef],
    );
  }

  /** Read and worth keeping, but in no registry — the ingest backlog. */
  unregistered(userRef: string, limit: number): Promise<SourceLogRow[]> {
    return query<SourceLogRow>(
      this.db,
      `SELECT ${SOURCE_COLS} FROM core_source_log
       WHERE ${MINE} AND registered_in = 'none'
         AND explore_state IN ('explored','exploring')
       ORDER BY COALESCE(priority, 0) DESC, first_seen DESC LIMIT ?`,
      [userRef, limit],
    );
  }
}
