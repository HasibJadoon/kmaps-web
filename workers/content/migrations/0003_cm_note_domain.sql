-- The notes library's shelves: one row per domain a note can be filed under, with what the app shows for it.
-- The app draws only what is here (no domain names or colours in the client). Two for now: Qurʾān and Worldview.
CREATE TABLE IF NOT EXISTS cm_note_domain (
  domain_key  TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  title_ar    TEXT,
  subtitle    TEXT,
  accent      TEXT NOT NULL,          -- hex, the shelf's colour (slides palette)
  icon        TEXT,                   -- SF Symbol name
  sort_order  INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'live'
);
INSERT OR REPLACE INTO cm_note_domain (domain_key, title, title_ar, subtitle, accent, icon, sort_order) VALUES
  ('quran',     'Qurʾān',    'القرآن',      'Passages, key terms and the questions they raise', '#F2B233', 'book.closed', 1),
  ('worldview', 'Worldview', 'رؤية العالم', 'Syntheses across traditions, history and ideas',   '#4BA8A4', 'globe.europe.africa', 2);

-- file the notes that sat under no shelf: the worldview syntheses, and the كتب question (a Ghāfir key term)
UPDATE cm_notes SET domain = 'worldview' WHERE domain = 'notes' AND tags_json LIKE '%"worldview"%';
UPDATE cm_notes SET domain = 'quran' WHERE note_id = 'NOTE:كتب:open_axis';
