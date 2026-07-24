-- 0057 — Rename ar_ling_lexicon_entry_sections and repoint its FTS index (phase 5).
--
-- 101,201 rows. THIS IS THE ONLY PART OF THE REFACTOR THAT RENAME CANNOT DO
-- ON ITS OWN.
--
-- fts5 stores its external-content pointer as a module argument, not a parsed
-- table reference, so ALTER TABLE RENAME leaves `content='ar_ling_lexicon_entry_sections'`
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

DROP TRIGGER IF EXISTS trig_ales_fts_ad;
DROP TRIGGER IF EXISTS trig_ales_fts_ai;
DROP TRIGGER IF EXISTS trig_ales_fts_au;
DROP TABLE IF EXISTS ar_ling_lexicon_entry_sections_fts;

ALTER TABLE "ar_ling_lexicon_entry_sections" RENAME TO "ar_ling_lexicon_entry_section";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_lexicon_entry_section'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lexicon_entry_sections';

CREATE VIRTUAL TABLE ar_ling_lexicon_entry_section_fts USING fts5(
  root_text,
  root_norm,
  heading_ar,
  heading_norm,
  heading_bare,
  section_type,
  text_ar,
  text_en,
  content='ar_ling_lexicon_entry_section',
  content_rowid='rowid'
);

CREATE TRIGGER trig_ales_fts_ad
AFTER DELETE ON ar_ling_lexicon_entry_section BEGIN
  INSERT INTO ar_ling_lexicon_entry_section_fts(
    ar_ling_lexicon_entry_section_fts,
    rowid, root_text, root_norm,
    heading_ar, heading_norm, heading_bare,
    section_type, text_ar, text_en
  ) VALUES (
    'delete',
    old.rowid, old.root_text, old.root_norm,
    COALESCE(old.heading_ar, ''),
    COALESCE(old.heading_norm, ''),
    COALESCE(old.heading_bare, ''),
    COALESCE(old.section_type, ''),
    COALESCE(old.text_ar, ''),
    COALESCE(old.text_en, '')
  );
END;

CREATE TRIGGER trig_ales_fts_ai
AFTER INSERT ON ar_ling_lexicon_entry_section BEGIN
  INSERT INTO ar_ling_lexicon_entry_section_fts(
    rowid, root_text, root_norm,
    heading_ar, heading_norm, heading_bare,
    section_type, text_ar, text_en
  ) VALUES (
    new.rowid, new.root_text, new.root_norm,
    COALESCE(new.heading_ar, ''),
    COALESCE(new.heading_norm, ''),
    COALESCE(new.heading_bare, ''),
    COALESCE(new.section_type, ''),
    COALESCE(new.text_ar, ''),
    COALESCE(new.text_en, '')
  );
END;

CREATE TRIGGER trig_ales_fts_au
AFTER UPDATE ON ar_ling_lexicon_entry_section BEGIN
  INSERT INTO ar_ling_lexicon_entry_section_fts(
    ar_ling_lexicon_entry_section_fts,
    rowid, root_text, root_norm,
    heading_ar, heading_norm, heading_bare,
    section_type, text_ar, text_en
  ) VALUES (
    'delete',
    old.rowid, old.root_text, old.root_norm,
    COALESCE(old.heading_ar, ''),
    COALESCE(old.heading_norm, ''),
    COALESCE(old.heading_bare, ''),
    COALESCE(old.section_type, ''),
    COALESCE(old.text_ar, ''),
    COALESCE(old.text_en, '')
  );
  INSERT INTO ar_ling_lexicon_entry_section_fts(
    rowid, root_text, root_norm,
    heading_ar, heading_norm, heading_bare,
    section_type, text_ar, text_en
  ) VALUES (
    new.rowid, new.root_text, new.root_norm,
    COALESCE(new.heading_ar, ''),
    COALESCE(new.heading_norm, ''),
    COALESCE(new.heading_bare, ''),
    COALESCE(new.section_type, ''),
    COALESCE(new.text_ar, ''),
    COALESCE(new.text_en, '')
  );
END;

INSERT INTO ar_ling_lexicon_entry_section_fts(ar_ling_lexicon_entry_section_fts) VALUES('rebuild');
