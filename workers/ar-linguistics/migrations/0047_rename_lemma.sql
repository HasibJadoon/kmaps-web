-- 0047 — Rename batch: LEMMA family (naming convention v2, phase 4).
--
-- 17 table(s), 116,442 rows.
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

-- ar_ling_lemmas → ar_ling_root_lemma  (83,703 rows)
--   why: No scope prefix; plural. 6 tables FK here
ALTER TABLE "ar_ling_lemmas" RENAME TO "ar_ling_root_lemma";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lemmas';

-- ar_ling_lemma_root_links → ar_ling_root_lemma_link  (9,280 rows)
--   why: Plural; 'root' redundant
ALTER TABLE "ar_ling_lemma_root_links" RENAME TO "ar_ling_root_lemma_link";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_link'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lemma_root_links';

-- ar_ling_lemma_form_map → ar_ling_root_lemma_form_map  (2,481 rows)
--   why: No scope prefix
ALTER TABLE "ar_ling_lemma_form_map" RENAME TO "ar_ling_root_lemma_form_map";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_form_map'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lemma_form_map';

-- ar_ling_syn_lemma → ar_ling_root_lemma_syn  (12 rows)
--   why: 'syn_' prefix is meaningless
ALTER TABLE "ar_ling_syn_lemma" RENAME TO "ar_ling_root_lemma_syn";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_syn'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_syn_lemma';

-- ar_ling_syn_lemma_sense → ar_ling_root_lemma_sense_syn  (15 rows)
--   why: 'syn_' prefix is meaningless
ALTER TABLE "ar_ling_syn_lemma_sense" RENAME TO "ar_ling_root_lemma_sense_syn";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_sense_syn'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_syn_lemma_sense';

-- ar_ling_morphology → ar_ling_root_lemma_sarf  (963 rows)
--   why: No scope prefix; Arabic token
ALTER TABLE "ar_ling_morphology" RENAME TO "ar_ling_root_lemma_sarf";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_sarf'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_morphology';

-- ar_ling_verb_government → ar_ling_root_lemma_tadiya  (51 rows)
--   why: 'government' is a translation artefact
ALTER TABLE "ar_ling_verb_government" RENAME TO "ar_ling_root_lemma_tadiya";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_tadiya'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_verb_government';

-- ar_ling_inflection_rules → ar_ling_root_lemma_ilal  (24 rows)
--   why: No scope prefix; plural
ALTER TABLE "ar_ling_inflection_rules" RENAME TO "ar_ling_root_lemma_ilal";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_ilal'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_inflection_rules';

-- ar_ling_morph_corrections → ar_ling_root_lemma_taswib  (18 rows)
--   why: No scope prefix; plural
ALTER TABLE "ar_ling_morph_corrections" RENAME TO "ar_ling_root_lemma_taswib";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_taswib'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_morph_corrections';

-- ar_ling_near_synonym_sets → ar_ling_root_lemma_furuq_set  (746 rows)
--   why: 'near_synonym' is not the discipline term
ALTER TABLE "ar_ling_near_synonym_sets" RENAME TO "ar_ling_root_lemma_furuq_set";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_furuq_set'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_near_synonym_sets';

-- ar_ling_near_synonym_members → ar_ling_root_lemma_furuq_member  (3,269 rows)
--   why: Same
ALTER TABLE "ar_ling_near_synonym_members" RENAME TO "ar_ling_root_lemma_furuq_member";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_furuq_member'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_near_synonym_members';

-- ar_ling_near_synonym_evidence → ar_ling_root_lemma_furuq_evidence  (4,359 rows)
--   why: Same
ALTER TABLE "ar_ling_near_synonym_evidence" RENAME TO "ar_ling_root_lemma_furuq_evidence";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_furuq_evidence'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_near_synonym_evidence';

-- ar_ling_near_synonym_member_sources → ar_ling_root_lemma_furuq_member_src  (4,832 rows)
--   why: Same
ALTER TABLE "ar_ling_near_synonym_member_sources" RENAME TO "ar_ling_root_lemma_furuq_member_src";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_furuq_member_src'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_near_synonym_member_sources';

-- ar_ling_near_synonym_set_sources → ar_ling_root_lemma_furuq_set_src  (1,514 rows)
--   why: Same
ALTER TABLE "ar_ling_near_synonym_set_sources" RENAME TO "ar_ling_root_lemma_furuq_set_src";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_furuq_set_src'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_near_synonym_set_sources';

-- ar_ling_near_synonym_review_queue → ar_ling_root_lemma_furuq_queue  (2,804 rows)
--   why: Same
ALTER TABLE "ar_ling_near_synonym_review_queue" RENAME TO "ar_ling_root_lemma_furuq_queue";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_furuq_queue'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_near_synonym_review_queue';

-- ar_ling_expressions → ar_ling_root_lemma_tabir  (2,357 rows)
--   why: No scope prefix; plural
ALTER TABLE "ar_ling_expressions" RENAME TO "ar_ling_root_lemma_tabir";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_tabir'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_expressions';

-- ar_ling_expression_types → ar_ling_root_lemma_tabir_kind  (14 rows)
--   why: Enum table takes _kind (rule N7)
ALTER TABLE "ar_ling_expression_types" RENAME TO "ar_ling_root_lemma_tabir_kind";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_tabir_kind'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_expression_types';

