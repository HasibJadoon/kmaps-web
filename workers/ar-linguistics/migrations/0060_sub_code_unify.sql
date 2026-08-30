UPDATE ar_ling_reg_sub_layer SET sub_code = '80-KIN'  WHERE sub_code = '400-KIN';
UPDATE ar_ling_reg_sub_layer SET sub_code = '82-EXPR' WHERE sub_code = '500-EXPR';

UPDATE ar_ling_reg_table_map
   SET sub_code  = '80-KIN',
       code_full = REPLACE(code_full, '400-KIN', '80-KIN')
 WHERE sub_code = '400-KIN';
UPDATE ar_ling_reg_table_map
   SET sub_code  = '82-EXPR',
       code_full = REPLACE(code_full, '500-EXPR', '82-EXPR')
 WHERE sub_code = '500-EXPR';

UPDATE ar_ling_stg_claim
   SET id       = REPLACE(id, '400-KIN', '80-KIN'),
       sub_code = CASE WHEN sub_code = '400-KIN' THEN '80-KIN' ELSE sub_code END,
       updated_at = datetime('now')
 WHERE id LIKE '%400-KIN%' OR sub_code = '400-KIN';

UPDATE ar_ling_stg_claim
   SET id       = REPLACE(id, '500-EXPR', '82-EXPR'),
       sub_code = CASE WHEN sub_code = '500-EXPR' THEN '82-EXPR' ELSE sub_code END,
       updated_at = datetime('now')
 WHERE id LIKE '%500-EXPR%' OR sub_code = '500-EXPR';
