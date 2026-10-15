-- A verb's gloss in the vocab drills: its most-used meaning in the Qurʾān (AL quran_meanings, read from every use and its
-- translations, 0214), not the first Lane sub-entry the import took (أَنزَلَ had "She excerned the first milk … into her udder",
-- Lane's أَنْزَلَتْ A2, on all 183 rows) nor a narrow idiom (نَزَّلَ: Mir's "send down sanction").
UPDATE qr_vocab_item SET gloss_en = 'to come down, to descend', gloss_ref = 'K-Maps: its uses in the Qurʾān and their translations' WHERE root = 'نزل' AND lemma = 'نَزَلَ';
UPDATE qr_vocab_item SET gloss_en = 'to send down, to reveal', gloss_ref = 'K-Maps: its uses in the Qurʾān and their translations' WHERE root = 'نزل' AND lemma = 'نَزَّلَ';
UPDATE qr_vocab_item SET gloss_en = 'to send down (revelation, rain, calm, angels)', gloss_ref = 'K-Maps: its uses in the Qurʾān and their translations' WHERE root = 'نزل' AND lemma = 'أَنزَلَ';
UPDATE qr_vocab_item SET gloss_en = 'to come down, to descend (angels, devils, command)', gloss_ref = 'K-Maps: its uses in the Qurʾān and their translations' WHERE root = 'نزل' AND lemma = 'تَنَزَّلَتْ';
UPDATE qr_vocab_item SET gloss_en = 'to forgive', gloss_ref = 'K-Maps: its uses in the Qurʾān and their translations' WHERE root = 'غفر' AND lemma = 'غَفَرَ';
UPDATE qr_vocab_item SET gloss_en = 'to ask (God) for forgiveness', gloss_ref = 'K-Maps: its uses in the Qurʾān and their translations' WHERE root = 'غفر' AND lemma = 'اسْتَغْفَرَ';
UPDATE qr_vocab_item SET gloss_en = 'to come toward, to approach', gloss_ref = 'K-Maps: its uses in the Qurʾān and their translations' WHERE root = 'قبل' AND lemma = 'أَقْبَلَ';
UPDATE qr_vocab_item SET gloss_en = 'to accept (an offering, a prayer, a person)', gloss_ref = 'K-Maps: its uses in the Qurʾān and their translations' WHERE root = 'قبل' AND lemma = 'تَقَبَّلَ';
UPDATE qr_vocab_item SET gloss_en = 'to repent, to turn back to God', gloss_ref = 'K-Maps: its uses in the Qurʾān and their translations' WHERE root = 'توب' AND lemma = 'تَابَ';
UPDATE qr_vocab_item SET gloss_en = 'to punish in return, to hit back with the same', gloss_ref = 'K-Maps: its uses in the Qurʾān and their translations' WHERE root = 'عقب' AND lemma = 'عَاقَبَ';
UPDATE qr_vocab_item SET gloss_en = 'to make something follow as a result (as a penalty)', gloss_ref = 'K-Maps: its uses in the Qurʾān and their translations' WHERE root = 'عقب' AND lemma = 'أَعْقَبَ';
UPDATE qr_vocab_item SET gloss_en = 'to be long, to last long (of time, life)', gloss_ref = 'K-Maps: its uses in the Qurʾān and their translations' WHERE root = 'طول' AND lemma = 'طَالَ';
UPDATE qr_vocab_item SET gloss_en = 'to grow long, to stretch on (of life, time)', gloss_ref = 'K-Maps: its uses in the Qurʾān and their translations' WHERE root = 'طول' AND lemma = 'تَطَاوَلَ';
-- two patterns written without their sukūn
UPDATE qr_vocab_item SET wazn_ar = 'مَفْعِل' WHERE wazn_ar = 'مَفِعل';
UPDATE qr_vocab_item SET wazn_ar = 'فَعْل' WHERE wazn_ar = 'فَعل';
-- three lemmas filed by their present tense
UPDATE qr_vocab_item SET gloss_en = 'to return to, to end up with', gloss_ref = 'K-Maps: its uses in the Qurʾān and their translations' WHERE root = 'صير' AND lemma = 'تَصِيرُ';
UPDATE qr_vocab_item SET gloss_en = 'to accept', gloss_ref = 'K-Maps: its uses in the Qurʾān and their translations' WHERE root = 'قبل' AND lemma = 'يَقْبَلُ';
UPDATE qr_vocab_item SET gloss_en = 'to turn back, to look back', gloss_ref = 'K-Maps: its uses in the Qurʾān and their translations' WHERE root = 'عقب' AND lemma = 'يُعَقِّبْ';
