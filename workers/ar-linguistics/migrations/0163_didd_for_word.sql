-- 0163: an opposite is stated for ONE word of a root, not for the root. The books' طُول ↔ قِصَر is about length, not
-- طَوْل (bounty, 40:3); أَقْبَلَ ↔ أَدْبَرَ is about coming forward, not قَابِل (accepting). Listed by root, a word's
-- screen led with another word's opposite. Each row now names the word it belongs to when that word is not the
-- root's main sense:
--   for_word_ar / for_word_en  the word and a plain gloss (shown as "for …")
--   lemma_id                   its global lemma id, where the Qurʾān has that word (AL:LEMMA)
-- NULL for_word = the root's main sense, shared by its main words. The "For X — not Y." lead-in that 0160 put in
-- note_en is dropped from those rows: the label carries it now.
ALTER TABLE ar_ling_root_didd ADD COLUMN lemma_id TEXT REFERENCES ar_ling_root_lemma(id);
ALTER TABLE ar_ling_root_didd ADD COLUMN for_word_ar TEXT;
ALTER TABLE ar_ling_root_didd ADD COLUMN for_word_en TEXT;

UPDATE ar_ling_root_didd SET for_word_ar = 'ذَنَب',   for_word_en = 'tail'                        WHERE id = 'DID:ذنب:راس';
UPDATE ar_ling_root_didd SET for_word_ar = 'شَدَّ',   for_word_en = 'to tie fast',                lemma_id = '3f55c0cc3dd6f3d9b639739bda' WHERE id = 'DID:شدد:حلل';
UPDATE ar_ling_root_didd SET for_word_ar = 'طُول',    for_word_en = 'length',                     lemma_id = 'a0c8ed4d653bd3b02b6e7e5c8a' WHERE id IN ('AN:طول:1', 'AN:طول:2');
UPDATE ar_ling_root_didd SET for_word_ar = 'عَزَّ',   for_word_en = 'the verb, in a rare use',    lemma_id = '56834f34c3fa485855e9f3993f' WHERE id = 'DID:عزز:عزز';
UPDATE ar_ling_root_didd SET for_word_ar = 'مَعْلَم', for_word_en = 'a marked place'              WHERE id = 'DID:علم:جهل:2';
UPDATE ar_ling_root_didd SET for_word_ar = 'غَفِرَ',  for_word_en = 'said of a wound'             WHERE id = 'DID:غفر:غفر';
UPDATE ar_ling_root_didd SET for_word_ar = 'أَقْبَلَ', for_word_en = 'to come forward',           lemma_id = '40d911dc4aea22bff6c354f962' WHERE id = 'DID:قبل:دبر';
UPDATE ar_ling_root_didd SET for_word_ar = 'قَبْلُ',  for_word_en = 'before',                     lemma_id = 'c1703585b55a416fd046cb98d7' WHERE id = 'DID:قبل:بعد';
UPDATE ar_ling_root_didd SET for_word_ar = 'قُبُل',   for_word_en = 'the front',                  lemma_id = '10860bc58426c6806965272428' WHERE id = 'DID:قبل:دبر:2';
UPDATE ar_ling_root_didd SET for_word_ar = 'كَتَبَ',  for_word_en = 'to gather, as in كَتِيبَة, a troop' WHERE id = 'DID:كتب:نشر';
UPDATE ar_ling_root_didd SET for_word_ar = 'نُزُول',  for_word_en = 'stopping at a place',        lemma_id = '2800aea5ea522f1be1ab108d71' WHERE id = 'DID:نزل:رحل';

-- the lead-in now lives in the label
UPDATE ar_ling_root_didd SET note_en = trim(substr(note_en, instr(note_en, '. ') + 2))
 WHERE for_word_ar IS NOT NULL AND note_en LIKE 'For %— not %' AND instr(note_en, '. ') > 0;
