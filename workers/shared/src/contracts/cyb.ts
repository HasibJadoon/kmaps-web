export const KNOWN_CYB_SCALES = [
  'root', 'stage', 'piece', 'passage', 'programme',
  'domain', 'surah', 'unit', 'source', 'mufassir',
] as const;

export type KnownCybScale = (typeof KNOWN_CYB_SCALES)[number];

export const CYB_AXES = ['build', 'study', 'content', 'retention'] as const;
export type CybAxis = (typeof CYB_AXES)[number];

export interface CybNode {
  id: string;
  domain: string;
  lane: string;
  parent_id: string | null;

  scale: string;
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

  build_measured?: number;
  study_measured?: number;
  content_measured?: number;
  retention_measured?: number;

  build_stale?: number;
  priority: number;
  meta_json: string;
  updated_at: string;
}

export interface CybNodeTree extends CybNode {
  children: CybNodeTree[];
}

export interface CybNodeDetail {
  node: CybNode;
  sensors: CybSensor[];
  jobs: CybJob[];
  gauges: CybGauge[];
  children: CybNodeTree[];
}

export interface CybNodeReading {
  axis: CybAxis | string;
  pct: number;

  measured: number;
  stale: number;
  sensors: number;
  read_sensors: number;
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

export interface CybJob {
  id: string;
  node_id: string;
  op: string;
  band_code: string | null;
  source_slug: string | null;

  actuator: string;
  skill: string | null;
  depends_on: string | null;
  readiness: 'ready' | 'blocked' | 'done' | string;
  error_val: number;
  created_at: string;
}

export interface CybGauge {
  id: string;
  node_id: string;
  gauge_kind: string;
  score: number;
  actor: string;
  attempt_at: string;
}
