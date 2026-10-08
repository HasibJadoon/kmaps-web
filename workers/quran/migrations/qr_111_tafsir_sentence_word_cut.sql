-- The commentary's Understanding sentences cut at the word, as its passages are (qr_110): each sentence card starts
-- on its own first word (word_from, in its first line's words as served), never on a fragment of the one before or
-- with a lead-in it doesn't own; a line it shares with the sentence before is split there. Ids are unchanged (marks
-- and drills point at them); only where each starts and ends moves. Every passage start is a sentence start.
-- And al-Ālūsī's 'What tawb and ṭawl mean' passage starts at his verdict «وعندي…» (line 110, word 2), which its
-- sentence card holds; his English recording is re-voiced to match.
ALTER TABLE qr_tafsir_sentence ADD COLUMN word_from INTEGER NOT NULL DEFAULT 0;
UPDATE qr_tafsir_sentence SET seq_from = 1, seq_to = 4, word_from = 0 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:1-3';
UPDATE qr_tafsir_sentence SET seq_from = 4, seq_to = 4, word_from = 1 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:4-4';
UPDATE qr_tafsir_sentence SET seq_from = 5, seq_to = 6, word_from = 0 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:5-6';
UPDATE qr_tafsir_sentence SET seq_from = 7, seq_to = 8, word_from = 0 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:7-8';
UPDATE qr_tafsir_sentence SET seq_from = 9, seq_to = 10, word_from = 0 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:9-10';
UPDATE qr_tafsir_sentence SET seq_from = 11, seq_to = 11, word_from = 0 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:11-11';
UPDATE qr_tafsir_sentence SET seq_from = 12, seq_to = 14, word_from = 0 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:12-14';
UPDATE qr_tafsir_sentence SET seq_from = 15, seq_to = 16, word_from = 0 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:15-16';
UPDATE qr_tafsir_sentence SET seq_from = 17, seq_to = 17, word_from = 0 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:17-17';
UPDATE qr_tafsir_sentence SET seq_from = 18, seq_to = 21, word_from = 0 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:18-21';
UPDATE qr_tafsir_sentence SET seq_from = 21, seq_to = 22, word_from = 4 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:22-22';
UPDATE qr_tafsir_sentence SET seq_from = 23, seq_to = 24, word_from = 0 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:23-24';
UPDATE qr_tafsir_sentence SET seq_from = 25, seq_to = 26, word_from = 0 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:25-26';
UPDATE qr_tafsir_sentence SET seq_from = 27, seq_to = 28, word_from = 0 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:27-28';
UPDATE qr_tafsir_sentence SET seq_from = 29, seq_to = 32, word_from = 0 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:29-32';
UPDATE qr_tafsir_sentence SET seq_from = 32, seq_to = 35, word_from = 3 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:33-35';
UPDATE qr_tafsir_sentence SET seq_from = 35, seq_to = 38, word_from = 9 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:36-38';
UPDATE qr_tafsir_sentence SET seq_from = 38, seq_to = 41, word_from = 13 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:39-41';
UPDATE qr_tafsir_sentence SET seq_from = 41, seq_to = 42, word_from = 1 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:42-42';
UPDATE qr_tafsir_sentence SET seq_from = 43, seq_to = 44, word_from = 0 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:43-44';
UPDATE qr_tafsir_sentence SET seq_from = 45, seq_to = 45, word_from = 0 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:45-45';
UPDATE qr_tafsir_sentence SET seq_from = 46, seq_to = 49, word_from = 0 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:46-49';
UPDATE qr_tafsir_sentence SET seq_from = 50, seq_to = 51, word_from = 0 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:50-51';
UPDATE qr_tafsir_sentence SET seq_from = 51, seq_to = 55, word_from = 4 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:52-55';
UPDATE qr_tafsir_sentence SET seq_from = 56, seq_to = 57, word_from = 0 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:56-57';
UPDATE qr_tafsir_sentence SET seq_from = 58, seq_to = 60, word_from = 0 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:58-60';
UPDATE qr_tafsir_sentence SET seq_from = 60, seq_to = 62, word_from = 1 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:61-62';
UPDATE qr_tafsir_sentence SET seq_from = 62, seq_to = 65, word_from = 3 WHERE id = 'tafsir_sent:QRTA:zamakhshari:40-01:63-65';
UPDATE qr_tafsir_sentence SET seq_from = 1, seq_to = 2, word_from = 0 WHERE id = 'tafsir_sent:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:1-2';
UPDATE qr_tafsir_sentence SET seq_from = 3, seq_to = 5, word_from = 0 WHERE id = 'tafsir_sent:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:3-5';
UPDATE qr_tafsir_sentence SET seq_from = 6, seq_to = 6, word_from = 0 WHERE id = 'tafsir_sent:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:6-6';
UPDATE qr_tafsir_sentence SET seq_from = 7, seq_to = 7, word_from = 0 WHERE id = 'tafsir_sent:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:7-7';
UPDATE qr_tafsir_sentence SET seq_from = 8, seq_to = 9, word_from = 0 WHERE id = 'tafsir_sent:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:8-9';
UPDATE qr_tafsir_sentence SET seq_from = 10, seq_to = 11, word_from = 0 WHERE id = 'tafsir_sent:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:10-11';
UPDATE qr_tafsir_sentence SET seq_from = 12, seq_to = 14, word_from = 0 WHERE id = 'tafsir_sent:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:12-14';
UPDATE qr_tafsir_sentence SET seq_from = 15, seq_to = 16, word_from = 0 WHERE id = 'tafsir_sent:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:15-16';
UPDATE qr_tafsir_sentence SET seq_from = 17, seq_to = 17, word_from = 0 WHERE id = 'tafsir_sent:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:17-17';
UPDATE qr_tafsir_sentence SET seq_from = 18, seq_to = 20, word_from = 0 WHERE id = 'tafsir_sent:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:18-19';
UPDATE qr_tafsir_sentence SET seq_from = 20, seq_to = 22, word_from = 2 WHERE id = 'tafsir_sent:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:20-22';
UPDATE qr_tafsir_sentence SET seq_from = 23, seq_to = 24, word_from = 0 WHERE id = 'tafsir_sent:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:23-24';
UPDATE qr_tafsir_sentence SET seq_from = 25, seq_to = 26, word_from = 0 WHERE id = 'tafsir_sent:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:25-25';
UPDATE qr_tafsir_sentence SET seq_from = 26, seq_to = 29, word_from = 1 WHERE id = 'tafsir_sent:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:26-29';
UPDATE qr_tafsir_sentence SET seq_from = 30, seq_to = 31, word_from = 0 WHERE id = 'tafsir_sent:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:30-31';
UPDATE qr_tafsir_sentence SET seq_from = 32, seq_to = 34, word_from = 0 WHERE id = 'tafsir_sent:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:32-34';
UPDATE qr_tafsir_sentence SET seq_from = 35, seq_to = 36, word_from = 0 WHERE id = 'tafsir_sent:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:35-36';
UPDATE qr_tafsir_sentence SET seq_from = 36, seq_to = 39, word_from = 16 WHERE id = 'tafsir_sent:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:37-39';
UPDATE qr_tafsir_sentence SET seq_from = 40, seq_to = 45, word_from = 0 WHERE id = 'tafsir_sent:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:40-44';
UPDATE qr_tafsir_sentence SET seq_from = 45, seq_to = 45, word_from = 2 WHERE id = 'tafsir_sent:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:45-45';
UPDATE qr_tafsir_sentence SET seq_from = 46, seq_to = 48, word_from = 0 WHERE id = 'tafsir_sent:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:46-48';
UPDATE qr_tafsir_sentence SET seq_from = 49, seq_to = 51, word_from = 0 WHERE id = 'tafsir_sent:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:49-51';
UPDATE qr_tafsir_sentence SET seq_from = 52, seq_to = 54, word_from = 0 WHERE id = 'tafsir_sent:QRTA:ibn_ashur:y-m2kq2xlU4DM-02:52-54';
UPDATE qr_tafsir_sentence SET seq_from = 1, seq_to = 4, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:1-4';
UPDATE qr_tafsir_sentence SET seq_from = 5, seq_to = 8, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:5-8';
UPDATE qr_tafsir_sentence SET seq_from = 8, seq_to = 10, word_from = 12 WHERE id = 'tafsir_sent:QRTA:razi:40-01:9-10';
UPDATE qr_tafsir_sentence SET seq_from = 10, seq_to = 13, word_from = 11 WHERE id = 'tafsir_sent:QRTA:razi:40-01:11-12';
UPDATE qr_tafsir_sentence SET seq_from = 13, seq_to = 13, word_from = 6 WHERE id = 'tafsir_sent:QRTA:razi:40-01:13-13';
UPDATE qr_tafsir_sentence SET seq_from = 14, seq_to = 14, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:14-14';
UPDATE qr_tafsir_sentence SET seq_from = 14, seq_to = 17, word_from = 12 WHERE id = 'tafsir_sent:QRTA:razi:40-01:15-17';
UPDATE qr_tafsir_sentence SET seq_from = 17, seq_to = 18, word_from = 13 WHERE id = 'tafsir_sent:QRTA:razi:40-01:18-18';
UPDATE qr_tafsir_sentence SET seq_from = 19, seq_to = 20, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:19-19';
UPDATE qr_tafsir_sentence SET seq_from = 20, seq_to = 21, word_from = 3 WHERE id = 'tafsir_sent:QRTA:razi:40-01:20-21';
UPDATE qr_tafsir_sentence SET seq_from = 22, seq_to = 24, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:22-24';
UPDATE qr_tafsir_sentence SET seq_from = 24, seq_to = 26, word_from = 8 WHERE id = 'tafsir_sent:QRTA:razi:40-01:25-26';
UPDATE qr_tafsir_sentence SET seq_from = 27, seq_to = 29, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:27-29';
UPDATE qr_tafsir_sentence SET seq_from = 29, seq_to = 31, word_from = 17 WHERE id = 'tafsir_sent:QRTA:razi:40-01:30-31';
UPDATE qr_tafsir_sentence SET seq_from = 32, seq_to = 32, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:32-32';
UPDATE qr_tafsir_sentence SET seq_from = 32, seq_to = 34, word_from = 16 WHERE id = 'tafsir_sent:QRTA:razi:40-01:33-34';
UPDATE qr_tafsir_sentence SET seq_from = 34, seq_to = 37, word_from = 17 WHERE id = 'tafsir_sent:QRTA:razi:40-01:35-37';
UPDATE qr_tafsir_sentence SET seq_from = 37, seq_to = 40, word_from = 5 WHERE id = 'tafsir_sent:QRTA:razi:40-01:38-39';
UPDATE qr_tafsir_sentence SET seq_from = 40, seq_to = 41, word_from = 1 WHERE id = 'tafsir_sent:QRTA:razi:40-01:40-41';
UPDATE qr_tafsir_sentence SET seq_from = 41, seq_to = 43, word_from = 7 WHERE id = 'tafsir_sent:QRTA:razi:40-01:42-43';
UPDATE qr_tafsir_sentence SET seq_from = 43, seq_to = 45, word_from = 1 WHERE id = 'tafsir_sent:QRTA:razi:40-01:44-45';
UPDATE qr_tafsir_sentence SET seq_from = 45, seq_to = 49, word_from = 13 WHERE id = 'tafsir_sent:QRTA:razi:40-01:46-49';
UPDATE qr_tafsir_sentence SET seq_from = 50, seq_to = 50, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:50-50';
UPDATE qr_tafsir_sentence SET seq_from = 50, seq_to = 54, word_from = 16 WHERE id = 'tafsir_sent:QRTA:razi:40-01:51-54';
UPDATE qr_tafsir_sentence SET seq_from = 55, seq_to = 56, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:55-56';
UPDATE qr_tafsir_sentence SET seq_from = 56, seq_to = 59, word_from = 9 WHERE id = 'tafsir_sent:QRTA:razi:40-01:57-59';
UPDATE qr_tafsir_sentence SET seq_from = 60, seq_to = 62, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:60-62';
UPDATE qr_tafsir_sentence SET seq_from = 63, seq_to = 65, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:63-65';
UPDATE qr_tafsir_sentence SET seq_from = 66, seq_to = 67, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:66-67';
UPDATE qr_tafsir_sentence SET seq_from = 68, seq_to = 71, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:68-70';
UPDATE qr_tafsir_sentence SET seq_from = 71, seq_to = 74, word_from = 1 WHERE id = 'tafsir_sent:QRTA:razi:40-01:71-74';
UPDATE qr_tafsir_sentence SET seq_from = 75, seq_to = 77, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:75-77';
UPDATE qr_tafsir_sentence SET seq_from = 77, seq_to = 80, word_from = 13 WHERE id = 'tafsir_sent:QRTA:razi:40-01:78-80';
UPDATE qr_tafsir_sentence SET seq_from = 80, seq_to = 84, word_from = 2 WHERE id = 'tafsir_sent:QRTA:razi:40-01:81-84';
UPDATE qr_tafsir_sentence SET seq_from = 85, seq_to = 86, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:85-86';
UPDATE qr_tafsir_sentence SET seq_from = 86, seq_to = 90, word_from = 12 WHERE id = 'tafsir_sent:QRTA:razi:40-01:87-90';
UPDATE qr_tafsir_sentence SET seq_from = 90, seq_to = 93, word_from = 3 WHERE id = 'tafsir_sent:QRTA:razi:40-01:91-93';
UPDATE qr_tafsir_sentence SET seq_from = 93, seq_to = 96, word_from = 2 WHERE id = 'tafsir_sent:QRTA:razi:40-01:94-96';
UPDATE qr_tafsir_sentence SET seq_from = 97, seq_to = 98, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:97-98';
UPDATE qr_tafsir_sentence SET seq_from = 99, seq_to = 102, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:99-101';
UPDATE qr_tafsir_sentence SET seq_from = 102, seq_to = 103, word_from = 3 WHERE id = 'tafsir_sent:QRTA:razi:40-01:102-103';
UPDATE qr_tafsir_sentence SET seq_from = 104, seq_to = 107, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:104-107';
UPDATE qr_tafsir_sentence SET seq_from = 108, seq_to = 110, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:108-110';
UPDATE qr_tafsir_sentence SET seq_from = 111, seq_to = 112, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:111-112';
UPDATE qr_tafsir_sentence SET seq_from = 113, seq_to = 116, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:113-116';
UPDATE qr_tafsir_sentence SET seq_from = 116, seq_to = 120, word_from = 3 WHERE id = 'tafsir_sent:QRTA:razi:40-01:117-119';
UPDATE qr_tafsir_sentence SET seq_from = 120, seq_to = 121, word_from = 1 WHERE id = 'tafsir_sent:QRTA:razi:40-01:120-121';
UPDATE qr_tafsir_sentence SET seq_from = 121, seq_to = 123, word_from = 16 WHERE id = 'tafsir_sent:QRTA:razi:40-01:122-123';
UPDATE qr_tafsir_sentence SET seq_from = 124, seq_to = 126, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:124-126';
UPDATE qr_tafsir_sentence SET seq_from = 127, seq_to = 130, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:127-130';
UPDATE qr_tafsir_sentence SET seq_from = 131, seq_to = 132, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:131-132';
UPDATE qr_tafsir_sentence SET seq_from = 133, seq_to = 135, word_from = 0 WHERE id = 'tafsir_sent:QRTA:razi:40-01:133-135';
UPDATE qr_tafsir_sentence SET seq_from = 135, seq_to = 136, word_from = 11 WHERE id = 'tafsir_sent:QRTA:razi:40-01:136-136';
UPDATE qr_tafsir_sentence SET seq_from = 1, seq_to = 4, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:1-4';
UPDATE qr_tafsir_sentence SET seq_from = 5, seq_to = 6, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:5-6';
UPDATE qr_tafsir_sentence SET seq_from = 6, seq_to = 10, word_from = 13 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:7-10';
UPDATE qr_tafsir_sentence SET seq_from = 10, seq_to = 13, word_from = 9 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:11-13';
UPDATE qr_tafsir_sentence SET seq_from = 13, seq_to = 16, word_from = 4 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:14-16';
UPDATE qr_tafsir_sentence SET seq_from = 17, seq_to = 17, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:17-17';
UPDATE qr_tafsir_sentence SET seq_from = 18, seq_to = 20, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:18-19';
UPDATE qr_tafsir_sentence SET seq_from = 20, seq_to = 22, word_from = 2 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:20-21';
UPDATE qr_tafsir_sentence SET seq_from = 22, seq_to = 24, word_from = 4 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:22-24';
UPDATE qr_tafsir_sentence SET seq_from = 25, seq_to = 25, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:25-25';
UPDATE qr_tafsir_sentence SET seq_from = 26, seq_to = 28, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:26-27';
UPDATE qr_tafsir_sentence SET seq_from = 28, seq_to = 29, word_from = 4 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:28-29';
UPDATE qr_tafsir_sentence SET seq_from = 30, seq_to = 31, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:30-31';
UPDATE qr_tafsir_sentence SET seq_from = 32, seq_to = 33, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:32-33';
UPDATE qr_tafsir_sentence SET seq_from = 34, seq_to = 35, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:34-35';
UPDATE qr_tafsir_sentence SET seq_from = 36, seq_to = 39, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:36-39';
UPDATE qr_tafsir_sentence SET seq_from = 40, seq_to = 42, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:40-42';
UPDATE qr_tafsir_sentence SET seq_from = 42, seq_to = 46, word_from = 12 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:43-46';
UPDATE qr_tafsir_sentence SET seq_from = 47, seq_to = 50, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:47-49';
UPDATE qr_tafsir_sentence SET seq_from = 50, seq_to = 52, word_from = 4 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:50-52';
UPDATE qr_tafsir_sentence SET seq_from = 53, seq_to = 53, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:53-53';
UPDATE qr_tafsir_sentence SET seq_from = 54, seq_to = 56, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:54-55';
UPDATE qr_tafsir_sentence SET seq_from = 56, seq_to = 58, word_from = 1 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:56-58';
UPDATE qr_tafsir_sentence SET seq_from = 58, seq_to = 60, word_from = 14 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:59-60';
UPDATE qr_tafsir_sentence SET seq_from = 60, seq_to = 63, word_from = 16 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:61-63';
UPDATE qr_tafsir_sentence SET seq_from = 63, seq_to = 65, word_from = 8 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:64-65';
UPDATE qr_tafsir_sentence SET seq_from = 66, seq_to = 66, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:66-66';
UPDATE qr_tafsir_sentence SET seq_from = 67, seq_to = 69, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:67-69';
UPDATE qr_tafsir_sentence SET seq_from = 69, seq_to = 72, word_from = 6 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:70-72';
UPDATE qr_tafsir_sentence SET seq_from = 73, seq_to = 74, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:73-74';
UPDATE qr_tafsir_sentence SET seq_from = 75, seq_to = 76, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:75-76';
UPDATE qr_tafsir_sentence SET seq_from = 76, seq_to = 78, word_from = 8 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:77-78';
UPDATE qr_tafsir_sentence SET seq_from = 79, seq_to = 81, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:79-81';
UPDATE qr_tafsir_sentence SET seq_from = 81, seq_to = 83, word_from = 13 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:82-83';
UPDATE qr_tafsir_sentence SET seq_from = 84, seq_to = 86, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:84-86';
UPDATE qr_tafsir_sentence SET seq_from = 86, seq_to = 88, word_from = 9 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:87-88';
UPDATE qr_tafsir_sentence SET seq_from = 88, seq_to = 90, word_from = 11 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:89-90';
UPDATE qr_tafsir_sentence SET seq_from = 90, seq_to = 92, word_from = 17 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:91-92';
UPDATE qr_tafsir_sentence SET seq_from = 92, seq_to = 95, word_from = 15 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:93-94';
UPDATE qr_tafsir_sentence SET seq_from = 95, seq_to = 97, word_from = 1 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:95-96';
UPDATE qr_tafsir_sentence SET seq_from = 97, seq_to = 98, word_from = 1 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:97-98';
UPDATE qr_tafsir_sentence SET seq_from = 99, seq_to = 100, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:99-100';
UPDATE qr_tafsir_sentence SET seq_from = 101, seq_to = 102, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:101-102';
UPDATE qr_tafsir_sentence SET seq_from = 102, seq_to = 105, word_from = 4 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:103-105';
UPDATE qr_tafsir_sentence SET seq_from = 105, seq_to = 110, word_from = 16 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:106-109';
UPDATE qr_tafsir_sentence SET seq_from = 110, seq_to = 111, word_from = 2 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:110-111';
UPDATE qr_tafsir_sentence SET seq_from = 111, seq_to = 114, word_from = 9 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:112-113';
UPDATE qr_tafsir_sentence SET seq_from = 114, seq_to = 116, word_from = 6 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:114-116';
UPDATE qr_tafsir_sentence SET seq_from = 116, seq_to = 119, word_from = 7 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:117-119';
UPDATE qr_tafsir_sentence SET seq_from = 119, seq_to = 121, word_from = 12 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:120-121';
UPDATE qr_tafsir_sentence SET seq_from = 121, seq_to = 123, word_from = 7 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:122-123';
UPDATE qr_tafsir_sentence SET seq_from = 123, seq_to = 125, word_from = 16 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:124-124';
UPDATE qr_tafsir_sentence SET seq_from = 125, seq_to = 125, word_from = 2 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:125-125';
UPDATE qr_tafsir_sentence SET seq_from = 126, seq_to = 126, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:126-126';
UPDATE qr_tafsir_sentence SET seq_from = 127, seq_to = 128, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:127-128';
UPDATE qr_tafsir_sentence SET seq_from = 129, seq_to = 130, word_from = 0 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:129-130';
UPDATE qr_tafsir_sentence SET seq_from = 130, seq_to = 132, word_from = 10 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:131-132';
UPDATE qr_tafsir_sentence SET seq_from = 132, seq_to = 135, word_from = 6 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:133-135';
UPDATE qr_tafsir_sentence SET seq_from = 135, seq_to = 138, word_from = 3 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:136-138';
UPDATE qr_tafsir_sentence SET seq_from = 138, seq_to = 140, word_from = 14 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:139-140';
UPDATE qr_tafsir_sentence SET seq_from = 140, seq_to = 142, word_from = 1 WHERE id = 'tafsir_sent:QRTA:alusi:40-01:141-142';
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
  ('QRTA:alusi:40-01', 110, 114, 'alusi', 'What tawb and ṭawl mean', 'kmaps_editor', 2, 18),
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
  ('QRTA:alusi:40-01', 102, 110, 'tafsir-en/alusi/40-001-003.m4a', 1037.65, 1118.93, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 110, 114, 'tafsir-en/alusi/40-001-003.m4a', 1119.83, 1174.05, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 114, 125, 'tafsir-en/alusi/40-001-003.m4a', 1174.95, 1319.02, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 126, 128, 'tafsir-en/alusi/40-001-003.m4a', 1319.92, 1357.02, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 129, 132, 'tafsir-en/alusi/40-001-003.m4a', 1357.92, 1394.07, 'kokoro:bm_george'),
  ('QRTA:alusi:40-01', 132, 142, 'tafsir-en/alusi/40-001-003.m4a', 1394.97, 1480.22, 'kokoro:bm_george');
