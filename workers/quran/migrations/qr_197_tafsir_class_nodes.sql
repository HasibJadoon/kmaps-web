-- qr_197 — owner 2026-11-27: the Tafsīr path drawn like a Qurʾān passage's class path (Apps ▸ Path ▸ Tafsīr ▸ sūra ▸ passage).
-- Each row is one step of a tafsīr passage; extra_json.kinds names the bank drill kinds (km_core cyb_drill.kind) it deals.
-- Kinds no step names fall to the step marked "rest". The worker reads these rows; the app draws them (ClassPathView).
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('tafsir_class_node', 'listen_fill', 'Listen & fill', 'الاِسْتِمَاعُ وَالإِكْمَال', 'Hear the line, fill the missing word', 'ear', '#6FA8DC', NULL,
 '{"step":1,"kinds":["fill","hear"]}', 10),
('tafsir_class_node', 'words', 'Words', 'الكَلِمَات', 'The words the commentator leans on', 'character.book.closed', '#D8B657', NULL,
 '{"step":2,"kinds":["vocab_meaning","idiom","ns_contrast","pairs_gloss","lex_antonym","lex_synonym"]}', 20),
('tafsir_class_node', 'word_forms', 'Word forms', 'الصِّيَغ', 'Forms, plurals, patterns and families', 'textformat.abc', '#9FC5A0', NULL,
 '{"step":3,"kinds":["lex_form","lex_plural","lex_plural_pattern","lex_family","gt_wazn_pattern"]}', 30),
('tafsir_class_node', 'sentence_parts', 'Sentence parts', 'أَجْزَاءُ الجُمْلَة', 'Roles, kinds and order in his sentences', 'text.book.closed', '#4FB3A9', NULL,
 '{"step":4,"kinds":["ss_kind","ss_role","ss_why","irab","order","tafsir_build"]}', 40),
('tafsir_class_node', 'translate', 'Translate', 'التَّرْجَمَة', 'Which English says what the line says', 'character.bubble', '#C9A0DC', NULL,
 '{"step":5,"kinds":["translation_compare","translation_why","translate"]}', 50),
('tafsir_class_node', 'commentary', 'The commentary', 'التَّفْسِير', 'His points, terms and the sūra''s aim', 'book.pages', '#E8A87C', NULL,
 '{"step":6,"kinds":["tafsir_section","tafsir_point","tafsir_term","surah_aim","ring_centre"],"rest":true}', 60),
('tafsir_class', 'round', 'One full round', 'جَوْلَةٌ كَامِلَة', 'Every step once', 'circle.hexagongrid', '#D8B657', NULL, NULL, 0),
('tafsir_class', 'intro', 'Introduction', 'مُقَدِّمَةُ السُّورَة', 'The commentator''s introduction to the sūra', NULL, NULL, NULL, NULL, 0);
