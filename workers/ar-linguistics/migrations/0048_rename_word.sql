-- 0048 — Rename batch: WORD family (naming convention v2, phase 4).
--
-- 3 table(s), 7,996 rows.
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

-- ar_ling_orthography_rules → ar_ling_root_lemma_word_khat  (0 rows)
--   why: Empty - free to rename. doc 3.5
ALTER TABLE "ar_ling_orthography_rules" RENAME TO "ar_ling_root_lemma_word_khat";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_word_khat'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_orthography_rules';

-- ar_ling_word_sums → ar_ling_root_lemma_word_silsila  (9 rows)
--   why: 'sums' is opaque. doc 3.9
ALTER TABLE "ar_ling_word_sums" RENAME TO "ar_ling_root_lemma_word_silsila";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_word_silsila'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_word_sums';

-- ar_ling_quran_links → ar_ling_root_lemma_word_quran_link  (7,987 rows)
--   why: No scope prefix; plural
ALTER TABLE "ar_ling_quran_links" RENAME TO "ar_ling_root_lemma_word_quran_link";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_word_quran_link'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_quran_links';

