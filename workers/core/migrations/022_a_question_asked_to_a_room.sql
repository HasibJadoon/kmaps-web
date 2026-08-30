CREATE TABLE IF NOT EXISTS core_quiz_question (
  id            TEXT PRIMARY KEY,
  author_ref    TEXT NOT NULL,
  module        TEXT NOT NULL CHECK (module IN ('QR','AL','AR','WV','EN','other')),
  domain        TEXT,
  resource_ref  TEXT,
  prompt        TEXT NOT NULL,

  options_json  TEXT NOT NULL CHECK (json_valid(options_json)),

  correct_index INTEGER NOT NULL,
  explanation   TEXT,

  seconds       INTEGER NOT NULL DEFAULT 20,
  difficulty    TEXT,
  tags          TEXT,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','retired')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE INDEX IF NOT EXISTS ix_quiz_question_module ON core_quiz_question (module, status);
CREATE INDEX IF NOT EXISTS ix_quiz_question_ref    ON core_quiz_question (resource_ref);

CREATE TABLE IF NOT EXISTS core_quiz_session (
  id           TEXT PRIMARY KEY,
  code         TEXT NOT NULL UNIQUE,
  host_ref     TEXT NOT NULL,
  title        TEXT,
  module       TEXT,
  status       TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby','live','ended')),
  started_at   TEXT,
  ended_at     TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS core_quiz_answer (
  id            TEXT PRIMARY KEY,
  session_ref   TEXT NOT NULL REFERENCES core_quiz_session(id) ON DELETE CASCADE,
  question_ref  TEXT NOT NULL,
  user_ref      TEXT NOT NULL,
  choice        INTEGER,
  correct       INTEGER NOT NULL DEFAULT 0,

  ms            INTEGER,
  points        INTEGER NOT NULL DEFAULT 0,
  answered_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE (session_ref, question_ref, user_ref)
);

CREATE INDEX IF NOT EXISTS ix_quiz_answer_session ON core_quiz_answer (session_ref);
CREATE INDEX IF NOT EXISTS ix_quiz_answer_user    ON core_quiz_answer (user_ref, answered_at);
