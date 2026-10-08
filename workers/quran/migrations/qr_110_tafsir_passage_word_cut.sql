-- The commentary passages on Ghāfir 40:1–3 cut at the WORD: an audio line often starts or ends mid-sentence, so a
-- passage may start inside its first line (word_from: the first word, in the line's words as served; en_from: where
-- its English starts in that line's English). The line is then shared: what comes before is the passage before's.
-- Each placed by reading: a passage opens on a sentence or its lead-in, never on a fragment of the one before.
-- And each passage's English read aloud (qr_109): its span of the work's English recording, voiced from this text.
ALTER TABLE qr_tafsir_passage_heading ADD COLUMN word_from INTEGER NOT NULL DEFAULT 0;
ALTER TABLE qr_tafsir_passage_heading ADD COLUMN en_from INTEGER NOT NULL DEFAULT 0;
DELETE FROM qr_tafsir_passage_heading WHERE audio_id = 'QRTA:zamakhshari:40-01' AND seq_from BETWEEN 1 AND 65;
INSERT INTO qr_tafsir_passage_heading (audio_id, seq_from, seq_to, source_slug, heading_en, origin, word_from, en_from) VALUES
  ('QRTA:zamakhshari:40-01', 1, 4, 'zamakhshari', 'Meccan, and how many verses', 'kmaps_editor', 0, 0),
  ('QRTA:zamakhshari:40-01', 4, 6, 'zamakhshari', 'How Ḥā Mīm is read', 'kmaps_editor', 1, 19),
  ('QRTA:zamakhshari:40-01', 7, 10, 'zamakhshari', 'Tawb and ṭawl: what the words mean', 'kmaps_editor', 0, 0),
  ('QRTA:zamakhshari:40-01', 11, 14, 'zamakhshari', 'Why “Forgiver” and “Accepter” are definite', 'kmaps_editor', 0, 0),
  ('QRTA:zamakhshari:40-01', 15, 21, 'zamakhshari', '“Severe in punishment”: substitute, not description', 'kmaps_editor', 0, 0),
  ('QRTA:zamakhshari:40-01', 21, 35, 'zamakhshari', 'Ibn al-Munayyir''s note on the metre comparison', 'kmaps_editor', 4, 42),
  ('QRTA:zamakhshari:40-01', 35, 41, 'zamakhshari', 'Dropping the article to match its neighbours', 'kmaps_editor', 9, 85),
  ('QRTA:zamakhshari:40-01', 41, 44, 'zamakhshari', 'Left vague on purpose, to warn', 'kmaps_editor', 1, 20),
  ('QRTA:zamakhshari:40-01', 45, 49, 'zamakhshari', 'The wāw: two mercies for the one who repents', 'kmaps_editor', 0, 0),
  ('QRTA:zamakhshari:40-01', 50, 65, 'zamakhshari', 'ʿUmar''s letter to a man lost to drink', 'kmaps_editor', 0, 0);
DELETE FROM qr_tafsir_passage_audio_en WHERE audio_id = 'QRTA:zamakhshari:40-01' AND seq_from BETWEEN 1 AND 65;
INSERT INTO qr_tafsir_passage_audio_en (audio_id, seq_from, seq_to, object_key, start_sec, end_sec, voice) VALUES
  ('QRTA:zamakhshari:40-01', 1, 4, 'tafsir-en/zamakhshari/40-001-003.m4a', 0.0, 27.65, 'kokoro:bm_george'),
  ('QRTA:zamakhshari:40-01', 4, 6, 'tafsir-en/zamakhshari/40-001-003.m4a', 28.55, 65.9, 'kokoro:bm_george'),
  ('QRTA:zamakhshari:40-01', 7, 10, 'tafsir-en/zamakhshari/40-001-003.m4a', 66.8, 83.92, 'kokoro:bm_george'),
  ('QRTA:zamakhshari:40-01', 11, 14, 'tafsir-en/zamakhshari/40-001-003.m4a', 84.83, 124.1, 'kokoro:bm_george'),
  ('QRTA:zamakhshari:40-01', 15, 21, 'tafsir-en/zamakhshari/40-001-003.m4a', 125.0, 170.85, 'kokoro:bm_george'),
  ('QRTA:zamakhshari:40-01', 21, 35, 'tafsir-en/zamakhshari/40-001-003.m4a', 171.75, 279.25, 'kokoro:bm_george'),
  ('QRTA:zamakhshari:40-01', 35, 41, 'tafsir-en/zamakhshari/40-001-003.m4a', 280.15, 338.15, 'kokoro:bm_george'),
  ('QRTA:zamakhshari:40-01', 41, 44, 'tafsir-en/zamakhshari/40-001-003.m4a', 339.05, 360.72, 'kokoro:bm_george'),
  ('QRTA:zamakhshari:40-01', 45, 49, 'tafsir-en/zamakhshari/40-001-003.m4a', 361.62, 389.62, 'kokoro:bm_george'),
  ('QRTA:zamakhshari:40-01', 50, 65, 'tafsir-en/zamakhshari/40-001-003.m4a', 390.52, 485.48, 'kokoro:bm_george');
DELETE FROM qr_tafsir_passage_heading WHERE audio_id = 'QRTA:ibn_ashur:y-m2kq2xlU4DM-02' AND seq_from BETWEEN 1 AND 54;
INSERT INTO qr_tafsir_passage_heading (audio_id, seq_from, seq_to, source_slug, heading_en, origin, word_from, en_from) VALUES
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 1, 5, 'ibn_ashur', 'Ḥā Mīm and the challenge of the Qurʾān', 'kmaps_editor', 0, 0),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 6, 9, 'ibn_ashur', 'The Book sent down: no emphasis for deniers', 'kmaps_editor', 0, 0),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 10, 11, 'ibn_ashur', 'Six definite names of God', 'kmaps_editor', 0, 0),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 12, 14, 'ibn_ashur', 'Mighty and All-Knowing: a quiet warning', 'kmaps_editor', 0, 0),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 15, 17, 'ibn_ashur', 'Why this verse ends differently from al-Zumar', 'kmaps_editor', 0, 0),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 18, 20, 'ibn_ashur', 'God knows whom to give His message', 'kmaps_editor', 0, 0),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 20, 22, 'ibn_ashur', 'Forgiveness offered to those who deny', 'kmaps_editor', 2, 5),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 23, 24, 'ibn_ashur', 'Why “Forgiver” comes first', 'kmaps_editor', 0, 0),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 25, 26, 'ibn_ashur', 'What tawb means', 'kmaps_editor', 0, 0),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 26, 29, 'ibn_ashur', 'Why “and” joins two names', 'kmaps_editor', 1, 9),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 30, 31, 'ibn_ashur', '“Severe in punishment”: an open threat', 'kmaps_editor', 0, 0),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 32, 34, 'ibn_ashur', 'Lasting qualities, not passing acts', 'kmaps_editor', 0, 0),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 35, 39, 'ibn_ashur', 'How “Severe” can describe God''s name', 'kmaps_editor', 0, 0),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 40, 45, 'ibn_ashur', 'What ṭawl means; two kinds of punishment', 'kmaps_editor', 0, 0),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 45, 48, 'ibn_ashur', 'One God, and the return to Him', 'kmaps_editor', 2, 5),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 49, 51, 'ibn_ashur', 'Why “to Him” comes first', 'kmaps_editor', 0, 0),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 52, 54, 'ibn_ashur', 'An opening that holds the whole sūra', 'kmaps_editor', 0, 0);
DELETE FROM qr_tafsir_passage_audio_en WHERE audio_id = 'QRTA:ibn_ashur:y-m2kq2xlU4DM-02' AND seq_from BETWEEN 1 AND 54;
INSERT INTO qr_tafsir_passage_audio_en (audio_id, seq_from, seq_to, object_key, start_sec, end_sec, voice) VALUES
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 1, 5, 'tafsir-en/ibn_ashur/40-001-003.m4a', 0.0, 44.15, 'kokoro:bm_george'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 6, 9, 'tafsir-en/ibn_ashur/40-001-003.m4a', 45.05, 82.85, 'kokoro:bm_george'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 10, 11, 'tafsir-en/ibn_ashur/40-001-003.m4a', 83.75, 106.03, 'kokoro:bm_george'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 12, 14, 'tafsir-en/ibn_ashur/40-001-003.m4a', 106.93, 133.8, 'kokoro:bm_george'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 15, 17, 'tafsir-en/ibn_ashur/40-001-003.m4a', 134.7, 162.08, 'kokoro:bm_george'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 18, 20, 'tafsir-en/ibn_ashur/40-001-003.m4a', 162.98, 182.4, 'kokoro:bm_george'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 20, 22, 'tafsir-en/ibn_ashur/40-001-003.m4a', 183.3, 218.5, 'kokoro:bm_george'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 23, 24, 'tafsir-en/ibn_ashur/40-001-003.m4a', 219.4, 249.08, 'kokoro:bm_george'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 25, 26, 'tafsir-en/ibn_ashur/40-001-003.m4a', 249.98, 266.33, 'kokoro:bm_george'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 26, 29, 'tafsir-en/ibn_ashur/40-001-003.m4a', 267.23, 308.25, 'kokoro:bm_george'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 30, 31, 'tafsir-en/ibn_ashur/40-001-003.m4a', 309.15, 328.6, 'kokoro:bm_george'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 32, 34, 'tafsir-en/ibn_ashur/40-001-003.m4a', 329.5, 354.98, 'kokoro:bm_george'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 35, 39, 'tafsir-en/ibn_ashur/40-001-003.m4a', 355.88, 422.08, 'kokoro:bm_george'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 40, 45, 'tafsir-en/ibn_ashur/40-001-003.m4a', 422.98, 472.1, 'kokoro:bm_george'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 45, 48, 'tafsir-en/ibn_ashur/40-001-003.m4a', 473.0, 525.5, 'kokoro:bm_george'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 49, 51, 'tafsir-en/ibn_ashur/40-001-003.m4a', 526.4, 543.7, 'kokoro:bm_george'),
  ('QRTA:ibn_ashur:y-m2kq2xlU4DM-02', 52, 54, 'tafsir-en/ibn_ashur/40-001-003.m4a', 544.6, 571.15, 'kokoro:bm_george');
DELETE FROM qr_tafsir_passage_heading WHERE audio_id = 'QRTA:razi:40-01' AND seq_from BETWEEN 1 AND 136;
INSERT INTO qr_tafsir_passage_heading (audio_id, seq_from, seq_to, source_slug, heading_en, origin, word_from, en_from) VALUES
  ('QRTA:razi:40-01', 1, 8, 'razi', 'The sūra''s opening verses (Ghāfir 1–6)', 'kmaps_editor', 0, 0),
  ('QRTA:razi:40-01', 8, 13, 'razi', 'How Ḥā Mīm is read', 'kmaps_editor', 12, 140),
  ('QRTA:razi:40-01', 14, 18, 'razi', 'Ḥā Mīm as the sūra''s name', 'kmaps_editor', 0, 0),
  ('QRTA:razi:40-01', 19, 21, 'razi', 'Why the Sender is named: “from God”', 'kmaps_editor', 0, 0),
  ('QRTA:razi:40-01', 22, 31, 'razi', 'Knowing God; “the Almighty” as One without equal', 'kmaps_editor', 0, 0),
  ('QRTA:razi:40-01', 32, 41, 'razi', '“The All-Knowing”, and why these names come here', 'kmaps_editor', 0, 0),
  ('QRTA:razi:40-01', 41, 49, 'razi', 'Six attributes; al-Jubbāʾī on “Forgiver of sin”', 'kmaps_editor', 7, 69),
  ('QRTA:razi:40-01', 50, 62, 'razi', 'Forgiving major sins before repentance: three proofs', 'kmaps_editor', 0, 0),
  ('QRTA:razi:40-01', 63, 71, 'razi', 'Tawb: verbal noun or plural?', 'kmaps_editor', 0, 0),
  ('QRTA:razi:40-01', 71, 74, 'razi', 'Accepting repentance: a grace, not a duty', 'kmaps_editor', 1, 5),
  ('QRTA:razi:40-01', 75, 98, 'razi', 'Severe in punishment: a question of grammar', 'kmaps_editor', 0, 0),
  ('QRTA:razi:40-01', 99, 103, 'razi', 'Mercy comes before punishment', 'kmaps_editor', 0, 0),
  ('QRTA:razi:40-01', 104, 112, 'razi', 'Why “and” comes in one place only', 'kmaps_editor', 0, 0),
  ('QRTA:razi:40-01', 113, 120, 'razi', 'Ṭawl: what the word means', 'kmaps_editor', 0, 0),
  ('QRTA:razi:40-01', 120, 126, 'razi', 'Bounty: forgoing a deserved punishment', 'kmaps_editor', 1, 5),
  ('QRTA:razi:40-01', 127, 130, 'razi', 'No god but He: oneness sharpens hope, fear', 'kmaps_editor', 0, 0),
  ('QRTA:razi:40-01', 131, 136, 'razi', 'To Him is the return; the word “ilā”', 'kmaps_editor', 0, 0);
DELETE FROM qr_tafsir_passage_audio_en WHERE audio_id = 'QRTA:razi:40-01' AND seq_from BETWEEN 1 AND 136;
INSERT INTO qr_tafsir_passage_audio_en (audio_id, seq_from, seq_to, object_key, start_sec, end_sec, voice) VALUES
  ('QRTA:razi:40-01', 1, 8, 'tafsir-en/razi/40-001-003.m4a', 0.0, 107.4, 'kokoro:bm_george'),
  ('QRTA:razi:40-01', 8, 13, 'tafsir-en/razi/40-001-003.m4a', 108.3, 172.3, 'kokoro:bm_george'),
  ('QRTA:razi:40-01', 14, 18, 'tafsir-en/razi/40-001-003.m4a', 173.2, 207.4, 'kokoro:bm_george'),
  ('QRTA:razi:40-01', 19, 21, 'tafsir-en/razi/40-001-003.m4a', 208.3, 242.3, 'kokoro:bm_george'),
  ('QRTA:razi:40-01', 22, 31, 'tafsir-en/razi/40-001-003.m4a', 243.2, 295.0, 'kokoro:bm_george'),
  ('QRTA:razi:40-01', 32, 41, 'tafsir-en/razi/40-001-003.m4a', 295.9, 392.83, 'kokoro:bm_george'),
  ('QRTA:razi:40-01', 41, 49, 'tafsir-en/razi/40-001-003.m4a', 393.73, 455.48, 'kokoro:bm_george'),
  ('QRTA:razi:40-01', 50, 62, 'tafsir-en/razi/40-001-003.m4a', 456.38, 580.1, 'kokoro:bm_george'),
  ('QRTA:razi:40-01', 63, 71, 'tafsir-en/razi/40-001-003.m4a', 581.0, 627.25, 'kokoro:bm_george'),
  ('QRTA:razi:40-01', 71, 74, 'tafsir-en/razi/40-001-003.m4a', 628.15, 664.85, 'kokoro:bm_george'),
  ('QRTA:razi:40-01', 75, 98, 'tafsir-en/razi/40-001-003.m4a', 665.75, 833.83, 'kokoro:bm_george'),
  ('QRTA:razi:40-01', 99, 103, 'tafsir-en/razi/40-001-003.m4a', 834.73, 874.5, 'kokoro:bm_george'),
  ('QRTA:razi:40-01', 104, 112, 'tafsir-en/razi/40-001-003.m4a', 875.4, 925.5, 'kokoro:bm_george'),
  ('QRTA:razi:40-01', 113, 120, 'tafsir-en/razi/40-001-003.m4a', 926.4, 956.83, 'kokoro:bm_george'),
  ('QRTA:razi:40-01', 120, 126, 'tafsir-en/razi/40-001-003.m4a', 957.73, 1028.35, 'kokoro:bm_george'),
  ('QRTA:razi:40-01', 127, 130, 'tafsir-en/razi/40-001-003.m4a', 1029.25, 1062.78, 'kokoro:bm_george'),
  ('QRTA:razi:40-01', 131, 136, 'tafsir-en/razi/40-001-003.m4a', 1063.68, 1110.53, 'kokoro:bm_george');
DELETE FROM qr_tafsir_passage_heading WHERE audio_id = 'QRTA:alusi:40-01' AND seq_from BETWEEN 1 AND 142;
INSERT INTO qr_tafsir_passage_heading (audio_id, seq_from, seq_to, source_slug, heading_en, origin, word_from, en_from) VALUES
  ('QRTA:alusi:40-01', 1, 6, 'alusi', 'The sūra''s names, and where it came down', 'kmaps_editor', 0, 0),
  ('QRTA:alusi:40-01', 6, 17, 'alusi', 'Is verse 35 Madinan? What “revealed about” means', 'kmaps_editor', 13, 138),
  ('QRTA:alusi:40-01', 18, 24, 'alusi', 'Verse count, and the link to al-Zumar', 'kmaps_editor', 0, 0),
  ('QRTA:alusi:40-01', 25, 28, 'alusi', 'Why the Ḥā Mīm sūras sit together', 'kmaps_editor', 0, 0),
  ('QRTA:alusi:40-01', 28, 35, 'alusi', 'The merit of the Ḥā Mīm sūras', 'kmaps_editor', 4, 54),
  ('QRTA:alusi:40-01', 36, 39, 'alusi', 'Sūras given in place of earlier books', 'kmaps_editor', 0, 0),
  ('QRTA:alusi:40-01', 40, 42, 'alusi', 'Seven Ḥā Mīms at Hell''s seven gates', 'kmaps_editor', 0, 0),
  ('QRTA:alusi:40-01', 42, 46, 'alusi', 'The merit of these opening verses', 'kmaps_editor', 12, 93),
  ('QRTA:alusi:40-01', 47, 56, 'alusi', 'Readings of Ḥā Mīm and their grammar', 'kmaps_editor', 0, 0),
  ('QRTA:alusi:40-01', 56, 66, 'alusi', 'Ḥawāmīm or Āl Ḥā Mīm? The plural debated', 'kmaps_editor', 1, 18),
  ('QRTA:alusi:40-01', 67, 74, 'alusi', 'What “Āl” means in “Āl Ḥā Mīm”', 'kmaps_editor', 0, 0),
  ('QRTA:alusi:40-01', 75, 78, 'alusi', 'Sending down of the Book; why Mighty, All-Knowing', 'kmaps_editor', 0, 0),
  ('QRTA:alusi:40-01', 79, 83, 'alusi', 'Four attributes: hope, fear, and definiteness', 'kmaps_editor', 0, 0),
  ('QRTA:alusi:40-01', 84, 97, 'alusi', '“Severe in punishment”: how can it be definite?', 'kmaps_editor', 0, 0),
  ('QRTA:alusi:40-01', 97, 102, 'alusi', 'Reading them as substitutes', 'kmaps_editor', 1, 8),
  ('QRTA:alusi:40-01', 102, 110, 'alusi', 'Can substitutes repeat?', 'kmaps_editor', 4, 48),
  ('QRTA:alusi:40-01', 110, 114, 'alusi', 'What tawb and ṭawl mean', 'kmaps_editor', 11, 113),
  ('QRTA:alusi:40-01', 114, 125, 'alusi', 'The wāw: two mercies joined; Forgiver first', 'kmaps_editor', 6, 66),
  ('QRTA:alusi:40-01', 126, 128, 'alusi', 'Is repentance surely accepted? Mercy comes first', 'kmaps_editor', 0, 0),
  ('QRTA:alusi:40-01', 129, 132, 'alusi', 'No god but He; to Him the return', 'kmaps_editor', 0, 0),
  ('QRTA:alusi:40-01', 132, 142, 'alusi', 'ʿUmar''s letter to a man lost to drink', 'kmaps_editor', 6, 80);
DELETE FROM qr_tafsir_passage_audio_en WHERE audio_id = 'QRTA:alusi:40-01' AND seq_from BETWEEN 1 AND 142;
INSERT INTO qr_tafsir_passage_audio_en (audio_id, seq_from, seq_to, object_key, start_sec, end_sec, voice) VALUES
  ('QRTA:alusi:40-01', 1, 6, 'tafsir-en/alusi/40-001-003.m4a', 0.0, 49.83, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 6, 17, 'tafsir-en/alusi/40-001-003.m4a', 50.73, 128.9, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 18, 24, 'tafsir-en/alusi/40-001-003.m4a', 129.8, 192.12, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 25, 28, 'tafsir-en/alusi/40-001-003.m4a', 193.02, 234.85, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 28, 35, 'tafsir-en/alusi/40-001-003.m4a', 235.75, 292.38, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 36, 39, 'tafsir-en/alusi/40-001-003.m4a', 293.28, 329.35, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 40, 42, 'tafsir-en/alusi/40-001-003.m4a', 330.25, 354.78, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 42, 46, 'tafsir-en/alusi/40-001-003.m4a', 355.68, 391.4, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 47, 56, 'tafsir-en/alusi/40-001-003.m4a', 392.3, 492.13, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 56, 66, 'tafsir-en/alusi/40-001-003.m4a', 493.03, 608.15, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 67, 74, 'tafsir-en/alusi/40-001-003.m4a', 609.05, 691.83, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 75, 78, 'tafsir-en/alusi/40-001-003.m4a', 692.73, 740.03, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 79, 83, 'tafsir-en/alusi/40-001-003.m4a', 740.93, 816.18, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 84, 97, 'tafsir-en/alusi/40-001-003.m4a', 817.08, 982.45, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 97, 102, 'tafsir-en/alusi/40-001-003.m4a', 983.35, 1036.75, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 102, 110, 'tafsir-en/alusi/40-001-003.m4a', 1037.65, 1124.05, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 110, 114, 'tafsir-en/alusi/40-001-003.m4a', 1124.95, 1173.5, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 114, 125, 'tafsir-en/alusi/40-001-003.m4a', 1174.4, 1318.47, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 126, 128, 'tafsir-en/alusi/40-001-003.m4a', 1319.37, 1356.47, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 129, 132, 'tafsir-en/alusi/40-001-003.m4a', 1357.37, 1393.52, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 132, 142, 'tafsir-en/alusi/40-001-003.m4a', 1394.42, 1479.67, 'kokoro:bm_george');
