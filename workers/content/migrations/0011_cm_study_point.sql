-- A talking point added on the brainstorm board itself (owner, 2026-10-31: "arrange and create new"): a frame of
-- its own beside the points from the decks, signed by whoever added it, holding stickies like any other.
CREATE TABLE IF NOT EXISTS cm_study_point (
  point_key   TEXT PRIMARY KEY,               -- PT:<uuid>
  study_id    TEXT NOT NULL,
  title       TEXT NOT NULL,
  title_ar    TEXT,
  note        TEXT,
  author_ref  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at  TEXT
);
CREATE INDEX IF NOT EXISTS cm_study_point_study ON cm_study_point(study_id, created_at);
