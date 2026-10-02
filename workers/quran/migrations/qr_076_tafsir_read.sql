-- Reading the commentary through (the owner's aim: read and hear the four commentaries of a passage
-- until they are understood without a translation). A step of its own after "Hear the commentary":
-- each work, concise to extensive, a sentence at a time in its author's order — the line plays with
-- its words lighting, and the learner chooses the English that says what it says; the other choices
-- are the same work's other sentences, so only reading tells them apart. A sentence missed comes
-- back until it is right; the step is passed when every sentence of all four is.

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('skill', 'tafsir_read', 'Read the commentary', 'اِقْرَأ التَّفْسِير', 'Each commentary read through, a sentence at a time: choose what it says',
 'text.book.closed', '#4FB3A9', NULL, '{"source":"tafsir_read","works":["zamakhshari","ibn_ashur","razi","alusi"]}', 15);

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('kind', 'tq_read', 'Read and listen — which English says what this line says?', 'اقرأ واسمع — أيّ ترجمة تقول ما يقوله هذا السطر؟',
 NULL, NULL, NULL, NULL, NULL, 230);

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('class_node', 'read_tafsir', 'Read the commentary', 'اِقْرَأ التَّفْسِير',
 'All four commentaries, a sentence at a time, until you understand each one', 'text.book.closed', '#4FB3A9', NULL,
 '{"kind":"step","step":7,"skills":["tafsir_read"],"max":400,"sprint":10}', 67);

-- the questions on the āyāt's meaning follow the reading; the check comes last
UPDATE qr_study_label SET label = 'Commentary questions', label_ar = 'أَسْئِلَةُ التَّفْسِير',
       detail = 'What the verses mean, as the commentators explain them',
       extra_json = json_set(extra_json, '$.step', 8)
 WHERE scope = 'class_node' AND key = 'tafsir';
UPDATE qr_study_label SET extra_json = json_set(extra_json, '$.step', 9) WHERE scope = 'class_node' AND key = 'check';
