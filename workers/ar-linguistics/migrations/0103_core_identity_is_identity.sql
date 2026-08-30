UPDATE ar_ling_reg_table_map SET sub_code = '72-MEM'
 WHERE table_name = 'ar_ling_learn_memory_hook';
UPDATE ar_ling_reg_table_map SET sub_code = '22-BAB'
 WHERE table_name = 'ar_ling_root_form_family';

UPDATE ar_ling_reg_table_map SET sub_code = '010-SRC'
 WHERE table_name IN ('ar_ling_lexicon_book_page',
                      'ar_ling_lexicon_entry_section',
                      'ar_ling_source_chunk');
UPDATE ar_ling_reg_sub_layer
   SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_lexicon_book_page')
 WHERE sub_code = '010-SRC' AND tables_json NOT LIKE '%ar_ling_lexicon_book_page%';
UPDATE ar_ling_reg_sub_layer
   SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_lexicon_entry_section')
 WHERE sub_code = '010-SRC' AND tables_json NOT LIKE '%ar_ling_lexicon_entry_section%';
UPDATE ar_ling_reg_sub_layer
   SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_source_chunk')
 WHERE sub_code = '010-SRC' AND tables_json NOT LIKE '%ar_ling_source_chunk%';

UPDATE ar_ling_reg_table_map SET sub_code = '72-MEM'
 WHERE table_name = 'ar_ling_learn_question';
UPDATE ar_ling_reg_sub_layer
   SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_learn_question')
 WHERE sub_code = '72-MEM' AND tables_json NOT LIKE '%ar_ling_learn_question%';

UPDATE ar_ling_reg_sub_layer
   SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_learn_lemma')
 WHERE sub_code = '70-VOCAB' AND tables_json NOT LIKE '%ar_ling_learn_lemma%';
UPDATE ar_ling_reg_sub_layer
   SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_root_lemma_link')
 WHERE sub_code = '40-LINK' AND tables_json NOT LIKE '%ar_ling_root_lemma_link%';
UPDATE ar_ling_reg_sub_layer
   SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_source_citation')
 WHERE sub_code = '40-LINK' AND tables_json NOT LIKE '%ar_ling_source_citation%';

DROP VIEW IF EXISTS v_ar_ling_carrier_undeclared;
CREATE VIEW v_ar_ling_carrier_undeclared AS
SELECT m.table_name, m.sub_code, m.root_bind, m.root_bind_col
  FROM ar_ling_reg_table_map m
 WHERE m.role = 'carrier' AND m.root_bind = 'direct'
   AND NOT EXISTS (SELECT 1 FROM ar_ling_reg_sub_layer s
                    WHERE s.sub_code = m.sub_code
                      AND s.tables_json LIKE '%"' || m.table_name || '"%');
