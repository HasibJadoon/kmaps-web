ALTER TABLE ar_ling_reg_table_map ADD COLUMN root_bind_via_json TEXT
  CHECK (root_bind_via_json IS NULL OR json_valid(root_bind_via_json));

UPDATE ar_ling_reg_table_map
   SET root_bind_via_json = json_object(
         'col',       'arc_id',
         'to_table',  'ar_ling_sense_arc',
         'to_col',    'id',
         'root_col',  'root_norm')
 WHERE sub_code = '18-STEP'
   AND table_name = 'ar_ling_sense_arc_step'
   AND root_bind = 'via';

UPDATE ar_ling_reg_table_map
   SET root_bind_via_json = json_object(
         'col',        'target_id',
         'to_table',   'ar_ling_root_sense',
         'to_col',     'id',
         'root_col',   'root_norm',
         'where_col',  'target_type',
         'where_val',  'sense')
 WHERE sub_code = '19-ATT'
   AND table_name = 'ar_ling_sense_attestation'
   AND root_bind = 'via';
