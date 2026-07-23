-- 0036 — Close layer-mapping gaps in the register (AL domain, cluster 'reg').
-- The registry (ar_ling_reg_table_map / ar_ling_reg_build_layer) is the layered
-- map of every table. Auditing it against live sqlite_master found tables that
-- exist (or are added in 0035) but are NOT registered — so a "touch all tables"
-- root tree would have holes. This migration registers them. Idempotent:
-- INSERT OR REPLACE on the (db, table_name) PK.
--
-- Code scheme recap:  <DB>:<layer>-<CLUSTER>:<discipline>:<seq>-<role>:<kind>
--   discipline  SF=ṣarf  NH=naḥw  DL=dalāla  BL=balāgha  XC=cross-cutting
--   kind        P=primary  B=bridge/link  A=annotation  J=job/runtime

-- ── New AL root tables from 0035 (layer 100 ROOT, discipline DL) ─────────────
INSERT OR REPLACE INTO ar_ling_reg_table_map (db, table_name, cluster, layer_code, role, code_full, discipline) VALUES
  ('km_arabic_linguistic','ar_ling_root_senses',         'morph','100','canonical','AL:100-ROOT:DL:00-CORE:P','DL'),
  ('km_arabic_linguistic','ar_ling_root_semantic_fields','morph','100','link',     'AL:100-ROOT:DL:40-LINK:B','DL'),
  ('km_arabic_linguistic','ar_ling_root_relations',      'morph','100','link',     'AL:100-ROOT:DL:40-LINK:B','DL');

-- ── Unmapped QR tables discovered in the audit ──────────────────────────────
INSERT OR REPLACE INTO ar_ling_reg_table_map (db, table_name, cluster, layer_code, role, code_full, discipline) VALUES
  ('km_quran','qr_root_registry',         'morph',          '100','canonical','QR:100-ROOT:00-REG:P',  NULL),
  ('km_quran','qr_ss_pattern_register',   'ss',             '310','analysis', 'QR:310-SS:00-CORE:P',   NULL),
  ('km_quran','qr_ss_translation_decision','ss',            '310','analysis', 'QR:310-SS:00-CORE:P',   NULL),
  ('km_quran','qr_ss_vocab_register',     'ss',             '310','analysis', 'QR:310-SS:00-CORE:P',   NULL),
  ('km_quran','qr_ss_migration_log',      'infra',          '990','runtime',  'QR:990-SYS:00-CORE:J',  NULL),
  ('km_quran','qr_surah_register_shifts', 'surah_analysis', '350','analysis', 'QR:350-SANL:00-CORE:P', NULL);

-- ── Disciplines for the new AL tables ───────────────────────────────────────
INSERT OR REPLACE INTO ar_ling_reg_table_discipline (table_name, discipline, is_primary) VALUES
  ('ar_ling_root_senses',         'DL', 1),
  ('ar_ling_root_semantic_fields','DL', 0),
  ('ar_ling_root_relations',      'DL', 0);

-- ── Register ar_ling_root_senses in the Root layer's primary_tables_json ─────
--    (root_relations + root_semantic_fields were already listed; senses was not.)
UPDATE ar_ling_reg_build_layer
   SET primary_tables_json =
     '["ar_ling_root_antonyms","ar_ling_root_development_stages","ar_ling_root_relations","ar_ling_root_scholarship","ar_ling_root_semantic_fields","ar_ling_root_sense_axes","ar_ling_root_senses","ar_ling_root_variants","ar_ling_root_vocab","ar_ling_roots","qr_morph_display_roots"]'
 WHERE layer_code = '100';
