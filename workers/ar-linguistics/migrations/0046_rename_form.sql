-- 0046 — Rename batch: FORM family (naming convention v2, phase 4).
--
-- 6 table(s), 2,286 rows.
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

-- ar_ling_form_families → ar_ling_root_form_family  (28 rows)
--   why: No scope prefix; plural
ALTER TABLE "ar_ling_form_families" RENAME TO "ar_ling_root_form_family";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_form_family'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_form_families';

-- ar_ling_form_tiers → ar_ling_root_form_tier  (6 rows)
--   why: No scope prefix; plural
ALTER TABLE "ar_ling_form_tiers" RENAME TO "ar_ling_root_form_tier";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_form_tier'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_form_tiers';

-- ar_ling_form_paradigms → ar_ling_root_form_paradigm  (15 rows)
--   why: No scope prefix; plural
ALTER TABLE "ar_ling_form_paradigms" RENAME TO "ar_ling_root_form_paradigm";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_form_paradigm'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_form_paradigms';

-- ar_ling_form_semantics → ar_ling_root_form_binya  (0 rows)
--   why: Empty - free to rename
ALTER TABLE "ar_ling_form_semantics" RENAME TO "ar_ling_root_form_binya";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_form_binya'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_form_semantics';

-- ar_ling_conjugation_templates → ar_ling_root_form_template  (517 rows)
--   why: No family prefix; plural
ALTER TABLE "ar_ling_conjugation_templates" RENAME TO "ar_ling_root_form_template";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_form_template'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_conjugation_templates';

-- ar_ling_root_form_attested → ar_ling_root_form_masmu  (1,720 rows)
--   why: Arabic token; 1,720 layer_code literals to rewrite
ALTER TABLE "ar_ling_root_form_attested" RENAME TO "ar_ling_root_form_masmu";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_form_masmu'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_form_attested';

