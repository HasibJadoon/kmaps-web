import type { Router } from '../../../shared/src/router';
import { ok, notFound } from '../../../shared/src/response';
import { query, queryOne } from '../../../shared/src/db';
import type { WorldviewEnv } from '../env';
import { TimelineRepo } from '../repositories/timeline.repo';
import { dual } from './prefix';

const COLS = `id, title, event_type, year_exact, year_start, year_end,
              is_approximate, century, location_id, tradition_id, person_id,
              description_md, significance, meta_json`;

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

  const list = async (req: Request, env: WorldviewEnv) => {
    const url = new URL(req.url);
    const unitId = url.searchParams.get('unit_id');
    const sourceId = url.searchParams.get('source_id');
    const repo = new TimelineRepo(env.DB_WV);
    if (unitId) return ok(await repo.byUnit(unitId));
    if (sourceId) return ok(await repo.bySource(sourceId));

    const conds: string[] = [];
    const params: unknown[] = [];

    const num = (key: string): number | null => {
      const raw = url.searchParams.get(key);
      if (raw === null || raw.trim() === '') return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    };
    let from = num('from');
    let to = num('to');
    const tradition = url.searchParams.get('tradition');
    let type = url.searchParams.get('type');

    // ?view=<id>: one named timeline, cut here — its own events, or its filter —
    // so a reader downloads that story and not the whole record.
    const viewId = url.searchParams.get('view');
    if (viewId) {
      const v = await queryOne<{ event_ids_json: string | null; filter_json: string | null }>(env.DB_WV,
        `SELECT event_ids_json, filter_json FROM wv_timeline_views WHERE id = ? OR slug = ?`, [viewId, viewId]);
      if (!v) return notFound(`timeline view ${viewId}`);
      let ids: string[] = [];
      try { ids = JSON.parse(v.event_ids_json ?? '[]'); } catch { ids = []; }
      if (ids.length) {
        conds.push(`id IN (SELECT value FROM json_each(?))`); params.push(JSON.stringify(ids));
      } else {
        let f: { type?: string; from?: number; to?: number } = {};
        try { f = JSON.parse(v.filter_json ?? '{}'); } catch { f = {}; }
        type = type ?? f.type ?? null;
        from = from ?? (typeof f.from === 'number' ? f.from : null);
        to = to ?? (typeof f.to === 'number' ? f.to : null);
      }
    }
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

      isBand: r.year_start != null && r.year_end != null && r.year_exact == null,
    }));
    const plotted = events.filter(e => e.year != null);

    return ok({
      events,
      span: plotted.length
        ? { from: plotted[0].year, to: Math.max(...plotted.map(e => Number(e.year))) }
        : null,

      facets: {
        eventTypes: countBy(events, e => e.event_type),
        traditions: countBy(events, e => e.tradition_id),
      },
      undated: events.length - plotted.length,
    });
  };

  dual(router, 'get', '/timeline', list);

  dual(router, 'get', '/timeline/views', async (_req, env) =>
    ok({
      views: await query<Record<string, unknown>>(
        env.DB_WV,
        `SELECT id, slug, title, timeline_theme, tradition_id, century_from,
                century_to, renderer_hint, event_ids_json, filter_json
           FROM wv_timeline_views ORDER BY title`,
      ),
    }));

  dual(router, 'get', '/timeline/centuries', async (_req, env) =>
    ok({
      centuries: await query<Record<string, unknown>>(
        env.DB_WV,
        `SELECT * FROM wv_century_profiles ORDER BY century`,
      ),
    }));

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
