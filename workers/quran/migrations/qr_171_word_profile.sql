-- The word drill of a sentence: no longer only ism, fiʿl or ḥarf, but the word as the corpus (QAC) describes it in GT
-- terms — its kind, then a noun's derivation, case, definiteness, number and gender, a verb's tense, voice, person,
-- number, gender and mood (owner, 2026-10-20). The drill's key stays 'wordclass'; its words change.
UPDATE qr_study_label SET label = 'What is this word? Its kind and its marks', label_ar = 'صِفِ الكَلِمَة: نَوْعُهَا وَعَلَامَاتُهَا'
 WHERE scope = 'kind' AND key = 'wordclass';
UPDATE qr_study_label SET label = 'Each word described', label_ar = 'وَصْفُ الكَلِمَة'
 WHERE scope = 'class_style' AND key = 'wordclass';
