-- Read & fill at Level 1. ar_read_pool.grade 0 is Level 1's own sentences: the plainest recorded lines of the
-- books and readers (adab and stories — al-Qāriʾ al-ʿArabī, the learners' stories, Kalīla wa-Dimna, al-Bukhalāʾ,
-- Ibn Baṭṭūṭa, Adab al-dunyā wa-l-dīn …), 4–10 words, three content words or more and every one common in the
-- Shamela library, each with its human recording and every word timed (object_key / start_sec / end_sec /
-- words_json as in ar_practice_pool; unit_id is the recording, ar_practice_pool.audio_id). Chosen and written by
-- kmaps-resources scripts/arabic-episodes/drill_words.py level1, their blanks by drill_words.py build/apply
-- (band basic: only function words are never blanked). Grades 1–3 stay the classical books' (drill_words.py grade,
-- which leaves grade 0 alone). Level 1 reads grade 0; Levels 2 and 3 read as before.
UPDATE ar_practice_label
   SET extra_json = json_set(COALESCE(extra_json, '{}'), '$.read', json('{"grades":[0]}'))
 WHERE scope = 'sentence_band' AND key = 'basic';
