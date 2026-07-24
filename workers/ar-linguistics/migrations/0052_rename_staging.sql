-- 0052 — Rename batch: STAGING family (naming convention v2, phase 4).
--
-- 1 table(s), 322 rows.
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

-- ar_ling_root_stage → ar_ling_stg_claim  (322 rows)
--   why: 'root_stage' reads as a root layer; it is the staging spine. IDs also regenerate
ALTER TABLE "ar_ling_root_stage" RENAME TO "ar_ling_stg_claim";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_stg_claim'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_stage';

