DROP VIEW IF EXISTS v_cyb_binding_broken;
CREATE VIEW v_cyb_binding_broken AS
SELECT b.uid, b.domain, b.db_name, b.table_name, b.layer_uid, b.band_code, b.role,
       CASE
         WHEN b.layer_uid IS NULL THEN 'carrier names no layer'
         WHEN NOT EXISTS (SELECT 1 FROM cyb_layer l WHERE l.id = b.layer_uid)
           THEN 'layer_uid resolves to no cyb_layer'
         ELSE 'uid does not name its band family'
       END AS issue
  FROM cyb_carrier_binding b
 WHERE b.status = 'live' AND b.role = 'carrier'
   AND (b.layer_uid IS NULL
        OR NOT EXISTS (SELECT 1 FROM cyb_layer l WHERE l.id = b.layer_uid)
        OR b.uid <> 'BIND:' || (CASE
             WHEN EXISTS (SELECT 1 FROM cyb_root_band z WHERE z.band_code = b.band_code) THEN 'root'
             WHEN EXISTS (SELECT 1 FROM cyb_ps_band   z WHERE z.band_code = b.band_code) THEN 'passage'
             WHEN EXISTS (SELECT 1 FROM cyb_ss_band   z WHERE z.band_code = b.band_code) THEN 'ss'
             WHEN EXISTS (SELECT 1 FROM cyb_wv_band   z WHERE z.band_code = b.band_code) THEN 'wv'
             WHEN EXISTS (SELECT 1 FROM cyb_doc_band  z WHERE z.band_code = b.band_code) THEN 'doc'
             WHEN EXISTS (SELECT 1 FROM cyb_pt_band   z WHERE z.band_code = b.band_code) THEN 'pt'
             ELSE 'unknown' END)
           || ':' || b.band_code || ':' || b.table_name);
