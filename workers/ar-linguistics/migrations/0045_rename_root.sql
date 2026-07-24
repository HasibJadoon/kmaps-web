-- 0045 — Rename batch: ROOT family (naming convention v2, phase 4).
--
-- 11 table(s), 551 rows.
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

-- ar_ling_letters → ar_ling_root_letter  (29 rows)
--   why: No family prefix; plural
ALTER TABLE "ar_ling_letters" RENAME TO "ar_ling_root_letter";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_letter'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_letters';

-- ar_ling_syn_root → ar_ling_root_asl  (2 rows)
--   why: 'syn_' prefix is meaningless
ALTER TABLE "ar_ling_syn_root" RENAME TO "ar_ling_root_asl";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_asl'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_syn_root';

-- ar_ling_syn_sense → ar_ling_root_sense_src  (9 rows)
--   why: 'syn_' prefix is meaningless
ALTER TABLE "ar_ling_syn_sense" RENAME TO "ar_ling_root_sense_src";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_sense_src'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_syn_sense';

-- ar_ling_syn_backlink → ar_ling_root_backlink  (15 rows)
--   why: 'syn_' prefix is meaningless
ALTER TABLE "ar_ling_syn_backlink" RENAME TO "ar_ling_root_backlink";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_backlink'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_syn_backlink';

-- ar_ling_root_variants → ar_ling_root_lugha  (392 rows)
--   why: Plural; align to 100-10-LUGHAT
ALTER TABLE "ar_ling_root_variants" RENAME TO "ar_ling_root_lugha";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lugha'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_variants';

-- ar_ling_root_senses → ar_ling_root_sense  (62 rows)
--   why: Plural
ALTER TABLE "ar_ling_root_senses" RENAME TO "ar_ling_root_sense";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_sense'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_senses';

-- ar_ling_root_sense_axes → ar_ling_root_sense_axis  (9 rows)
--   why: Plural
ALTER TABLE "ar_ling_root_sense_axes" RENAME TO "ar_ling_root_sense_axis";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_sense_axis'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_sense_axes';

-- ar_ling_root_development_stages → ar_ling_root_tatawwur  (8 rows)
--   why: 'stage' is reserved for the staging pipeline (rule N9)
ALTER TABLE "ar_ling_root_development_stages" RENAME TO "ar_ling_root_tatawwur";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_tatawwur'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_development_stages';

-- ar_ling_root_antonyms → ar_ling_root_didd  (19 rows)
--   why: Plural; Arabic token
ALTER TABLE "ar_ling_root_antonyms" RENAME TO "ar_ling_root_didd";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_didd'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_antonyms';

-- ar_ling_root_semantic_fields → ar_ling_root_haql  (5 rows)
--   why: Plural; Arabic token
ALTER TABLE "ar_ling_root_semantic_fields" RENAME TO "ar_ling_root_haql";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_haql'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_semantic_fields';

-- ar_ling_root_relations → ar_ling_root_relation  (1 rows)
--   why: Plural
ALTER TABLE "ar_ling_root_relations" RENAME TO "ar_ling_root_relation";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_relation'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_relations';

