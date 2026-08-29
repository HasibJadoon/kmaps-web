-- 0006_st_scene_columns.sql — declare the eight columns that were applied by hand
--
-- These columns exist in production D1 and have existed for some time; the class
-- episode EP:44:P01:session is authored against them (5 scenes, 34 beats, 34
-- overlay payloads). They were never written as a migration, so a fresh database
-- built from the migration files got a schema the authored content could not
-- load into, and `scripts/regen_schemas.py` quietly laundered the hand-applied
-- ALTERs into schema.sql, where they read as if they had always been there.
--
-- This file is the declaration. It is written to be a no-op against production —
-- every column already exists there — and to bring a fresh database up to the
-- same shape. Run it once; `ALTER TABLE ... ADD COLUMN` is not idempotent in
-- SQLite, so a re-run against production will error on the first line, which is
-- the correct and visible outcome rather than a silent one.
--
-- WHAT THEY ARE FOR
--
-- An episode is planned in Studio and filmed one of three ways: a talking head
-- is solo and driven by talking points; a podcast is two or more people working
-- from the same points as reference; a lesson is a passage study rendered scene
-- by scene. `source_ref` is what makes the third measurable — it holds the same
-- string as `cyb_node.target_ref` in km_core ('QR:SP:44:1-9'), so cybernetics
-- can ask whether the study a scene renders is actually built before the scene
-- is filmed.

-- ── st_episodes — what the episode belongs to, and what it is about ──────────
ALTER TABLE st_episodes ADD COLUMN ecosystem   TEXT;  -- 'quran' | 'adab' | 'worldview'
ALTER TABLE st_episodes ADD COLUMN series_ref  TEXT;  -- → st_episodes.id of format 'series'
ALTER TABLE st_episodes ADD COLUMN session_no  INTEGER;
ALTER TABLE st_episodes ADD COLUMN output_kind TEXT;  -- 'long' | 'short' | …
ALTER TABLE st_episodes ADD COLUMN source_ref  TEXT;  -- the scope: 'QR:SP:44:1-9'

-- ── st_sections — a section IS a scene ──────────────────────────────────────
-- `type` already carries the scene key, and for a lesson its values are
-- cyb_process_step.step_key in km_core — 'reading', 'vocabulary',
-- 'sentence_structure', 'passage_structure', 'tafsir', 'worldview'. That
-- register is the authority; nothing is duplicated here.
ALTER TABLE st_sections ADD COLUMN overlay_kind TEXT;  -- 'ayah' | 'lexeme' | 'sentence'
ALTER TABLE st_sections ADD COLUMN d1_query     TEXT;  -- provenance ONLY — never executed

-- ── st_talking_points — the beat's scene payload ────────────────────────────
-- Frozen at authoring time on purpose: a take must not depend on a live fetch
-- part-way through a scene. The builder fills this from the study data; the
-- overlay stage renders it as-is.
ALTER TABLE st_talking_points ADD COLUMN overlay_json TEXT;

-- Episodes of a series, in order — the query the series screen makes.
CREATE INDEX IF NOT EXISTS idx_st_episodes_series ON st_episodes (series_ref, session_no);
-- "which episodes render this passage" — the join cybernetics measures through.
CREATE INDEX IF NOT EXISTS idx_st_episodes_source ON st_episodes (source_ref);

-- ── verify ──────────────────────────────────────────────────────────────────
--   SELECT id, format, source_ref,
--          (SELECT COUNT(*) FROM st_sections s WHERE s.episode_ref = e.id) scenes,
--          (SELECT COUNT(*) FROM st_talking_points p
--            WHERE p.episode_ref = e.id AND p.overlay_json IS NOT NULL) overlays
--     FROM st_episodes e WHERE id = 'EP:44:P01:session';
--   -- expect  lesson_passage | QR:SP:44:1-9 | 5 | 34
--
-- ── rollback ────────────────────────────────────────────────────────────────
-- Do not. The columns hold authored content in production; dropping them
-- discards the class episode's scenes. On a fresh database, drop the whole table.
