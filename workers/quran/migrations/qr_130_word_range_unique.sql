-- The word in its āyah, fuller (owner, 2026-10-15: "meaning here can come from all translations and unique usage …
-- this will give range"): beside here_en (qr_085), the RANGE the English translations give this word here, the root
-- sense it carries (the range map's plain name, kmaps-resources scripts/quran/range_senses_*.json), and what is unique
-- about this use. Written by Claude from the āyah and twelve translations; read by the word and lemma drills.
ALTER TABLE qr_word_occurrence ADD COLUMN here_renderings_json TEXT;   -- ["bounty", "abundance", …] the translations' own words
ALTER TABLE qr_word_occurrence ADD COLUMN here_sense_en TEXT;          -- the root sense it carries here (range map name)
ALTER TABLE qr_word_occurrence ADD COLUMN here_unique TEXT;            -- what is special about this use, or NULL
