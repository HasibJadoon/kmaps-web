-- Hadith ref aliases. Hadith ids are SRC:HADITH:<CODE>#<ref> in sunnah.com's style; where a number is split into parts
-- (Muslim 8.01 -> 8a, 8b; Bukhari 402.2 -> 402b) and no block carries the bare number, the bare number is an alias that
-- lists its parts, so a citation like SRC:HADITH:MUSLIM#375 (ar_ling_source_citation) joins to 375a, 375b, ...
CREATE TABLE IF NOT EXISTS wv_hadith_ref_alias (
  alias_ref  TEXT NOT NULL,     -- SRC:HADITH:MUSLIM#375
  hadith_ref TEXT NOT NULL,     -- SRC:HADITH:MUSLIM#375a  (= wv_corpus_block.id)
  part       TEXT,              -- 'a'
  PRIMARY KEY (alias_ref, hadith_ref)
);
CREATE INDEX IF NOT EXISTS ix_hadith_alias_target ON wv_hadith_ref_alias(hadith_ref);
