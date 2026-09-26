-- An episode's reconstructed script: scenes, cast, lines (Arabic, English,
-- speaker, notes), made from the raw captions in text_ar and served by
-- GET /ar/text/units/:id/script. The scripts themselves live in kmaps-resources
-- (scripts/arabic-episodes).
--
-- The column was first added to the live database by hand; this records it.
-- It is marked applied on remote, so it runs only on a fresh database.
ALTER TABLE ar_text_unit ADD COLUMN script_json TEXT;
