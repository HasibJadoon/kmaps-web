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

UPDATE ar_ling_reg_table_map SET sub_code = '310-00-SIJILL'
 WHERE table_name = 'ar_ling_term_dictionary';
UPDATE ar_ling_reg_sub_layer SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_term_dictionary')
 WHERE sub_code = '310-00-SIJILL' AND tables_json NOT LIKE '%ar_ling_term_dictionary%';

UPDATE ar_ling_reg_sub_layer SET tables_json = json_remove(tables_json, '$[1]')
 WHERE sub_code = '00-CORE'
   AND json_extract(tables_json, '$[1]') = 'ar_ling_root_lugha';
