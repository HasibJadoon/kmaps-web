-- ─── A question asked to a room ───────────────────────────────────────────────
--
-- Live quiz: a host pushes a question, everyone answers at once, the answer is
-- revealed, and the score board moves. Distinct from the SRS in every way that
-- matters, which is why it is its own tables rather than a mode of the review
-- engine:
--
--   SRS   one person, their own memory, scheduled over months
--   quiz  many people, the same question at the same second, scored on speed
--
-- Trying to make one table serve both would put `next_review_at` on a thing
-- nobody reviews and `points` on a thing nobody races.
--
-- Domain-agnostic on purpose: `module` is the five pillars (QR/AL/AR/WV/EN) and
-- `resource_ref` is whatever that pillar addresses — an ayah key, a lemma id, a
-- concept ref. A question about Hallaq and a question about 44:3 are the same
-- kind of row.

CREATE TABLE IF NOT EXISTS core_quiz_question (
  id            TEXT PRIMARY KEY,
  author_ref    TEXT NOT NULL,                    -- CORE:ULID → core_users
  module        TEXT NOT NULL CHECK (module IN ('QR','AL','AR','WV','EN','other')),
  domain        TEXT,                             -- concept domain, when it has one
  resource_ref  TEXT,                             -- "44:3", a lemma id, a concept ref
  prompt        TEXT NOT NULL,
  -- A JSON array of strings. Two to six of them; the count is what the client
  -- draws, so it is not fixed at four.
  options_json  TEXT NOT NULL CHECK (json_valid(options_json)),
  -- Index into options_json. Never sent to a player before the reveal.
  correct_index INTEGER NOT NULL,
  explanation   TEXT,
  -- How long the room gets. Speed is half the score, so the limit is part of
  -- the question rather than a session-wide setting.
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
  code         TEXT NOT NULL UNIQUE,              -- the six letters read out loud
  host_ref     TEXT NOT NULL,
  title        TEXT,
  module       TEXT,
  status       TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby','live','ended')),
  started_at   TEXT,
  ended_at     TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

-- One row per person per question. This is the record the dashboard reads, and
-- it is written when the answer is revealed rather than when it is given: a
-- Durable Object can be evicted, and a score that exists only in memory is a
-- score that will eventually be lost.
CREATE TABLE IF NOT EXISTS core_quiz_answer (
  id            TEXT PRIMARY KEY,
  session_ref   TEXT NOT NULL REFERENCES core_quiz_session(id) ON DELETE CASCADE,
  question_ref  TEXT NOT NULL,
  user_ref      TEXT NOT NULL,
  choice        INTEGER,                          -- NULL when they ran out of time
  correct       INTEGER NOT NULL DEFAULT 0,
  -- Milliseconds from the question appearing to the answer landing. Kept raw so
  -- the scoring rule can change without losing what actually happened.
  ms            INTEGER,
  points        INTEGER NOT NULL DEFAULT 0,
  answered_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE (session_ref, question_ref, user_ref)
);

CREATE INDEX IF NOT EXISTS ix_quiz_answer_session ON core_quiz_answer (session_ref);
CREATE INDEX IF NOT EXISTS ix_quiz_answer_user    ON core_quiz_answer (user_ref, answered_at);
