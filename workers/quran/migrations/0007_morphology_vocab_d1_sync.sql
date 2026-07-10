-- 0007_morphology_vocab_d1_sync.sql
-- =============================================================================
-- Purpose: bring a locally-rebuilt km_quran DB up to the LIVE D1 shape for the
--          Qurʾān Vocabulary / Morphology study step. The repo migrations only
--          reached 0006 (which created qr_morph_display_sources / _words /
--          _blocks), but live D1 (audited 2026-07-10) also carries the ROOT and
--          LEMMA display tiers, the media table, the form register tables, and
--          several ALTER columns added after 0006. This migration reproduces
--          all of that verbatim so `wrangler d1 migrations apply` rebuilds a DB
--          that is byte-for-byte compatible with production.
--
-- Idempotency: net-new tables use CREATE TABLE IF NOT EXISTS. ALTER ADD COLUMN
--          statements run exactly once (wrangler tracks applied migrations in
--          d1_migrations), so they are safe on a fresh local DB. Do NOT hand-run
--          this file against a DB that already has these columns.
--
-- Tier model (Laws L2 / L4 from the master doc): a fact lives at exactly one
--          scope — root (بين) · lemma (مُبِين) · context (44:2 word 8) — and is
--          built once, then reused. These tables are the render-ready PROJECTION
--          of the canonical ar_ling_* truth in km_arabic_linguistic.
-- =============================================================================

------------------------------------------------------------------------------
-- 1. Column added to qr_lemmas after 0006 — the wazn join key (Gate 3 / D17).
--    Live D1: qr_lemmas.wazn_ar is now 4817/4817 non-NULL.
------------------------------------------------------------------------------
ALTER TABLE qr_lemmas ADD COLUMN wazn_ar TEXT;

------------------------------------------------------------------------------
-- 2. ROOT display tier — one row per Qurʾānic root (Tier 3, 1,642 total).
--    'MDR:بين'. Holds the render-ready root card: core sense, family, senses,
--    five-lens coverage, section icons. Projection of ar_ling_roots + root_dna.
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_morph_display_roots (
  id                 TEXT PRIMARY KEY,             -- 'MDR:بين'
  root_ar            TEXT NOT NULL UNIQUE,         -- 'بين'
  root_display       TEXT,                         -- 'ب ي ن'
  root_type          TEXT,                         -- 'ثلاثي'
  frequency_quran    INTEGER,
  meaning_core_ar    TEXT,
  meaning_core_en    TEXT,
  meaning_core_ur    TEXT,
  hook_ar            TEXT,
  hook_en            TEXT,
  hook_ur            TEXT,
  family_json        JSON,   -- [{ lemma_ar, pos, pos_icon, verb_form, is_quran_word }]
  lens_coverage_json JSON,   -- [{ key, label, icon, on }]
  senses_json        JSON,   -- ["…", …]
  semantic_field     TEXT,
  section_icons_json JSON,   -- { family, senses, hook, freq }  (lucide names)
  is_anchor          INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'live',
  display_order      INTEGER NOT NULL DEFAULT 0,
  meta_json          JSON,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

------------------------------------------------------------------------------
-- 3. LEMMA display tier — THE MISSING TIER in the master doc (Gate 7).
--    One row per lemma (Tier 2, 4,817 total). Keyed on qr_lemmas.id because
--    lemma_bare collides with the root (D30): بَيْن & بَيِّن both bare to بين.
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_morph_display_lemmas (
  id            TEXT PRIMARY KEY,            -- 'MDL:{bare}#{qr_lemmas.id[:8]}'
  lemma_ref     TEXT NOT NULL UNIQUE,        -- qr_lemmas.id (the real key)
  lemma_ar      TEXT NOT NULL,
  lemma_bare    TEXT,
  root_ar       TEXT,
  morphology_id TEXT,                        -- ar_ling_morphology bundle (km_arabic_linguistic)
  form_family_id TEXT,                       -- qr_morph_form_families.id
  tier_key      TEXT,                        -- qr_morph_form_tiers.tier_key
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

------------------------------------------------------------------------------
-- 4. MEDIA — R2-backed illustrations / audio for root & word blocks.
--    'MDM:بين:root_dna'. Lifecycle: pending → stored → live.
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_morph_display_media (
  id                 TEXT PRIMARY KEY,               -- 'MDM:بين:root_dna'
  r2_key             TEXT NOT NULL UNIQUE,           -- object key inside the bucket
  bucket             TEXT NOT NULL DEFAULT 'kmaps-media',
  kind               TEXT NOT NULL,                  -- 'image' | 'animation' | 'audio'
  mime               TEXT,
  root_ar            TEXT,
  surah_no           INTEGER, ayah_no INTEGER, word_index INTEGER,
  block_type         TEXT,                           -- links the asset to its block
  alt_en             TEXT, alt_ar TEXT,
  source_kind        TEXT,                           -- 'generated' | 'licensed' | 'public_domain'
  source_url         TEXT,
  source_attribution TEXT,
  license            TEXT,
  sha256             TEXT,
  width_px           INTEGER, height_px INTEGER, duration_ms INTEGER,
  status             TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'stored' | 'live'
  meta_json          JSON,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_morph_media_word ON qr_morph_display_media(surah_no, ayah_no, word_index);
CREATE INDEX IF NOT EXISTS idx_morph_media_root ON qr_morph_display_media(root_ar, block_type);

------------------------------------------------------------------------------
-- 5. FORM REGISTER — tiers (تجرّد/زيادة) and families (أبواب/صيغ).
--    Master doc widened tiers 2→4 (added رباعي) and families 17→21 (XI, XII,
--    رباعي). Live D1: qr_morph_form_tiers = 4 rows, qr_morph_form_families = 21.
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_morph_form_tiers (
  tier_key     TEXT PRIMARY KEY,
  tier_order   INTEGER NOT NULL,
  arabic_name  TEXT NOT NULL,
  english_name TEXT,
  urdu_name    TEXT,
  icon         TEXT
);

CREATE TABLE IF NOT EXISTS qr_morph_form_families (
  id            TEXT PRIMARY KEY,          -- 'FORM:IV' · 'BAB:nasara'
  family_order  INTEGER NOT NULL,          -- 1..N display order
  kind          TEXT NOT NULL,             -- 'form_i_bab' | 'derived_verb' | 'noun'
  roman         TEXT,                      -- 'I'..'X' (null for bāb/noun)
  verb_form_key TEXT,                      -- matches ar_ling_lemmas.verb_form
  arabic_name   TEXT NOT NULL,             -- 'إفعال' · 'تفعيل' · 'نصر'
  english_name  TEXT,                      -- 'Form IV — ifʿāl'
  urdu_name     TEXT,
  wazn          TEXT,                      -- 'أَفْعَلَ' · 'نَصَرَ يَنْصُرُ'
  example_ar    TEXT,                      -- 'نَصَرَ'
  note_md       TEXT,
  icon          TEXT,
  status        TEXT NOT NULL DEFAULT 'live',
  tier          TEXT                       -- FK-ish → qr_morph_form_tiers.tier_key
);

------------------------------------------------------------------------------
-- 6. Columns added to the 0006 display tables after they shipped.
--    These carry the richer word-card fields the modal binds to.
------------------------------------------------------------------------------
-- qr_morph_display_sources — trilingual + icon
ALTER TABLE qr_morph_display_sources ADD COLUMN title_ur       TEXT;
ALTER TABLE qr_morph_display_sources ADD COLUMN author_name_ur TEXT;
ALTER TABLE qr_morph_display_sources ADD COLUMN icon           TEXT;

-- qr_morph_display_words — Urdu, anchor, sense-arc, lemma pointer
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

-- qr_morph_display_blocks — media + multi-register payload added post-0006
ALTER TABLE qr_morph_display_blocks ADD COLUMN registers_json JSON;
ALTER TABLE qr_morph_display_blocks ADD COLUMN media_r2_key   TEXT;
ALTER TABLE qr_morph_display_blocks ADD COLUMN media_kind     TEXT;
ALTER TABLE qr_morph_display_blocks ADD COLUMN media_alt      TEXT;
