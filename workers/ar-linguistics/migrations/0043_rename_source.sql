-- 0043 — Rename batch: SOURCE family (naming convention v2, phase 4).
--
-- 6 table(s), 259,504 rows.
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

-- ar_ling_sources → ar_ling_source  (58 rows)
--   why: Plural
ALTER TABLE "ar_ling_sources" RENAME TO "ar_ling_source";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_source'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_sources';

-- ar_ling_source_editions → ar_ling_source_edition  (25 rows)
--   why: Plural
ALTER TABLE "ar_ling_source_editions" RENAME TO "ar_ling_source_edition";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_source_edition'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_source_editions';

-- ar_ling_source_chunks → ar_ling_source_chunk  (205,548 rows)
--   why: Plural
ALTER TABLE "ar_ling_source_chunks" RENAME TO "ar_ling_source_chunk";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_source_chunk'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_source_chunks';

-- ar_ling_source_entry_refs → ar_ling_source_entry_ref  (47,919 rows)
--   why: Plural
ALTER TABLE "ar_ling_source_entry_refs" RENAME TO "ar_ling_source_entry_ref";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_source_entry_ref'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_source_entry_refs';

-- ar_ling_evidence_items → ar_ling_source_evidence  (5,427 rows)
--   why: Belongs to source family; '_items' is filler
ALTER TABLE "ar_ling_evidence_items" RENAME TO "ar_ling_source_evidence";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_source_evidence'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_evidence_items';

-- ar_ling_citations → ar_ling_source_citation  (527 rows)
--   why: Belongs to source family; plural
ALTER TABLE "ar_ling_citations" RENAME TO "ar_ling_source_citation";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_source_citation'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_citations';

