-- A2 — one reading, defined once.
--
-- node × axis → (pct, measured, stale, sensors, read). The app derived a
-- passage's number five different ways; this view is now the only definition
-- of a reading anywhere in the stack, and every serving endpoint selects it.
DROP VIEW IF EXISTS v_cyb_node_reading;
CREATE VIEW v_cyb_node_reading AS
SELECT n.id AS node_id, 'build' AS axis,
       n.build_pct AS pct, n.build_measured AS measured, n.build_stale AS stale,
       (SELECT COUNT(*) FROM cyb_sensor s WHERE s.node_id = n.id AND s.axis = 'build') AS sensors,
       (SELECT COUNT(*) FROM cyb_sensor s WHERE s.node_id = n.id AND s.axis = 'build' AND s.read_count > 0) AS read_sensors
  FROM cyb_node n
UNION ALL
SELECT n.id, 'study', n.study_pct, n.study_measured, 0,
       (SELECT COUNT(*) FROM cyb_sensor s WHERE s.node_id = n.id AND s.axis = 'study'),
       (SELECT COUNT(*) FROM cyb_sensor s WHERE s.node_id = n.id AND s.axis = 'study' AND s.read_count > 0)
  FROM cyb_node n
UNION ALL
SELECT n.id, 'content', n.content_pct, n.content_measured, 0,
       (SELECT COUNT(*) FROM cyb_sensor s WHERE s.node_id = n.id AND s.axis = 'content'),
       (SELECT COUNT(*) FROM cyb_sensor s WHERE s.node_id = n.id AND s.axis = 'content' AND s.read_count > 0)
  FROM cyb_node n
UNION ALL
SELECT n.id, 'retention', n.retention_pct, n.retention_measured, 0,
       (SELECT COUNT(*) FROM cyb_sensor s WHERE s.node_id = n.id AND s.axis = 'retention'),
       (SELECT COUNT(*) FROM cyb_sensor s WHERE s.node_id = n.id AND s.axis = 'retention' AND s.read_count > 0)
  FROM cyb_node n;

-- A3 conformance — a measured percent must have a sensor behind it, unless the
-- node sits at a declared rollup scale (surah/stage aggregate their bands).
DROP VIEW IF EXISTS v_cyb_node_unsourced;
CREATE VIEW v_cyb_node_unsourced AS
SELECT r.node_id, r.axis, r.pct
  FROM v_cyb_node_reading r
  JOIN cyb_node n ON n.id = r.node_id
 WHERE r.measured = 1 AND r.pct > 0 AND r.sensors = 0
   AND n.scale NOT IN ('surah','stage','domain','programme');

DROP VIEW IF EXISTS v_cyb_binding_unresolved;
CREATE VIEW v_cyb_binding_unresolved AS
SELECT uid, domain, db_name, table_name, band_code
  FROM cyb_carrier_binding
 WHERE bind_kind = 'unset' AND status = 'live';
