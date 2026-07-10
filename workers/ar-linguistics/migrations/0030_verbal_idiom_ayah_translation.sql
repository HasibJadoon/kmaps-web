-- 0030_verbal_idiom_ayah_translation.sql
-- Mir prints the idiom's meaning in roman and the translation of the cited ayah in
-- italic, in the same cell. The importer separates them by font; keep them apart here
-- too, so the UI never shows a verse translation where a gloss belongs.
ALTER TABLE ar_ling_expressions ADD COLUMN ayah_translation_en TEXT;
