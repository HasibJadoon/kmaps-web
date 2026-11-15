-- Reading: the owner's log of what is being read and what has been read — each entry a note (domain 'reading')
-- linking the resources read, with the questions, notes, infographics and slides that belong to it. Read-only in
-- the app; Claude writes the entries. Two stages only: no plans, no backlog.
INSERT OR REPLACE INTO cm_note_stage (domain_key, stage_key, title, title_ar, hint, empty_text, accent, icon, sort_order) VALUES
  ('reading', 'reading', 'Reading now', 'أقرأ الآن',
   'What is open on the desk: the resources being read, and the questions and notes they are raising.',
   'Nothing open right now.', '#D8B657', 'book', 1),
  ('reading', 'read', 'Read', 'قرأت',
   'Finished: what was read, what it answered, and what it left open.',
   'Nothing finished yet.', '#7DDC7D', 'checkmark.seal', 2);
