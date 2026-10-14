-- The scene word screen's own words (GET /ar/scenes/:unit/:no/words → words).
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('word_words', 'title',        'Words of this scene', 'كَلِمَاتُ المَشْهَد', NULL, 'character.book.closed', NULL, NULL, NULL, 2),
 ('word_words', 'line_title',   'Words of this line',  'كَلِمَاتُ السَّطْر', NULL, 'text.word.spacing', NULL, NULL, NULL, 3),
 ('word_words', 'filter_all',   'All',                 'الكُلّ', NULL, NULL, NULL, NULL, NULL, 4),
 ('word_words', 'filter_quran', 'In the Qurʾān',       'فِي القُرْآن', 'Words the Qurʾān uses, or of its roots', NULL, NULL, NULL, NULL, 5),
 ('word_words', 'filter_hard',  'Hard in the Qurʾān',  'صَعْب', 'Medium to gharīb in the Qurʾān — the ones worth learning here', NULL, NULL, NULL, NULL, 6),
 ('word_words', 'sarf',         'Ṣarf',                'الصَّرْف', NULL, NULL, NULL, NULL, NULL, 7),
 ('word_words', 'lemma',        'Dictionary form',     'المُعْجَمِيّ', NULL, NULL, NULL, NULL, NULL, 8),
 ('word_words', 'root',         'Root',                'الجِذْر', NULL, NULL, NULL, NULL, NULL, 9),
 ('word_words', 'provisional',  'Machine reading — not yet checked', 'قِرَاءَةُ الآلَة', 'Read by the CAMeL analyser; a checked reading replaces it', 'cpu', NULL, NULL, NULL, 10),
 ('word_words', 'counts',       '{words} words · {lemma} Qurʾān words · {root} Qurʾān roots', NULL, NULL, NULL, NULL, NULL, NULL, 11);
