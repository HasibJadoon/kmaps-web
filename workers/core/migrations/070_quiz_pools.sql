-- Quiz pools: the questions a round deals from, so the host need not choose each one (owner, 2026-10-20).
-- Pools are made for you from what you studied (a passage's drills, from core_drill_class) and from the path
-- (a course unit's bank questions, core_bank_unit_item); these are not stored — they are read when asked for.
-- Your own pools are stored here: a title and the questions you chose from those.
--   kind 'drill': a drill of a passage you studied (ref = its item_ref, scope = the class's scope_ref)
--   kind 'item' : a bank question (ref = core_bank_item.id)

CREATE TABLE IF NOT EXISTS core_quiz_pool (
  id          TEXT PRIMARY KEY,
  owner_ref   TEXT NOT NULL,
  title       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'archived')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_core_quiz_pool_owner ON core_quiz_pool (owner_ref, status);

CREATE TABLE IF NOT EXISTS core_quiz_pool_item (
  pool_ref    TEXT NOT NULL REFERENCES core_quiz_pool(id) ON DELETE CASCADE,
  seq         INTEGER NOT NULL DEFAULT 0,
  kind        TEXT NOT NULL CHECK (kind IN ('drill', 'item')),
  ref         TEXT NOT NULL,
  scope       TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (pool_ref, kind, ref, scope)
);

-- the pool picker's words
INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('quiz_pool', 'study', NULL, 'From what you studied', 'ممّا درست',  'A passage you studied: its drills',          'graduationcap.fill', '#81B29A', NULL, 1),
('quiz_pool', 'path',  NULL, 'From the path',          'من المسار',  'A unit of a course: its questions',          'point.topleft.down.to.point.bottomright.curvepath.fill', '#5DA9E9', NULL, 2),
('quiz_pool', 'mine',  NULL, 'Your pools',             'مجموعاتك',   'Questions you put together yourself',        'tray.full.fill',     '#D8B657', NULL, 3);
