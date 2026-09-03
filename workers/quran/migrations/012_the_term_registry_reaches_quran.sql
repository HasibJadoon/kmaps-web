CREATE TABLE IF NOT EXISTS qr_gram_term_ref (
  gram_term_ref  TEXT PRIMARY KEY,
  id             TEXT NOT NULL,
  category_key   TEXT NOT NULL,
  term_key       TEXT NOT NULL,
  qac_flag       TEXT,
  parent_term_id TEXT,
  term_order     INTEGER NOT NULL DEFAULT 0,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  short_ar TEXT, short_en TEXT, short_ur TEXT,
  definition_ar TEXT, definition_en TEXT, definition_ur TEXT,
  badge_color TEXT, icon TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  superseded_by TEXT,
  status TEXT NOT NULL DEFAULT 'live',
  discipline TEXT,
  name_bare TEXT,
  content_source TEXT NOT NULL DEFAULT 'AL:ar_ling_gram_term',
  content_synced_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE (category_key, term_key)
);
CREATE INDEX IF NOT EXISTS ix_qr_gram_term_category ON qr_gram_term_ref (category_key, term_order);

-- Rows are projected from km_arabic_linguistic.ar_ling_gram_term, which is the
-- term of record. 498 terms, keyed GT:{category_key}:{term_key}.
-- Re-run the projection with scripts/project-gram-terms.mjs.
