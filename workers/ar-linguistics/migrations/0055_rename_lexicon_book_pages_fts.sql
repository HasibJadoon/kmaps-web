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
