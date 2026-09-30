-- How common each word of the drill pools is: its count in the local Shamela library (the form's, or
-- its stem's where that is higher), keyed by the letters alone (no marks; ٱأإآ→ا ى→ي ة→ه ؤ→و ئ→ي).
-- Filled by kmaps-resources scripts/arabic-episodes/drill_words.py grade, with ar_read_pool.grade.
-- The drills read it to blank the commoner content words at Level 1 and the rarer at Level 3.
CREATE TABLE IF NOT EXISTS ar_word_freq (
  bare TEXT PRIMARY KEY,
  n    INTEGER NOT NULL
);
