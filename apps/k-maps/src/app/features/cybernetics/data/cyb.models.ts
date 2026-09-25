export interface CountRow { key: string; n: number }

import type {
  CybNode, CybNodeTree, CybNodeDetail, CybNodeReading, CybSensor, CybGauge,
} from '@kmaps/contracts/cyb';

export type {
  CybNode, CybNodeTree, CybNodeDetail, CybNodeReading, CybSensor, CybGauge,
};
export { KNOWN_CYB_SCALES } from '@kmaps/contracts/cyb';

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
  vocabulary: { nouns: number; verbs: number; total: number; has: number };
  sentence_structure: { has: number };
  passage_structure: { has: number };
  tafsir: { has: number };
  worldview: { has: number };

  surah_structure: { has: number };
}
export interface StudyGrid {
  surah: { surah_id: number; name_ar: string | null; name_en: string | null };
  units: StudyUnit[];
}

export interface PassageRoot { root: string; occurrences: number; lemmas: number; first_ayah: number; first_word: number }

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
export interface RootClaim {
  id: string; sub_code: string; band: number; source_slug: string;
  claim_type: string; status: string; promoted_to_table: string | null;
  quote_ar: string | null; gloss_en: string | null; gloss_ur: string | null;
}
export interface RootMemlet {
  id: string; memlet_key: string; scope_level: string;
  title_ar: string | null; title_en: string | null; title_ur: string | null;
  body_ar: string | null; body_en: string | null; body_ur: string | null; status: string;
}
export interface RootQuestion {
  id: string; question_key: string;
  prompt_ar: string | null; prompt_en: string | null; prompt_ur: string | null;
  explanation_en: string | null; answer_json: string | null;
}

export interface RootOption {
  id: string; item_id: string;
  option_ar: string; option_en: string | null; option_ur: string | null;
  is_correct: number; distractor_kind: string | null;
  why_wrong_en: string | null; why_wrong_ar: string | null; sort_order: number;
}

export interface RootMedia {
  id: string; memlet_id: string; memlet_key: string | null;
  media_kind: string; r2_key: string; bucket: string;
  mime: string | null; duration_ms: number | null;
  reciter: string | null; qr_ref: string | null; status: string;
}

export interface MemletKind {
  memlet_key: string; name_ar: string; name_en: string; name_ur: string | null;
  modality: string; scope_level: string; display_order: number;
}

export interface QuestionKind {
  question_key: string; name_ar: string; name_en: string;
  memlet_key: string | null; response_kind: string;
  cognitive_level: string; difficulty_floor: number;
}
export interface RootDetail {
  root: string; claims: RootClaim[]; memlets: RootMemlet[];
  questions: RootQuestion[]; options: RootOption[]; media: RootMedia[];
  sub_layers: SubLayer[]; memlet_kinds: MemletKind[]; question_kinds: QuestionKind[];
}

export type CybAxis = 'build' | 'study' | 'content' | 'retention';
export const CYB_AXES: CybAxis[] = ['build', 'study', 'content', 'retention'];

export interface NodeReading {
  axis: CybAxis | string;
  pct: number;
  measured: number;
  stale: number;
  sensors: number;
  read_sensors: number;
}

export interface CybDomain {
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
  name_ar: string | null;
  name_en: string | null;
  name_ur: string | null;
  hint: string | null;
  db_name: string | null;
  color_hex: string | null;
  symbol: string | null;
  display_order: number;
}

export interface NodeCarrierRows {
  band_code: string;
  db_name: string;
  table_name: string;
  bind_col: string;
  rows: Record<string, unknown>[];

  total: number;
}

export interface LayerModelSub {
  sub_code: string;
  name_ar: string;
  name_en: string;
  name_ur: string | null;

  scope_level: string;
  discipline: string;
  card: string;
  produced_by: string;
  fill_state: string;
  carrier_state: string;
  tables: string[];
  display_order: number;
}

export interface LayerModelBand {
  scope: string;
  band: number;
  key: string;
  name_ar: string | null;
  name_en: string | null;
  subs: LayerModelSub[];
}

export interface LayerModelScope {
  key: string;
  code: string;
  name_ar: string;
  name_en: string;
  name_ur: string;
  note: string | null;
  layers: number;
  subs: number;
}

export interface LayerModel {
  scopes: LayerModelScope[];
  layers: LayerModelBand[];
}

export interface RootFillCell {
  sub_code: string;
  carrier_table: string;
  rows: number;
}

export interface RootCarrierRows {
  sub_code: string;
  carrier_table: string;
  bind_col: string;
  rows: Record<string, unknown>[];
  total: number;
}

export interface RootGloss {
  root_normalized: string;
  root_text: string;
  root_letters: string | null;
  root_type: string | null;
  frequency_quran: number | null;
  meaning_core_en: string | null;
  meaning_core_ar: string | null;
  meaning_core_ur: string | null;
}

export interface RootSense {
  id: string;
  root_norm: string;
  sense_key: string;
  gloss_ar: string | null;
  gloss_en: string | null;
  gloss_ur: string | null;
  is_core: number;
  status: string;
}

export interface SenseAttestation {
  id: string;
  target_type: string;
  target_id: string;
  source_slug: string;
  quote_ar: string | null;
  quote_en: string | null;
  locator: string | null;
  agreement: string;
  confidence: number | null;
}

export interface RootSenseBundle {
  root: string;
  senses: RootSense[];
  arcs: Record<string, unknown>[];
  steps: Record<string, unknown>[];
  attestations: SenseAttestation[];
}
