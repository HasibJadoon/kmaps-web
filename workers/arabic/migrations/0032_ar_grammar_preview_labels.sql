-- The grammar path's preview opens on the lesson itself: its own text from its book and its own
-- examples, heard (workers/arabic lib/grammar.ts lessonPreview) — their headings.
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('grammar_path', 'lesson_text', 'The lesson', 'الدَّرْس', 'As its book teaches it — the definition, the rules', NULL, NULL, NULL, NULL, 13),
('grammar_path', 'examples', 'Its examples', 'أَمْثِلَتُه', 'The lesson''s own examples, heard', NULL, NULL, NULL, NULL, 14);
-- no drill asks this (the iḍāfa examples are drilled by the rule they are cited for, gs_term)
DELETE FROM ar_practice_label WHERE scope = 'kind' AND key = 'gs_idafa';
