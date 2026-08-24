// ─── Quran Cybernetics — API models ──────────────────────────────────────────
// Mirror the frozen /core/cyb/* + /al/staging/* contract. Every field is a live
// read from km_core.cyb_* / km_arabic_linguistic.ar_ling_*. See cyb.service.ts.

export interface CountRow { key: string; n: number }

export interface CybNode {
  id: string;
  domain: string;
  lane: string;
  parent_id: string | null;
  // quran lane: domain → surah → passage → stage → piece
  // doc lane:   domain → programme → unit → stage
  scale: 'domain' | 'programme' | 'surah' | 'passage' | 'unit' | 'stage' | 'piece' | string;
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

/** A unique root occurring in a passage's āyāt (GET .../passages/:no/roots). */
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

// ── Deep per-root drill (GET /al/staging/root/:root) ──
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
/** One MCQ option — the correct answer or a typed distractor with why_wrong. */
export interface RootOption {
  id: string; item_id: string;
  option_ar: string; option_en: string | null; option_ur: string | null;
  is_correct: number; distractor_kind: string | null;
  why_wrong_en: string | null; why_wrong_ar: string | null; sort_order: number;
}
/** A media asset catalogued against a memlet (image · video · audio). */
export interface RootMedia {
  id: string; memlet_id: string; memlet_key: string | null;
  media_kind: string; r2_key: string; bucket: string;
  mime: string | null; duration_ms: number | null;
  reciter: string | null; qr_ref: string | null; status: string;
}
/** Memlet layer family registry (16 kinds). */
export interface MemletKind {
  memlet_key: string; name_ar: string; name_en: string; name_ur: string | null;
  modality: string; scope_level: string; display_order: number;
}
/** Question layer family registry (11 kinds). */
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

// ─── The bridge ───────────────────────────────────────────────────────────────
// km_core holds the control plane; the work itself lives in the domain
// databases. These are the shapes the bridge returns — a node's reading, and
// what the carriers bound to it actually hold. The web read the tree and the
// monitor but never these, so a node's percentage had no visible evidence
// behind it; iOS has consumed them since the bridge landed.

/** One axis of one node: the single definition of a reading, served as itself. */
export interface CybReading {
  axis: 'build' | 'study' | 'content' | 'retention' | string;
  pct: number;
  /** 1 when a sensor actually measured this; 0 when the pct is a stored guess. */
  measured: number;
  stale: number;
  sensors: number;
  read_sensors: number;
}

/** Rows a single carrier table holds for a node — the work, not the summary. */
export interface CarrierRows {
  carrier: string;
  table_name?: string | null;
  source_db?: string | null;
  band_code?: string | null;
  total: number;
  rows: Record<string, unknown>[];
}

/** Carrier rows grouped under the band that declares them. */
export interface CarrierBandRows {
  band_code: string;
  band_name_ar?: string | null;
  band_name_en?: string | null;
  carriers: CarrierRows[];
}

/** What a step's work is done by: a layer, the skill that does it, the db. */
export interface ProcessStepLayer {
  step_uid: string;
  layer_uid: string | null;
  layer_key: string | null;
  layer_name_en: string | null;
  db_name: string | null;
  skill_slug: string | null;
  skill_name: string | null;
  skill_stages: string | null;
  role: string | null;
  note: string | null;
}

/**
 * What a step writes into, derived through the one bridge —
 * step → layer → cyb_carrier_binding → table. A step with a skill and no
 * carriers is a step that cannot be built, and the register says so.
 */
export interface StepCarrier {
  step_uid: string;
  db_name: string | null;
  table_name: string | null;
  band_code: string | null;
  scope_kind: string | null;
}

/** One ordered step of a registered study process. */
export interface StudyProcessStep {
  uid: string;
  process_uid: string;
  step_key: string;
  step_no: number;
  scope_kind: string;
  name_ar: string;
  name_en: string;
  name_ur: string | null;
  covers_md: string | null;
  key_info_md: string | null;
  /** Steps this one absorbed when the process was consolidated. */
  merged_from: string[];
  prereq: string[];
  layers: ProcessStepLayer[];
  carriers: StepCarrier[];
}

export interface StudyProcess {
  uid: string;
  domain: string | null;
  lane: string | null;
  scope_kind: string | null;
  name_ar: string | null;
  name_en: string | null;
  name_ur: string | null;
  note_md: string | null;
  steps: StudyProcessStep[];
}

/** The layer registry — the one taxonomy both clients read. */
export interface CybLayer {
  code: string;
  domain?: string | null;
  name_ar?: string | null;
  name_en?: string | null;
  scope_level?: string | null;
  seq?: number;
  status?: string;
}

// ─── The doc lane — episodes ─────────────────────────────────────────────────
// An episode is not a new kind of thing. It is a cyb_node of scale 'unit' in
// lane 'content', whose stages are its children and whose every stage points at
// a cm_documents row. Teaching and Document are the two halves: the stage says
// how far the work has got, the document is the work.

/** A cm_documents row as the episode surfaces read it. */
export interface CmDocument {
  doc_id: string;
  doc_type: string;            // episode | teaching_note | script | reference
  title: string;
  title_ar: string | null;
  slug: string | null;
  language: string | null;
  publication_state: string;
  domain: string | null;
  subdomain: string | null;
  surah: number | null;
  ayah_from: number | null;
  ayah_to: number | null;
  passage_ref: string | null;
  tags_json: string | null;
  meta_json: string | null;
  word_count: number | null;
  reading_time_min: number | null;
  created_at: string;
  updated_at: string;
}

/** One classical topic retold for one audience. */
export interface TeachingVariant {
  id: string;
  node_id: string;
  audience: string;            // kid | peer | youtube | …
  lang: string;
  title: string | null;
  body_md: string;
  duration_min: number | null;
  age_from: number | null;
  source_ids_json: string | null;
  example_ids_json: string | null;
  status: string;
  node_name_ar: string | null;
  node_name_en: string | null;
}

/** What an episode's meta_json carries — parsed, with nothing assumed present. */
export interface EpisodeMeta {
  series?: string;
  episode_no?: number;
  audience?: string;
  audiences?: string[];
  age_from?: number;
  parent_doc?: string;
  cyb_node?: string;
  teaching_variants?: string[];
  stack?: {
    ss?: string;
    grammar_node?: string;
    examples?: string[];
  };
  status_note?: string;
}
