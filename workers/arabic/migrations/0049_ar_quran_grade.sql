-- How hard a scene word is in the Qurʾān (QR qr_vocab_grade, asked by AL lemma): shown on the scene's word card.
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('quran_grade', 'common', 'Common in the Qurʾān', 'شائع',  'Met everywhere in the Qurʾān', 'circle', '#8A8F98', NULL, NULL, 1),
 ('quran_grade', 'medium', 'Medium',               'متوسط', 'A Qurʾān word worth learning from here', 'gauge', '#5DA9E9', NULL, NULL, 2),
 ('quran_grade', 'hard',   'Hard',                 'صعب',   'Rare in the Qurʾān — this scene is a good place to meet it', 'flame', '#F4A261', NULL, NULL, 3),
 ('quran_grade', 'super',  'Gharīb',               'غريب',  'Once or twice in the Qurʾān', 'gem', '#E76F51', NULL, NULL, 4),
 ('word_words',  'quran_count', '{n}× in the Qurʾān', '{n} مرة في القرآن', NULL, NULL, NULL, NULL, NULL, 1);
