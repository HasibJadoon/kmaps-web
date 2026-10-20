-- The class screen's "The story of {term}": the term in Arabic script, not transliterated (owner, 2026-10-20).
UPDATE qr_keyterm_story SET term_en = CASE term_key WHEN 'kitab' THEN 'الكتاب' WHEN 'tanzil' THEN 'تنزيل'
  WHEN 'ilah' THEN 'إله' WHEN 'allah' THEN 'الله' ELSE term_en END
 WHERE term_key IN ('kitab', 'tanzil', 'ilah', 'allah');
