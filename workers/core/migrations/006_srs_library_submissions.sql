CREATE TABLE IF NOT EXISTS core_srs_library_card (
  id            TEXT PRIMARY KEY,
  author_ref    TEXT NOT NULL,
  module        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_ref  TEXT NOT NULL,
  card_kind     TEXT,
  front_text    TEXT NOT NULL,
  back_text     TEXT,
  tags          TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  review_note   TEXT,
  reviewed_by   TEXT,
  reviewed_at   TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_srs_lib_lookup
  ON core_srs_library_card (status, module, resource_ref);

CREATE INDEX IF NOT EXISTS idx_srs_lib_author
  ON core_srs_library_card (author_ref, status);

CREATE INDEX IF NOT EXISTS idx_srs_lib_status
  ON core_srs_library_card (status, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_srs_lib_unique
  ON core_srs_library_card (author_ref, resource_ref, front_text);
