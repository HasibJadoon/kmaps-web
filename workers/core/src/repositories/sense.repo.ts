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

function scopeValue(node: NodeRow): string | null {
  if (node.scale === 'root') {
    try {
      const meta = JSON.parse(node.meta_json ?? '{}') as Record<string, unknown>;
      const rootAr = meta['root_ar'];
      if (typeof rootAr === 'string' && rootAr) return rootAr;
    } catch {  }
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

      let args: Args = {};
      try { args = JSON.parse(def.reader_args ?? '{}') as Args; } catch {  }
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

      let reading: number | null = null;
      let failed: string | null = null;
      for (const carrier of carriers) {
        const owner = ownerOfDb(carrier.db_name);
        if (!owner) { failed = `no worker owns ${carrier.db_name}`; break; }

        const request: SenseRequest = {
          reader: def.reader as SenseRequest['reader'],
          table: carrier.table_name,
          bind_col: carrier.bind_col ?? args.where_col,
          bind_value: bindValue ?? undefined,
          col: args.test_col?.split(',')[0]?.trim(),
          expected: args.expected ?? def.expected ?? sensor.expected ?? 1,

          bind_kind: carrier.bind_kind === 'id' ? 'id' : 'text',
          scope_kind: carrier.scope_kind,
        };

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

    if (dryRun) return report;

    const axes = await query<{ axis: string; pct: number; n: number }>(
      db,
      `SELECT axis,
              ROUND(100.0 * SUM(weight * MIN(1.0, reading / expected))
                    / MAX(1e-9, SUM(weight)), 0) AS pct,
              COUNT(*) AS n
         FROM cyb_sensor
        WHERE node_id = ? AND read_count > 0 AND expected > 0
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

export interface CarrierRows {
  band_code: string;
  db_name: string;
  table_name: string;
  bind_col: string;
  rows: Record<string, unknown>[];

  total: number;
}

const ROWS_PATH: Record<string, string> = {
  QURAN: '/qr/internal/rows',
  AR_LINGUISTICS: '/al/internal/rows',
  CONTENT: '/cm/internal/rows',
};

export class CarrierRowsRepo {
  constructor(private env: CoreEnv) {}

  async rowsForNode(nodeID: string, layerKey?: string): Promise<CarrierRows[] | null> {
    const db = this.env.DB_CORE;
    const node = await queryOne<NodeRow & { layer: string | null }>(
      db,
      `SELECT id, scale, domain, target_ref, meta_json, layer FROM cyb_node WHERE id = ?`,
      [nodeID]);
    if (!node) return null;

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

      const bindCol = b.bind_col;
      if (!bindCol) continue;

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

  async rowsForScope(scopeType: string, scopeID: string,
                     layerKey?: string, domain = 'quran'): Promise<CarrierRows[]> {

    const ids = scopeID.split(',').map(v => v.trim()).filter(Boolean);
    if (!ids.length) return [];
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
            table: b.table_name, bind_col: bindCol, bind_value: ids[0],
            bind_values: ids.length > 1 ? ids : undefined,

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
