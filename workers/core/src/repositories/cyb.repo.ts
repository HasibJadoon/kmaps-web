import { query, queryOne } from '../../../shared/src/db';

export interface ProcessRow {
  uid: string; domain: string; lane: string; scope_kind: string;
  name_ar: string; name_en: string; name_ur: string | null; note_md: string | null;
}

export interface ProcessStepRow {
  uid: string; process_uid: string; step_key: string; step_no: number;
  scope_kind: string; name_ar: string; name_en: string; name_ur: string | null;
  covers_md: string | null; key_info_md: string | null;
  merged_from_json: string; prereq_json: string;
}

export interface ProcessStepLayerRow {
  step_uid: string; layer_uid: string; skill_slug: string | null;
  role: string; note: string | null;
  layer_key: string | null; layer_name_en: string | null; db_name: string | null;
  skill_name: string | null; skill_stages: string | null;
}

export interface CybDomainRow {
  slug: string;
  lane: string;
  name_ar: string;
  name_en: string;
  name_ur: string | null;
  hint: string | null;
  content_db: string;
  learner_db: string;
  unit_kind: string;
  color_hex: string | null;
  symbol: string | null;
  display_order: number;
  status: string;
}

export interface CybLayerRow {
  id: string;
  domain: string;
  lane: string;
  layer_key: string;
  name_ar: string;
  name_en: string;
  name_ur: string | null;
  hint: string | null;
  db_name: string;
  color_hex: string | null;
  symbol: string | null;
  display_order: number;
}

import type {
  CybNode, CybNodeTree, CybNodeDetail, CybNodeReading,
  CybSensor, CybJob, CybGauge, CybAxis,
} from '../../../shared/src/contracts/cyb';

export type {
  CybNode, CybNodeTree, CybNodeDetail, CybNodeReading,
  CybSensor, CybJob, CybGauge, CybAxis,
};
export { KNOWN_CYB_SCALES, CYB_AXES } from '../../../shared/src/contracts/cyb';

export interface CybTick {
  id: string;
  ran_at: string;
  sensed: number | null;
  drifts: number | null;
  actuated: number | null;
  corrected: number | null;
  summary: string | null;
}

export interface CybSource {
  id: string;
  loop_key: string;
  domain: string;
  source_slug: string;
  title_ar: string | null;
  title_en: string | null;
  author: string | null;
  source_kind: string;
  authority_rank: number;
  coverage_state: string;
  trilingual: number;
  note: string | null;
}

export interface CountRow { key: string; n: number }

export interface StepCarrierRow {
  step_uid: string;
  db_name: string;
  table_name: string;
  band_code: string;
  scope_kind: string;
}

const NODE_COLS = `
  id, domain, lane, parent_id, scale, target_kind, target_ref, layer, piece_kind,
  build_state, build_pct, study_state, study_pct, content_state, content_pct,
  retention_state, retention_pct,
  build_measured, study_measured, content_measured, retention_measured, build_stale,
  priority, meta_json, updated_at
FROM cyb_node`;

const JOB_COLS = `
  id, node_id, op, band_code, source_slug, actuator, skill, depends_on,
  readiness, error_val, created_at
FROM cyb_job`;

const SENSOR_COLS = `
  id, node_id, axis, kind, band_code, metric, reading, expected, weight,
  state, health, trend, error_val, read_count, source_table, source_slug, last_read_at
FROM cyb_sensor`;

export class CybRepo {
  constructor(private db: D1Database) {}

  readings(nodeID: string) {
    return query<Record<string, unknown>>(
      this.db,
      `SELECT axis, pct, measured, stale, sensors, read_sensors
         FROM v_cyb_node_reading WHERE node_id = ? ORDER BY axis`,
      [nodeID],
    );
  }

  allNodes(lane?: string): Promise<CybNode[]> {
    if (lane) {
      return query<CybNode>(this.db, `SELECT ${NODE_COLS} WHERE lane = ? ORDER BY priority, id`, [lane]);
    }
    return query<CybNode>(this.db, `SELECT ${NODE_COLS} ORDER BY priority, id`);
  }

  findNode(id: string): Promise<CybNode | null> {
    return queryOne<CybNode>(this.db, `SELECT ${NODE_COLS} WHERE id = ?`, [id]);
  }

  async tree(rootId?: string, lane?: string): Promise<CybNodeTree[]> {
    const nodes = await this.allNodes(lane);
    const byParent = new Map<string | null, CybNode[]>();
    for (const n of nodes) {
      const key = n.parent_id;
      const bucket = byParent.get(key);
      if (bucket) bucket.push(n); else byParent.set(key, [n]);
    }
    const build = (n: CybNode): CybNodeTree => ({
      ...n,
      children: (byParent.get(n.id) ?? []).map(build),
    });
    if (rootId) {
      const root = nodes.find((n) => n.id === rootId);
      return root ? [build(root)] : [];
    }

    const ids = new Set(nodes.map((n) => n.id));
    return nodes.filter((n) => !n.parent_id || !ids.has(n.parent_id)).map(build);
  }

  domains(): Promise<CybDomainRow[]> {
    return query<CybDomainRow>(
      this.db,
      `SELECT slug, lane, name_ar, name_en, name_ur, hint, content_db, learner_db,
              unit_kind, color_hex, symbol, display_order, status
         FROM cyb_domain
        WHERE status = 'live'
        ORDER BY display_order`,
    );
  }

  layers(domain?: string): Promise<CybLayerRow[]> {
    const where = domain ? "WHERE status = 'live' AND domain = ?" : "WHERE status = 'live'";
    return query<CybLayerRow>(
      this.db,
      `SELECT id, domain, lane, layer_key, name_ar, name_en, name_ur, hint,
              db_name, color_hex, symbol, display_order
         FROM cyb_layer ${where}
        ORDER BY domain, display_order`,
      domain ? [domain] : [],
    );
  }

  async process(domain?: string) {
    const where = domain ? "WHERE p.status = 'live' AND p.domain = ?" : "WHERE p.status = 'live'";
    const args = domain ? [domain] : [];

    const [processes, steps, bridges, carriers] = await Promise.all([
      query<ProcessRow>(
        this.db,
        `SELECT uid, domain, lane, scope_kind, name_ar, name_en, name_ur, note_md
           FROM cyb_process p ${where} ORDER BY domain`,
        args,
      ),
      query<ProcessStepRow>(
        this.db,
        `SELECT s.uid, s.process_uid, s.step_key, s.step_no, s.scope_kind,
                s.name_ar, s.name_en, s.name_ur, s.covers_md, s.key_info_md,
                s.merged_from_json, s.prereq_json
           FROM cyb_process_step s
           JOIN cyb_process p ON p.uid = s.process_uid
          ${where} AND s.status = 'live'
          ORDER BY s.step_no`,
        args,
      ),
      query<ProcessStepLayerRow>(
        this.db,
        `SELECT b.step_uid, b.layer_uid, b.skill_slug, b.role, b.note,
                l.layer_key, l.name_en AS layer_name_en, l.db_name,
                k.name AS skill_name, k.stages AS skill_stages
           FROM cyb_process_step_layer b
           JOIN cyb_process_step s ON s.uid = b.step_uid
           JOIN cyb_process p ON p.uid = s.process_uid
           LEFT JOIN cyb_layer l ON l.id = b.layer_uid
           LEFT JOIN cyb_skill k ON k.slug = b.skill_slug
          ${where}`,
        args,
      ),

      query<StepCarrierRow>(
        this.db,
        `SELECT DISTINCT b.step_uid, c.db_name, c.table_name, c.band_code, c.scope_kind
           FROM cyb_process_step_layer b
           JOIN cyb_process_step s ON s.uid = b.step_uid
           JOIN cyb_process p ON p.uid = s.process_uid
           JOIN cyb_carrier_binding c
             ON c.layer_uid = b.layer_uid AND c.status = 'live'
          ${where}
          ORDER BY c.band_code, c.table_name`,
        args,
      ),
    ]);

    return processes.map((proc) => ({
      ...proc,
      steps: steps
        .filter((st) => st.process_uid === proc.uid)
        .map((st) => ({
          ...st,
          merged_from: JSON.parse(st.merged_from_json || '[]'),
          prereq: JSON.parse(st.prereq_json || '[]'),
          layers: bridges.filter((b) => b.step_uid === st.uid),
          carriers: carriers.filter((c) => c.step_uid === st.uid),
        })),
    }));
  }

  nodesByScale(): Promise<CountRow[]> {
    return query<CountRow>(this.db, `SELECT scale AS key, COUNT(*) AS n FROM cyb_node GROUP BY scale ORDER BY n DESC`);
  }

  nodeSensors(nodeId: string): Promise<CybSensor[]> {
    return query<CybSensor>(this.db, `SELECT ${SENSOR_COLS} WHERE node_id = ? ORDER BY axis, band_code`, [nodeId]);
  }

  sensorCountByState(): Promise<CountRow[]> {
    return query<CountRow>(this.db, `SELECT state AS key, COUNT(*) AS n FROM cyb_sensor GROUP BY state ORDER BY n DESC`);
  }

  sensorCountByAxis(): Promise<CountRow[]> {
    return query<CountRow>(this.db, `SELECT axis AS key, COUNT(*) AS n FROM cyb_sensor GROUP BY axis ORDER BY n DESC`);
  }

  async sensorTotal(): Promise<number> {
    const row = await queryOne<{ n: number }>(this.db, `SELECT COUNT(*) AS n FROM cyb_sensor`);
    return row?.n ?? 0;
  }

  allJobs(): Promise<CybJob[]> {

    return query<CybJob>(
      this.db,
      `SELECT ${JOB_COLS}
       ORDER BY CASE readiness WHEN 'ready' THEN 0 WHEN 'blocked' THEN 1 WHEN 'done' THEN 2 ELSE 3 END,
                created_at`,
    );
  }

  jobsForNode(nodeId: string): Promise<CybJob[]> {
    return query<CybJob>(this.db, `SELECT ${JOB_COLS} WHERE node_id = ? ORDER BY created_at`, [nodeId]);
  }

  jobsByReadiness(): Promise<CountRow[]> {
    return query<CountRow>(this.db, `SELECT readiness AS key, COUNT(*) AS n FROM cyb_job GROUP BY readiness`);
  }

  gauges(): Promise<CybGauge[]> {
    return query<CybGauge>(
      this.db,
      `SELECT id, node_id, gauge_kind, score, actor, attempt_at FROM cyb_gauge ORDER BY attempt_at DESC`,
    );
  }

  nodeGauges(nodeId: string): Promise<CybGauge[]> {
    return query<CybGauge>(
      this.db,
      `SELECT id, node_id, gauge_kind, score, actor, attempt_at FROM cyb_gauge WHERE node_id = ? ORDER BY attempt_at DESC`,
      [nodeId],
    );
  }

  ticks(limit = 12): Promise<CybTick[]> {
    return query<CybTick>(
      this.db,
      `SELECT id, ran_at, sensed, drifts, actuated, corrected, summary
       FROM cyb_tick ORDER BY ran_at DESC LIMIT ?`,
      [limit],
    );
  }

  async disturbanceTotal(): Promise<number> {
    const row = await queryOne<{ n: number }>(this.db, `SELECT COUNT(*) AS n FROM cyb_disturbance WHERE resolved = 0`);
    return row?.n ?? 0;
  }

  disturbanceBySeverity(): Promise<CountRow[]> {
    return query<CountRow>(
      this.db,
      `SELECT CAST(severity AS TEXT) AS key, COUNT(*) AS n
       FROM cyb_disturbance WHERE resolved = 0 GROUP BY severity ORDER BY severity DESC`,
    );
  }

  disturbanceByKind(): Promise<CountRow[]> {
    return query<CountRow>(
      this.db,
      `SELECT kind AS key, COUNT(*) AS n
       FROM cyb_disturbance WHERE resolved = 0 GROUP BY kind ORDER BY n DESC`,
    );
  }

  sources(loopKey?: string): Promise<CybSource[]> {
    if (loopKey) {
      return query<CybSource>(
        this.db,
        `SELECT id, loop_key, domain, source_slug, title_ar, title_en, author, source_kind,
                authority_rank, coverage_state, trilingual, note
         FROM cyb_source_registry WHERE loop_key = ? ORDER BY authority_rank, source_slug`,
        [loopKey],
      );
    }
    return query<CybSource>(
      this.db,
      `SELECT id, loop_key, domain, source_slug, title_ar, title_en, author, source_kind,
              authority_rank, coverage_state, trilingual, note
       FROM cyb_source_registry ORDER BY loop_key, authority_rank`,
    );
  }

  sourceCountByCoverage(): Promise<CountRow[]> {
    return query<CountRow>(
      this.db,
      `SELECT coverage_state AS key, COUNT(*) AS n FROM cyb_source_registry GROUP BY coverage_state ORDER BY n DESC`,
    );
  }

  config(): Promise<{ key: string; value: string; note: string | null }[]> {
    return query<{ key: string; value: string; note: string | null }>(
      this.db,
      `SELECT key, value, note FROM cyb_config ORDER BY key`,
    );
  }
}
