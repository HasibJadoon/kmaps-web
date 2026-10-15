-- qr_140 · A class's drills, kept (drill-engine plan §5).
-- A step's drills over a passage were drawn afresh by each read (several skills sample), so the path's
-- counts, a node's drills and the next day's draw could disagree: an item missed on day 1 could be
-- missing from day 2's draw, so Practice could not deal it back and the class could never be completed.
-- The first draw of a step over a passage is kept here and served from then on: a class is one edition
-- while it is studied. It is drawn again when the step's definition (its class_node row's extra_json)
-- changes, or when a passage's rows are deleted on purpose (to take in newly authored drills).
CREATE TABLE IF NOT EXISTS qr_class_pool (
  passage_id TEXT NOT NULL,
  step_key   TEXT NOT NULL,
  definition TEXT NOT NULL,       -- the step's class_node extra_json when drawn
  items_json TEXT NOT NULL,       -- the drills, in their order
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (passage_id, step_key)
);

-- the class routes' responses kept before this (each its own random draw) are rebuilt on their next read
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest';
