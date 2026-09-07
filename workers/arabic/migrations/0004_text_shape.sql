-- 0004_text_shape.sql — km_arabic (DB_AR)
--
-- A dīwān is not a story and a proverb collection is neither. They are read
-- differently, so they are shown differently — and which one a work is belongs
-- on the work, not in a template's if-branch.
--
-- shape ∈ diwan | maqama | amthal | prose
-- NOT re-runnable as-is only in the sense that it overwrites shape; the values
-- are idempotent, so re-running is harmless.

UPDATE ar_acquisition_ref
   SET meta_json = json_set(COALESCE(NULLIF(meta_json,''),'{}'), '$.shape', 'diwan')
 WHERE genre_ref = 'AG:shiar';

UPDATE ar_acquisition_ref
   SET meta_json = json_set(COALESCE(NULLIF(meta_json,''),'{}'), '$.shape', 'maqama')
 WHERE title_ar LIKE '%مقامات%';

UPDATE ar_acquisition_ref
   SET meta_json = json_set(COALESCE(NULLIF(meta_json,''),'{}'), '$.shape', 'amthal')
 WHERE title_ar LIKE '%الأمثال%' OR title_ar LIKE '%أمثال%';

UPDATE ar_acquisition_ref
   SET meta_json = json_set(COALESCE(NULLIF(meta_json,''),'{}'), '$.shape', 'prose')
 WHERE json_extract(COALESCE(NULLIF(meta_json,''),'{}'), '$.shape') IS NULL
   AND genre_ref = 'AG:adab';
