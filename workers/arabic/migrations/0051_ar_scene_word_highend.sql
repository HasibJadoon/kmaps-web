-- A scene's words are shown and drilled for their high end only: verb + preposition and idioms, expert grammar and
-- balāgha, Qurʾān key terms, and the words that are hard in the Qurʾān. qr_grade is the lemma's grade there (QR
-- qr_vocab_grade by AL lemma), synced by kmaps-resources scripts/arabic-episodes/scene_word_grades.py.
ALTER TABLE ar_scene_word ADD COLUMN qr_grade TEXT;
CREATE INDEX IF NOT EXISTS idx_ar_scene_word_grade ON ar_scene_word (unit_id, scene_no, qr_grade);

INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('word_words', 'title',       'High-end language in this scene', 'لُغَةُ المَشْهَدِ العالية', 'Verb + preposition, idioms, expert grammar and balāgha, and words hard in the Qurʾān — not every word', 'sparkles', NULL, NULL, NULL, 2),
 ('word_words', 'line_title',  'High-end language in this line',  'لُغَةُ السَّطْرِ العالية', NULL, 'sparkles', NULL, NULL, NULL, 3),
 ('word_words', 'sec_idiom',   'Verb + preposition and idioms', 'الفِعْلُ وحَرْفُه والتَّعابير', 'A verb with the particle that changes its meaning, and fixed expressions', 'link', '#F4A261', NULL, NULL, 12),
 ('word_words', 'sec_feature', 'Expert grammar and balāgha', 'دَقائِقُ النَّحْوِ والبَلاغة', 'Features of the line an expert reader notices', 'scope', '#B388EB', NULL, NULL, 13),
 ('word_words', 'sec_keyterm', 'Qurʾān key terms', 'مُصْطَلَحاتٌ قُرْآنِيّة', 'Terms that carry the Qurʾān''s own meaning (Sinai)', 'book', '#2A9D8F', NULL, NULL, 14),
 ('word_words', 'sec_hard',    'Hard in the Qurʾān', 'صَعْبٌ في القُرْآن', 'Rare Qurʾānic words met here — with their ṣarf', 'flame', '#E76F51', NULL, NULL, 15),
 ('word_words', 'empty',       'Nothing high-end in this scene yet', 'لا شَيْءَ عالِيًا هُنا بَعْد', NULL, NULL, NULL, NULL, NULL, 16);
