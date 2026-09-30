-- qr_051_line_and_grammar_skills.sql
--
-- The Qurʾān's drills as the Arabic side has them: each āyah a line, heard in the recitation
-- with its words timed — listen & fill, build the āyah, catch the word, shadow — and grammar
-- and balāgha from the registry's Qurʾānic examples (ar_ling_gram_term_example, via AL).
-- Every skill's three levels are in its extra_json; the worker reads them.
--
--   line skills  L1 short āyāt (3–8 words) · L2 9–15 · L3 16+ (build the āyah: at most 25)
--   grammar      naḥw examples: L1 top-level terms · L2 sub-terms · L3 deepest
--   balagha      balāgha examples, the same by depth in the hierarchy
--
-- Apply with `d1 execute --file` (see qr_046: do not `migrations apply` km_quran).
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('skill', 'fill',   'Listen & fill', 'اِسْمَعْ وَأَكْمِلْ', 'Hear the āyah — find the missing word', 'ear', '#5DA9E9', NULL,
 '{"source":"lines","levels":{"basic":{"minWords":3,"maxWords":8},"middle":{"minWords":9,"maxWords":15},"advanced":{"minWords":16,"maxWords":60}}}', 0),
('skill', 'order',  'Build the āyah', 'رَتِّبِ الآيَة', 'Hear it, then put its words back in order', 'square.stack.3d.up', '#81B29A', NULL,
 '{"source":"lines","levels":{"basic":{"minWords":3,"maxWords":8},"middle":{"minWords":9,"maxWords":15},"advanced":{"minWords":16,"maxWords":25}}}', 1),
('skill', 'hear',   'Catch the word', 'اِلْتَقِطِ الكَلِمَة', 'One word, just as it is recited — which is it?', 'waveform', '#E07A5F', NULL,
 '{"source":"lines","timed":true,"levels":{"basic":{"minWords":3,"maxWords":8},"middle":{"minWords":9,"maxWords":15},"advanced":{"minWords":16,"maxWords":60}}}', 2),
('skill', 'shadow', 'Shadow', 'رَدِّدْ', 'Recite with al-ʿAfāsī, word by word', 'mic', '#B388EB', NULL,
 '{"source":"lines","timed":true,"levels":{"basic":{"minWords":3,"maxWords":8},"middle":{"minWords":9,"maxWords":15},"advanced":{"minWords":16,"maxWords":60}}}', 3),
('skill', 'irab', 'Iʿrāb', 'الإِعْرَاب', 'Hear the āyah — what is the role of the marked word?', 'point.3.connected.trianglepath.dotted', '#4FB3A9', NULL,
 '{"source":"irab","levels":{"basic":{"roles":["mubtada","khabar","fail","maful_bih","mudaf_ilayh","naat"]},"middle":{"roles":["hal","tamyiz","badal","maful_mutlaq","naib_fail","munada","zarf","maful_liajlih","tawkid","mustathna","maful_fih","maful_maah"]},"advanced":{"alternative":true}}}', 4),
('skill', 'grammar', 'Grammar', 'النَّحْو', 'The marked words — which grammar term names them?', 'text.book.closed', '#D8B657', NULL,
 '{"source":"gram","discipline":"NH","levels":{"basic":{"minDepth":0,"maxDepth":0},"middle":{"minDepth":1,"maxDepth":1},"advanced":{"minDepth":2,"maxDepth":9}}}', 5),
('skill', 'balagha', 'Balāgha', 'البَلَاغَة', 'The marked words — which figure of rhetoric is at work?', 'wand.and.stars', '#F2CC8F', NULL,
 '{"source":"gram","discipline":"BL","levels":{"basic":{"minDepth":0,"maxDepth":0},"middle":{"minDepth":1,"maxDepth":1},"advanced":{"minDepth":2,"maxDepth":9}}}', 6),
('skill', 'idiom', 'Verbal idioms', 'التَّعَابِيرُ الفِعْلِيَّة', 'A verb and its particle — what do they mean together, here?', 'link', '#F28482', NULL,
 '{"source":"idiom","levels":{"basic":{"minFreq":5},"middle":{"minFreq":2,"maxFreq":4},"advanced":{"maxFreq":1}}}', 7),
('skill', 'arc', 'Sense arcs', 'مَسَارُ المَعْنَى', 'How a root''s meaning travels — from its first image to its Qurʾānic sense', 'arrow.triangle.branch', '#B388EB', NULL,
 '{"source":"arc","levels":{"basic":{"minSteps":2,"maxSteps":20,"ask":"origin"},"middle":{"minSteps":3,"maxSteps":3,"ask":"order"},"advanced":{"minSteps":4,"maxSteps":20,"ask":"order"}}}', 8),

('kind', 'fill',    'Listen, then pick the missing word', 'اِسْمَعْ ثُمَّ اخْتَرِ الكَلِمَةَ النَّاقِصَة', NULL, NULL, NULL, NULL, NULL, 0),
('kind', 'order',   'Listen, then tap the words in order', 'اِسْمَعْ ثُمَّ رَتِّبِ الكَلِمَات', NULL, NULL, NULL, NULL, NULL, 1),
('kind', 'hear',    'Which word did you hear?', 'أَيَّ كَلِمَةٍ سَمِعْت؟', NULL, NULL, NULL, NULL, NULL, 2),
('kind', 'shadow',  'Recite along, word by word', 'رَدِّدْ مَعَ القَارِئ', NULL, NULL, NULL, NULL, NULL, 3),
('kind', 'grammar', 'Listen — which grammar term names the marked words?', 'اِسْمَعْ — مَا المُصْطَلَحُ النَّحْوِيّ؟', NULL, NULL, NULL, NULL, NULL, 5),
('kind', 'balagha', 'Listen — which figure of rhetoric is at work here?', 'اِسْمَعْ — مَا الأُسْلُوبُ البَلَاغِيّ؟', NULL, NULL, NULL, NULL, NULL, 6);
