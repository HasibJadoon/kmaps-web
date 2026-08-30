CREATE TABLE IF NOT EXISTS core_bank_attempt (
  id            TEXT PRIMARY KEY,
  user_ref      TEXT NOT NULL,
  unit_ref      TEXT NOT NULL REFERENCES core_bank_unit(id),
  pack_ref      TEXT NOT NULL REFERENCES core_bank_pack(id),
  mode          TEXT NOT NULL DEFAULT 'solo'
                  CHECK (mode IN ('solo','live','table')),

  room_code     TEXT,
  started_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  finished_at   TEXT,
  score         REAL,
  points        INTEGER NOT NULL DEFAULT 0,
  xp            INTEGER NOT NULL DEFAULT 0,
  hearts_left   INTEGER,

  passed_at     TEXT
);
CREATE INDEX IF NOT EXISTS ix_bank_attempt_progress
  ON core_bank_attempt (user_ref, unit_ref, passed_at);
CREATE INDEX IF NOT EXISTS ix_bank_attempt_room ON core_bank_attempt (room_code);
CREATE INDEX IF NOT EXISTS ix_bank_attempt_pack ON core_bank_attempt (pack_ref, user_ref);

CREATE TABLE IF NOT EXISTS core_bank_response (
  id            TEXT PRIMARY KEY,
  attempt_ref   TEXT NOT NULL REFERENCES core_bank_attempt(id) ON DELETE CASCADE,
  item_ref      TEXT NOT NULL REFERENCES core_bank_item(id),
  user_ref      TEXT NOT NULL,
  seq           INTEGER NOT NULL DEFAULT 0,
  response_json TEXT CHECK (response_json IS NULL OR json_valid(response_json)),

  is_correct    INTEGER,
  credit        REAL,
  latency_ms    INTEGER,
  points        INTEGER NOT NULL DEFAULT 0,
  hinted        INTEGER NOT NULL DEFAULT 0,

  respondent_ref  TEXT,
  respondent_name TEXT,
  answered_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS ix_bank_response_item ON core_bank_response (item_ref, is_correct);
CREATE INDEX IF NOT EXISTS ix_bank_response_user ON core_bank_response (user_ref, answered_at);
CREATE INDEX IF NOT EXISTS ix_bank_response_attempt ON core_bank_response (attempt_ref, seq);

CREATE TABLE IF NOT EXISTS core_bank_item_feedback (
  id          TEXT PRIMARY KEY,
  item_ref    TEXT NOT NULL REFERENCES core_bank_item(id) ON DELETE CASCADE,
  user_ref    TEXT NOT NULL,
  rating      INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  flag        TEXT CHECK (flag IS NULL OR flag IN
                ('ambiguous','wrong_answer','too_easy','too_hard','typo','other')),
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),

  UNIQUE (item_ref, user_ref)
);

CREATE TABLE IF NOT EXISTS core_bank_profile (
  user_ref      TEXT NOT NULL,
  pack_ref      TEXT NOT NULL REFERENCES core_bank_pack(id) ON DELETE CASCADE,
  xp            INTEGER NOT NULL DEFAULT 0,
  streak_days   INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  hearts        INTEGER,
  last_active_on TEXT,
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (user_ref, pack_ref)
);
