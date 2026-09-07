-- Where each reader is in each book, and what they marked — the shelf's
-- "currently reading", "read" and "my shelf" come from here, not from the
-- device. One row per (user, work); the JSON columns hold the small lists.
CREATE TABLE IF NOT EXISTS ar_reading_state (
  user_id         TEXT NOT NULL,
  work_id         TEXT NOT NULL REFERENCES ar_acquisition_ref(id),
  status          TEXT NOT NULL DEFAULT 'reading',   -- reading | read
  progress_seq    INTEGER,                           -- the page last open
  favourite       INTEGER NOT NULL DEFAULT 0,
  bookmarks_json  TEXT NOT NULL DEFAULT '[]',        -- [seq, ...]
  highlights_json TEXT NOT NULL DEFAULT '[]',        -- [{seq, text, at}, ...]
  opened_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, work_id)
);
CREATE INDEX IF NOT EXISTS ix_ar_reading_state_user ON ar_reading_state(user_id, updated_at DESC);
