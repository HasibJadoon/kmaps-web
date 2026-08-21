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

/** One row of the bridge. km_core reaches another database through this and
 *  through nothing else. */
interface BindingRow {
  db_name: string;
  table_name: string;
  bind_col: string | null;
  bind_kind: string;
  band_code: string;
  scope_kind: string;
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

/** Which worker owns a database. The binding names the database; this maps it
 *  to the worker that owns it. Guessing the owner from a table's name prefix
 *  was a second rule about where data lives, held in code, disagreeing with the
 *  binding table that is supposed to be the only one — `core_study_session` was
 *  bound to km_quran for exactly as long as nobody had to reconcile them. */
function ownerOfDb(db: string): 'QURAN' | 'AR_LINGUISTICS' | 'CONTENT' | 'LOCAL' | null {
  switch (db) {
    case 'km_quran':             return 'QURAN';
    case 'km_arabic_linguistic': return 'AR_LINGUISTICS';
    case 'km_content':           return 'CONTENT';
    case 'km_core':              return 'LOCAL';
    default:                     return null;
  }
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

    // The bridge. Every carrier this node's sensors may read comes from here:
    // km_core holds no other statement of where another database's data lives.
    const bindings = await query<BindingRow>(
      db,
      `SELECT db_name, table_name, bind_col, bind_kind, band_code, scope_kind
         FROM cyb_carrier_binding
        WHERE status = 'live' AND domain = ? AND scope_kind = ?
          AND bind_kind <> 'unset'`,
      [node.domain, node.scale]);
    const byBand = new Map<string, BindingRow[]>();
    for (const b of bindings) {
      const list = byBand.get(b.band_code);
      if (list) list.push(b); else byBand.set(b.band_code, [b]);
    }

    const bindValue = scopeValue(node);
    const report: SenseReport = { node_id: nodeID, read: 0, skipped: [], axes: {} };
    const now = new Date().toISOString();

    for (const sensor of sensors) {
      const def = defMap.get(defKey(sensor.axis, sensor.band_code, sensor.metric));
      if (!def) {
        report.skipped.push({ sensor_id: sensor.id, reason: 'no live definition' });
        continue;
      }
      // The definition says WHAT to measure; the bridge says WHERE the data
      // is. reader_args used to carry its own carrier list, so a table could be
      // read that the binding table had never heard of — and the two drifted.
      let args: Args = {};
      try { args = JSON.parse(def.reader_args ?? '{}') as Args; } catch { /* empty */ }
      const carriers = byBand.get(sensor.band_code ?? '') ?? [];
      if (!carriers.length) {
        report.skipped.push({ sensor_id: sensor.id,
                              reason: `no live binding for band ${sensor.band_code ?? '—'} at ${node.scale} scope` });
        continue;
      }
      if (!bindValue) {
        report.skipped.push({ sensor_id: sensor.id,
                              reason: `scope ${node.scale} has no bind value` });
        continue;
      }

      // A band carried by several tables reads as their sum (counts) or their
      // best fraction — matching how the fill readers already merge.
      let reading: number | null = null;
      let failed: string | null = null;
      for (const carrier of carriers) {
        const owner = ownerOfDb(carrier.db_name);
        if (!owner) { failed = `no worker owns ${carrier.db_name}`; break; }
        // `bind_kind` is why the bridge carries it: nine AL carriers key on a
        // ULID, and matching an id column against 'نزل' returns zero for every
        // root in the corpus rather than failing.
        const request: SenseRequest = {
          reader: def.reader as SenseRequest['reader'],
          table: carrier.table_name,
          bind_col: carrier.bind_col ?? args.where_col,
          bind_value: bindValue ?? undefined,
          col: args.test_col?.split(',')[0]?.trim(),
          expected: args.expected ?? def.expected ?? sensor.expected ?? 1,
          // The bridge says how the scope binds; the owning worker resolves an
          // id against its own keys.
          bind_kind: carrier.bind_kind === 'id' ? 'id' : 'text',
          scope_kind: carrier.scope_kind,
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
