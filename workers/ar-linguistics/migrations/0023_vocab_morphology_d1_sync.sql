-- 0023_vocab_morphology_d1_sync.sql
-- =============================================================================
-- Purpose: bring a local km_arabic_linguistic DB (base schema.sql + migrations
--          0001–0022) up to the LIVE D1 shape for the Vocabulary / Morphology
--          domain, audited 2026-07-10.
--
-- Two parts:
--   PART 1 — net-new tables (CREATE TABLE IF NOT EXISTS): the grammatical
--            register, the memlet/question learning layer, word_sums, the D9
--            core tables, and learner state. None of these are produced by any
--            existing migration, so IF NOT EXISTS is purely defensive.
--   PART 2 — ALTER column top-ups on tables that DO exist but lack columns the
--            live schema added later. These target a DB built from the OLD
--            snapshot; if you rebuilt from the updated schema.sql (which already
--            carries these columns) SKIP part 2 — the columns are present.
--
-- SQLite/D1 has no "ADD COLUMN IF NOT EXISTS", so Part 2 must run exactly once.
-- =============================================================================

-- ═══════════════════════════ PART 1 — NET-NEW TABLES ════════════════════════

-- A. GRAMMATICAL REGISTER (24 categories · ~245 terms · trilingual) -----------
CREATE TABLE IF NOT EXISTS ar_ling_gram_categories (
  category_key TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  discipline TEXT NOT NULL, applies_to TEXT NOT NULL,
  is_closed INTEGER NOT NULL DEFAULT 1, display_order INTEGER NOT NULL DEFAULT 0, icon TEXT
);
CREATE TABLE IF NOT EXISTS ar_ling_gram_terms (
  id TEXT PRIMARY KEY, category_key TEXT NOT NULL, term_key TEXT NOT NULL,
  qac_flag TEXT, parent_term_id TEXT, term_order INTEGER NOT NULL DEFAULT 0,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  short_ar TEXT, short_en TEXT, short_ur TEXT,
  definition_ar TEXT, definition_en TEXT, definition_ur TEXT,
  badge_color TEXT, icon TEXT, version INTEGER NOT NULL DEFAULT 1,
  superseded_by TEXT, status TEXT NOT NULL DEFAULT 'live',
  UNIQUE (category_key, term_key), UNIQUE (category_key, qac_flag),
  FOREIGN KEY (category_key) REFERENCES ar_ling_gram_categories(category_key),
  FOREIGN KEY (parent_term_id) REFERENCES ar_ling_gram_terms(id)
);
CREATE TABLE IF NOT EXISTS ar_ling_gram_term_relations (
  from_term_id TEXT NOT NULL, to_term_id TEXT NOT NULL, relation_kind TEXT NOT NULL,
  note_ar TEXT, note_en TEXT, note_ur TEXT,
  PRIMARY KEY (from_term_id, to_term_id, relation_kind)
);
CREATE TABLE IF NOT EXISTS ar_ling_gram_term_examples (
  id TEXT PRIMARY KEY, term_id TEXT NOT NULL, example_ar TEXT NOT NULL,
  gloss_en TEXT, gloss_ur TEXT, example_kind TEXT NOT NULL DEFAULT 'quran',
  qr_ref TEXT, source_ref TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (term_id) REFERENCES ar_ling_gram_terms(id)
);
CREATE TABLE IF NOT EXISTS ar_ling_gram_term_sources (
  term_id TEXT NOT NULL, source_slug TEXT NOT NULL, page_ref TEXT,
  PRIMARY KEY (term_id, source_slug)
);

-- B. SARF ENGINE additions ---------------------------------------------------
CREATE TABLE IF NOT EXISTS ar_ling_word_sums (
  id TEXT PRIMARY KEY, lemma_ar TEXT NOT NULL UNIQUE, root_norm TEXT NOT NULL,
  root_letters_json TEXT NOT NULL, wazn_ar TEXT NOT NULL, form_family_key TEXT,
  zawaid_json TEXT, operation_key TEXT,
  operation_ar TEXT, operation_en TEXT, operation_ur TEXT,
  surface_form_ar TEXT NOT NULL, underlying_form_ar TEXT, inflection_class_key TEXT,
  rule_ar TEXT, rule_en TEXT, rule_ur TEXT,
  source_slug TEXT NOT NULL, source_ref TEXT, status TEXT NOT NULL DEFAULT 'draft',
  FOREIGN KEY (root_norm) REFERENCES ar_ling_roots(root_normalized)
);

-- C. D9 CORE TABLES for usage_map / development display blocks ----------------
CREATE TABLE IF NOT EXISTS ar_ling_root_sense_axes (
  id TEXT PRIMARY KEY, root_norm TEXT NOT NULL, axis_key TEXT NOT NULL,
  axis_ar TEXT, axis_en TEXT, axis_ur TEXT,
  weight INTEGER NOT NULL DEFAULT 0 CHECK (weight BETWEEN 0 AND 3),
  basis_json TEXT CHECK (basis_json IS NULL OR json_valid(basis_json)),
  note_en TEXT, source_slug TEXT NOT NULL DEFAULT 'kmaps_usage_map',
  status TEXT NOT NULL DEFAULT 'draft', UNIQUE (root_norm, axis_key)
);
CREATE TABLE IF NOT EXISTS ar_ling_root_development_stages (
  id TEXT PRIMARY KEY, root_norm TEXT NOT NULL, stage_no INTEGER NOT NULL,
  stage_ar TEXT NOT NULL, stage_en TEXT, stage_ur TEXT, note_en TEXT,
  source_ref TEXT, source_slug TEXT NOT NULL DEFAULT 'kmaps_development',
  status TEXT NOT NULL DEFAULT 'draft', UNIQUE (root_norm, stage_no)
);

-- D. MEMLET / QUESTION LAYER -------------------------------------------------
CREATE TABLE IF NOT EXISTS ar_ling_memlet_kinds (
  memlet_key TEXT PRIMARY KEY, name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  purpose_ar TEXT, purpose_en TEXT, purpose_ur TEXT,
  modality TEXT NOT NULL, encoding_axis TEXT NOT NULL, scope_level TEXT NOT NULL,
  block_type TEXT, is_arabic_only INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0, icon TEXT
);
CREATE TABLE IF NOT EXISTS ar_ling_memlets (
  id TEXT PRIMARY KEY, memlet_key TEXT NOT NULL,
  scope_level TEXT NOT NULL CHECK (scope_level IN ('root','lemma')),
  scope_key TEXT NOT NULL, lemma_ar TEXT, root_norm TEXT NOT NULL,
  title_ar TEXT, title_en TEXT, title_ur TEXT, body_ar TEXT, body_en TEXT, body_ur TEXT,
  data_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(data_json)),
  media_r2_key TEXT, block_ref TEXT, difficulty INTEGER NOT NULL DEFAULT 3,
  is_synthesis INTEGER NOT NULL DEFAULT 1, source_slug TEXT NOT NULL, source_ref TEXT,
  confidence TEXT DEFAULT 'medium', status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (scope_level, scope_key, memlet_key),
  FOREIGN KEY (memlet_key) REFERENCES ar_ling_memlet_kinds(memlet_key),
  CHECK ((is_synthesis = 1 AND source_slug LIKE 'kmaps_%') OR (is_synthesis = 0 AND source_ref IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS ar_ling_memlet_media (
  id TEXT PRIMARY KEY, memlet_id TEXT NOT NULL, media_kind TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE, bucket TEXT NOT NULL DEFAULT 'kmaps-media',
  mime TEXT, duration_ms INTEGER, sha256 TEXT, reciter TEXT, qiraa TEXT, qr_ref TEXT,
  license TEXT, source_attribution TEXT, status TEXT NOT NULL DEFAULT 'pending',
  FOREIGN KEY (memlet_id) REFERENCES ar_ling_memlets(id)
);
CREATE TABLE IF NOT EXISTS ar_ling_memlet_mastery (
  id TEXT PRIMARY KEY, core_user_ref TEXT NOT NULL, lemma_ar TEXT NOT NULL, memlet_key TEXT NOT NULL,
  exposures INTEGER NOT NULL DEFAULT 0, correct INTEGER NOT NULL DEFAULT 0,
  encoding_score REAL NOT NULL DEFAULT 0, last_seen_at TEXT,
  UNIQUE (core_user_ref, lemma_ar, memlet_key)
);
CREATE TABLE IF NOT EXISTS ar_ling_question_kinds (
  question_key TEXT PRIMARY KEY, name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  memlet_key TEXT, response_kind TEXT NOT NULL, cognitive_level TEXT NOT NULL,
  difficulty_floor INTEGER NOT NULL DEFAULT 1, is_arabic_only INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (memlet_key) REFERENCES ar_ling_memlet_kinds(memlet_key)
);
CREATE TABLE IF NOT EXISTS ar_ling_question_items (
  id TEXT PRIMARY KEY, question_key TEXT NOT NULL, lemma_ar TEXT NOT NULL, root_norm TEXT NOT NULL,
  memlet_id TEXT, prompt_ar TEXT NOT NULL, prompt_en TEXT, prompt_ur TEXT,
  answer_json TEXT NOT NULL CHECK (json_valid(answer_json)),
  explanation_ar TEXT, explanation_en TEXT, explanation_ur TEXT,
  difficulty INTEGER NOT NULL DEFAULT 3, discrimination REAL,
  times_shown INTEGER NOT NULL DEFAULT 0, times_correct INTEGER NOT NULL DEFAULT 0,
  qr_ref TEXT, source_slug TEXT NOT NULL, source_ref TEXT,
  is_synthesis INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'draft',
  FOREIGN KEY (question_key) REFERENCES ar_ling_question_kinds(question_key),
  FOREIGN KEY (memlet_id) REFERENCES ar_ling_memlets(id)
);
CREATE TABLE IF NOT EXISTS ar_ling_question_distractors (
  id TEXT PRIMARY KEY, item_id TEXT NOT NULL,
  option_ar TEXT NOT NULL, option_en TEXT, option_ur TEXT,
  is_correct INTEGER NOT NULL DEFAULT 0, distractor_kind TEXT,
  why_wrong_ar TEXT, why_wrong_en TEXT, why_wrong_ur TEXT,
  source_ref TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (item_id) REFERENCES ar_ling_question_items(id)
);

-- E. LEARNER STATE -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS ar_ling_context_passages (
  id TEXT PRIMARY KEY, lemma_ar TEXT NOT NULL, passage_ar TEXT NOT NULL,
  passage_en TEXT, passage_ur TEXT, blank_index INTEGER NOT NULL DEFAULT 1,
  answer_ar TEXT NOT NULL, clue_kind TEXT, passage_kind TEXT NOT NULL DEFAULT 'quran',
  qr_ref TEXT, difficulty INTEGER NOT NULL DEFAULT 3,
  source_slug TEXT NOT NULL, source_ref TEXT, status TEXT NOT NULL DEFAULT 'draft'
);
CREATE TABLE IF NOT EXISTS ar_ling_exposure_log (
  id TEXT PRIMARY KEY, core_user_ref TEXT NOT NULL, lemma_ar TEXT NOT NULL,
  memlet_key TEXT, item_id TEXT, surface TEXT NOT NULL, qr_ref TEXT, outcome TEXT,
  latency_ms INTEGER, shown_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS ar_ling_lemma_difficulty (
  lemma_ar TEXT PRIMARY KEY, frequency_quran INTEGER, frequency_rank INTEGER,
  morph_opacity REAL, polysemy_count INTEGER, abstractness REAL, root_known_first INTEGER,
  computed_level INTEGER NOT NULL DEFAULT 3, computed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ═══════════════════════ PART 2 — ALTER COLUMN TOP-UPS ══════════════════════
-- Target: DB built from the OLD snapshot. Skip if rebuilt from updated schema.sql.

-- Morphology bundle keys (Gate 3 / D33)
ALTER TABLE ar_ling_morphology ADD COLUMN verb_form TEXT;
ALTER TABLE ar_ling_morphology ADD COLUMN root_type TEXT;
ALTER TABLE ar_ling_morphology ADD COLUMN qac_flags TEXT;
ALTER TABLE ar_ling_morphology ADD COLUMN pos       TEXT;
ALTER TABLE ar_ling_morphology ADD COLUMN mood      TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_morph_flags ON ar_ling_morphology(qac_flags, pos);

-- Root join key + transliteration (D31)
ALTER TABLE ar_ling_roots ADD COLUMN buckwalter      TEXT;
ALTER TABLE ar_ling_roots ADD COLUMN simple_lat      TEXT;
ALTER TABLE ar_ling_roots ADD COLUMN root_normalized TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_roots_norm ON ar_ling_roots(root_normalized);

-- Conjugation template re-keying (Gate 5 / D6)
ALTER TABLE ar_ling_conjugation_templates ADD COLUMN verb_form    TEXT;
ALTER TABLE ar_ling_conjugation_templates ADD COLUMN root_type    TEXT;
ALTER TABLE ar_ling_conjugation_templates ADD COLUMN weak_pattern TEXT;

-- verb_government → register link
ALTER TABLE ar_ling_verb_government ADD COLUMN transitivity_term_id TEXT;

-- memory hooks re-scope root → lemma (D26)
ALTER TABLE ar_ling_vocab_memory_hooks ADD COLUMN lemma_ar TEXT;

-- Urdu on the older reference tables (master doc I.5)
ALTER TABLE ar_ling_semantic_fields  ADD COLUMN field_name_ur   TEXT;
ALTER TABLE ar_ling_sentence_types   ADD COLUMN name_ur         TEXT;
ALTER TABLE ar_ling_expression_types ADD COLUMN name_ur         TEXT;
ALTER TABLE ar_ling_nahw_concepts    ADD COLUMN concept_name_ur TEXT;
ALTER TABLE ar_ling_nahw_concepts    ADD COLUMN definition_ur   TEXT;
ALTER TABLE ar_ling_balagha_concepts ADD COLUMN name_ur         TEXT;
ALTER TABLE ar_ling_balagha_concepts ADD COLUMN definition_ur   TEXT;

-- Urdu on the near-synonym leaves
ALTER TABLE ar_ling_near_synonym_sets    ADD COLUMN canonical_ur           TEXT;
ALTER TABLE ar_ling_near_synonym_members ADD COLUMN basic_gloss_ur         TEXT;
ALTER TABLE ar_ling_near_synonym_members ADD COLUMN contrast_note_ur       TEXT;
ALTER TABLE ar_ling_near_synonym_members ADD COLUMN usage_rule_ur          TEXT;
ALTER TABLE ar_ling_near_synonym_members ADD COLUMN quran_usage_pattern_ur TEXT;
ALTER TABLE ar_ling_near_synonym_members ADD COLUMN nuance_note_ur         TEXT;
