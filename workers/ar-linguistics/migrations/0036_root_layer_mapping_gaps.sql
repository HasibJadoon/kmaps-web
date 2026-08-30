INSERT OR REPLACE INTO ar_ling_reg_table_map (db, table_name, cluster, layer_code, role, code_full, discipline) VALUES
  ('km_arabic_linguistic','ar_ling_root_senses',         'morph','100','canonical','AL:100-ROOT:DL:00-CORE:P','DL'),
  ('km_arabic_linguistic','ar_ling_root_semantic_fields','morph','100','link',     'AL:100-ROOT:DL:40-LINK:B','DL'),
  ('km_arabic_linguistic','ar_ling_root_relations',      'morph','100','link',     'AL:100-ROOT:DL:40-LINK:B','DL');

INSERT OR REPLACE INTO ar_ling_reg_table_map (db, table_name, cluster, layer_code, role, code_full, discipline) VALUES
  ('km_quran','qr_root_registry',         'morph',          '100','canonical','QR:100-ROOT:00-REG:P',  NULL),
  ('km_quran','qr_ss_pattern_register',   'ss',             '310','analysis', 'QR:310-SS:00-CORE:P',   NULL),
  ('km_quran','qr_ss_translation_decision','ss',            '310','analysis', 'QR:310-SS:00-CORE:P',   NULL),
  ('km_quran','qr_ss_vocab_register',     'ss',             '310','analysis', 'QR:310-SS:00-CORE:P',   NULL),
  ('km_quran','qr_ss_migration_log',      'infra',          '990','runtime',  'QR:990-SYS:00-CORE:J',  NULL),
  ('km_quran','qr_surah_register_shifts', 'surah_analysis', '350','analysis', 'QR:350-SANL:00-CORE:P', NULL);

INSERT OR REPLACE INTO ar_ling_reg_table_discipline (table_name, discipline, is_primary) VALUES
  ('ar_ling_root_senses',         'DL', 1),
  ('ar_ling_root_semantic_fields','DL', 0),
  ('ar_ling_root_relations',      'DL', 0);

UPDATE ar_ling_reg_build_layer
   SET primary_tables_json =
     '["ar_ling_root_antonyms","ar_ling_root_development_stages","ar_ling_root_relations","ar_ling_root_scholarship","ar_ling_root_semantic_fields","ar_ling_root_sense_axes","ar_ling_root_senses","ar_ling_root_variants","ar_ling_root_vocab","ar_ling_roots","qr_morph_display_roots"]'
 WHERE layer_code = '100';
