-- 0054 — Rename batch: INFRA family (naming convention v2, phase 4).
--
-- 4 table(s), 121 rows.
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

-- ar_ling_root_build_jobs → ar_ling_infra_job  (114 rows)
--   why: No family prefix; plural. Also the only INTEGER PK
ALTER TABLE "ar_ling_root_build_jobs" RENAME TO "ar_ling_infra_job";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_infra_job'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_build_jobs';

-- ar_ling_import_runs → ar_ling_infra_import  (2 rows)
--   why: No family prefix; plural
ALTER TABLE "ar_ling_import_runs" RENAME TO "ar_ling_infra_import";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_infra_import'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_import_runs';

-- ar_ling_embedding_jobs → ar_ling_infra_embedding_job  (5 rows)
--   why: No family prefix; plural
ALTER TABLE "ar_ling_embedding_jobs" RENAME TO "ar_ling_infra_embedding_job";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_infra_embedding_job'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_embedding_jobs';

-- ar_ling_vector_records → ar_ling_infra_vector  (0 rows)
--   why: No family prefix; plural
ALTER TABLE "ar_ling_vector_records" RENAME TO "ar_ling_infra_vector";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_infra_vector'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_vector_records';

