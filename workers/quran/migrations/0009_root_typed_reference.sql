-- 0009 — Typed AL reference for the Qurʾān root display layer (QR domain).
--
-- PROBLEM: qr_morph_display_roots re-stores root content that AL owns —
-- meaning_core_ar/en/ur, hook_ar/en/ur, family_json, senses_json,
-- semantic_field. That duplicates ar_ling_root_dna / ar_ling_root_vocab and
-- can drift. CLAUDE.md: "Do not duplicate canonical data across domains.
-- Store typed references instead."
--
-- WHY WE DON'T JUST DROP THOSE COLUMNS: cross-domain access is via Worker
-- service bindings, never cross-database SQL (QR cannot JOIN into km_arabic_
-- linguistic). So a render-ready projection in QR is the correct pattern for
-- the Morphology study step. The fix is to make the projection HONEST:
--   • add a typed source-of-truth pointer (al_root_ref = 'AL:<ar_ling_roots.id>')
--   • record that the content columns are a cache, and when it was synced
--   • treat AL as canonical; the QR row is a materialized view refreshed by the
--     ingestion/sync job through the AL service binding.
--
-- All columns are additive/nullable — existing reads keep working.

ALTER TABLE qr_morph_display_roots ADD COLUMN al_root_ref TEXT;      -- typed 'AL:<ar_ling_roots.id>'
ALTER TABLE qr_morph_display_roots ADD COLUMN content_source TEXT NOT NULL DEFAULT 'al_projection';
                                                                    -- 'al_projection' = cache of AL;
                                                                    -- 'qr_local' = intentionally QR-authored (rare)
ALTER TABLE qr_morph_display_roots ADD COLUMN content_synced_at TEXT;

CREATE INDEX IF NOT EXISTS idx_qr_mdr_al_ref ON qr_morph_display_roots(al_root_ref);

-- Backfill guidance (NOT runnable as cross-DB SQL here — the sync job does it):
--   qr_morph_display_roots.root_uid  ==  qr_root_registry.root_uid
--   qr_root_registry maps root_ar → root_uid → (in AL) ar_ling_roots via
--   canonical_id / root_normalized / buckwalter.
--   The AL-binding sync job resolves ar_ling_roots.id for each root_uid and
--   writes al_root_ref = 'AL:' || ar_ling_roots.id, then refreshes the cached
--   content columns from ar_ling_root_dna / ar_ling_root_vocab and stamps
--   content_synced_at = datetime('now').
--
-- Local-only rows (no AL match) keep content_source you set explicitly; leaving
-- al_root_ref NULL flags a root that AL has not yet canonicalized.
