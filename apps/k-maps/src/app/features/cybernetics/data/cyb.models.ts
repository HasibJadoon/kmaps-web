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
  /** Per-axis: whether a sensor has actually read this axis. 0 is *unknown*,
   *  which is not the same as a measured zero — see `axisMeasured`. */
  build_measured?: number;
  study_measured?: number;
  content_measured?: number;
  retention_measured?: number;
  /** The build percent is carried from a superseded node: measured once, but no
   *  live sensor stands behind it now. */
  build_stale?: number;
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
  // The SIX registered steps of PRC:quran:surah_passage_study, exactly as the
  // grid endpoint sends them. This used to declare `expressions`, a legacy
  // task_type the server folded into `vocabulary` — so `u.expressions.has`
  // read `.has` of undefined, threw inside the passage @for, and left every
  // card after the throw rendered blank.
  reading: { has: number };
  vocabulary: { nouns: number; verbs: number; total: number; has: number };
  sentence_structure: { has: number };
  passage_structure: { has: number };
  tafsir: { has: number };
  worldview: { has: number };
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

// ── The four outputs ─────────────────────────────────────────────────────────

export type CybAxis = 'build' | 'study' | 'content' | 'retention';
export const CYB_AXES: CybAxis[] = ['build', 'study', 'content', 'retention'];

/** `v_cyb_node_reading` for one axis (GET /core/cyb/reading/:id). */
export interface NodeReading {
  axis: CybAxis | string;
  pct: number;
  measured: number;
  stale: number;
  sensors: number;
  read_sensors: number;
}

// ── The module registry (GET /core/cyb/domains) ──────────────────────────────
// One row per module of the console. `slug` matches `cyb_node.domain`, so a
// module's nodes are found by it. The dashboard's cards are this table.

export interface CybDomain {
  slug: string;
  lane: string;
  name_ar: string;
  name_en: string;
  name_ur: string | null;
  hint: string | null;
  /** Where the knowledge is built — Build senses this. */
  content_db: string;
  /** Where the learner's own state lives — Study and Retention sense this. */
  learner_db: string;
  /** What one unit of work is called here: a passage, a root, a concept. */
  unit_kind: string;
  color_hex: string | null;
  symbol: string | null;
  display_order: number;
  status: string;
}

// ── The layer registry (GET /core/cyb/layers) ────────────────────────────────
// The ONE taxonomy of stream-systems. The app used to carry its own list of
// six; the registry has `translation` that the list never had, and a layer the
// registry retires would have gone on rendering. Nothing here is authored in
// the app.

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

// ── What the carriers hold ───────────────────────────────────────────────────

/** One carrier's rows for a node, under the band that declares it
 *  (GET /core/cyb/rows/:id?layer=). This is the work itself — āyāt, sentences,
 *  renderings, tafsīr — as opposed to the control plane's own child nodes. */
export interface NodeCarrierRows {
  band_code: string;
  db_name: string;
  table_name: string;
  bind_col: string;
  rows: Record<string, unknown>[];
  /** What the carrier holds, against `rows.length`, which is what was sent. A
   *  truncated read has to say so rather than present a slice as the whole. */
  total: number;
}

// ── The AL carrier registry (GET /al/registry/*) ─────────────────────────────
// `ar_ling_stg_claim` was dropped on 2026-08-21 and `/al/staging/*` with it.
// A row is in its carrier or it does not exist, so the per-root reading is a
// live count off the carrier, never a stored claim count.

/** One registered sub-layer: a named slot with its own carrier table(s). */
export interface LayerModelSub {
  sub_code: string;
  name_ar: string;
  name_en: string;
  name_ur: string | null;
  /** The registry's own level, before the fold onto a scope tab: a *form* folds
   *  under lemma, a *letter* under root, so this can differ from the scope the
   *  sub-layer appears under. */
  scope_level: string;
  discipline: string;
  card: string;
  produced_by: string;
  fill_state: string;
  carrier_state: string;
  tables: string[];
  display_order: number;
}

/** One band of sub-layers inside a scope — a row in the Root Dashboard. */
export interface LayerModelBand {
  scope: string;
  band: number;
  key: string;
  name_ar: string | null;
  name_en: string | null;
  subs: LayerModelSub[];
}

/** One scope of the recursion — root · lemma · word — a tab in the dashboard. */
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

/** One carrier's live row count for a root. A sub_code absent from the list has
 *  no audited carrier binding: that is unknown, not zero. */
export interface RootFillCell {
  sub_code: string;
  carrier_table: string;
  rows: number;
}

/** A sub-layer carrier's actual rows for one root — the leaf screen. */
export interface RootCarrierRows {
  sub_code: string;
  carrier_table: string;
  bind_col: string;
  rows: Record<string, unknown>[];
  total: number;
}

/** One root's identity card from `ar_ling_roots` (GET /al/roots/glosses).
 *  The Quran worker names a passage's roots but cannot gloss them — the gloss
 *  lives in DB_AL — so the root grid reads all of its tiles' cards in one call.
 *  A root with no row here has no card: the tile says so rather than inventing
 *  one. */
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

/** A minted sense of a root (`ar_ling_root_sense`). */
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

/** Who said it — `ar_ling_sense_attestation`. `agreement` is the source's
 *  stance on the claim, not a quality score. */
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

/** GET /al/roots/:root/senses — the 360° sense layer in one read. */
export interface RootSenseBundle {
  root: string;
  senses: RootSense[];
  arcs: Record<string, unknown>[];
  steps: Record<string, unknown>[];
  attestations: SenseAttestation[];
}
