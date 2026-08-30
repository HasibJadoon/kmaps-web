ALTER TABLE ar_ling_lexicon_entry_sections ADD COLUMN translation_en TEXT;
ALTER TABLE ar_ling_lexicon_entry_sections ADD COLUMN translation_ur TEXT;

ALTER TABLE ar_ling_lexicon_root_entries ADD COLUMN family_json TEXT
  CHECK (family_json IS NULL OR json_valid(family_json));
ALTER TABLE ar_ling_lexicon_root_entries ADD COLUMN entry_gloss_json TEXT
  CHECK (entry_gloss_json IS NULL OR json_valid(entry_gloss_json));
