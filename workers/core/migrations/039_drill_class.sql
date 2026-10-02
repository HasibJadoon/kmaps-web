-- The Class: a passage (QR:SP:40:1-3) or an Arabic unit studied to completion as one
-- lesson, every drill in it, step after step. CORE keeps the learner's record of it, so
-- iOS and the Mac share it; the domain worker keeps what the class is (its steps, its
-- drills), CORE only what the learner did.
--
--   core_drill_class       one row per learner × scope: status, timing, rating, the steps' progress
--   core_drill_class_day   one row per day studied: the days-taken timeline, the streak
--   core_drill_class_item  every drill the class has met: first try, misses, the card it files
--
-- When the class is marked studied every item is filed to the SRS (its card_json, as
-- /core/srs/cards/bulk takes it), seeded Good when it was right the first time and Hard
-- when it needed perfecting.

CREATE TABLE IF NOT EXISTS core_drill_class (
  id               TEXT PRIMARY KEY,                 -- DCL:<ulid>
  user_ref         TEXT NOT NULL,
  scope_ref        TEXT NOT NULL,                    -- QR:SP:40:1-3 · AR:unit:<id>
  module           TEXT NOT NULL,                    -- QR · AR
  status           TEXT NOT NULL DEFAULT 'in_progress',   -- in_progress · studied
  started_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  last_at          TEXT,
  completed_at     TEXT,
  days_taken       INTEGER,                          -- calendar days, start → finish (both counted)
  active_days      INTEGER NOT NULL DEFAULT 0,       -- days with any drilling
  sessions         INTEGER NOT NULL DEFAULT 0,       -- sprints run
  active_seconds   INTEGER NOT NULL DEFAULT 0,
  items_total      INTEGER NOT NULL DEFAULT 0,       -- distinct drills met
  first_try_right  INTEGER NOT NULL DEFAULT 0,       -- of those, right the first time
  score            INTEGER,                          -- first-try accuracy, 0–100, when studied
  rating           INTEGER,                          -- 1–3 stars, when studied
  steps_json       TEXT NOT NULL DEFAULT '{}',       -- per node: {sprints:[done indices], of, stars, best, items, right, seconds}
  UNIQUE (user_ref, scope_ref)
);
CREATE INDEX IF NOT EXISTS idx_core_drill_class_user ON core_drill_class(user_ref, module, status);

CREATE TABLE IF NOT EXISTS core_drill_class_day (
  class_id   TEXT NOT NULL REFERENCES core_drill_class(id) ON DELETE CASCADE,
  day        TEXT NOT NULL,                          -- YYYY-MM-DD, the learner's day
  seconds    INTEGER NOT NULL DEFAULT 0,
  items      INTEGER NOT NULL DEFAULT 0,
  right      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (class_id, day)
);

CREATE TABLE IF NOT EXISTS core_drill_class_item (
  class_id    TEXT NOT NULL REFERENCES core_drill_class(id) ON DELETE CASCADE,
  item_ref    TEXT NOT NULL,                         -- the drill's id (its card's resource_ref when it has one)
  node_key    TEXT NOT NULL,                         -- the path node it was met in
  first_right INTEGER NOT NULL DEFAULT 0,            -- right the first time it was met
  misses      INTEGER NOT NULL DEFAULT 0,
  streak      INTEGER NOT NULL DEFAULT 0,            -- right answers in a row since the last miss
  state       TEXT NOT NULL DEFAULT 'right',         -- right · open (to perfect) · perfected
  card_json   TEXT,                                  -- the SRS card it files when the class is studied
  filed_card  TEXT,                                  -- the card it was filed as
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (class_id, item_ref)
);
CREATE INDEX IF NOT EXISTS idx_core_drill_class_item_open ON core_drill_class_item(class_id, state);
