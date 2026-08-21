// ─── The sensor engine — the actuator, mechanised ─────────────────────────────
//
// `POST /core/cyb/sense/:nodeID` re-reads a node's sensors against the real
// carrier tables, through each carrier's owning worker. Until now every
// `read_count` tick was written by hand in a Claude session; a percentage
// nobody can recompute mechanically is a hand-written number with a sensor's
// name on it, and this is the machine that removes that class.
//
// Coverage is honest: a sensor whose definition the engine cannot yet bind
// (no table named, or a scope the reader grammar cannot express) is reported
// in `skipped` with its reason — never read as zero, never silently dropped.

import { query, queryOne, execute } from '../../../shared/src/db';
import { sense, type SenseRequest, type SenseResult } from '../../../shared/src/sense';
import type { CoreEnv } from '../env';

interface SensorRow {
  id: string;
  node_id: string;
  axis: string;
  band_code: string | null;
  metric: string | null;
  expected: number;
  weight: number;
  read_count: number;
}

interface DefRow {
  axis: string;
  band_code: string | null;
  metric: string | null;
  reader: string;
  reader_args: string | null;
  expected: number | null;
}

interface NodeRow {
  id: string;
  scale: string;
  domain: string;
  target_ref: string | null;
  meta_json: string | null;
}

interface Args {
  table?: string;
  carrier?: string;
  carriers?: string[];
  where_col?: string;
  test_col?: string;
  expected?: number;
}

export interface SenseReport {
  node_id: string;
  read: number;
  skipped: { sensor_id: string; reason: string }[];
  axes: Record<string, { pct: number; sensors: number }>;
}

/** Which worker owns a carrier, by the table-name prefix the registry uses.
 *  `core_*` and `cyb_*` live in this worker's own database — a local read,
 *  not a service call. */
function ownerOf(table: string): 'QURAN' | 'AR_LINGUISTICS' | 'CONTENT' | 'LOCAL' | null {
  if (table.startsWith('qr_')) return 'QURAN';
  if (table.startsWith('ar_ling_')) return 'AR_LINGUISTICS';
  if (table.startsWith('cm_')) return 'CONTENT';
  if (table.startsWith('core_') || table.startsWith('cyb_')) return 'LOCAL';
  return null;
}

const OWNER_PATH: Record<string, string> = {
  QURAN: '/qr/internal/sense',
  AR_LINGUISTICS: '/al/internal/sense',
  CONTENT: '/cm/internal/sense',
};

async function callReader(env: CoreEnv, owner: keyof typeof OWNER_PATH,
                          req: SenseRequest): Promise<SenseResult> {
  const fetcher = env[owner as 'QURAN' | 'AR_LINGUISTICS' | 'CONTENT'];
  const res = await fetcher.fetch(new Request(
    `http://internal.k-maps.local${OWNER_PATH[owner]}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req) },
  ));
  const body = await res.json<{ data?: SenseResult }>().catch(() => null);
  return body?.data ?? { ok: false, error: `reader ${owner} returned no body` };
}

/** The value the node's scope binds carriers on — a root node binds its root. */
function scopeValue(node: NodeRow): string | null {
  if (node.scale === 'root') {
    try {
      const meta = JSON.parse(node.meta_json ?? '{}') as Record<string, unknown>;
      const rootAr = meta['root_ar'];
      if (typeof rootAr === 'string' && rootAr) return rootAr;
    } catch { /* fall through to ref */ }
    return node.target_ref;
  }
  return null;
}

export class SenseRepo {
  constructor(private env: CoreEnv) {}

  async senseNode(nodeID: string, dryRun = false): Promise<SenseReport | null> {
    const db = this.env.DB_CORE;
    const node = await queryOne<NodeRow>(
      db, `SELECT id, scale, domain, target_ref, meta_json FROM cyb_node WHERE id = ?`,
      [nodeID]);
    if (!node) return null;

    const sensors = await query<SensorRow>(
      db, `SELECT id, node_id, axis, band_code, metric, expected, weight, read_count
             FROM cyb_sensor WHERE node_id = ?`, [nodeID]);
    const defs = await query<DefRow>(
      db, `SELECT axis, band_code, metric, reader, reader_args, expected
             FROM cyb_sensor_def WHERE status = 'live'`);
    const defKey = (axis: string, band: string | null, metric: string | null) =>
      `${axis}|${band ?? ''}|${metric ?? ''}`;
    const defMap = new Map(defs.map(d => [defKey(d.axis, d.band_code, d.metric), d]));

    const bindValue = scopeValue(node);
    const report: SenseReport = { node_id: nodeID, read: 0, skipped: [], axes: {} };
    const now = new Date().toISOString();

    for (const sensor of sensors) {
      const def = defMap.get(defKey(sensor.axis, sensor.band_code, sensor.metric));
      if (!def) {
        report.skipped.push({ sensor_id: sensor.id, reason: 'no live definition' });
        continue;
      }
      let args: Args = {};
      try { args = JSON.parse(def.reader_args ?? '{}') as Args; } catch { /* empty */ }
      const tables = args.carriers ?? (args.carrier ? [args.carrier]
                      : args.table ? [args.table] : []);
      if (!tables.length) {
        report.skipped.push({ sensor_id: sensor.id, reason: 'definition names no carrier' });
        continue;
      }
      if (args.where_col && !bindValue) {
        report.skipped.push({ sensor_id: sensor.id,
                              reason: `scope ${node.scale} has no bind value for ${args.where_col}` });
        continue;
      }

      // A band carried by several tables reads as their sum (counts) or their
      // best fraction — matching how the fill readers already merge.
      let reading: number | null = null;
      let failed: string | null = null;
      for (const table of tables) {
        const owner = ownerOf(table);
        if (!owner) { failed = `no owner for ${table}`; break; }
        const request: SenseRequest = {
          reader: def.reader as SenseRequest['reader'],
          table,
          bind_col: args.where_col,
          bind_value: bindValue ?? undefined,
          col: args.test_col?.split(',')[0]?.trim(),
          expected: args.expected ?? def.expected ?? sensor.expected ?? 1,
        };
        // sql_scalar defs in this registry carry table/test_col like
        // col_fraction — read them as such rather than shipping SQL text.
        if (request.reader === 'sql_scalar') request.reader = 'col_fraction';
        const result = owner === 'LOCAL'
          ? await sense(this.env.DB_CORE, request)
          : await callReader(this.env, owner, request);
        if (!result.ok) { failed = result.error ?? 'reader failed'; break; }
        reading = Math.max(reading ?? 0, result.reading ?? 0);
      }
      if (failed !== null || reading === null) {
        report.skipped.push({ sensor_id: sensor.id, reason: failed ?? 'no reading' });
        continue;
      }

      if (!dryRun) {
        await execute(
          db,
          `UPDATE cyb_sensor
              SET prev_reading = reading, reading = ?, read_count = read_count + 1,
                  state = CASE WHEN ? > 0 THEN 'filled' ELSE 'empty' END,
                  error_val = ? - reading,
                  first_read_at = COALESCE(first_read_at, ?), last_read_at = ?
            WHERE id = ?`,
          [reading, reading, reading, now, now, sensor.id]);
      }
      report.read += 1;
    }

    // Recompute the node's per-axis percent from what was actually read, and
    // mark the axis measured — the flag now states a fact the engine made true.
    if (dryRun) return report;
    const axes = await query<{ axis: string; pct: number; n: number }>(
      db,
      `SELECT axis,
              ROUND(100.0 * SUM(weight * MIN(1.0, CASE WHEN expected > 0
                     THEN reading / expected ELSE reading END))
                    / MAX(1e-9, SUM(weight)), 0) AS pct,
              COUNT(*) AS n
         FROM cyb_sensor
        WHERE node_id = ? AND read_count > 0
        GROUP BY axis`,
      [nodeID]);
    for (const a of axes) {
      report.axes[a.axis] = { pct: a.pct, sensors: a.n };
      if (!['build', 'study', 'content', 'retention'].includes(a.axis)) continue;
      await execute(
        db,
        `UPDATE cyb_node SET ${a.axis}_pct = ?, ${a.axis}_measured = 1,
                             ${a.axis}_state = CASE WHEN ? > 0 THEN
                               CASE ? WHEN 'build' THEN 'mined' WHEN 'study' THEN 'learning'
                                      ELSE 'compiled' END
                             ELSE 'empty' END,
                             updated_at = ?
          WHERE id = ?`,
        [a.pct, a.pct, a.axis, now, nodeID]);
    }
    return report;
  }
}
