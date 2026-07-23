// ─── CybRepo — the cross-domain cybernetics control plane (cyb_*) ─────────────
// CORE owns the control loop that drives the three knowledge domains
// (Qurʾān · classical Arabic · WorldViews) to a built · studied · retained state.
//
// Every node (cyb_node) is a point in the recursion tree — domain → surah →
// passage → stage → piece — carrying four outputs (build/study/content/
// retention _pct) and a typed reference (target_ref) into the owning domain DB.
// Sensors read those domains; the comparator raises disturbances; the controller
// queues jobs; the actuator (a skill) mines; the plant is D1; feedback re-senses.
//
// This repo is READ-ONLY. It only reads cyb_* tables in DB_CORE — it never
// touches a domain DB (that stays the domain worker's job) and never mutates.

import { query, queryOne } from '../../../shared/src/db';

// ── Row interfaces (snake_case — match the live columns exactly) ───────────────

export interface CybNode {
  id: string;
  domain: string;
  lane: string;
  parent_id: string | null;
  scale: 'domain' | 'surah' | 'passage' | 'stage' | 'piece';
  target_kind: string | null;
  target_ref: string | null;
  layer: string | null;
  piece_kind: string | null;
  build_state: string;
  build_pct: number;
  study_state: string;
  study_pct: number;
  content_state: string;
  content_pct: number;
  retention_state: string;
  retention_pct: number;
  priority: number;
  meta_json: string;
  updated_at: string;
}

/** A node plus its children — the Map / Ladder shape. */
export interface CybNodeTree extends CybNode {
  children: CybNodeTree[];
}

export interface CybJob {
  id: string;
  node_id: string;
  op: string;
  band_code: string | null;
  source_slug: string | null;
  actuator: string;
  skill: string | null;
  depends_on: string | null;
  readiness: string;
  error_val: number;
  created_at: string;
}

export interface CybSensor {
  id: string;
  node_id: string;
  axis: string;
  kind: string;
  band_code: string | null;
  metric: string;
  reading: number;
  expected: number;
  weight: number;
  state: string;
  health: string;
  trend: string;
  error_val: number;
  read_count: number;
  source_table: string | null;
  source_slug: string | null;
  last_read_at: string | null;
}

export interface CybGauge {
  id: string;
  node_id: string;
  gauge_kind: string;
  score: number;
  actor: string;
  attempt_at: string;
}

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

// ── Column fragments ──────────────────────────────────────────────────────────

const NODE_COLS = `
  id, domain, lane, parent_id, scale, target_kind, target_ref, layer, piece_kind,
  build_state, build_pct, study_state, study_pct, content_state, content_pct,
  retention_state, retention_pct, priority, meta_json, updated_at
FROM cyb_node`;

const JOB_COLS = `
  id, node_id, op, band_code, source_slug, actuator, skill, depends_on,
  readiness, error_val, created_at
FROM cyb_job`;

const SENSOR_COLS = `
  id, node_id, axis, kind, band_code, metric, reading, expected, weight,
  state, health, trend, error_val, read_count, source_table, source_slug, last_read_at
FROM cyb_sensor`;

// ── Repo ──────────────────────────────────────────────────────────────────────

export class CybRepo {
  constructor(private db: D1Database) {}

  // ── Nodes / tree ──

  allNodes(lane?: string): Promise<CybNode[]> {
    if (lane) {
      return query<CybNode>(this.db, `SELECT ${NODE_COLS} WHERE lane = ? ORDER BY priority, id`, [lane]);
    }
    return query<CybNode>(this.db, `SELECT ${NODE_COLS} ORDER BY priority, id`);
  }

  findNode(id: string): Promise<CybNode | null> {
    return queryOne<CybNode>(this.db, `SELECT ${NODE_COLS} WHERE id = ?`, [id]);
  }

  /**
   * Build the descendant tree of `rootId` (inclusive). When `rootId` is null,
   * returns a synthetic forest under a virtual root, grouped by top-level nodes.
   * Only 54 nodes live in the table, so we load once and assemble in memory.
   */
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
    // Forest: every node whose parent is null (or whose parent is absent).
    const ids = new Set(nodes.map((n) => n.id));
    return nodes.filter((n) => !n.parent_id || !ids.has(n.parent_id)).map(build);
  }

  nodesByScale(): Promise<CountRow[]> {
    return query<CountRow>(this.db, `SELECT scale AS key, COUNT(*) AS n FROM cyb_node GROUP BY scale ORDER BY n DESC`);
  }

  // ── Sensors ──

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

  // ── Jobs ──

  allJobs(): Promise<CybJob[]> {
    // Order the queue: ready first, then blocked, then done; newest job wins ties.
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

  // ── Gauges ──

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

  // ── Ticks (feedback log) ──

  ticks(limit = 12): Promise<CybTick[]> {
    return query<CybTick>(
      this.db,
      `SELECT id, ran_at, sensed, drifts, actuated, corrected, summary
       FROM cyb_tick ORDER BY ran_at DESC LIMIT ?`,
      [limit],
    );
  }

  // ── Disturbances (the error ledger) ──

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

  // ── Sources (the mining registry) ──

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

  // ── Config (the control law) ──

  config(): Promise<{ key: string; value: string; note: string | null }[]> {
    return query<{ key: string; value: string; note: string | null }>(
      this.db,
      `SELECT key, value, note FROM cyb_config ORDER BY key`,
    );
  }
}
