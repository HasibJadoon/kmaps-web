-- qr_142 · two ṣarf instructions had an Arabic word inside tracked English ("Which باب is it?"): letter-spaced, the Arabic
-- came apart (بـــاب). English-primary, the term transliterated and glossed; the Arabic stays in label_ar.
UPDATE qr_study_label SET label = 'Which verb pattern (bāb) is it?' WHERE scope = 'kind' AND key = 'sf_bab';
UPDATE qr_study_label SET label = 'Choose every verbal noun (maṣdar)' WHERE scope = 'kind' AND key = 'sf_masadir';
