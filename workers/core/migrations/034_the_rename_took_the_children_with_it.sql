DROP TABLE IF EXISTS core_bank_response_old;
ALTER TABLE core_bank_response RENAME TO core_bank_response_old;

CREATE TABLE core_bank_response (
  id            TEXT PRIMARY KEY,
  attempt_ref   TEXT NOT NULL REFERENCES core_bank_attempt(id) ON DELETE CASCADE,
  item_ref      TEXT NOT NULL REFERENCES core_bank_item(id),
  user_ref      TEXT NOT NULL,
  seq           INTEGER NOT NULL DEFAULT 0,
  response_json TEXT,
  is_correct    INTEGER,
  credit        REAL NOT NULL DEFAULT 0,
  latency_ms    INTEGER,
  points        INTEGER NOT NULL DEFAULT 0,
  hinted        INTEGER NOT NULL DEFAULT 0,
  respondent_ref  TEXT,
  respondent_name TEXT,
  answered_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

INSERT INTO core_bank_response
  (id, attempt_ref, item_ref, user_ref, seq, response_json, is_correct, credit,
   latency_ms, points, hinted, respondent_ref, respondent_name, answered_at, created_at)
SELECT id, attempt_ref, item_ref, user_ref, seq, response_json, is_correct, credit,
       latency_ms, points, hinted, respondent_ref, respondent_name, answered_at, created_at
  FROM core_bank_response_old;

DROP TABLE core_bank_response_old;

CREATE UNIQUE INDEX IF NOT EXISTS ux_bank_response_once
  ON core_bank_response (attempt_ref, item_ref);
CREATE INDEX IF NOT EXISTS ix_bank_response_attempt
  ON core_bank_response (attempt_ref, seq);
CREATE INDEX IF NOT EXISTS ix_bank_response_item
  ON core_bank_response (item_ref);
CREATE INDEX IF NOT EXISTS ix_bank_response_user
  ON core_bank_response (user_ref, answered_at DESC);
