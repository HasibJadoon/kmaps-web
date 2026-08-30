DROP TABLE IF EXISTS bkp_srs_review_20260815;
DROP TABLE IF EXISTS bkp_srs_card_surah_20260815;
DROP TABLE IF EXISTS bkp_srs_card_concept_20260815;
DROP TABLE IF EXISTS bkp_srs_card_20260815;
DROP TABLE IF EXISTS bkp_cyb_sensor_20260815;
DROP TABLE IF EXISTS bkp_cyb_node_20260815;
DROP TABLE IF EXISTS bkp_cyb_sensor_def_20260815;

DELETE FROM cyb_sensor WHERE source_table = 'core_srs_card_migration';
UPDATE cyb_node SET meta_json = json_remove(meta_json, '$.staging_table')
 WHERE id = 'CYB:srs:card_standardisation'
   AND json_extract(meta_json, '$.staging_table') IS NOT NULL;
