-- The Qurʾān Atlas keeps one door per way of drilling: a passage is studied as its class, and what
-- is due comes back in Review. Free skill practice has one home, the Apps Atlas's Practice room.
--
--   · The three rooms whose only destination was a practice screen (Words & Roots, Grammar Book,
--     Concepts) leave the Atlas home's rooms: they move to scope 'practice_room', kept whole for the
--     practice home that groups skills by them.
--   · Step 'class' words the sūra's door into its classes; step 'class_passage' the passage's door
--     into its own class (both read from /qr/atlas/surah and /qr/atlas/passage 'steps').

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort)
SELECT 'practice_room', key, label, label_ar, detail, icon, color, min_value, extra_json, sort
  FROM qr_study_label WHERE scope = 'room' AND key IN ('words', 'grammar', 'concepts');
DELETE FROM qr_study_label WHERE scope = 'room' AND key IN ('words', 'grammar', 'concepts');

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('step', 'class', 'Study the passages', 'ادْرُسِ المَقَاطِع', 'Each passage as one graded lesson, in order', 'graduationcap.fill', '#81B29A', NULL, NULL, 6),
('step', 'class_passage', 'Study this passage', 'ادْرُسْ هَذَا المَقْطَع', 'The passage as one graded lesson', 'graduationcap.fill', '#81B29A', NULL, NULL, 7);
