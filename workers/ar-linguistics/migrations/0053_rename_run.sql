-- 0053 — Rename batch: RUN family (naming convention v2, phase 4).
--
-- 3 table(s), 42 rows.
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

-- ar_ling_kroot_run → ar_ling_run  (3 rows)
--   why: 'kroot' is not a term used anywhere else
ALTER TABLE "ar_ling_kroot_run" RENAME TO "ar_ling_run";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_run'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_kroot_run';

-- ar_ling_kroot_run_stage → ar_ling_run_step  (15 rows)
--   why: 'kroot'; 'stage' reserved (rule N9)
ALTER TABLE "ar_ling_kroot_run_stage" RENAME TO "ar_ling_run_step";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_run_step'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_kroot_run_stage';

-- ar_ling_root_build_status → ar_ling_run_root_status  (24 rows)
--   why: Run state, not a root layer
ALTER TABLE "ar_ling_root_build_status" RENAME TO "ar_ling_run_root_status";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_run_root_status'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_build_status';

