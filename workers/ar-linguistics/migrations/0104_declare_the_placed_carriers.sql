-- The declaration is the authority; place what is already correctly bound.
--
-- Nine AL tables are bound in km_core's cyb_carrier_binding with nothing in
-- ar_ling_reg_sub_layer declaring them. Eight are bound to the band whose
-- subject they plainly are — only the declaration was missing, and that gap is
-- what let 00-CORE act as a default home. They are declared here so binding
-- and declaration agree, and the JOIN in the readers can be trusted.
UPDATE ar_ling_reg_sub_layer SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_concept_sense')
 WHERE sub_code = '14-SENSE' AND tables_json NOT LIKE '%ar_ling_concept_sense%';
UPDATE ar_ling_reg_sub_layer SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_root_display')
 WHERE sub_code = '50-META' AND tables_json NOT LIKE '%ar_ling_root_display%';
UPDATE ar_ling_reg_sub_layer SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_root_page_index')
 WHERE sub_code = '50-META' AND tables_json NOT LIKE '%ar_ling_root_page_index%';
UPDATE ar_ling_reg_sub_layer SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_root_lemma_form_map')
 WHERE sub_code = '40-LINK' AND tables_json NOT LIKE '%ar_ling_root_lemma_form_map%';
UPDATE ar_ling_reg_sub_layer SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_root_letter')
 WHERE sub_code = '03-ASWAT' AND tables_json NOT LIKE '%ar_ling_root_letter%';
UPDATE ar_ling_reg_sub_layer SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_root_sarf_form_index')
 WHERE sub_code = '22-BAB' AND tables_json NOT LIKE '%ar_ling_root_sarf_form_index%';

-- The terms dictionary is a global register of terms, not a root's identity.
-- It is the last table 00-CORE was holding that is not the root itself.
UPDATE ar_ling_reg_table_map SET sub_code = '310-00-SIJILL'
 WHERE table_name = 'ar_ling_term_dictionary';
UPDATE ar_ling_reg_sub_layer SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_term_dictionary')
 WHERE sub_code = '310-00-SIJILL' AND tables_json NOT LIKE '%ar_ling_term_dictionary%';

-- 00-CORE declared ar_ling_root_lugha as well, but Variants (02-VARI) owns it
-- and declares it too. One sub-layer per table: Core identity is the root's own
-- row, and its language variants are their own slot.
UPDATE ar_ling_reg_sub_layer SET tables_json = json_remove(tables_json, '$[1]')
 WHERE sub_code = '00-CORE'
   AND json_extract(tables_json, '$[1]') = 'ar_ling_root_lugha';

-- ar_ling_lemma_arc and ar_ling_lemma_arc_example stay undeclared and visible
-- in v_ar_ling_carrier_undeclared: whether a lemma-scope arc belongs with
-- Government (where it is bound) or with the sense arcs at 17-ARC is a content
-- decision. Unplaced and named beats placed by default.
