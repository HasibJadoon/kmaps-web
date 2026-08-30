-- ─── A round that has no unit ────────────────────────────────────────────────
--
-- Migration 030 opened with the claim that this is ONE ledger, not three: every
-- play of every app writes the same two rows, so "how is everyone doing" is one
-- GROUP BY rather than a union of things that do not mean the same thing.
--
-- It could not be. `unit_ref` is NOT NULL, and a quiz round and a table deck
-- have no units — routes/bank.ts:101 says so in as many words, and the pack
-- route serves their items straight off the pack. So two of the three apps had
-- no way to write to the ledger built for them, and the live quiz room went on
-- writing core_quiz_answer. The shared scorecard has never contained a quiz.
--
-- A unit is how a PATH round is scoped. A room is how a QUIZ round is scoped.
-- Both are packs. So the pack is the required part and the unit is the optional
-- one — which is what this says.
--
-- Rebuilt rather than ALTERed because SQLite cannot drop a NOT NULL. Safe to do
-- exactly now: core_bank_attempt holds 0 rows and core_bank_response, its only
-- child, holds 0 too. After the first evening of real play this migration costs
-- a careful copy; today it costs nothing.

DROP TABLE IF EXISTS core_bank_attempt_old;
ALTER TABLE core_bank_attempt RENAME TO core_bank_attempt_old;

CREATE TABLE core_bank_attempt (
  id            TEXT PRIMARY KEY,
  user_ref      TEXT NOT NULL,
  -- Optional now: a path lesson has one, a quiz round and a table evening do
  -- not. Nothing else about the row changes shape.
  unit_ref      TEXT REFERENCES core_bank_unit(id),
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
  passed_at     TEXT,
  -- A live round belongs to a room, and a room needs somewhere to say which
  -- question is currently up without the Durable Object being the only copy.
  -- Written by the room, read by anybody reconnecting to it.
  current_item_ref TEXT REFERENCES core_bank_item(id),
  -- Every mode must be scoped by something. A row with neither a unit nor a
  -- room is a round nobody could name afterwards.
  CHECK (unit_ref IS NOT NULL OR room_code IS NOT NULL)
);

INSERT INTO core_bank_attempt
  (id, user_ref, unit_ref, pack_ref, mode, room_code, started_at, finished_at,
   score, points, xp, hearts_left, passed_at)
SELECT id, user_ref, unit_ref, pack_ref, mode, room_code, started_at, finished_at,
       score, points, xp, hearts_left, passed_at
  FROM core_bank_attempt_old;

DROP TABLE core_bank_attempt_old;

-- The indexes the old table carried, plus the one 031 added.
CREATE INDEX IF NOT EXISTS ix_bank_attempt_user
  ON core_bank_attempt (user_ref, started_at DESC);
CREATE INDEX IF NOT EXISTS ix_bank_attempt_progress
  ON core_bank_attempt (user_ref, unit_ref, passed_at);
CREATE INDEX IF NOT EXISTS ix_bank_attempt_room
  ON core_bank_attempt (room_code) WHERE room_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_bank_attempt_unit
  ON core_bank_attempt (unit_ref);
CREATE INDEX IF NOT EXISTS ix_bank_attempt_pack
  ON core_bank_attempt (pack_ref, started_at DESC);
