-- 0058 — Rename ar_ling_lexicon_blocks and repoint its FTS index (phase 5).
--
-- 1,004,356 rows. THIS IS THE ONLY PART OF THE REFACTOR THAT RENAME CANNOT DO
-- ON ITS OWN.
--
-- fts5 stores its external-content pointer as a module argument, not a parsed
-- table reference, so ALTER TABLE RENAME leaves `content='ar_ling_lexicon_blocks'`
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

DROP TRIGGER IF EXISTS trig_albk_fts_ad;
DROP TRIGGER IF EXISTS trig_albk_fts_ai;
DROP TRIGGER IF EXISTS trig_albk_fts_au;
DROP TABLE IF EXISTS ar_ling_lexicon_blocks_fts;

ALTER TABLE "ar_ling_lexicon_blocks" RENAME TO "ar_ling_lexicon_block";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_lexicon_block'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lexicon_blocks';

CREATE VIRTUAL TABLE ar_ling_lexicon_block_fts USING fts5(
  text_plain, title_ar, title_en, root_norm, source_slug, block_type,
  content='ar_ling_lexicon_block', content_rowid='rowid'
);

CREATE TRIGGER trig_albk_fts_ad
AFTER DELETE ON ar_ling_lexicon_block BEGIN
  INSERT INTO ar_ling_lexicon_block_fts(
    ar_ling_lexicon_block_fts,
    rowid, text_plain, title_ar, title_en, root_norm, source_slug, block_type
  ) VALUES (
    'delete', old.rowid,
    COALESCE(old.text_plain, ''),
    COALESCE(old.title_ar, ''),
    COALESCE(old.title_en, ''),
    old.root_norm,
    old.source_slug,
    old.block_type
  );
END;

CREATE TRIGGER trig_albk_fts_ai
AFTER INSERT ON ar_ling_lexicon_block BEGIN
  INSERT INTO ar_ling_lexicon_block_fts(
    rowid, text_plain, title_ar, title_en, root_norm, source_slug, block_type
  ) VALUES (
    new.rowid,
    COALESCE(new.text_plain, ''),
    COALESCE(new.title_ar, ''),
    COALESCE(new.title_en, ''),
    new.root_norm,
    new.source_slug,
    new.block_type
  );
END;

CREATE TRIGGER trig_albk_fts_au
AFTER UPDATE ON ar_ling_lexicon_block BEGIN
  INSERT INTO ar_ling_lexicon_block_fts(
    ar_ling_lexicon_block_fts,
    rowid, text_plain, title_ar, title_en, root_norm, source_slug, block_type
  ) VALUES (
    'delete', old.rowid,
    COALESCE(old.text_plain, ''),
    COALESCE(old.title_ar, ''),
    COALESCE(old.title_en, ''),
    old.root_norm,
    old.source_slug,
    old.block_type
  );
  INSERT INTO ar_ling_lexicon_block_fts(
    rowid, text_plain, title_ar, title_en, root_norm, source_slug, block_type
  ) VALUES (
    new.rowid,
    COALESCE(new.text_plain, ''),
    COALESCE(new.title_ar, ''),
    COALESCE(new.title_en, ''),
    new.root_norm,
    new.source_slug,
    new.block_type
  );
END;

-- REBUILD IS DELIBERATELY NOT RUN HERE.
-- 1,004,356 rows will not reindex inside a single D1 statement. Run it from the
-- worker in batches instead — kmaps-web/scripts/lane/rebuild-lane-fts.ts is an
-- existing batched driver for exactly this. Until it completes, MATCH returns
-- nothing for this index.
-- INSERT INTO ar_ling_lexicon_block_fts(ar_ling_lexicon_block_fts) VALUES('rebuild');
