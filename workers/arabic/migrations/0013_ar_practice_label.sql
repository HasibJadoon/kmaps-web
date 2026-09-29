-- Every label an exercise shows, as data: the practice skills, each drill kind's
-- instruction, the buckets and tiers a scene's items are sorted into, the
-- Qurʾān-frequency tiers of My words, and part-of-speech labels. The worker
-- reads them (cached by the 'content' version) and hands them out with the
-- drills; neither the worker's code nor the app holds any of this text.
CREATE TABLE IF NOT EXISTS ar_practice_label (
  scope     TEXT NOT NULL,     -- skill | scene_skill | kind | prompt | bucket | scene_tier | quran_tier | pos
  key       TEXT NOT NULL,
  label     TEXT NOT NULL,
  label_ar  TEXT,
  detail    TEXT,              -- a skill's tagline
  icon      TEXT,
  color     TEXT,
  min_value INTEGER,           -- quran_tier: the fewest Qurʾān occurrences for the tier
  extra_json TEXT,             -- skill: {source}
  sort      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (scope, key)
);
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_practice_label_i AFTER INSERT ON ar_practice_label BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_practice_label_u AFTER UPDATE ON ar_practice_label BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_practice_label_d AFTER DELETE ON ar_practice_label BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('skill', 'fill', 'Listen & fill', 'اِسْمَعْ وَأَكْمِلْ', 'Hear a real line — find the missing word', 'ear', '#5DA9E9', NULL, '{"source":"lines"}', 0),
('skill', 'order', 'Build the sentence', 'رَتِّبِ الجُمْلَة', 'Hear it, then put the words back in order', 'square.stack.3d.up', '#81B29A', NULL, '{"source":"lines"}', 1),
('skill', 'hear', 'Catch the word', 'اِلْتَقِطِ الكَلِمَة', 'One word, just as it was spoken — which is it?', 'waveform', '#E07A5F', NULL, '{"source":"lines"}', 2),
('skill', 'shadow', 'Shadow', 'رَدِّدْ', 'Say it with the speaker, word by word', 'mic', '#B388EB', NULL, '{"source":"lines"}', 3),
('skill', 'mine', 'My words', 'مُفْرَدَاتِي', 'Your own words from your photos — as they are spoken in real Arabic', 'text.viewfinder', '#F28482', NULL, '{"source":"mine"}', 4),
('skill', 'meaning', 'Words', 'المَعَانِي', 'What does it mean?', 'character.book.closed', '#D8B657', NULL, '{"source":"words"}', 5),
('skill', 'plural', 'Plurals', 'الجُمُوع', 'From singular to plural — broken and sound', 'square.grid.2x2', '#F2CC8F', NULL, '{"source":"plurals"}', 6),
('skill', 'grammar', 'Grammar', 'النَّحْو', 'Questions from the grammar books', 'text.book.closed', '#4FB3A9', NULL, '{"source":"grammar"}', 7),
('scene_skill', 'scene', 'Scene practice', 'المَشْهَد', 'This scene — its hard words, idioms, features and dialogue', 'film', '#E07A5F', NULL, NULL, 0),
('kind', 'fill', 'Listen, then pick the missing word', 'اِسْمَعْ ثُمَّ اخْتَرِ الكَلِمَةَ النَّاقِصَة', NULL, NULL, NULL, NULL, NULL, 0),
('kind', 'hear', 'Which word did you hear?', 'أَيَّ كَلِمَةٍ سَمِعْت؟', NULL, NULL, NULL, NULL, NULL, 1),
('kind', 'order', 'Listen, then tap the words in order', 'اِسْمَعْ ثُمَّ رَتِّبِ الكَلِمَات', NULL, NULL, NULL, NULL, NULL, 2),
('kind', 'shadow', 'Listen, then say it with the speaker', 'اِسْمَعْ ثُمَّ رَدِّدْ مَعَ المُتَكَلِّم', NULL, NULL, NULL, NULL, NULL, 3),
('kind', 'meaning', 'What does it mean?', 'مَا مَعْنَاهَا؟', NULL, NULL, NULL, NULL, NULL, 4),
('kind', 'plural', 'What is its plural?', 'مَا جَمْعُهَا؟', NULL, NULL, NULL, NULL, NULL, 5),
('kind', 'grammar', 'Choose the answer', 'اِخْتَرِ الجَوَاب', NULL, NULL, NULL, NULL, NULL, 6),
('kind', 'speaker', 'Listen — who says this?', 'اِسْمَعْ — مَنْ قَائِلُهَا؟', NULL, NULL, NULL, NULL, NULL, 7),
('kind', 'match', 'Listen — what does it mean?', 'اِسْمَعْ — مَا مَعْنَاهَا؟', NULL, NULL, NULL, NULL, NULL, 8),
('kind', 'vocab', 'What does the marked word mean here?', 'مَا مَعْنَى الكَلِمَةِ المُعَلَّمَةِ هُنَا؟', NULL, NULL, NULL, NULL, NULL, 9),
('kind', 'idiom', 'An expression — what does it mean here?', 'تَعْبِيرٌ — مَا مَعْنَاهُ هُنَا؟', NULL, NULL, NULL, NULL, NULL, 10),
('kind', 'feature', 'Notice how it is said', 'تَأَمَّلْ كَيْفَ قِيلَت', NULL, NULL, NULL, NULL, NULL, 11),
('kind', 'gist', 'What happened in this scene?', 'مَاذَا جَرَى فِي هَذَا المَشْهَد؟', NULL, NULL, NULL, NULL, NULL, 12),
('kind', 'dialogue', 'Put the exchange back in order', 'رَتِّبِ الحِوَار', NULL, NULL, NULL, NULL, NULL, 13),
('prompt', 'speaker', 'Who says this?', 'مَنِ القَائِل؟', NULL, NULL, NULL, NULL, NULL, 0),
('bucket', 'vocab', 'Word', 'مُفْرَدَة', NULL, NULL, '#F28482', NULL, NULL, 0),
('bucket', 'idiom', 'Idiom', 'تَعْبِير', NULL, NULL, '#E9C46A', NULL, NULL, 1),
('bucket', 'grammar', 'Grammar', 'نَحْو', NULL, NULL, '#5DA9E9', NULL, NULL, 2),
('bucket', 'morphology', 'Morphology', 'صَرْف', NULL, NULL, '#84A59D', NULL, NULL, 3),
('bucket', 'rhetoric', 'Rhetoric', 'بَلَاغَة', NULL, NULL, '#B388EB', NULL, NULL, 4),
('bucket', 'collocation', 'Collocation', 'تَلَازُم', NULL, NULL, '#F4A261', NULL, NULL, 5),
('bucket', 'connector', 'Connector', 'رَابِط', NULL, NULL, '#90BE6D', NULL, NULL, 6),
('bucket', 'address', 'Address', 'خِطَاب', NULL, NULL, '#F6BD60', NULL, NULL, 7),
('bucket', 'register', 'Register', 'مُسْتَوَى', NULL, NULL, '#A5A58D', NULL, NULL, 8),
('bucket', 'pragmatics', 'Intent', 'مَقَام', NULL, NULL, '#F28482', NULL, NULL, 9),
('bucket', 'echo', 'Echo', 'اِقْتِبَاس', NULL, NULL, '#C9A227', NULL, NULL, 10),
('bucket', 'sound', 'Sound', 'صَوْت', NULL, NULL, '#48CAE4', NULL, NULL, 11),
('scene_tier', '', 'All', 'الكُلّ', NULL, NULL, '#E07A5F', NULL, NULL, 0),
('scene_tier', 'easy', 'Easy', 'سَهْل', NULL, NULL, '#81B29A', NULL, NULL, 1),
('scene_tier', 'good', 'Good', 'جَيِّد', NULL, NULL, '#5DA9E9', NULL, NULL, 2),
('scene_tier', 'hard', 'Hard', 'صَعْب', NULL, NULL, '#E07A5F', NULL, NULL, 3),
('quran_tier', 'easy', 'Easy', 'سَهْل', NULL, NULL, '#81B29A', 100, NULL, 0),
('quran_tier', 'good', 'Good', 'جَيِّد', NULL, NULL, '#5DA9E9', 25, NULL, 1),
('quran_tier', 'hard', 'Hard', 'صَعْب', NULL, NULL, '#F2A65A', 5, NULL, 2),
('quran_tier', 'hardest', 'Hardest', 'أَصْعَب', NULL, NULL, '#E07A5F', 1, NULL, 3),
('pos', 'noun', 'noun (ism)', 'اِسْم', NULL, NULL, NULL, NULL, NULL, 0),
('pos', 'verb', 'verb (fiʿl)', 'فِعْل', NULL, NULL, NULL, NULL, NULL, 1),
('pos', 'particle', 'particle (ḥarf)', 'حَرْف', NULL, NULL, NULL, NULL, NULL, 2),
('pos', 'adjective', 'adjective (ṣifa)', 'صِفَة', NULL, NULL, NULL, NULL, NULL, 3);
-- templates filled by the worker: {n} a number, {s} "s" unless n is 1
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, sort) VALUES
('template', 'quran_line', 'met {n} time{s} in the Qurʾān', 'وَرَدَتْ فِي القُرْآنِ {n} مَرَّة', 0);
