-- Where a sticky sits on the brainstorm board when it has been moved (owner, 2026-10-31: "brainstorming cards
-- dragging to re-arrange"). Any sticky — one added on the board, Claude's, or a question that lives in a deck
-- (deck:<slug>:<slide>:<n>) — can be dragged within its frame or to another; its frame and order are kept here.
CREATE TABLE IF NOT EXISTS cm_study_sticky_place (
  study_id    TEXT NOT NULL,
  sticky_ref  TEXT NOT NULL,
  point_key   TEXT NOT NULL,
  seq         INTEGER NOT NULL,
  moved_by    TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (study_id, sticky_ref)
);
