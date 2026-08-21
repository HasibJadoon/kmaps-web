-- The uid check was wrong, not 103 primary keys.
--
-- `BIND:passage:320-00-HUDUD:qr_surah_structure_unit` sits beside
-- `scope_kind = 'surah'`, and the obvious reading — that one of them is stale —
-- is not what the data says. The uid's second segment is the BAND FAMILY: which
-- of the six band tables holds the code. 320-00-HUDUD is in cyb_ps_band (family
-- `passage`); 00-CORE is in cyb_root_band (`root`); 400-20-RIJAL in cyb_wv_band
-- (`wv`); 500-10-QAYD in cyb_doc_band (`doc`). `scope_kind` is a different
-- fact: the scope of the rows themselves, which for a surah-structure table is
-- surah even though its band lives in the passage family.
--
-- Both were right. The check asserted a form the convention never had, and
-- would have had us rewrite 103 keys to satisfy it. It now derives the family
-- the same way the ids were minted, and applies only to carriers — a registry
-- entry is not a scope binding and need not carry the BIND: form.
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
