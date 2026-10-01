-- qr_063_atlas_gaps.sql
--
-- The atlas's known gaps, as data:
--
--   1. Rooms lead somewhere. Each atlas room carries its destination in extra_json.destination, which
--      /qr/atlas/home sends with the room (atlas-intro.ts roomDestination): {kind:'surahs'|'lexicon'|
--      'tafsir'|'practice', skills?, prefixes?}. Skills are checked against the skill labels and every
--      skill whose key starts with a prefix is added, so the app no longer maps rooms to skills itself.
--   2. The tafsīr skill drills the curated surah tables (qr_surah_tafsir_theme/_term/_xref/_hadith) and
--      the fiqh positions a tafsīr names a school for (tafsir_drills.py); its levels' asks, the new kinds'
--      prompts, and the four schools' names (scope 'madhab').
--   3. qr_irab_book_word.word_to: a phrase the book parses whole (irab_book_drills.py) spans word_index…word_to.
--
-- Apply with `d1 execute --file` (see qr_046: do not `migrations apply` km_quran), then
--   INSERT OR IGNORE INTO d1_migrations (name) VALUES ('qr_063_atlas_gaps.sql');

-- 1. rooms → destinations
UPDATE qr_study_label SET extra_json = json_set(COALESCE(extra_json, '{}'), '$.destination', json('{"kind":"surahs","skills":["groups"]}'))
 WHERE scope = 'room' AND key = 'surahs';
UPDATE qr_study_label SET extra_json = json_set(COALESCE(extra_json, '{}'), '$.destination', json('{"kind":"practice","skills":["vocab","hear","fill","lexicon","nearsyn","keyterm"]}'))
 WHERE scope = 'room' AND key = 'words';
UPDATE qr_study_label SET extra_json = json_set(COALESCE(extra_json, '{}'), '$.destination', json('{"kind":"lexicon"}'))
 WHERE scope = 'room' AND key = 'lexicon';
UPDATE qr_study_label SET extra_json = json_set(COALESCE(extra_json, '{}'), '$.destination', json('{"kind":"practice","skills":["irab","grammar","balagha","irabbooks"],"prefixes":["gt_"]}'))
 WHERE scope = 'room' AND key = 'grammar';
UPDATE qr_study_label SET extra_json = json_set(COALESCE(extra_json, '{}'), '$.destination', json('{"kind":"tafsir","skills":["tafsir"]}'))
 WHERE scope = 'room' AND key = 'tafsir';
UPDATE qr_study_label SET extra_json = json_set(COALESCE(extra_json, '{}'), '$.destination', json('{"kind":"practice","skills":["arc","meaning_arc","translation","idiom","expression"]}'))
 WHERE scope = 'room' AND key = 'concepts';

-- 2. the tafsīr skill: new asks per level
UPDATE qr_study_label SET extra_json = json_set(extra_json,
    '$.levels.basic.asks', json('["tafsir_point","surah_intro","tafsir_term"]'),
    '$.levels.middle.asks', json('["tafsir_who","tafsir_where","tafsir_theme","tafsir_xref","tafsir_hadith"]'),
    '$.levels.advanced.asks', json('["tafsir_school","tafsir_reading","tafsir_section","tafsir_fiqh"]'))
 WHERE scope = 'skill' AND key = 'tafsir';

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('kind', 'tafsir_term', 'A term as the mufassir uses it — what does it mean in his reading?', 'مُصْطَلَحٌ كَمَا اسْتَعْمَلَهُ المُفَسِّر — مَا مَعْنَاهُ عِنْدَه؟', NULL, NULL, NULL, NULL, NULL, 21),
('kind', 'tafsir_theme', 'A stretch of his tafsīr — which of his themes is it?', 'مِنْ تَفْسِيرِه — تَحْتَ أَيِّ مَوْضُوعٍ هَذَا؟', NULL, NULL, NULL, NULL, NULL, 22),
('kind', 'tafsir_xref', 'An āyah the mufassir cites — which āyah is it?', 'آيَةٌ اسْتَشْهَدَ بِهَا المُفَسِّر — أَيُّ آيَةٍ هِيَ؟', NULL, NULL, NULL, NULL, NULL, 23),
('kind', 'tafsir_hadith', 'A ḥadīth the mufassir cites — on which āyah?', 'حَدِيثٌ أَوْرَدَهُ المُفَسِّر — عِنْدَ أَيِّ آيَة؟', NULL, NULL, NULL, NULL, NULL, 24),
('kind', 'tafsir_fiqh', 'A ruling, its school left out — whose position is it?', 'حُكْمٌ حُذِفَ قَائِلُه — مَذْهَبُ مَنْ هُوَ؟', NULL, NULL, NULL, NULL, NULL, 25),
('madhab', 'hanafi', 'Ḥanafī (Abū Ḥanīfa and his school)', 'أبو حنيفة والحنفية', NULL, NULL, NULL, NULL, '{"names":["ابو حنيفة","ابي حنيفة","ابا حنيفة","الحنفية","اصحاب ابي حنيفة","اهل العراق","اهل الراي"]}', 1),
('madhab', 'maliki', 'Mālikī (Mālik and his school)', 'مالك والمالكية', NULL, NULL, NULL, NULL, '{"names":["مالك","المالكية","اصحاب مالك"]}', 2),
('madhab', 'shafii', 'Shāfiʿī (al-Shāfiʿī and his school)', 'الشافعي والشافعية', NULL, NULL, NULL, NULL, '{"names":["الشافعي","الشافعية","اصحاب الشافعي"]}', 3),
('madhab', 'hanbali', 'Ḥanbalī (Aḥmad and his school)', 'أحمد والحنابلة', NULL, NULL, NULL, NULL, '{"names":["احمد بن حنبل","الامام احمد","الحنابلة","اصحاب احمد"]}', 4);

-- 3. a phrase's span
ALTER TABLE qr_irab_book_word ADD COLUMN word_to INTEGER;   -- the span's last word (a phrase the book parses whole); NULL for one word
