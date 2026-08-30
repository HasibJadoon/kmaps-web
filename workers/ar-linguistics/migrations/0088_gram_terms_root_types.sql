INSERT OR IGNORE INTO ar_ling_gram_term
  (id, category_key, term_key, term_order, parent_term_id, name_ar, name_en, name_ur, short_ar, short_en, short_ur, status)
VALUES
  ('GT:root_type:hollow', 'root_type', 'hollow', 6, NULL,
   'أجوف', 'hollow', 'اجوف', 'أجوف', 'hollow', 'اجوف', 'live'),

  ('GT:root_type:defective', 'root_type', 'defective', 8, NULL,
   'ناقص', 'defective', 'ناقص', 'ناقص', 'defective', 'ناقص', 'live'),

  ('GT:root_type:rubai_mujarrad', 'root_type', 'rubai_mujarrad', 12, NULL,
   'رباعي مجرّد', 'quadriliteral', 'رباعی مجرد', 'رباعي', 'quadriliteral', 'رباعی', 'live'),

  ('GT:root_type:khumasi', 'root_type', 'khumasi', 13, NULL,
   'خماسي', 'quinqueliteral', 'خماسی', 'خماسي', 'quinqueliteral', 'خماسی', 'live');

UPDATE ar_ling_gram_term SET parent_term_id = 'GT:root_type:hollow',    term_order = 7  WHERE id = 'GT:root_type:hollow_w';
UPDATE ar_ling_gram_term SET parent_term_id = 'GT:root_type:hollow',    term_order = 7  WHERE id = 'GT:root_type:hollow_y';
UPDATE ar_ling_gram_term SET parent_term_id = 'GT:root_type:defective', term_order = 9  WHERE id = 'GT:root_type:defective_w';
UPDATE ar_ling_gram_term SET parent_term_id = 'GT:root_type:defective', term_order = 9  WHERE id = 'GT:root_type:defective_y';
UPDATE ar_ling_gram_term SET term_order = 11 WHERE id = 'GT:root_type:rubai_mudaaf';
