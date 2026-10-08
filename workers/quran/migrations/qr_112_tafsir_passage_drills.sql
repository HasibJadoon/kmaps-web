-- The commentary's Drills view: each passage of a work drilled in three stages, so its text is understood, translated
-- and mastered (passageDrills, GET /qr/tafsir/passage/drills). The stages, and the words each new drill asks with.
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('tafsir_stage', 'understand', 'Understand', 'الفَهْم', 'What each sentence says', 'lightbulb', '#4FB3A9', NULL, NULL, 1),
('tafsir_stage', 'translate', 'Translate', 'التَّرْجَمَة', 'Each line in English', 'character.bubble', '#4FB3A9', NULL, NULL, 2),
('tafsir_stage', 'master', 'Master', 'الإتْقان', 'The words themselves: fill, order, hear', 'checkmark.seal', '#4FB3A9', NULL, NULL, 3);

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('kind', 'tq_pd_translate', 'Which English says what this line says?', 'أيّ ترجمة تقول ما يقوله هذا السطر؟', NULL, NULL, NULL, NULL, NULL, 240),
('kind', 'tq_pd_build', 'Build this line in English', 'رتّب ترجمة هذا السطر', NULL, NULL, NULL, NULL, NULL, 241),
('kind', 'tq_pd_fill', 'Which word fills the gap?', 'أيّ كلمة تملأ الفراغ؟', NULL, NULL, NULL, NULL, NULL, 242),
('kind', 'tq_pd_order', 'Put the words of this line in order', 'رتّب كلمات هذا السطر', NULL, NULL, NULL, NULL, NULL, 243);
