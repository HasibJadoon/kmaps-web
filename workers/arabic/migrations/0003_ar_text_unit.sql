-- 0003_ar_text_unit.sql — km_arabic (DB_AR)
--
-- Reading needs text, and until now km_arabic had nowhere to put any. Works were
-- catalogued in ar_acquisition_ref with text_db/text_source_ref pointing outward
-- at a corpus that lives on someone's disk — fine for a catalogue, useless for a
-- reader.
--
-- One row per page of a work. Page is the right grain: it is what the printed
-- edition uses, what a locator cites, and roughly what a person reads in a
-- sitting. Chapters are recorded as a title on the page that opens them rather
-- than as a separate tree — Shamela's own TOC is page-anchored, and inventing a
-- deeper hierarchy would be inventing structure the source does not have.

CREATE TABLE IF NOT EXISTS ar_text_unit (
  id           TEXT PRIMARY KEY,              -- ARTX:<book_id>:<seq>
  acq_ref_id   TEXT NOT NULL REFERENCES ar_acquisition_ref(id),
  seq          INTEGER NOT NULL,              -- reading order within the work
  part_no      INTEGER,                       -- volume, where the edition has one
  page_no      INTEGER,                       -- printed page, for citation
  title_ar     TEXT,                          -- chapter heading, when this page opens one
  text_ar      TEXT NOT NULL,                 -- vocalised where the source vocalises
  char_count   INTEGER NOT NULL DEFAULT 0,
  word_count   INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'live',
  meta_json    TEXT NOT NULL DEFAULT '{}',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (acq_ref_id, seq)
);
CREATE INDEX IF NOT EXISTS idx_ar_text_work ON ar_text_unit(acq_ref_id, seq);
CREATE INDEX IF NOT EXISTS idx_ar_text_page ON ar_text_unit(acq_ref_id, page_no);

-- Full-text search over the reading shelf. Arabic needs the unicode61 tokeniser
-- with diacritics folded, or a vocalised search never matches an unvocalised query.
CREATE VIRTUAL TABLE IF NOT EXISTS ar_text_unit_fts USING fts5(
  text_ar,
  title_ar,
  content='ar_text_unit',
  content_rowid='rowid',
  tokenize="unicode61 remove_diacritics 2"
);

CREATE TRIGGER IF NOT EXISTS ar_text_unit_ai AFTER INSERT ON ar_text_unit BEGIN
  INSERT INTO ar_text_unit_fts(rowid, text_ar, title_ar)
  VALUES (new.rowid, new.text_ar, new.title_ar);
END;
CREATE TRIGGER IF NOT EXISTS ar_text_unit_ad AFTER DELETE ON ar_text_unit BEGIN
  INSERT INTO ar_text_unit_fts(ar_text_unit_fts, rowid, text_ar, title_ar)
  VALUES ('delete', old.rowid, old.text_ar, old.title_ar);
END;
