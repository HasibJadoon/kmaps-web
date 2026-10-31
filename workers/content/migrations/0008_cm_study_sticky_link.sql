-- A doc or a deck linked to a sticky on the brainstorm board (owner, 2026-10-31: "can link docs or slides to any
-- note"). sticky_ref is a sticky_id, or deck:<slug>:<slide>:<n> for a question that lives in a deck, so any sticky
-- can carry links. open_type/open_ref are what a tap opens (essay · deck · note, as the study page's items);
-- open_at is the part it jumps to: an essay's section (1 = the first ## heading) or a deck's slide (0 = the first).
CREATE TABLE IF NOT EXISTS cm_study_sticky_link (
  study_id    TEXT NOT NULL,
  sticky_ref  TEXT NOT NULL,
  open_type   TEXT NOT NULL,
  open_ref    TEXT NOT NULL,
  open_at     INTEGER,
  label       TEXT NOT NULL,
  user_ref    TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (study_id, sticky_ref, open_type, open_ref)
);
