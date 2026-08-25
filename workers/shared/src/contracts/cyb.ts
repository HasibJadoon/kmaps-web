// ─── contract · the cybernetics control plane, as it goes over the wire ──────
//
// One declaration, imported by the worker that sends these and by the apps that
// receive them. Before this file the same shapes were written twice — once in
// `workers/core/src/repositories/cyb.repo.ts` and once in the Angular app's
// `cyb.models.ts` — and kept in step by hand. They had already drifted:
//
//   • The client declared `children` as a required field on `CybNode`. The
//     worker's `CybNode` has no such field; only `CybNodeTree` does, and
//     `GET /core/cyb/node/:id` returns `children` as a *sibling* of `node`.
//     So `node.children` was typed as a guaranteed array the API never sends,
//     and call sites split into ones that trusted the type and ones that wrote
//     `?? []` on a non-nullable field.
//
//   • Both copies declared `scale` as a five-value union. The table holds ten,
//     and the two commonest — `root` (1,642 rows) and `programme` — were not
//     among the five. 83% of nodes had a scale the type called impossible.
//
// Types only. Nothing here is emitted at runtime, so an app importing it costs
// nothing in the bundle.

/**
 * The scales in `cyb_node.scale`, with the row counts they carried when this
 * was written. A scale is DATA, not a code change: the plane mints nodes at
 * whatever scale a domain declares, so this is the known list, not a closed
 * set — which is why `CybNode.scale` is a `string` and not a union of these.
 *
 *   root 1642 · stage 188 · piece 127 · passage 22 · programme 3
 *   domain 3 · surah 2 · unit 1 · source 1 · mufassir 1
 */
export const KNOWN_CYB_SCALES = [
  'root', 'stage', 'piece', 'passage', 'programme',
  'domain', 'surah', 'unit', 'source', 'mufassir',
] as const;

export type KnownCybScale = (typeof KNOWN_CYB_SCALES)[number];

/** The four outputs every scale is read on. */
export const CYB_AXES = ['build', 'study', 'content', 'retention'] as const;
export type CybAxis = (typeof CYB_AXES)[number];

/**
 * One node of the control plane — a row of `cyb_node`, exactly as the worker
 * selects it.
 *
 * This is the BARE node. It has no `children`: a node does not carry its
 * subtree, a *tree* does. See `CybNodeTree`.
 */
export interface CybNode {
  id: string;
  domain: string;
  lane: string;
  parent_id: string | null;
  /** One of `KNOWN_CYB_SCALES` — but new scales arrive as data, not as code. */
  scale: string;
  target_kind: string | null;
  /** What the node measures. `QR:SP:40:1-3` for a passage; the bare Arabic root
   *  for a root — though a root node prefers `meta_json.$.root_ar` when it has
   *  one, which is the precedence the sense engine uses. */
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
  /** Per axis: whether a sensor has ever actually read it. 0 means *unknown*,
   *  which is not a measured zero — every screen has to say which it is. */
  build_measured?: number;
  study_measured?: number;
  content_measured?: number;
  retention_measured?: number;
  /** Measured once, but no live sensor stands behind the number now. Only
   *  `build` carries a stale flag; the reading view hardcodes 0 for the rest. */
  build_stale?: number;
  priority: number;
  meta_json: string;
  updated_at: string;
}

/** A node with its subtree — what `GET /core/cyb/tree` returns. */
export interface CybNodeTree extends CybNode {
  children: CybNodeTree[];
}

/**
 * `GET /core/cyb/node/:id`.
 *
 * Note `children` sits BESIDE `node`, not inside it — `node` is a bare row.
 */
export interface CybNodeDetail {
  node: CybNode;
  sensors: CybSensor[];
  jobs: CybJob[];
  gauges: CybGauge[];
  children: CybNodeTree[];
}

/** One reading of one axis, from `v_cyb_node_reading` — the single definition
 *  of a reading anywhere in the stack. */
export interface CybNodeReading {
  axis: CybAxis | string;
  pct: number;
  /** 0 = no sensor has read this axis. Render it as unknown, never as 0%. */
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
  /** The denominator. When 0 the sensor is UNCALIBRATED and contributes no
   *  opinion — see `sensorFraction` in `../shaping`. */
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
  /** Defaults to `claude`. There is no machine actuator and none is wanted —
   *  this queue is a worklist to be read, not one to be drained by a cron. */
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
