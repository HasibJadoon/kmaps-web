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
