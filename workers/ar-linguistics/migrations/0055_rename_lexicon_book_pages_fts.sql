-- 0055 — Rename ar_ling_lexicon_book_pages and repoint its FTS index (phase 5).
--
-- 12,976 rows. THIS IS THE ONLY PART OF THE REFACTOR THAT RENAME CANNOT DO
-- ON ITS OWN.
--
-- fts5 stores its external-content pointer as a module argument, not a parsed
-- table reference, so ALTER TABLE RENAME leaves `content='ar_ling_lexicon_book_pages'`
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

DROP TRIGGER IF EXISTS trig_albp_fts_ad;
DROP TRIGGER IF EXISTS trig_albp_fts_ai;
DROP TRIGGER IF EXISTS trig_albp_fts_au;
DROP TABLE IF EXISTS ar_ling_lexicon_book_pages_fts;

ALTER TABLE "ar_ling_lexicon_book_pages" RENAME TO "ar_ling_lexicon_book_page";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_lexicon_book_page'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lexicon_book_pages';

CREATE VIRTUAL TABLE ar_ling_lexicon_book_page_fts USING fts5(
  clean_text, source_slug, root_norm,
  content='ar_ling_lexicon_book_page', content_rowid='rowid'
);

CREATE TRIGGER trig_albp_fts_ad
AFTER DELETE ON ar_ling_lexicon_book_page BEGIN
  INSERT INTO ar_ling_lexicon_book_page_fts(
    ar_ling_lexicon_book_page_fts,
    rowid, clean_text, source_slug, root_norm
  ) VALUES (
    'delete', old.rowid,
    COALESCE(old.clean_text, ''),
    old.source_slug,
    old.root_norm
  );
END;

CREATE TRIGGER trig_albp_fts_ai
AFTER INSERT ON ar_ling_lexicon_book_page BEGIN
  INSERT INTO ar_ling_lexicon_book_page_fts(
    rowid, clean_text, source_slug, root_norm
  ) VALUES (
    new.rowid,
    COALESCE(new.clean_text, ''),
    new.source_slug,
    new.root_norm
  );
END;

CREATE TRIGGER trig_albp_fts_au
AFTER UPDATE ON ar_ling_lexicon_book_page BEGIN
  INSERT INTO ar_ling_lexicon_book_page_fts(
    ar_ling_lexicon_book_page_fts,
    rowid, clean_text, source_slug, root_norm
  ) VALUES (
    'delete', old.rowid,
    COALESCE(old.clean_text, ''),
    old.source_slug,
    old.root_norm
  );
  INSERT INTO ar_ling_lexicon_book_page_fts(
    rowid, clean_text, source_slug, root_norm
  ) VALUES (
    new.rowid,
    COALESCE(new.clean_text, ''),
    new.source_slug,
    new.root_norm
  );
END;

INSERT INTO ar_ling_lexicon_book_page_fts(ar_ling_lexicon_book_page_fts) VALUES('rebuild');
