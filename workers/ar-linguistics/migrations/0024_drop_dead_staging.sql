-- 0024_drop_dead_staging.sql
-- Applied to live D1 (km_arabic_linguistic) on 2026-07-10.
-- Drops two staging tables that (a) have ZERO references in worker code and
-- (b) are superseded per the master doc: vocab_depth_staging (decomposed, D25)
-- and vocab_exercises_staging (superseded by learn_question_*, D27).
-- Rollback DDL preserved below for recovery (D1 Time Travel also covers 30 days).

DROP TABLE IF EXISTS ar_ling_vocab_depth_staging;
DROP TABLE IF EXISTS ar_ling_vocab_exercises_staging;

-- ── ROLLBACK (recreate if needed) ──────────────────────────────────────────
-- CREATE TABLE ar_ling_vocab_depth_staging (
--   root_norm TEXT PRIMARY KEY, transitivity TEXT, masadir_json TEXT,
--   prep_meanings_json TEXT, near_synonyms_json TEXT, antonyms_json TEXT,
--   idioms_json TEXT, nuance_gems_json TEXT, key_term_synthesis_en TEXT,
--   key_term_synthesis_ar TEXT, memory_hooks_json TEXT, sources_json TEXT,
--   status TEXT NOT NULL DEFAULT 'draft',
--   created_at TEXT NOT NULL DEFAULT (datetime('now')),
--   updated_at TEXT NOT NULL DEFAULT (datetime('now')),
--   FOREIGN KEY (root_norm) REFERENCES ar_ling_root_vocab(root_norm)
-- );
-- CREATE TABLE ar_ling_vocab_exercises_staging (
--   id TEXT PRIMARY KEY, root_norm TEXT NOT NULL, sense_id TEXT,
--   scope_type TEXT NOT NULL DEFAULT 'sense', exercise_kind TEXT NOT NULL,
--   prompt_md TEXT NOT NULL, options_json TEXT, answer_key TEXT NOT NULL,
--   qr_ref TEXT, difficulty INTEGER NOT NULL DEFAULT 3, source_ref TEXT,
--   status TEXT NOT NULL DEFAULT 'draft',
--   created_at TEXT NOT NULL DEFAULT (datetime('now'))
-- );
