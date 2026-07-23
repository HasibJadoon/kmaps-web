// ─── Quran Cybernetics — API models ──────────────────────────────────────────
// Mirror the frozen /core/cyb/* + /al/staging/* contract. Every field is a live
// read from km_core.cyb_* / km_arabic_linguistic.ar_ling_*. See cyb.service.ts.

export interface CountRow { key: string; n: number }

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
  children: CybNode[];
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

/** A surah from the QR corpus (GET /qr/surahs) — the Qurʾān-centric spine. */
export interface Surah {
  id: number;
  name_ar: string;
  name_en: string;
  name_transliteration: string;
  revelation_type: 'makki' | 'madani' | string;
  ayah_count: number;
  juz_start?: number;
  page_start?: number;
}

/** A study passage (unit) from the canonical Surah Study module
 *  (GET /qr/study/surahs/:id). Each carries which study steps exist. */
export interface StudyUnit {
  passage_id: string;
  passage_no: number;
  ayah_from: number;
  ayah_to: number;
  start_ref: string;
  end_ref: string;
  label: string;
  theme: string | null;
  reading: { has: number };
  vocabulary: { nouns: number; verbs: number; total: number };
  sentence_structure: { has: number };
  expressions: { has: number };
  passage_structure: { has: number };
}
export interface StudyGrid {
  surah: { surah_id: number; name_ar: string | null; name_en: string | null };
  units: StudyUnit[];
}

export interface CybConfigEntry { value: string; note: string | null }

export interface CybMonitor {
  config: Record<string, CybConfigEntry>;
  loop: {
    sensors: number; disturbances: number; jobs: number;
    jobs_ready: number; jobs_blocked: number; jobs_done: number;
    nodes: number; gauges: number;
  };
  gauges: CybGauge[];
  ticks: CybTick[];
  disturbances: { total: number; by_severity: CountRow[]; by_kind: CountRow[] };
  jobs: { by_readiness: CountRow[]; list: CybJob[] };
  sensors: { total: number; by_state: CountRow[]; by_axis: CountRow[] };
  nodes: { by_scale: CountRow[] };
  sources: { by_coverage: CountRow[] };
}

export interface CybNodeDetail {
  node: CybNode;
  sensors: CybSensor[];
  jobs: CybJob[];
  gauges: CybGauge[];
  children: CybNode[];
}

// ── AL staging spine ──
export interface SubLayer {
  sub_code: string; band: number; band_key: string; band_name_en: string | null;
  name_ar: string; name_en: string; name_ur: string | null;
  scope_level: string; discipline: string; produced_by: string;
  fill_state: string; display_order: number;
}
export interface StageCell { root_norm: string; sub_code: string; n: number; promoted: number }
export interface RootRollup { root_norm: string; staged: number; promoted: number; layers: number }

export interface StagingSummary {
  counts: { staged: number; promoted: number; roots: number; sub_layers: number; memlets: number; questions: number };
  by_status: { status: string; n: number }[];
  roots: RootRollup[];
  sub_layers: SubLayer[];
}
export interface StagingMatrix { cells: StageCell[]; sub_layers: SubLayer[]; roots: RootRollup[] }
