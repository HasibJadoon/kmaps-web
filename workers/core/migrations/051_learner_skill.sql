-- 051 · The learner's level per skill — the first piece of the learner model (plan A1: one model in CORE, no
-- per-app copies on the device). Each practice round of fresh and banked drills (reviews say nothing of the level)
-- moves its skill up a level at ≥ up, down at ≤ down, else keeps it; the levels themselves are the domain worker's.
CREATE TABLE IF NOT EXISTS core_learner_skill (
  user_ref   TEXT NOT NULL,
  module     TEXT NOT NULL,             -- AR · QR · WV …
  skill      TEXT NOT NULL,             -- the skill's key in its worker (fill, sarf, grammar …)
  level      TEXT NOT NULL,             -- the worker's level key (basic · middle · advanced …)
  rounds     INTEGER NOT NULL DEFAULT 0,
  last_right INTEGER, last_total INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_ref, module, skill)
);
