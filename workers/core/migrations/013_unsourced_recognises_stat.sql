-- A3 refinement: `core_root_build_stat` is a real source.
--
-- 1,628 of 1,642 root percentages carry no per-node sensors — their value is
-- synced from the stat table, which is itself derived from carrier counts and
-- was verified 1642/1642 against the nodes. The conformance check exempts a
-- root whose percent matches its stat row; a percent with neither sensors nor
-- a matching stat row still trips, which is the drift the check exists for.
DROP VIEW IF EXISTS v_cyb_node_unsourced;
CREATE VIEW v_cyb_node_unsourced AS
SELECT r.node_id, r.axis, r.pct
  FROM v_cyb_node_reading r
  JOIN cyb_node n ON n.id = r.node_id
 WHERE r.measured = 1 AND r.pct > 0 AND r.sensors = 0
   AND n.scale NOT IN ('surah','stage','domain','programme')
   AND NOT (n.scale = 'root' AND EXISTS (
        SELECT 1 FROM core_root_build_stat st
         WHERE st.root_ar = COALESCE(json_extract(n.meta_json,'$.root_ar'), n.target_ref)
           AND st.build_pct = r.pct AND r.axis = 'build'));
