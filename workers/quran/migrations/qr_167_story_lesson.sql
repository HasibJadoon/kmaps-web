-- qr_167 — a key term's story as a lesson node before its drills (owner, 2026-10-16): its slides (/class/lesson?style=story:<term>)
-- then its drills (/class/node?style=story:<term>), after the sentence it is met in. The term's English name, and the words
-- that frame the story's nodes.
ALTER TABLE qr_keyterm_story ADD COLUMN term_en TEXT;
UPDATE qr_keyterm_story SET term_en = CASE term_key WHEN 'kitab' THEN 'al-Kitāb' WHEN 'tanzil' THEN 'Tanzīl' WHEN 'ilah' THEN 'Ilāh' WHEN 'allah' THEN 'Allāh' END
 WHERE term_en IS NULL;
INSERT INTO qr_study_label (scope, key, label, label_ar, sort) VALUES
  ('class_ui', 'story_of', 'The story of {term}', 'قِصَّةُ {term}', 942),
  ('class_ui', 'story_drills', '{term} — drills', '{term} — تَمَارِين', 943)
ON CONFLICT (scope, key) DO UPDATE SET label = excluded.label, label_ar = excluded.label_ar;

-- the term's root letters, drawn on its story's title slide
ALTER TABLE qr_keyterm_story ADD COLUMN term_root TEXT;
UPDATE qr_keyterm_story SET term_root = CASE term_key WHEN 'kitab' THEN 'كتب' WHEN 'tanzil' THEN 'نزل' WHEN 'ilah' THEN 'أله' WHEN 'allah' THEN 'أله' END;

-- each story's slides are an authored deck in km_content (CM:DOC:qr:keyterm-story:<term>, from
-- kmaps-resources/decks/quran/keyterm-stories via gen-deck-seed): the story names its deck; the app reads it from /cm/decks
ALTER TABLE qr_keyterm_story ADD COLUMN deck_slug TEXT;
UPDATE qr_keyterm_story SET deck_slug = 'qr-keyterm-story-' || term_key WHERE term_key IS NOT NULL;
