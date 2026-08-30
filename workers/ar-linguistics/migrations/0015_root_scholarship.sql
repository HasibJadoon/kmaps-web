ALTER TABLE ar_ling_sources ADD COLUMN genre TEXT;

CREATE TABLE ar_ling_root_scholarship (
  id              TEXT PRIMARY KEY,

  source_id       TEXT NOT NULL,
  source_slug     TEXT,
  source_native_id TEXT,

  root_id         TEXT,
  root_norm       TEXT NOT NULL,
  root_text       TEXT,

  reading_kind    TEXT NOT NULL DEFAULT 'general',

  title_en        TEXT,
  title_ar        TEXT,
  body_md         TEXT,
  body_html       TEXT,
  body_plain      TEXT,

  comparanda_json TEXT,
  inscriptions_json TEXT,
  glosses_json    TEXT,
  citations_json  TEXT,

  page_no         INTEGER,
  page_range      TEXT,
  section_label   TEXT,

  parser_version  TEXT,
  import_batch_id TEXT,
  status          TEXT DEFAULT 'raw',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (source_id) REFERENCES ar_ling_sources(id),
  FOREIGN KEY (root_id)   REFERENCES ar_ling_roots(id)
);

CREATE INDEX idx_root_scholarship_root_norm ON ar_ling_root_scholarship(root_norm);
CREATE INDEX idx_root_scholarship_source    ON ar_ling_root_scholarship(source_id);
CREATE INDEX idx_root_scholarship_slug_root ON ar_ling_root_scholarship(source_slug, root_norm);
CREATE INDEX idx_root_scholarship_kind      ON ar_ling_root_scholarship(reading_kind);

CREATE TABLE ar_ling_vocab_scholarship (
  id              TEXT PRIMARY KEY,

  source_id       TEXT NOT NULL,
  source_slug     TEXT,
  source_native_id TEXT,

  lemma_id        TEXT,
  lemma_text      TEXT NOT NULL,
  lemma_norm      TEXT,
  root_norm       TEXT,

  reading_kind    TEXT NOT NULL DEFAULT 'general',

  title_en        TEXT,
  title_ar        TEXT,
  body_md         TEXT,
  body_html       TEXT,
  body_plain      TEXT,

  comparanda_json TEXT,
  citations_json  TEXT,

  page_no         INTEGER,
  page_range      TEXT,
  section_label   TEXT,

  parser_version  TEXT,
  import_batch_id TEXT,
  status          TEXT DEFAULT 'raw',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (source_id) REFERENCES ar_ling_sources(id),
  FOREIGN KEY (lemma_id)  REFERENCES ar_ling_lemmas(id)
);

CREATE INDEX idx_vocab_scholarship_lemma_norm ON ar_ling_vocab_scholarship(lemma_norm);
CREATE INDEX idx_vocab_scholarship_root_norm  ON ar_ling_vocab_scholarship(root_norm);
CREATE INDEX idx_vocab_scholarship_source     ON ar_ling_vocab_scholarship(source_id);

INSERT INTO ar_ling_root_scholarship (
  id, source_id, source_slug,
  root_id, root_norm, root_text,
  reading_kind,
  title_en, title_ar,
  body_md, body_html, body_plain,
  page_no, status, created_at
)
SELECT

  'rs_' || lower(hex(randomblob(8)))                AS id,
  e.source_id,
  e.source_slug,
  e.root_id,
  COALESCE(e.heading_norm, e.root_text)             AS root_norm,
  e.root_text,

  'qur_anic_hermeneutic'                            AS reading_kind,
  e.title_en,
  e.title_ar,
  COALESCE(e.gloss_en, e.summary_en, e.note_md)     AS body_md,
  NULL                                              AS body_html,
  COALESCE(e.gloss_en, e.summary_en)                AS body_plain,
  e.page_no,
  'imported'                                        AS status,
  COALESCE(e.created_at, datetime('now'))           AS created_at
FROM ar_ling_lexicon_entries e
WHERE e.source_id = 'SRC:ALJ:2026:EXCQRN';

DELETE FROM ar_ling_lexicon_entries WHERE source_id = 'SRC:ALJ:2026:EXCQRN';

UPDATE ar_ling_sources
   SET source_type = 'article',
       genre       = 'qur_anic_hermeneutic'
 WHERE id = 'SRC:ALJ:2026:EXCQRN';

UPDATE ar_ling_sources
   SET genre = CASE
     WHEN id IN ('SRC:KETABONLINE:MUFRADAT', 'SRC:KETABONLINE:UMDAT_AL_HUFFAZ')
       THEN 'classical_qur_lexicon'
     ELSE 'classical_lexicon'
   END
 WHERE source_type = 'lexicon' AND genre IS NULL;
