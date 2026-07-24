-- 0044 — Rename batch: GRAM family (naming convention v2, phase 4).
--
-- 6 table(s), 21,928 rows.
--
-- VERIFIED BEHAVIOUR (see dryrun/rename_test_d1mode.py, run under D1's actual
-- pragmas legacy_alter_table=0 / foreign_keys=1): ALTER TABLE RENAME rewrites
-- FK REFERENCES clauses, view bodies and trigger bodies automatically. Earlier
-- drafts of this refactor planned to rebuild them by hand; that is unnecessary
-- and would have been the riskier path.
--
-- What RENAME does NOT carry, and is therefore done explicitly below:
--   • ar_ling_reg_table_map.table_name  (the registry row, rule N21)
--   • layer_code string literals stored in data
--   • index names, which keep the old table's token

-- ar_ling_gram_terms → ar_ling_gram_term  (250 rows)
--   why: Plural
ALTER TABLE "ar_ling_gram_terms" RENAME TO "ar_ling_gram_term";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_gram_term'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_gram_terms';

-- ar_ling_gram_categories → ar_ling_gram_category  (25 rows)
--   why: Plural
ALTER TABLE "ar_ling_gram_categories" RENAME TO "ar_ling_gram_category";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_gram_category'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_gram_categories';

-- ar_ling_gram_chunks → ar_ling_gram_chunk  (21,319 rows)
--   why: Plural
ALTER TABLE "ar_ling_gram_chunks" RENAME TO "ar_ling_gram_chunk";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_gram_chunk'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_gram_chunks';

-- ar_ling_gram_term_examples → ar_ling_gram_term_example  (25 rows)
--   why: Plural
ALTER TABLE "ar_ling_gram_term_examples" RENAME TO "ar_ling_gram_term_example";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_gram_term_example'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_gram_term_examples';

-- ar_ling_gram_term_relations → ar_ling_gram_term_relation  (14 rows)
--   why: Plural
ALTER TABLE "ar_ling_gram_term_relations" RENAME TO "ar_ling_gram_term_relation";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_gram_term_relation'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_gram_term_relations';

-- ar_ling_gram_term_sources → ar_ling_gram_term_source  (295 rows)
--   why: Plural
ALTER TABLE "ar_ling_gram_term_sources" RENAME TO "ar_ling_gram_term_source";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_gram_term_source'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_gram_term_sources';

