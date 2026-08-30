CREATE TABLE IF NOT EXISTS ar_ling_root_vocab (
  root_norm           TEXT PRIMARY KEY,
  root_text           TEXT NOT NULL,
  root_id             TEXT,
  five_lens_entry_id  TEXT,
  core_sense_en       TEXT,
  core_sense_ar       TEXT,
  membean_hook        TEXT,
  membean_anchors_json TEXT,
  illustration_key    TEXT,
  diagram_key         TEXT,
  unique_senses_json  TEXT,
  examples_json       TEXT,
  status              TEXT NOT NULL DEFAULT 'draft',
  first_surah         INTEGER,
  first_ayah          INTEGER,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ar_ling_vocab_depth (
  root_norm             TEXT PRIMARY KEY,
  transitivity          TEXT,
  masadir_json          TEXT,
  prep_meanings_json    TEXT,
  near_synonyms_json    TEXT,
  antonyms_json         TEXT,
  idioms_json           TEXT,
  nuance_gems_json      TEXT,
  key_term_synthesis_en TEXT,
  key_term_synthesis_ar TEXT,
  memory_hooks_json     TEXT,
  sources_json          TEXT,
  status                TEXT NOT NULL DEFAULT 'draft',
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (root_norm) REFERENCES ar_ling_root_vocab(root_norm)
);

CREATE TABLE IF NOT EXISTS ar_ling_vocab_srs (
  id               TEXT PRIMARY KEY,
  workspace_id     INTEGER NOT NULL DEFAULT 1,
  root_norm        TEXT NOT NULL,
  ease_factor      REAL NOT NULL DEFAULT 2.5,
  interval_days    INTEGER NOT NULL DEFAULT 0,
  reps             INTEGER NOT NULL DEFAULT 0,
  lapses           INTEGER NOT NULL DEFAULT 0,
  due_at           TEXT,
  last_grade       INTEGER,
  last_reviewed_at TEXT,
  status           TEXT NOT NULL DEFAULT 'new',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (workspace_id, root_norm)
);
CREATE INDEX IF NOT EXISTS idx_vocab_srs_due ON ar_ling_vocab_srs(workspace_id, due_at);
