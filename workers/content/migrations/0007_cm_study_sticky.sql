-- The brainstorm board of a study (owner, 2026-10-31: "Miro style … brainstorming shared between Ali and me").
-- A study's talking points are frames (their text stays in each person's points deck); the stickies on them are
-- here: a question or an idea, by one of the study's people or by Claude (author_ref 'claude', drawn from the
-- passage's resources, with `source` naming them). The questions in each person's questions deck are shown on
-- the board too, read from the deck, never copied here.
CREATE TABLE IF NOT EXISTS cm_study_sticky (
  sticky_id   TEXT PRIMARY KEY,
  study_id    TEXT NOT NULL,
  point_key   TEXT NOT NULL,
  author_ref  TEXT NOT NULL,                     -- a core_user_ref, or 'claude'
  kind        TEXT NOT NULL DEFAULT 'question',  -- question · idea
  text        TEXT NOT NULL,
  note        TEXT,                              -- what the source says, shown when the sticky is opened
  source      TEXT,                              -- e.g. ابن عاشور · الآلوسي
  seq         INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at  TEXT
);
CREATE INDEX IF NOT EXISTS cm_study_sticky_point ON cm_study_sticky(study_id, point_key, seq);

-- A dot on a sticky: "this one for the episode". sticky_ref is a sticky_id, or deck:<slug>:<slide>:<n> for a
-- question that lives in a deck.
CREATE TABLE IF NOT EXISTS cm_study_sticky_vote (
  study_id    TEXT NOT NULL,
  sticky_ref  TEXT NOT NULL,
  user_ref    TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (study_id, sticky_ref, user_ref)
);
