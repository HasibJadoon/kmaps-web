INSERT OR IGNORE INTO ar_ling_reg_table_map
  (db, table_name, cluster, layer_code, role, sub_code, role_code, code_full, discipline) VALUES
  ('km_arabic_linguistic', 'ar_ling_citations', 'source', '010', 'ingest', '40-LINK', 'B', 'AL:010-SRC:--:40-LINK:B', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_root_stage', 'staging', '900', 'ingest', '00-CORE', 'P', 'AL:900-STG:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_kroot_run', 'infra', '900', 'ingest', '60-STAT', 'J', 'AL:900-INF:--:60-STAT:J', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_kroot_run_stage', 'infra', '900', 'ingest', '60-STAT', 'J', 'AL:900-INF:--:60-STAT:J', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_root_story', 'story', '950', 'synthesis', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_root_story_beat', 'story', '950', 'synthesis', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_root_story_blueprint', 'story', '950', 'synthesis', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_root_article', 'story', '950', 'synthesis', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_root_article_block', 'story', '950', 'synthesis', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_root_composition', 'story', '950', 'synthesis', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_root_movement', 'story', '950', 'synthesis', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_root_beat', 'story', '950', 'synthesis', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_root_illustration', 'story', '950', 'synthesis', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_root_schedule', 'story', '950', 'synthesis', '60-STAT', 'P', 'AL:950-STY:--:60-STAT:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_story_arc_stage', 'story', '950', 'reference', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_story_craft', 'story', '950', 'reference', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_story_format', 'story', '950', 'reference', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_story_icon', 'story', '950', 'reference', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha');

ALTER TABLE ar_ling_reg_sub_layer ADD COLUMN carrier_state TEXT NOT NULL DEFAULT 'unknown';

UPDATE ar_ling_reg_sub_layer SET sub_code = '18-TATAWWUR' WHERE sub_code = '18-STAGE';
UPDATE ar_ling_reg_table_map SET sub_code = '18-TATAWWUR',
       code_full = REPLACE(code_full, '18-STAGE', '18-TATAWWUR')
 WHERE sub_code = '18-STAGE';

UPDATE ar_ling_reg_sub_layer
   SET tables_json = json_remove(
         json_remove(tables_json,
           COALESCE((SELECT '$[' || key || ']' FROM json_each(tables_json)
                      WHERE value = 'ar_applied_balagha'), '$[#]')),
         COALESCE((SELECT '$[' || key || ']' FROM json_each(tables_json)
                    WHERE value = 'ar_ling_expression_tokens'), '$[#]'))
 WHERE sub_code = '500-EXPR';
