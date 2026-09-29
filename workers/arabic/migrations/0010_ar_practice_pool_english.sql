-- English for the drill lines: the sentence, and a gloss per word (aligned to
-- the whitespace tokens of text_ar), so a learner can reveal the meaning of a
-- line as they drill it. Filled from the translation batches; a session draws
-- translated lines first.
ALTER TABLE ar_practice_pool ADD COLUMN text_en TEXT;
ALTER TABLE ar_practice_pool ADD COLUMN gloss_json TEXT;
CREATE INDEX IF NOT EXISTS idx_ar_pp_band_en ON ar_practice_pool (band, (text_en IS NOT NULL), rnd);
