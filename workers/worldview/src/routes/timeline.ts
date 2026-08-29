// ─── Timeline ─────────────────────────────────────────────────────────────────
//
// Read access to wv_timeline_events.
//
// Until now this answered only "the events of one source" and returned 400
// otherwise, so a corpus-wide timeline could not be asked for at all — which is
// why there is no timeline screen outside a book reader. It now takes a year
// range, a tradition and an event type, and will return everything.
//
// WHAT THE DATA ACTUALLY SUPPORTS
//
// 66 events, all from one book's arc (Arjana, plus Orientalism), spanning
// 77–2010 CE. `tradition_id` and `location_id` are NULL on every single row, so
// those filters are offered but will match nothing until the corpus grows — the
// response says so rather than leaving a caller to infer it from an empty list.
//
// `wv_periods` is empty, so era bands come from the 13 rows that carry
// year_start/year_end rather than from a period registry.

import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { WorldviewEnv } from '../env';
import { TimelineRepo } from '../repositories/timeline.repo';
import { dual } from './prefix';

const COLS = `id, title, event_type, year_exact, year_start, year_end,
              is_approximate, century, location_id, tradition_id, person_id,
              description_md, significance, meta_json`;

/** The one year to place an event on: its exact year, else the start of its
 *  band. An event with neither cannot be plotted and is reported separately
 *  rather than silently dropped at year zero. */
const PLOT_YEAR = `COALESCE(year_exact, year_start)`;

interface EventRow {
  id: string;
  title: string;
  event_type: string | null;
  year_exact: number | null;
  year_start: number | null;
  year_end: number | null;
  century: string | number | null;
  tradition_id: string | null;
  [k: string]: unknown;
}

/** `century` holds integers on some rows and strings like "13th c." on others.
 *  Anything that reads it has to cope, so it is normalised once, here. */
function centuryOf(row: EventRow): number | null {
  const raw = row.century;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const m = raw.match(/\d+/);
    if (m) return Number(m[0]);
  }
  const year = row.year_exact ?? row.year_start;
  return year == null ? null : Math.floor((year - 1) / 100) + 1;
}

export function timelineRoutes(router: Router<WorldviewEnv>) {

  // GET /wv/timeline
  //   ?source_id= | ?unit_id=      the original per-source behaviour
  //   ?from=&to=                   year range
  //   ?tradition=&type=            facets
  //
  // With none of them: the whole corpus, in order.
  const list = async (req: Request, env: WorldviewEnv) => {
    const url = new URL(req.url);
    const unitId = url.searchParams.get('unit_id');
    const sourceId = url.searchParams.get('source_id');
    const repo = new TimelineRepo(env.DB_WV);
    if (unitId) return ok(await repo.byUnit(unitId));
    if (sourceId) return ok(await repo.bySource(sourceId));

    const conds: string[] = [];
    const params: unknown[] = [];
    // `Number(null)` is 0, not NaN — so reading these straight through
    // Number() filtered an unfiltered request to `year >= 0 AND year <= 0` and
    // returned nothing, while any explicit range worked fine. Check presence
    // first.
    const num = (key: string): number | null => {
      const raw = url.searchParams.get(key);
      if (raw === null || raw.trim() === '') return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    };
    const from = num('from');
    const to = num('to');
    const tradition = url.searchParams.get('tradition');
    const type = url.searchParams.get('type');
    if (from !== null) { conds.push(`${PLOT_YEAR} >= ?`); params.push(from); }
    if (to !== null) { conds.push(`${PLOT_YEAR} <= ?`); params.push(to); }
    if (tradition) { conds.push('tradition_id = ?'); params.push(tradition); }
    if (type) { conds.push('event_type = ?'); params.push(type); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const rows = await query<EventRow>(
      env.DB_WV,
      `SELECT ${COLS} FROM wv_timeline_events ${where}
        ORDER BY ${PLOT_YEAR} IS NULL, ${PLOT_YEAR}, id`,
      params,
    );

    const events = rows.map(r => ({
      ...r,
      century: centuryOf(r),
      year: r.year_exact ?? r.year_start ?? null,
      /** A band rather than a point — 13 of the 66 are eras, not incidents. */
      isBand: r.year_start != null && r.year_end != null && r.year_exact == null,
    }));
    const plotted = events.filter(e => e.year != null);

    return ok({
      events,
      span: plotted.length
        ? { from: plotted[0].year, to: Math.max(...plotted.map(e => Number(e.year))) }
        : null,
      // Facets counted from the rows that came back, so a client offers only
      // filters that can actually match. tradition_id is NULL on all 66 today,
      // and this reports that as an empty list rather than a filter that
      // silently finds nothing.
      facets: {
        eventTypes: countBy(events, e => e.event_type),
        traditions: countBy(events, e => e.tradition_id),
      },
      undated: events.length - plotted.length,
    });
  };

  dual(router, 'get', '/timeline', list);

  // GET /wv/timeline/views — the saved arcs. One exists: Orientalism 1798–2003.
  dual(router, 'get', '/timeline/views', async (_req, env) =>
    ok({
      views: await query<Record<string, unknown>>(
        env.DB_WV,
        `SELECT id, slug, title, timeline_theme, tradition_id, century_from,
                century_to, renderer_hint, event_ids_json, filter_json
           FROM wv_timeline_views ORDER BY title`,
      ),
    }));

  // GET /wv/timeline/centuries — wv_century_profiles, 5 rows, 17th–21st.
  dual(router, 'get', '/timeline/centuries', async (_req, env) =>
    ok({
      centuries: await query<Record<string, unknown>>(
        env.DB_WV,
        `SELECT * FROM wv_century_profiles ORDER BY century`,
      ),
    }));

  // Kept last: '/timeline/:id' would otherwise swallow '/timeline/views' and
  // '/timeline/centuries', since the router matches in registration order.
  dual(router, 'get', '/timeline/:id', async (_req, env, { id }) => {
    const row = await queryOne<EventRow>(
      env.DB_WV, `SELECT ${COLS} FROM wv_timeline_events WHERE id = ?`, [id],
    );
    return row ? ok({ ...row, century: centuryOf(row) }) : notFound(`timeline event ${id}`);
  });
}

function countBy<T>(rows: T[], pick: (row: T) => string | null | undefined) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = pick(row);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}
