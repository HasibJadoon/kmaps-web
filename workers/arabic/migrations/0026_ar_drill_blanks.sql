-- The words a fill drill may blank in a line, and the three wrong options beside each, chosen
-- offline over the whole corpus (kmaps-resources scripts/arabic-episodes/drill_words.py): the same
-- part of speech (Qurʾān morphology, AL lemmas, the line's gloss, the corpus), the same shape
-- (article, clitic, ending, length ±1), the same work first; real words only, never a form of
-- the answer nor a word of the line. [{i, a, o: [3], p}] — token index, answer and options as
-- shown (bare), part of speech. A line without it falls back to the worker's own choice.
ALTER TABLE ar_practice_pool ADD COLUMN blanks_json TEXT;
ALTER TABLE ar_read_pool ADD COLUMN blanks_json TEXT;

-- Words of the transcribed lines that are not Arabic words (Whisper's mishearings, e.g. كلثنا for
-- كُلِّفنا): corrected where one confusable letter makes a frequent real word and a reader agreed
-- (new_ar set, text_ar changed), otherwise recorded here and never blanked (new_ar NULL).
CREATE TABLE IF NOT EXISTS ar_pool_word_fix (
  pool       TEXT NOT NULL,              -- practice | read
  line_id    TEXT NOT NULL,
  tok        INTEGER NOT NULL,           -- white-space token index in text_ar
  old_ar     TEXT NOT NULL,
  new_ar     TEXT,
  reason     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (pool, line_id, tok)
);
