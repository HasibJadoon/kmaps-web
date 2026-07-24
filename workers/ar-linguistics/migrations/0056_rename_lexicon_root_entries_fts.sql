-- 0056 — Rename ar_ling_lexicon_root_entries and repoint its FTS index (phase 5).
--
-- 53,515 rows. THIS IS THE ONLY PART OF THE REFACTOR THAT RENAME CANNOT DO
-- ON ITS OWN.
--
-- fts5 stores its external-content pointer as a module argument, not a parsed
-- table reference, so ALTER TABLE RENAME leaves `content='ar_ling_lexicon_root_entries'`
-- pointing at a table that no longer exists. Measured consequences (D1 pragmas,
-- dryrun/rename_test_d1mode.py section B):
--     MATCH               still works
--     bm25() ranking      still works
--     reading a column    FAILS  — no such table
--     snippet()/highlight FAILS  — SQL logic error
--     'rebuild'           FAILS  — no such table
-- So search keeps finding rows and then errors when it tries to show them. The
-- index must be dropped and recreated against the new name.
--
-- Triggers are dropped first: RENAME would rewrite their ON clause to the new
-- table, but they also name the FTS table in their bodies, and that table is
-- being replaced.

DROP TRIGGER IF EXISTS trig_alre_fts_ad;
DROP TRIGGER IF EXISTS trig_alre_fts_ai;
DROP TRIGGER IF EXISTS trig_alre_fts_au;
DROP TABLE IF EXISTS ar_ling_lexicon_root_entries_fts;

ALTER TABLE "ar_ling_lexicon_root_entries" RENAME TO "ar_ling_lexicon_entry";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_lexicon_entry'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lexicon_root_entries';

CREATE VIRTUAL TABLE ar_ling_lexicon_entry_fts USING fts5(
  root_text,
  root_norm,
  source_slug,
  entry_text_ar,
  entry_text_en,
  raw_text,
  content='ar_ling_lexicon_entry',
  content_rowid='rowid'
);

CREATE TRIGGER trig_alre_fts_ad
AFTER DELETE ON ar_ling_lexicon_entry BEGIN
  INSERT INTO ar_ling_lexicon_entry_fts(
    ar_ling_lexicon_entry_fts,
    rowid, root_text, root_norm, source_slug,
    entry_text_ar, entry_text_en, raw_text
  ) VALUES (
    'delete',
    old.rowid, old.root_text, old.root_norm, old.source_slug,
    COALESCE(old.entry_text_ar, ''),
    COALESCE(old.entry_text_en, ''),
    COALESCE(old.raw_text, '')
  );
END;

CREATE TRIGGER trig_alre_fts_ai
AFTER INSERT ON ar_ling_lexicon_entry BEGIN
  INSERT INTO ar_ling_lexicon_entry_fts(
    rowid, root_text, root_norm, source_slug,
    entry_text_ar, entry_text_en, raw_text
  ) VALUES (
    new.rowid, new.root_text, new.root_norm, new.source_slug,
    COALESCE(new.entry_text_ar, ''),
    COALESCE(new.entry_text_en, ''),
    COALESCE(new.raw_text, '')
  );
END;

CREATE TRIGGER trig_alre_fts_au
AFTER UPDATE ON ar_ling_lexicon_entry BEGIN
  INSERT INTO ar_ling_lexicon_entry_fts(
    ar_ling_lexicon_entry_fts,
    rowid, root_text, root_norm, source_slug,
    entry_text_ar, entry_text_en, raw_text
  ) VALUES (
    'delete',
    old.rowid, old.root_text, old.root_norm, old.source_slug,
    COALESCE(old.entry_text_ar, ''),
    COALESCE(old.entry_text_en, ''),
    COALESCE(old.raw_text, '')
  );
  INSERT INTO ar_ling_lexicon_entry_fts(
    rowid, root_text, root_norm, source_slug,
    entry_text_ar, entry_text_en, raw_text
  ) VALUES (
    new.rowid, new.root_text, new.root_norm, new.source_slug,
    COALESCE(new.entry_text_ar, ''),
    COALESCE(new.entry_text_en, ''),
    COALESCE(new.raw_text, '')
  );
END;

INSERT INTO ar_ling_lexicon_entry_fts(ar_ling_lexicon_entry_fts) VALUES('rebuild');
