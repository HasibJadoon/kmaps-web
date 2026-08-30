UPDATE ar_ling_reg_sub_layer
   SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_lemma_arc')
 WHERE sub_code = '20-GOV' AND tables_json NOT LIKE '%ar_ling_lemma_arc%';
UPDATE ar_ling_reg_sub_layer
   SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_lemma_arc_example')
 WHERE sub_code = '20-GOV' AND tables_json NOT LIKE '%ar_ling_lemma_arc_example%';
