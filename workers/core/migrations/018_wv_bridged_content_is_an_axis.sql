-- The last 37 unbridged bindings, and the two vocabularies behind them.
--
-- Every wv binding named a layer that did not exist. They split cleanly once
-- read: 24 name km_worldview tables under the 400-* bands (cyb_wv_band), and
-- 13 name cm_* tables under the 500-* bands (cyb_doc_band).
--
-- 1. The 400-* bands are worldview content and map onto wv's own taxonomy.
--    Only one had no home at all — geography — so the layer was added on the
--    same principle used for arabic:LEM and arabic:SIJILL: every band a
--    registry declares must have a layer to belong to.
INSERT OR IGNORE INTO cyb_layer
  (id, domain, lane, layer_key, name_ar, name_en, hint, db_name, color_hex, symbol, display_order, status)
VALUES ('wv:place','wv','worldview','place','المكان','Places','where it happened',
        'km_worldview','#c58ad9','map',55,'live');

UPDATE cyb_carrier_binding SET layer_uid='wv:place'     WHERE band_code='400-10-JUGHRAFIYA';
UPDATE cyb_carrier_binding SET layer_uid='wv:person'    WHERE band_code='400-20-RIJAL';
UPDATE cyb_carrier_binding SET layer_uid='wv:era'       WHERE band_code='400-30-TARIKH';
UPDATE cyb_carrier_binding SET layer_uid='wv:framework' WHERE band_code='400-40-IJTIMA';
UPDATE cyb_carrier_binding SET layer_uid='wv:concept'   WHERE band_code='400-50-NAFS';
UPDATE cyb_carrier_binding SET layer_uid='wv:claim'     WHERE band_code='400-60-FALSAFA';

-- 2. The 500-* bands are not worldview at all. Content is one of the four axes
--    — build, study, content, retention — and km_content is the carrier
--    database for that axis across all three domains. Filing its tables under
--    a worldview layer made the content axis look like a fourth domain, which
--    is the category error this plane has corrected everywhere else. They are
--    axis carriers: real bindings that name no layer, because no layer is what
--    they belong to.
UPDATE cyb_carrier_binding SET role='axis_carrier', layer_uid=NULL WHERE db_name='km_content';

-- 3. ar_ling_term_dictionary is a global register of terms, not a scope
--    carrier — which is exactly what ar_ling_reg_table_map already called it.
UPDATE cyb_carrier_binding SET role='registry', layer_uid=NULL
 WHERE table_name='ar_ling_term_dictionary';
