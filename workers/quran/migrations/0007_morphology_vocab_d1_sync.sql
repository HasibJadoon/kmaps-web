ALTER TABLE qr_lemmas ADD COLUMN wazn_ar TEXT;

CREATE TABLE IF NOT EXISTS qr_morph_display_roots (
  id                 TEXT PRIMARY KEY,
  root_ar            TEXT NOT NULL UNIQUE,
  root_display       TEXT,
  root_type          TEXT,
  frequency_quran    INTEGER,
  meaning_core_ar    TEXT,
  meaning_core_en    TEXT,
  meaning_core_ur    TEXT,
  hook_ar            TEXT,
  hook_en            TEXT,
  hook_ur            TEXT,
  family_json        JSON,
  lens_coverage_json JSON,
  senses_json        JSON,
  semantic_field     TEXT,
  section_icons_json JSON,
  is_anchor          INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'live',
  display_order      INTEGER NOT NULL DEFAULT 0,
  meta_json          JSON,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS qr_morph_display_lemmas (
  id            TEXT PRIMARY KEY,
  lemma_ref     TEXT NOT NULL UNIQUE,
  lemma_ar      TEXT NOT NULL,
  lemma_bare    TEXT,
  root_ar       TEXT,
  morphology_id TEXT,
  form_family_id TEXT,
  tier_key      TEXT,
  wazn_ar       TEXT,
  derived_type_ar TEXT, derived_type_en TEXT, derived_type_ur TEXT,
  gloss_ar TEXT, gloss_en TEXT, gloss_ur TEXT,
  total_occurrences INTEGER,
  first_surah   INTEGER, first_ayah INTEGER,
  is_anchor     INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'draft',
  display_order INTEGER NOT NULL DEFAULT 0,
  meta_json     JSON,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  form_roman    TEXT,
  form_ar       TEXT,
  verb_form_ar  TEXT
);
CREATE INDEX IF NOT EXISTS idx_mdl_root ON qr_morph_display_lemmas(root_ar);
CREATE INDEX IF NOT EXISTS idx_mdl_bare ON qr_morph_display_lemmas(lemma_bare);

CREATE TABLE IF NOT EXISTS qr_morph_display_media (
  id                 TEXT PRIMARY KEY,
  r2_key             TEXT NOT NULL UNIQUE,
  bucket             TEXT NOT NULL DEFAULT 'kmaps-media',
  kind               TEXT NOT NULL,
  mime               TEXT,
  root_ar            TEXT,
  surah_no           INTEGER, ayah_no INTEGER, word_index INTEGER,
  block_type         TEXT,
  alt_en             TEXT, alt_ar TEXT,
  source_kind        TEXT,
  source_url         TEXT,
  source_attribution TEXT,
  license            TEXT,
  sha256             TEXT,
  width_px           INTEGER, height_px INTEGER, duration_ms INTEGER,
  status             TEXT NOT NULL DEFAULT 'pending',
  meta_json          JSON,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_morph_media_word ON qr_morph_display_media(surah_no, ayah_no, word_index);
CREATE INDEX IF NOT EXISTS idx_morph_media_root ON qr_morph_display_media(root_ar, block_type);

CREATE TABLE IF NOT EXISTS qr_morph_form_tiers (
  tier_key     TEXT PRIMARY KEY,
  tier_order   INTEGER NOT NULL,
  arabic_name  TEXT NOT NULL,
  english_name TEXT,
  urdu_name    TEXT,
  icon         TEXT
);

CREATE TABLE IF NOT EXISTS qr_morph_form_families (
  id            TEXT PRIMARY KEY,
  family_order  INTEGER NOT NULL,
  kind          TEXT NOT NULL,
  roman         TEXT,
  verb_form_key TEXT,
  arabic_name   TEXT NOT NULL,
  english_name  TEXT,
  urdu_name     TEXT,
  wazn          TEXT,
  example_ar    TEXT,
  note_md       TEXT,
  icon          TEXT,
  status        TEXT NOT NULL DEFAULT 'live',
  tier          TEXT
);

ALTER TABLE qr_morph_display_sources ADD COLUMN title_ur       TEXT;
ALTER TABLE qr_morph_display_sources ADD COLUMN author_name_ur TEXT;
ALTER TABLE qr_morph_display_sources ADD COLUMN icon           TEXT;

ALTER TABLE qr_morph_display_words ADD COLUMN gloss_ur            TEXT;
ALTER TABLE qr_morph_display_words ADD COLUMN derived_type_ur     TEXT;
ALTER TABLE qr_morph_display_words ADD COLUMN pos_ur              TEXT;
ALTER TABLE qr_morph_display_words ADD COLUMN is_anchor           INTEGER NOT NULL DEFAULT 0;
ALTER TABLE qr_morph_display_words ADD COLUMN quran_meanings_json JSON;
ALTER TABLE qr_morph_display_words ADD COLUMN root_meaning_ar     TEXT;
ALTER TABLE qr_morph_display_words ADD COLUMN root_meaning_en     TEXT;
ALTER TABLE qr_morph_display_words ADD COLUMN form_ar             TEXT;
ALTER TABLE qr_morph_display_words ADD COLUMN sense_arc_en        TEXT;
ALTER TABLE qr_morph_display_words ADD COLUMN sense_range_en      TEXT;
ALTER TABLE qr_morph_display_words ADD COLUMN verb_form_ar        TEXT;
ALTER TABLE qr_morph_display_words ADD COLUMN lemma_ref           TEXT;

ALTER TABLE qr_morph_display_blocks ADD COLUMN registers_json JSON;
ALTER TABLE qr_morph_display_blocks ADD COLUMN media_r2_key   TEXT;
ALTER TABLE qr_morph_display_blocks ADD COLUMN media_kind     TEXT;
ALTER TABLE qr_morph_display_blocks ADD COLUMN media_alt      TEXT;
