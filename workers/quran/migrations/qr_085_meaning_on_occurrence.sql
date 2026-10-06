-- qr_085: what a word means in its āyah belongs to the Qurʾānic word itself — the occurrence
-- (qr_word_occurrence, the QAC word) — not to the passage's ṣarf sheet.
--
--   here_en        what it means in this āyah, in plain words
--   here_sense     which sense of its lemma's range it uses (qr_sarf_sense.id)
--   here_src_json  the source lines behind it [{src, ref, ar}]
--
-- Moved from qr_sarf_word (qr_082–084), which keeps only its ṣarf facts (verb, plurals, preposition).

ALTER TABLE qr_word_occurrence ADD COLUMN here_en TEXT;
ALTER TABLE qr_word_occurrence ADD COLUMN here_sense TEXT;
ALTER TABLE qr_word_occurrence ADD COLUMN here_src_json TEXT;

UPDATE qr_word_occurrence SET
  here_en       = (SELECT w.here_en       FROM qr_sarf_word w WHERE w.surah = qr_word_occurrence.surah AND w.ayah = qr_word_occurrence.ayah AND w.word_index = qr_word_occurrence.word_index),
  here_sense    = (SELECT w.here_sense    FROM qr_sarf_word w WHERE w.surah = qr_word_occurrence.surah AND w.ayah = qr_word_occurrence.ayah AND w.word_index = qr_word_occurrence.word_index),
  here_src_json = (SELECT w.here_src_json FROM qr_sarf_word w WHERE w.surah = qr_word_occurrence.surah AND w.ayah = qr_word_occurrence.ayah AND w.word_index = qr_word_occurrence.word_index)
WHERE EXISTS (SELECT 1 FROM qr_sarf_word w WHERE w.surah = qr_word_occurrence.surah AND w.ayah = qr_word_occurrence.ayah AND w.word_index = qr_word_occurrence.word_index);

ALTER TABLE qr_sarf_word DROP COLUMN here_en;
ALTER TABLE qr_sarf_word DROP COLUMN here_sense;
ALTER TABLE qr_sarf_word DROP COLUMN here_src_json;
