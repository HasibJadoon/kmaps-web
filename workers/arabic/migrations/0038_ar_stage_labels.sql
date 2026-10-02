-- 0038_ar_stage_labels.sql
--
-- The drill stage names nothing itself. Its own words — Check, Done, Listen, Slower, the
-- meaning switch, the listening turns' lines, and the instruction each interaction falls back
-- on when a drill's kind has none (i_<interaction>) — are these rows, sent with every round
-- as `stage`. `{n}` in a row is the count it is said with. A word missing here is not shown.
--
-- Applied by hand when the ledger is out of step: d1 execute --file, then
--   INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0038_ar_stage_labels.sql');

INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('stage', 'check', 'Check', 'تحقّق', NULL, NULL, NULL, NULL, NULL, 1),
('stage', 'done', 'Done', 'تمّ', NULL, NULL, NULL, NULL, NULL, 2),
('stage', 'said_it', 'I said it', 'قلتُها', NULL, NULL, NULL, NULL, NULL, 3),
('stage', 'the_line', 'The line', 'الجملة', NULL, NULL, NULL, NULL, NULL, 4),
('stage', 'the_order', 'The order', 'الترتيب', NULL, NULL, NULL, NULL, NULL, 5),
('stage', 'listen', 'Listen', 'استمع', NULL, NULL, NULL, NULL, NULL, 6),
('stage', 'play', 'Play', 'شغّل', NULL, NULL, NULL, NULL, NULL, 7),
('stage', 'play_word', 'Play the word', 'شغّل الكلمة', NULL, NULL, NULL, NULL, NULL, 8),
('stage', 'play_again', 'Play again', 'أعِد', NULL, NULL, NULL, NULL, NULL, 9),
('stage', 'slower', 'Slower', 'أبطأ', NULL, NULL, NULL, NULL, NULL, 10),
('stage', 'meaning', 'Meaning', 'المعنى', NULL, NULL, NULL, NULL, NULL, 11),
('stage', 'show_meaning', 'Show meaning', 'أظهر المعنى', NULL, NULL, NULL, NULL, NULL, 12),
('stage', 'always', 'Always', 'دائمًا', NULL, NULL, NULL, NULL, NULL, 13),
('stage', 'your_turn', 'Your turn — say it aloud, then:', 'دورك — قلها بصوت مسموع، ثم:', NULL, NULL, NULL, NULL, NULL, 14),
('stage', 'caught_all', 'Caught every word? Then Done.', 'التقطتَ كل كلمة؟ إذن: تمّ', NULL, NULL, NULL, NULL, NULL, 15),
('stage', 'marked', '{n} marked — they come back until you have them.', '{n} معلَّمة — تعود حتى تتقنها', NULL, NULL, NULL, NULL, NULL, 16),
('stage', 'pattern', 'Pattern', 'الوزن', NULL, NULL, NULL, NULL, NULL, 17),
('stage', 'i_choose', 'Choose', 'اختر', NULL, NULL, NULL, NULL, NULL, 18),
('stage', 'i_choose_all', 'Choose every one that holds', 'اختر كل ما يصحّ', NULL, NULL, NULL, NULL, NULL, 19),
('stage', 'i_odd_one_out', 'Which one does not belong?', 'أيّها لا ينتمي؟', NULL, NULL, NULL, NULL, NULL, 20),
('stage', 'i_translate_pick', 'Which English keeps the Arabic?', 'أيّ ترجمة تحفظ المعنى؟', NULL, NULL, NULL, NULL, NULL, 21),
('stage', 'i_tiles', 'Build it', 'ابنِها', NULL, NULL, NULL, NULL, NULL, 22),
('stage', 'i_listen_tiles', 'Listen, then build it', 'استمع ثم ابنِها', NULL, NULL, NULL, NULL, NULL, 23),
('stage', 'i_listen_mark', 'Listen — tap every word you did not catch', 'استمع — المس كل كلمة لم تلتقطها', NULL, NULL, NULL, NULL, NULL, 24),
('stage', 'i_pairs', 'Tap the matching pairs', 'المس الأزواج المتطابقة', NULL, NULL, NULL, NULL, NULL, 25),
('stage', 'i_order_units', 'Put them in order', 'رتّبها', NULL, NULL, NULL, NULL, NULL, 26),
('stage', 'i_shadow', 'Listen, then say it', 'استمع ثم قلها', NULL, NULL, NULL, NULL, NULL, 27);
