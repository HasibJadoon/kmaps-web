-- A note's journey: brainstorm → draft → review → published, for any idea on a shelf (the Worldview shelf first).
-- A note may be a thread of another (parent_ref); publishing compiles a note and its threads into a read-only essay
-- (cm_documents doc_type 'essay', one markdown block) that the essay reader lays out. The stages are rows, not code.
ALTER TABLE cm_notes ADD COLUMN stage TEXT;
ALTER TABLE cm_notes ADD COLUMN parent_ref TEXT;
ALTER TABLE cm_notes ADD COLUMN published_doc_ref TEXT;
ALTER TABLE cm_notes ADD COLUMN published_at TEXT;
CREATE INDEX IF NOT EXISTS idx_cm_notes_stage ON cm_notes (core_user_ref, domain, stage);
CREATE INDEX IF NOT EXISTS idx_cm_notes_parent ON cm_notes (parent_ref);

CREATE TABLE IF NOT EXISTS cm_note_stage (
  domain_key TEXT NOT NULL,
  stage_key  TEXT NOT NULL,
  title      TEXT NOT NULL,
  title_ar   TEXT,
  hint       TEXT,            -- what this stage is for, in plain words
  empty_text TEXT,            -- what an empty stage says
  accent     TEXT,
  icon       TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (domain_key, stage_key)
);
INSERT OR REPLACE INTO cm_note_stage (domain_key, stage_key, title, title_ar, hint, empty_text, accent, icon, sort_order) VALUES
  ('worldview', 'brainstorm', 'Brainstorm', 'عَصْف ذِهْنِيّ',
   'Get the idea down, rough. Questions, hunches, sources to look up. Nothing here has to be right.',
   'No ideas yet. Tap the pencil and write the first one.', '#E6B800', 'lightbulb', 1),
  ('worldview', 'draft', 'Draft', 'مُسَوَّدَة',
   'Give the idea a shape: the question, your method, the threads it splits into. Add a thread note for each strand.',
   'Nothing drafted. Move a brainstorm here when it has a shape.', '#5AB0FF', 'doc.text', 2),
  ('worldview', 'review', 'Review', 'مُرَاجَعَة',
   'Mark every claim as evidenced, to check, or your own reading. Check the verses and sources. Cut what you cannot stand behind.',
   'Nothing in review. Move a draft here when it is complete.', '#C792EA', 'checklist', 3),
  ('worldview', 'published', 'Published', 'مَنْشُور',
   'Finished and set as a clean read. Reopen it any time to keep working; it goes back to review.',
   'Nothing published yet. Publish a piece that has passed review.', '#7DDC7D', 'checkmark.seal', 4);
