-- The commentary passages on Ghāfir 40:1–3 as an editor cuts them: each work read through and paragraphed by its
-- author's own steps (a point, a question and its answer, a word taken up, a story, a report, an editor's note),
-- never by length; a lead-in ending in a colon stays with what it introduces. Each cut is a passage: the worker
-- (passagesByCut) shows its heading over its Arabic and over its English, its English its own lines' English.
-- Replaces the mechanical cuts qr_107 keyed to the old paragraph boundaries.
DELETE FROM qr_tafsir_passage_heading WHERE audio_id = 'QRTA:zamakhshari:40-01' AND seq_from BETWEEN 1 AND 65;
INSERT INTO qr_tafsir_passage_heading (audio_id, seq_from, seq_to, source_slug, heading_en, origin) VALUES
  ('QRTA:zamakhshari:40-01', 1, 3, 'zamakhshari', 'Meccan, and how many verses', 'kmaps_editor'),
  ('QRTA:zamakhshari:40-01', 4, 6, 'zamakhshari', 'How Ḥā Mīm is read', 'kmaps_editor'),
  ('QRTA:zamakhshari:40-01', 7, 10, 'zamakhshari', 'Tawb and ṭawl: what the words mean', 'kmaps_editor'),
  ('QRTA:zamakhshari:40-01', 11, 14, 'zamakhshari', 'Why “Forgiver” and “Accepter” are definite', 'kmaps_editor'),
  ('QRTA:zamakhshari:40-01', 15, 21, 'zamakhshari', '“Severe in punishment”: substitute, not description', 'kmaps_editor'),
  ('QRTA:zamakhshari:40-01', 22, 34, 'zamakhshari', 'Ibn al-Munayyir''s note on the metre comparison', 'kmaps_editor'),
  ('QRTA:zamakhshari:40-01', 35, 40, 'zamakhshari', 'Dropping the article to match its neighbours', 'kmaps_editor'),
  ('QRTA:zamakhshari:40-01', 41, 44, 'zamakhshari', 'Left vague on purpose, to warn', 'kmaps_editor'),
  ('QRTA:zamakhshari:40-01', 45, 49, 'zamakhshari', 'The wāw: two mercies for the one who repents', 'kmaps_editor'),
  ('QRTA:zamakhshari:40-01', 50, 65, 'zamakhshari', 'ʿUmar''s letter to a man lost to drink', 'kmaps_editor');
DELETE FROM qr_tafsir_passage_heading WHERE audio_id = 'QRTA:ibn_ashur:y-m2kq2xlU4DM-02' AND seq_from BETWEEN 1 AND 54;
INSERT INTO qr_tafsir_passage_heading (audio_id, seq_from, seq_to, source_slug, heading_en, origin) VALUES
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 1, 5, 'ibn_ashur', 'Ḥā Mīm and the challenge of the Qurʾān', 'kmaps_editor'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 6, 9, 'ibn_ashur', 'The Book sent down: no emphasis for deniers', 'kmaps_editor'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 10, 11, 'ibn_ashur', 'Six definite names of God', 'kmaps_editor'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 12, 14, 'ibn_ashur', 'Mighty and All-Knowing: a quiet warning', 'kmaps_editor'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 15, 17, 'ibn_ashur', 'Why this verse ends differently from al-Zumar', 'kmaps_editor'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 18, 19, 'ibn_ashur', 'God knows whom to give His message', 'kmaps_editor'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 20, 22, 'ibn_ashur', 'Forgiveness offered to those who deny', 'kmaps_editor'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 23, 24, 'ibn_ashur', 'Why “Forgiver” comes first', 'kmaps_editor'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 25, 25, 'ibn_ashur', 'What tawb means', 'kmaps_editor'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 26, 29, 'ibn_ashur', 'Why “and” joins two names', 'kmaps_editor'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 30, 31, 'ibn_ashur', '“Severe in punishment”: an open threat', 'kmaps_editor'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 32, 34, 'ibn_ashur', 'Lasting qualities, not passing acts', 'kmaps_editor'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 35, 39, 'ibn_ashur', 'How “Severe” can describe God''s name', 'kmaps_editor'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 40, 44, 'ibn_ashur', 'What ṭawl means; two kinds of punishment', 'kmaps_editor'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 45, 48, 'ibn_ashur', 'One God, and the return to Him', 'kmaps_editor'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 49, 51, 'ibn_ashur', 'Why “to Him” comes first', 'kmaps_editor'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 52, 54, 'ibn_ashur', 'An opening that holds the whole sūra', 'kmaps_editor');
DELETE FROM qr_tafsir_passage_heading WHERE audio_id = 'QRTA:razi:40-01' AND seq_from BETWEEN 1 AND 136;
INSERT INTO qr_tafsir_passage_heading (audio_id, seq_from, seq_to, source_slug, heading_en, origin) VALUES
  ('QRTA:razi:40-01', 1, 7, 'razi', 'The sūra''s opening verses (Ghāfir 1–6)', 'kmaps_editor'),
  ('QRTA:razi:40-01', 8, 13, 'razi', 'How Ḥā Mīm is read', 'kmaps_editor'),
  ('QRTA:razi:40-01', 14, 18, 'razi', 'Ḥā Mīm as the sūra''s name', 'kmaps_editor'),
  ('QRTA:razi:40-01', 19, 21, 'razi', 'Why the Sender is named: “from God”', 'kmaps_editor'),
  ('QRTA:razi:40-01', 22, 31, 'razi', 'Knowing God; “the Almighty” as One without equal', 'kmaps_editor'),
  ('QRTA:razi:40-01', 32, 40, 'razi', '“The All-Knowing”, and why these names come here', 'kmaps_editor'),
  ('QRTA:razi:40-01', 41, 49, 'razi', 'Six attributes; al-Jubbāʾī on “Forgiver of sin”', 'kmaps_editor'),
  ('QRTA:razi:40-01', 50, 62, 'razi', 'Forgiving major sins before repentance: three proofs', 'kmaps_editor'),
  ('QRTA:razi:40-01', 63, 70, 'razi', 'Tawb: verbal noun or plural?', 'kmaps_editor'),
  ('QRTA:razi:40-01', 71, 74, 'razi', 'Accepting repentance: a grace, not a duty', 'kmaps_editor'),
  ('QRTA:razi:40-01', 75, 98, 'razi', 'Severe in punishment: a question of grammar', 'kmaps_editor'),
  ('QRTA:razi:40-01', 99, 103, 'razi', 'Mercy comes before punishment', 'kmaps_editor'),
  ('QRTA:razi:40-01', 104, 112, 'razi', 'Why “and” comes in one place only', 'kmaps_editor'),
  ('QRTA:razi:40-01', 113, 119, 'razi', 'Ṭawl: what the word means', 'kmaps_editor'),
  ('QRTA:razi:40-01', 120, 126, 'razi', 'Bounty: forgoing a deserved punishment', 'kmaps_editor'),
  ('QRTA:razi:40-01', 127, 130, 'razi', 'No god but He: oneness sharpens hope, fear', 'kmaps_editor'),
  ('QRTA:razi:40-01', 131, 136, 'razi', 'To Him is the return; the word “ilā”', 'kmaps_editor');
DELETE FROM qr_tafsir_passage_heading WHERE audio_id = 'QRTA:alusi:40-01' AND seq_from BETWEEN 1 AND 142;
INSERT INTO qr_tafsir_passage_heading (audio_id, seq_from, seq_to, source_slug, heading_en, origin) VALUES
  ('QRTA:alusi:40-01', 1, 6, 'alusi', 'The sūra''s names, and where it came down', 'kmaps_editor'),
  ('QRTA:alusi:40-01', 7, 17, 'alusi', 'Is verse 35 Madinan? What “revealed about” means', 'kmaps_editor'),
  ('QRTA:alusi:40-01', 18, 24, 'alusi', 'Verse count, and the link to al-Zumar', 'kmaps_editor'),
  ('QRTA:alusi:40-01', 25, 27, 'alusi', 'Why the Ḥā Mīm sūras sit together', 'kmaps_editor'),
  ('QRTA:alusi:40-01', 28, 35, 'alusi', 'The merit of the Ḥā Mīm sūras', 'kmaps_editor'),
  ('QRTA:alusi:40-01', 36, 39, 'alusi', 'Sūras given in place of earlier books', 'kmaps_editor'),
  ('QRTA:alusi:40-01', 40, 43, 'alusi', 'Seven Ḥā Mīms at Hell''s seven gates', 'kmaps_editor'),
  ('QRTA:alusi:40-01', 44, 46, 'alusi', 'The merit of these opening verses', 'kmaps_editor'),
  ('QRTA:alusi:40-01', 47, 55, 'alusi', 'Readings of Ḥā Mīm and their grammar', 'kmaps_editor'),
  ('QRTA:alusi:40-01', 56, 66, 'alusi', 'Ḥawāmīm or Āl Ḥā Mīm? The plural debated', 'kmaps_editor'),
  ('QRTA:alusi:40-01', 67, 74, 'alusi', 'What “Āl” means in “Āl Ḥā Mīm”', 'kmaps_editor'),
  ('QRTA:alusi:40-01', 75, 78, 'alusi', 'Sending down of the Book; why Mighty, All-Knowing', 'kmaps_editor'),
  ('QRTA:alusi:40-01', 79, 83, 'alusi', 'Four attributes: hope, fear, and definiteness', 'kmaps_editor'),
  ('QRTA:alusi:40-01', 84, 96, 'alusi', '“Severe in punishment”: how can it be definite?', 'kmaps_editor'),
  ('QRTA:alusi:40-01', 97, 101, 'alusi', 'Reading them as substitutes', 'kmaps_editor'),
  ('QRTA:alusi:40-01', 102, 109, 'alusi', 'Can substitutes repeat?', 'kmaps_editor'),
  ('QRTA:alusi:40-01', 110, 113, 'alusi', 'What tawb and ṭawl mean', 'kmaps_editor'),
  ('QRTA:alusi:40-01', 114, 125, 'alusi', 'The wāw: two mercies joined; Forgiver first', 'kmaps_editor'),
  ('QRTA:alusi:40-01', 126, 128, 'alusi', 'Is repentance surely accepted? Mercy comes first', 'kmaps_editor'),
  ('QRTA:alusi:40-01', 129, 132, 'alusi', 'No god but He; to Him the return', 'kmaps_editor'),
  ('QRTA:alusi:40-01', 133, 142, 'alusi', 'ʿUmar''s letter to a man lost to drink', 'kmaps_editor');
