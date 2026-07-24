-- 0042 — Rename batch: REGISTRY family (naming convention v2, phase 4).
--
-- 1 table(s), 389 rows.
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

-- ar_ling_semantic_fields → ar_ling_reg_semantic_field  (389 rows)
--   why: Registry vocabulary sitting outside the reg_ family; plural
ALTER TABLE "ar_ling_semantic_fields" RENAME TO "ar_ling_reg_semantic_field";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_reg_semantic_field'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_semantic_fields';

