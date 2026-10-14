-- A unit check, kept as dealt, so its score is computed here from the learner's answers — never taken on trust.
CREATE TABLE IF NOT EXISTS ar_unit_check (
  id         TEXT PRIMARY KEY,
  user_id    TEXT,
  unit_id    TEXT NOT NULL,
  items_json TEXT NOT NULL,          -- [{ id, answer }] as dealt
  score      INTEGER,                -- 0–100, once answered
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_unit_check_user ON ar_unit_check (user_id, unit_id);
