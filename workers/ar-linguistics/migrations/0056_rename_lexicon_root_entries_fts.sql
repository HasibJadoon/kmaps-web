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
