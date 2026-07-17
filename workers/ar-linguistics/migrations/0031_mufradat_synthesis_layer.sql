-- 0031_mufradat_synthesis_layer.sql
-- Mufradat (al-Rāghib) reader gains a trilingual synthesis layer so the
-- Mufradat Reader design can render EN/UR alongside the verbatim Arabic.
--
--   • entry sections gain per-passage EN + UR translation HTML (trusted,
--     class-scoped: span.ar / span.r / b / i). Distinct from the plain
--     `text_en` column, which is a bare gloss when present.
--   • the root entry gains two JSON synthesis blobs:
--       family_json      — the "family at a glance" study-aid (meaning core,
--                           semantic poles + derived forms, derivation chain)
--       entry_gloss_json — entry-head trilingual gloss + typographic helpers
--
-- All new columns are nullable/additive: existing reads keep working, and the
-- composer surfaces AR-only when a root has no synthesis yet.

ALTER TABLE ar_ling_lexicon_entry_sections ADD COLUMN translation_en TEXT;
ALTER TABLE ar_ling_lexicon_entry_sections ADD COLUMN translation_ur TEXT;

ALTER TABLE ar_ling_lexicon_root_entries ADD COLUMN family_json TEXT
  CHECK (family_json IS NULL OR json_valid(family_json));
ALTER TABLE ar_ling_lexicon_root_entries ADD COLUMN entry_gloss_json TEXT
  CHECK (entry_gloss_json IS NULL OR json_valid(entry_gloss_json));
