-- 0098 — record the root binding on ar_ling_reg_table_map
--
-- These three columns exist in the deployed km_arabic_linguistic and carry real
-- data (144 rows bound, 44 of them 'direct'), but they were never written into
-- schema.sql or any migration. Rebuilding the database from the checked-in
-- schema therefore produced a table map without them.
--
-- That is not a cosmetic drift. `StagingRepo.rootFill()` selects root_bind and
-- root_bind_col and wraps the query in `.catch(() => [])`, so against a rebuilt
-- database it returns no rows at all — every carrierRows reads nil, and
-- RootSubReading.isFilled silently falls back to the sensors instead of the
-- carrier. The failure is invisible: no error, just every sub-layer reporting
-- the wrong fill. rootFill is the designated replacement for the whole staging
-- surface, so the schema has to declare what it depends on.
--
-- root_bind:     direct | via | none | unset — how the table reaches a root.
--                'unset' means unaudited, which is unknown, not empty.
-- root_bind_col: the column that carries the binding.
-- root_bind_note: why, in words, for the ones that are not obvious.

ALTER TABLE ar_ling_reg_table_map ADD COLUMN root_bind TEXT NOT NULL DEFAULT 'unset';
ALTER TABLE ar_ling_reg_table_map ADD COLUMN root_bind_col TEXT;
ALTER TABLE ar_ling_reg_table_map ADD COLUMN root_bind_note TEXT;
