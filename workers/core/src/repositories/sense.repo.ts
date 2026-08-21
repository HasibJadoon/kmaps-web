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
          AND bind_kind NOT IN ('unset', 'scope')`,
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

// ─── Carrier rows for a node, through the bridge ─────────────────────────────
//
// The stream screens showed `cyb_node` children — the control plane's own
// bookkeeping, rendered as "s1 · B 100 S — C — R —" twelve times over. That is
// a review of the database, not a view of the work. This returns what the
// carriers actually hold for a passage, resolved the one way km_core is allowed
// to reach another database.

export interface CarrierRows {
  band_code: string;
  db_name: string;
  table_name: string;
  bind_col: string;
  rows: Record<string, unknown>[];
  /** What the carrier holds, against `rows.length`, which is what was sent. */
  total: number;
}

const ROWS_PATH: Record<string, string> = {
  QURAN: '/qr/internal/rows',
  AR_LINGUISTICS: '/al/internal/rows',
  CONTENT: '/cm/internal/rows',
};

export class CarrierRowsRepo {
  constructor(private env: CoreEnv) {}

  /** Every carrier row a node's layer holds, band by band. */
  async rowsForNode(nodeID: string, layerKey?: string): Promise<CarrierRows[] | null> {
    const db = this.env.DB_CORE;
    const node = await queryOne<NodeRow & { layer: string | null }>(
      db,
      `SELECT id, scale, domain, target_ref, meta_json, layer FROM cyb_node WHERE id = ?`,
      [nodeID]);
    if (!node) return null;

    // A passage node's target_ref is `QR:SP:44:1-9`; the carriers bind on the
    // surah and the ayah range it names.
    const ref = node.target_ref ?? '';
    const match = ref.replace('QR:SP:', '').match(/^(\d+):(\d+)-(\d+)$/);
    const surah = match ? match[1] : null;
    const from = match ? parseInt(match[2]) : null;
    const to = match ? parseInt(match[3]) : null;

    const layer = layerKey ?? node.layer;
    if (!layer) return [];
    const bindings = await query<{
      band_code: string; db_name: string; table_name: string;
      bind_col: string | null; bind_kind: string; bind_via: string | null;
    }>(
      db,
      `SELECT band_code, db_name, table_name, bind_col, bind_kind, bind_via
         FROM cyb_carrier_binding
        WHERE status = 'live' AND role = 'carrier'
          AND layer_uid = ? AND bind_kind NOT IN ('unset', 'none')
          AND bind_col IS NOT NULL
        ORDER BY band_code, table_name`,
      [`${node.domain}:${layer}`]);

    const out: CarrierRows[] = [];
    for (const b of bindings) {
      const owner = ownerOfDb(b.db_name);
      if (!owner || owner === 'LOCAL') continue;
      // The query already excludes these; saying so here is what lets the row
      // be built without asserting a type the binding does not guarantee.
      const bindCol = b.bind_col;
      if (!bindCol) continue;
      // What the node can name. A carrier keyed on `surah` is narrowed to the
      // passage's ayat by the range columns the binding carries — without them
      // a passage would read its whole surah. Anything else keyed by text takes
      // the node's own ref (`QR:SP:44:1-9`), whatever the column is called:
      // passage_id, study_passage_id, or the passage table's own id.
      // An id-bound carrier reached through another table is a second hop the
      // bridge does not express yet, and is left out rather than read against
      // the wrong key.
      let bindValue: string | null = null;
      let rangeFrom: number | null = null;
      let rangeTo: number | null = null;
      if (bindCol === 'surah' && surah) { bindValue = surah; rangeFrom = from; rangeTo = to; }
      else if (b.bind_kind === 'text') { bindValue = ref; }
      else continue;

      const res = await (this.env[owner] as Fetcher).fetch(new Request(
        `http://internal.k-maps.local${ROWS_PATH[owner]}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: b.table_name, bind_col: bindCol, bind_value: bindValue,
            bind_via: b.bind_via, range_from: rangeFrom, range_to: rangeTo, limit: 60,
          }) }));
      const body = await res.json<{
        data?: { ok: boolean; rows?: Record<string, unknown>[]; total?: number };
      }>().catch(() => null);
      const rows = body?.data?.rows ?? [];
      if (rows.length) {
        out.push({ band_code: b.band_code, db_name: b.db_name,
                   table_name: b.table_name, bind_col: bindCol, rows,
                   total: body?.data?.total ?? rows.length });
      }
    }
    return out;
  }

  /**
   * The second hop — what a *part* of a passage carries.
   *
   * A passage node's ref reaches carriers keyed on the passage and nothing
   * keyed on a sentence, a tree or a note, which is most of the syntactic
   * apparatus. 44:1–9 alone is 152 sentence rows and the word-level material is
   * far larger, so this is deliberately not folded into the passage read: the
   * caller asks for one scope, when a reader selects it.
   *
   * Two binding shapes, both declared in the bridge:
   *   * `bind_via` names a discriminator column — one row set serves words,
   *     clauses and sentences, and (scope_type, scope_id) picks one out;
   *   * `bind_via` is null — the carrier answers a single kind of scope, and
   *     `scope_kind` says which.
   */
  async rowsForScope(scopeType: string, scopeID: string,
                     layerKey?: string, domain = 'quran'): Promise<CarrierRows[]> {
    const bindings = await query<{
      band_code: string; db_name: string; table_name: string;
      bind_col: string | null; bind_via: string | null; scope_kind: string;
    }>(
      this.env.DB_CORE,
      `SELECT band_code, db_name, table_name, bind_col, bind_via, scope_kind
         FROM cyb_carrier_binding
        WHERE status = 'live' AND role = 'carrier' AND bind_kind = 'scope'
          AND domain = ? AND bind_col IS NOT NULL
          AND (bind_via IS NOT NULL OR scope_kind = ?)
          AND (? IS NULL OR layer_uid = ?)
        ORDER BY band_code, table_name`,
      [domain, scopeType,
       layerKey ?? null, layerKey ? `${domain}:${layerKey}` : null]);

    const out: CarrierRows[] = [];
    for (const b of bindings) {
      const owner = ownerOfDb(b.db_name);
      if (!owner || owner === 'LOCAL') continue;
      const bindCol = b.bind_col;
      if (!bindCol) continue;

      const res = await (this.env[owner] as Fetcher).fetch(new Request(
        `http://internal.k-maps.local${ROWS_PATH[owner]}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: b.table_name, bind_col: bindCol, bind_value: scopeID,
            // Only a carrier that mixes scope kinds needs to be told which.
            filter_col: b.bind_via ?? undefined,
            filter_value: b.bind_via ? scopeType : undefined,
            limit: 200,
          }) }));
      const body = await res.json<{
        data?: { ok: boolean; rows?: Record<string, unknown>[]; total?: number };
      }>().catch(() => null);
      const rows = body?.data?.rows ?? [];
      if (rows.length) {
        out.push({ band_code: b.band_code, db_name: b.db_name,
                   table_name: b.table_name, bind_col: bindCol, rows,
                   total: body?.data?.total ?? rows.length });
      }
    }
    return out;
  }
}
