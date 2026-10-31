-- The three streams and their weekly sprints (owner, 2026-10-31: "3 streams — Qurʾān, WVs, Arabic — each queue its
-- backlog for a weekly sprint"). A stream names its queue (a sprint backlog in its own domain worker, drilled in
-- levels); a week's sprint is the units pulled from the queues, each to do, doing or done. A unit is its typed ref,
-- so a pick finds its study (meta_json.sprint.unit) without being tied to one.
CREATE TABLE IF NOT EXISTS cm_stream (
  stream_key   TEXT PRIMARY KEY,               -- qr · wv · ar
  title        TEXT NOT NULL,
  title_ar     TEXT,
  icon         TEXT,                           -- an SF Symbol
  accent       TEXT,                           -- #hex
  queue_module TEXT NOT NULL,                  -- the worker its queue is in
  queue_path   TEXT NOT NULL,                  -- the queue's top level (a sprint backlog path)
  sort_order   INTEGER NOT NULL DEFAULT 0,
  meta_json    TEXT
);

CREATE TABLE IF NOT EXISTS cm_sprint_pick (
  pick_id      TEXT PRIMARY KEY,
  stream_key   TEXT NOT NULL,
  week_start   TEXT NOT NULL,                  -- the Monday, YYYY-MM-DD
  unit         TEXT NOT NULL,                  -- its typed ref (QR:SP:40:4-5, WV:wv-tradition-liberalism)
  label        TEXT NOT NULL,
  title        TEXT,
  title_ar     TEXT,
  ref          TEXT,
  page_json    TEXT,                           -- its page: {module, path}
  down_json    TEXT,                           -- its own backlog, when it has one
  state        TEXT NOT NULL DEFAULT 'todo',   -- todo · doing · done
  seq          INTEGER NOT NULL DEFAULT 0,
  picked_by    TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (stream_key, week_start, unit)
);
CREATE INDEX IF NOT EXISTS cm_sprint_pick_week ON cm_sprint_pick(week_start, stream_key, seq);

-- The month's retro (owner, 2026-10-31: "1 month retro — 3 streams, four sprints"): what to keep, change and try,
-- for the month as a whole or one stream, added by the study's people (or Claude).
CREATE TABLE IF NOT EXISTS cm_sprint_retro (
  retro_id    TEXT PRIMARY KEY,
  month       TEXT NOT NULL,                  -- YYYY-MM
  stream_key  TEXT,                           -- null: the month as a whole
  kind        TEXT NOT NULL,                  -- keep · change · try
  text        TEXT NOT NULL,
  author_ref  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS cm_sprint_retro_month ON cm_sprint_retro(month, kind, created_at);
