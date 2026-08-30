-- ─── The document is kept ─────────────────────────────────────────────────────
--
-- The pack is imported into normalised rows because that is what a query can
-- read — the app is fed from tables, not from a blob. But the DOCUMENT that was
-- imported is itself worth keeping in the database, for three reasons:
--
--   · the bank can be rebuilt from the last import without the file
--   · a re-import can diff against what was actually loaded, rather than
--     against whatever is in the working tree
--   · the file may be edited on a phone, in a chat, or by a generator — none of
--     which have a repo to commit to
--
-- So: JSON in a table, feeding an app that reads rows.
ALTER TABLE core_bank_import ADD COLUMN source_json TEXT;

-- The last document that successfully built this pack. Denormalised on purpose:
-- "show me what this pack is made of" should not have to walk the import ledger.
ALTER TABLE core_bank_pack ADD COLUMN source_json TEXT;
ALTER TABLE core_bank_pack ADD COLUMN source_format TEXT;
