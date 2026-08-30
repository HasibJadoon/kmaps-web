-- ─── What people actually did ─────────────────────────────────────────────────
--
-- The bank holds content that nobody owns. This is the other half: one ledger
-- of what happened, for all three apps, for everybody.
--
-- ONE ledger, not three, and that is the whole long-term bet. A Duolingo lesson
-- attempt, a Kahoot round and an evening at the table are the same two rows
-- with different columns filled — so every scoreboard, every rating, every
-- "which question does the room keep failing" is a QUERY over this, rather than
-- a third table that has to be kept in step with the other two. The moment
-- scoring lives in the quiz's own tables, the path cannot be scored the same
-- way, and a shared scorecard becomes a union of things that do not mean the
-- same thing.
--
-- What makes it measurable:
--   · every response is a row — never a counter, so a number can always be
--     traced back to the answers that produced it
--   · latency is SERVER-stamped, because a client-reported elapsed is a
--     client-chosen score
--   · nothing is ever updated in place: a response is immutable, and a
--     correction is another row
--
-- What makes it multi-person: `room_code` and `mode`. Solo study, a live quiz
-- room and a dinner table are three modes of the same play, so N people
-- answering the same item in the same room are N rows that already join.

-- ── One play of one unit, by one person ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS core_bank_attempt (
  id            TEXT PRIMARY KEY,
  user_ref      TEXT NOT NULL,
  unit_ref      TEXT NOT NULL REFERENCES core_bank_unit(id),
  pack_ref      TEXT NOT NULL REFERENCES core_bank_pack(id),
  mode          TEXT NOT NULL DEFAULT 'solo'
                  CHECK (mode IN ('solo','live','table')),
  -- The room this play belonged to, when it was shared. Everyone in one round
  -- carries the same code, which is what makes a shared scorecard one GROUP BY.
  room_code     TEXT,
  started_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  finished_at   TEXT,
  score         REAL,                            -- 0..1, the fraction correct
  points        INTEGER NOT NULL DEFAULT 0,      -- speed-weighted
  xp            INTEGER NOT NULL DEFAULT 0,
  hearts_left   INTEGER,
  -- The one fact unlocking reads, and the only reason this table is not purely
  -- derivable from responses: passing is a threshold decision made once, and a
  -- later change to pass_threshold must not silently re-lock a finished unit.
  passed_at     TEXT
);
CREATE INDEX IF NOT EXISTS ix_bank_attempt_progress
  ON core_bank_attempt (user_ref, unit_ref, passed_at);
CREATE INDEX IF NOT EXISTS ix_bank_attempt_room ON core_bank_attempt (room_code);
CREATE INDEX IF NOT EXISTS ix_bank_attempt_pack ON core_bank_attempt (pack_ref, user_ref);

-- ── One answer to one item ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS core_bank_response (
  id            TEXT PRIMARY KEY,
  attempt_ref   TEXT NOT NULL REFERENCES core_bank_attempt(id) ON DELETE CASCADE,
  item_ref      TEXT NOT NULL REFERENCES core_bank_item(id),
  user_ref      TEXT NOT NULL,
  seq           INTEGER NOT NULL DEFAULT 0,
  response_json TEXT CHECK (response_json IS NULL OR json_valid(response_json)),
  -- NULL when the item is unscored. A poll and a conversation card have
  -- responses and no correctness, and that is not a missing value — it is the
  -- kind of item it is.
  is_correct    INTEGER,
  credit        REAL,                            -- partial marks, map_response
  latency_ms    INTEGER,                         -- server-measured
  points        INTEGER NOT NULL DEFAULT 0,
  hinted        INTEGER NOT NULL DEFAULT 0,
  -- The Table app: who this question was ASKED OF. On the response, not on the
  -- card — which is the bug migrations 026/027 left behind, where a card asked
  -- of two people on two evenings could only remember the second.
  respondent_ref  TEXT,
  respondent_name TEXT,
  answered_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS ix_bank_response_item ON core_bank_response (item_ref, is_correct);
CREATE INDEX IF NOT EXISTS ix_bank_response_user ON core_bank_response (user_ref, answered_at);
CREATE INDEX IF NOT EXISTS ix_bank_response_attempt ON core_bank_response (attempt_ref, seq);

-- ── Rating the question, not the person ──────────────────────────────────────
--
-- The other half of "scorable". A bank that only measures learners never finds
-- out that one of its questions is ambiguous — and an ambiguous question makes
-- every learner it touches look worse. `times_shown`/`times_correct` on the
-- item catch a question everyone fails; this catches the one people can answer
-- and still object to.
CREATE TABLE IF NOT EXISTS core_bank_item_feedback (
  id          TEXT PRIMARY KEY,
  item_ref    TEXT NOT NULL REFERENCES core_bank_item(id) ON DELETE CASCADE,
  user_ref    TEXT NOT NULL,
  rating      INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  flag        TEXT CHECK (flag IS NULL OR flag IN
                ('ambiguous','wrong_answer','too_easy','too_hard','typo','other')),
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  -- One standing verdict per person per item; saying it again replaces it.
  UNIQUE (item_ref, user_ref)
);

-- ── The accumulator, and why it is the one exception ─────────────────────────
--
-- Everything else here is derived on read, per the doctrine in learn.ts. XP and
-- a streak are the exception on purpose: they are game currency rather than
-- measurement. A streak has to survive the deletion of the attempts that made
-- it, and summing XP over a full history on every screen load is the wrong
-- shape for a number that only ever goes up.
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
