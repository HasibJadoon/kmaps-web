ALTER TABLE "ar_ling_lemmas" RENAME TO "ar_ling_root_lemma";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lemmas';

ALTER TABLE "ar_ling_lemma_root_links" RENAME TO "ar_ling_root_lemma_link";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_link'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lemma_root_links';

ALTER TABLE "ar_ling_lemma_form_map" RENAME TO "ar_ling_root_lemma_form_map";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_form_map'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lemma_form_map';

ALTER TABLE "ar_ling_syn_lemma" RENAME TO "ar_ling_root_lemma_syn";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_syn'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_syn_lemma';

ALTER TABLE "ar_ling_syn_lemma_sense" RENAME TO "ar_ling_root_lemma_sense_syn";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_sense_syn'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_syn_lemma_sense';

ALTER TABLE "ar_ling_morphology" RENAME TO "ar_ling_root_lemma_sarf";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_sarf'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_morphology';

ALTER TABLE "ar_ling_verb_government" RENAME TO "ar_ling_root_lemma_tadiya";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_tadiya'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_verb_government';

ALTER TABLE "ar_ling_inflection_rules" RENAME TO "ar_ling_root_lemma_ilal";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_ilal'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_inflection_rules';

ALTER TABLE "ar_ling_morph_corrections" RENAME TO "ar_ling_root_lemma_taswib";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_taswib'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_morph_corrections';

ALTER TABLE "ar_ling_near_synonym_sets" RENAME TO "ar_ling_root_lemma_furuq_set";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_furuq_set'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_near_synonym_sets';

ALTER TABLE "ar_ling_near_synonym_members" RENAME TO "ar_ling_root_lemma_furuq_member";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_furuq_member'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_near_synonym_members';

ALTER TABLE "ar_ling_near_synonym_evidence" RENAME TO "ar_ling_root_lemma_furuq_evidence";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_furuq_evidence'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_near_synonym_evidence';

ALTER TABLE "ar_ling_near_synonym_member_sources" RENAME TO "ar_ling_root_lemma_furuq_member_src";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_furuq_member_src'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_near_synonym_member_sources';

ALTER TABLE "ar_ling_near_synonym_set_sources" RENAME TO "ar_ling_root_lemma_furuq_set_src";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_furuq_set_src'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_near_synonym_set_sources';

ALTER TABLE "ar_ling_near_synonym_review_queue" RENAME TO "ar_ling_root_lemma_furuq_queue";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_furuq_queue'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_near_synonym_review_queue';

ALTER TABLE "ar_ling_expressions" RENAME TO "ar_ling_root_lemma_tabir";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_tabir'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_expressions';

ALTER TABLE "ar_ling_expression_types" RENAME TO "ar_ling_root_lemma_tabir_kind";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_tabir_kind'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_expression_types';
