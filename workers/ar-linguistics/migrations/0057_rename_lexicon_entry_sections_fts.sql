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
