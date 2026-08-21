-- A3 — the last 55 dead sources, each resolved to what it really reads.
--
-- 6 × ar_ling_stg_claim (study "sources" on 44:1-9 roots): staging is dropped;
-- the sources a root has are its lexicon chunks. Repointed to
-- ar_ling_source_chunk and marked unread — their old readings counted staged
-- claims, which no longer exist, and a stale reading is not a reading.
UPDATE cyb_sensor
   SET source_table = 'ar_ling_source_chunk', read_count = 0, reading = 0,
       state = 'pending_reread'
 WHERE source_table = 'ar_ling_stg_claim';

-- 13 × NULL (arabic root 90-CARD coverage): the card carrier is the central
-- SRS deck. They read 0 and had a read tick with no source recorded — the
-- source is core_srs_card scoped to the root's bank.
UPDATE cyb_sensor
   SET source_table = 'core_srs_card'
 WHERE source_table IS NULL AND band_code = '90-CARD';

-- 36 × qr_surah_passage_tafsir_section (state pending_carrier): the carrier is
-- a decision, not a drift. The view keeps a row for them under their own issue
-- class so they stay visible without polluting the drift classes.
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
