-- qr_087: every Qurʾānic إِثْم is one AL lemma (AL:ae07a3a460b2ba37e4490886cc, 24 uses in AL). 11 uses had no
-- lemma link and 2 pointed at the wrong lemma — the word next to it (off by one):
--   2:181:6  was AL:e87b01d6a238b28f50fc8d95c1 (إِنّ)
--   2:203:16 was AL:b4069918b8864f902a843a6a30 (تَأَخَّرَ)
-- Found while moving the near-synonym set "words for sin" into AL (2:219 is its إِثْم verse).
UPDATE qr_word_occurrence SET gid_lemma = 'AL:ae07a3a460b2ba37e4490886cc'
 WHERE lemma = 'إِثْم' AND (gid_lemma IS NULL OR gid_lemma IN ('AL:e87b01d6a238b28f50fc8d95c1', 'AL:b4069918b8864f902a843a6a30'));
