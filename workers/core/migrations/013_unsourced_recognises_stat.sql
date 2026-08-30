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
