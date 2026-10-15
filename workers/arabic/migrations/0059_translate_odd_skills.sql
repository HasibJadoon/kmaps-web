-- Phase 1.3 of the drill-engine plan: the Duolingo-style Arabic additions not yet dealt, drawn from the pool's own lines
-- (ar_practice_pool, 6,000 translated): the English built from tiles, the Arabic built from tiles, and the word not in the line.
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, sort, extra_json) VALUES
  ('skill', 'to_en', 'Into English', 'إلى الإنجليزية', 'Hear the Arabic, build its English from tiles', 'text.bubble', 10, '{"source":"lines"}'),
  ('skill', 'to_ar', 'Into Arabic', 'إلى العربية', 'Read the English, build its Arabic from tiles', 'character.bubble', 11, '{"source":"lines"}'),
  ('skill', 'odd', 'Odd one out', 'الغريب', 'Hear the line, find the word that is not in it', 'circle.grid.cross', 12, '{"source":"lines"}'),
  ('kind', 'to_en', 'Listen, then build the English', 'اسمع ثم ركّب الإنجليزية', NULL, NULL, 50, NULL),
  ('kind', 'to_ar', 'Build this in Arabic', 'ركّب هذا بالعربية', NULL, NULL, 51, NULL),
  ('kind', 'odd', 'Listen — which word is not in the line?', 'اسمع — أيّ كلمة ليست في الجملة؟', NULL, NULL, 52, NULL);
