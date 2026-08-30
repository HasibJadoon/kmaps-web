UPDATE ar_ling_reg_sub_layer
   SET band          = 14,
       band_key      = 'SENSE',
       band_name_ar  = 'المعاني',
       band_name_en  = 'Senses',
       tables_json   = '["ar_ling_root_sense"]',
       display_order = 14
 WHERE sub_code = '14-SENSE' AND scope_level = 'root';

INSERT OR IGNORE INTO ar_ling_reg_sub_layer
  (sub_code, band, band_key, band_name_ar, band_name_en,
   name_ar, name_en, name_ur, scope_level, discipline, default_card,
   carrier_hint, display_order, status, tables_json, fill_state,
   produced_by, carrier_state)
VALUES
  ('15-AXIS', 14, 'SENSE', 'المعاني', 'Senses',
   'محاور المعنى', 'Sense axes', NULL, 'root', 'DL', 'P',
   'ar_ling_root_sense_axis', 15, 'live',
   '["ar_ling_root_sense_axis"]', 'has_carrier', 'ingest', 'unknown'),

  ('16-TAT', 14, 'SENSE', 'المعاني', 'Senses',
   'تطوّر المعنى', 'Sense evolution', NULL, 'root', 'DL', 'P',
   'ar_ling_root_tatawwur', 16, 'live',
   '["ar_ling_root_tatawwur"]', 'has_carrier', 'ingest', 'unknown'),

  ('17-ARC', 14, 'SENSE', 'المعاني', 'Senses',
   'قوس المعنى', 'Sense arc', NULL, 'root', 'DL', 'P',
   'ar_ling_sense_arc', 17, 'live',
   '["ar_ling_sense_arc"]', 'has_carrier', 'ingest', 'unknown'),

  ('18-STEP', 14, 'SENSE', 'المعاني', 'Senses',
   'خطوات القوس', 'Arc steps', NULL, 'root', 'DL', 'P',
   'ar_ling_sense_arc_step', 18, 'live',
   '["ar_ling_sense_arc_step"]', 'has_carrier', 'ingest', 'unknown'),

  ('19-ATT', 14, 'SENSE', 'المعاني', 'Senses',
   'شواهد المعنى', 'Attestations', NULL, 'root', 'DL', 'P',
   'ar_ling_sense_attestation', 19, 'live',
   '["ar_ling_sense_attestation"]', 'has_carrier', 'ingest', 'unknown');

INSERT OR IGNORE INTO ar_ling_reg_table_map
  (db, table_name, cluster, layer_code, role, sub_code, discipline)
VALUES
  ('km_arabic_linguistic', 'ar_ling_root_sense_axis',    'SENSE', NULL, 'carrier', '15-AXIS', 'DL'),
  ('km_arabic_linguistic', 'ar_ling_root_tatawwur',      'SENSE', NULL, 'carrier', '16-TAT',  'DL'),
  ('km_arabic_linguistic', 'ar_ling_sense_arc',          'SENSE', NULL, 'carrier', '17-ARC',  'DL'),
  ('km_arabic_linguistic', 'ar_ling_sense_arc_step',     'SENSE', NULL, 'carrier', '18-STEP', 'DL'),
  ('km_arabic_linguistic', 'ar_ling_sense_attestation',  'SENSE', NULL, 'carrier', '19-ATT',  'DL');

UPDATE ar_ling_reg_table_map
   SET cluster = 'SENSE', sub_code = '14-SENSE'
 WHERE table_name = 'ar_ling_root_sense';
