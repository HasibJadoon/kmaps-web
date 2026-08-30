DROP TABLE IF EXISTS core_bank_attempt_old;
ALTER TABLE core_bank_attempt RENAME TO core_bank_attempt_old;

CREATE TABLE core_bank_attempt (
  id            TEXT PRIMARY KEY,
  user_ref      TEXT NOT NULL,

  unit_ref      TEXT REFERENCES core_bank_unit(id),
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

  passed_at     TEXT,

  current_item_ref TEXT REFERENCES core_bank_item(id),

  CHECK (unit_ref IS NOT NULL OR room_code IS NOT NULL)
);

INSERT INTO core_bank_attempt
  (id, user_ref, unit_ref, pack_ref, mode, room_code, started_at, finished_at,
   score, points, xp, hearts_left, passed_at)
SELECT id, user_ref, unit_ref, pack_ref, mode, room_code, started_at, finished_at,
       score, points, xp, hearts_left, passed_at
  FROM core_bank_attempt_old;

DROP TABLE core_bank_attempt_old;

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
