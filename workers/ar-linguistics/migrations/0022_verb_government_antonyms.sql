CREATE TABLE IF NOT EXISTS ar_ling_verb_government (
  id           TEXT PRIMARY KEY,
  root_norm    TEXT NOT NULL,
  verb_form    TEXT,
  verb_ar      TEXT NOT NULL,
  transitivity TEXT NOT NULL,
  harf         TEXT,
  meaning_en   TEXT,
  meaning_ar   TEXT,
  qr_ref       TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  source_ref   TEXT,
  status       TEXT NOT NULL DEFAULT 'draft',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_vgov_root ON ar_ling_verb_government(root_norm, sort_order);

CREATE TABLE IF NOT EXISTS ar_ling_root_antonyms (
  id            TEXT PRIMARY KEY,
  root_norm     TEXT NOT NULL,
  antonym_ar    TEXT NOT NULL,
  antonym_root  TEXT,
  antonym_en    TEXT,
  relation_kind TEXT NOT NULL DEFAULT 'antonym',
  note          TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  source_ref    TEXT,
  status        TEXT NOT NULL DEFAULT 'draft',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_rant_root ON ar_ling_root_antonyms(root_norm, sort_order);
