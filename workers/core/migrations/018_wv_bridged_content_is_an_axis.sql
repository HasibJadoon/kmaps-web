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

UPDATE cyb_carrier_binding SET role='axis_carrier', layer_uid=NULL WHERE db_name='km_content';

UPDATE cyb_carrier_binding SET role='registry', layer_uid=NULL
 WHERE table_name='ar_ling_term_dictionary';
