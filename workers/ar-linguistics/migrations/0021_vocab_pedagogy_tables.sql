CREATE TABLE IF NOT EXISTS ar_ling_vocab_memory_hooks (
  id          TEXT PRIMARY KEY,
  root_norm   TEXT NOT NULL,
  sense_id    TEXT,
  scope_type  TEXT NOT NULL DEFAULT 'root',
  hook_kind   TEXT NOT NULL DEFAULT 'sound',
  hook_md     TEXT NOT NULL,
  anchor_word TEXT,
  source_ref  TEXT,
  status      TEXT NOT NULL DEFAULT 'draft',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_vmh_root ON ar_ling_vocab_memory_hooks(root_norm);

CREATE TABLE IF NOT EXISTS ar_ling_vocab_illustrations (
  id               TEXT PRIMARY KEY,
  root_norm        TEXT NOT NULL,
  sense_id         TEXT,
  scope_type       TEXT NOT NULL DEFAULT 'root',
  media_kind       TEXT NOT NULL DEFAULT 'svg',
  illustration_key TEXT,
  title            TEXT,
  caption_md       TEXT,
  svg_inline       TEXT,
  asset_url        TEXT,
  palette          TEXT,
  status           TEXT NOT NULL DEFAULT 'draft',
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_vill_root ON ar_ling_vocab_illustrations(root_norm);

CREATE TABLE IF NOT EXISTS ar_ling_vocab_diagrams (
  id           TEXT PRIMARY KEY,
  root_norm    TEXT NOT NULL,
  diagram_kind TEXT NOT NULL DEFAULT 'constellation',
  diagram_key  TEXT,
  title        TEXT,
  spec_json    TEXT NOT NULL,
  renderer_key TEXT,
  svg_cache    TEXT,
  status       TEXT NOT NULL DEFAULT 'draft',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_vdiag_root ON ar_ling_vocab_diagrams(root_norm);

CREATE TABLE IF NOT EXISTS ar_ling_vocab_exercises (
  id            TEXT PRIMARY KEY,
  root_norm     TEXT NOT NULL,
  sense_id      TEXT,
  scope_type    TEXT NOT NULL DEFAULT 'sense',
  exercise_kind TEXT NOT NULL,
  prompt_md     TEXT NOT NULL,
  options_json  TEXT,
  answer_key    TEXT NOT NULL,
  qr_ref        TEXT,
  difficulty    INTEGER NOT NULL DEFAULT 3,
  source_ref    TEXT,
  status        TEXT NOT NULL DEFAULT 'draft',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_vex_root ON ar_ling_vocab_exercises(root_norm);
