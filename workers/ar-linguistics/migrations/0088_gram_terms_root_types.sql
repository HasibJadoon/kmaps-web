-- Registry: root types the corpus needs but the registry did not carry.
--
-- Lane's `root_norm` writes a bare alif where the printed root has hamza or a
-- weak radical (أكل → اكل, بور → بار, بدو → بدا). That makes the *letter*
-- ambiguous. The *class* is recovered from the vocalised Form I lemma, which
-- prints the radical Lane means — بار → بَأَرَ is hamzated, بار → بَارَ is hollow —
-- so these parent terms are only for the residue where no lemma settles it
-- (42 hollow, 99 defective forms). The lettered children (hollow_w / hollow_y …)
-- stay reserved for roots that spell the radical out.
--
-- Reading the position alone would be wrong: Lane writes bare alif for hamza in
-- every position, not just R1.
--
-- rubai_mujarrad covers the plain quadriliterals (بحثر, بختر, برذن) — the
-- registry only had the reduplicated kind.

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

-- The lettered variants become children of the class they specialise, so a
-- reader can group by "hollow" without losing which radical Lane names.
UPDATE ar_ling_gram_term SET parent_term_id = 'GT:root_type:hollow',    term_order = 7  WHERE id = 'GT:root_type:hollow_w';
UPDATE ar_ling_gram_term SET parent_term_id = 'GT:root_type:hollow',    term_order = 7  WHERE id = 'GT:root_type:hollow_y';
UPDATE ar_ling_gram_term SET parent_term_id = 'GT:root_type:defective', term_order = 9  WHERE id = 'GT:root_type:defective_w';
UPDATE ar_ling_gram_term SET parent_term_id = 'GT:root_type:defective', term_order = 9  WHERE id = 'GT:root_type:defective_y';
UPDATE ar_ling_gram_term SET term_order = 11 WHERE id = 'GT:root_type:rubai_mudaaf';
