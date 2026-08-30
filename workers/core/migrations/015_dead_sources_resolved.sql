UPDATE cyb_sensor
   SET source_table = 'ar_ling_source_chunk', read_count = 0, reading = 0,
       state = 'pending_reread'
 WHERE source_table = 'ar_ling_stg_claim';

UPDATE cyb_sensor
   SET source_table = 'core_srs_card'
 WHERE source_table IS NULL AND band_code = '90-CARD';

DROP VIEW IF EXISTS v_cyb_sensor_dead_source;
CREATE VIEW v_cyb_sensor_dead_source AS
SELECT s.id AS sensor_id, s.node_id, s.axis, s.band_code, s.metric, s.source_table, s.state,
       CASE WHEN s.source_table IS NULL THEN 'null_source'
            WHEN s.source_table LIKE 'km/_%' ESCAPE '/' THEN 'db_name_not_table'
            WHEN s.source_table LIKE '%+%' THEN 'composite_string'
            WHEN s.state = 'pending_carrier' THEN 'pending_carrier_decision'
            ELSE 'check_exists' END AS issue
FROM cyb_sensor s
WHERE s.source_table IS NULL
   OR s.source_table LIKE 'km/_%' ESCAPE '/'
   OR s.source_table LIKE '%+%'
   OR s.state = 'pending_carrier';
