UPDATE cyb_carrier_binding
   SET band_code = '010-SRC', band_uid = 'BND:root:010-SRC',
       uid = 'BIND:root:010-SRC:' || table_name
 WHERE table_name IN ('ar_ling_lexicon_book_page',
                      'ar_ling_lexicon_entry_section',
                      'ar_ling_source_chunk');

UPDATE cyb_carrier_binding
   SET band_code = '72-MEM', band_uid = 'BND:root:72-MEM',
       uid = 'BIND:root:72-MEM:' || table_name
 WHERE table_name IN ('ar_ling_learn_memory_hook', 'ar_ling_learn_question');

UPDATE cyb_carrier_binding
   SET band_code = '310-00-SIJILL', band_uid = 'BND:global:310-00-SIJILL',
       uid = 'BIND:global:310-00-SIJILL:' || table_name
 WHERE table_name = 'ar_ling_term_dictionary';

UPDATE cyb_carrier_binding
   SET band_code = '02-VARI', band_uid = 'BND:root:02-VARI',
       uid = 'BIND:root:02-VARI:' || table_name
 WHERE table_name = 'ar_ling_root_lugha' AND band_code = '00-CORE';

DROP VIEW IF EXISTS v_cyb_binding_broken;
CREATE VIEW v_cyb_binding_broken AS
SELECT b.uid, b.table_name, b.db_name, b.layer_uid, b.band_code,
       CASE
         WHEN NOT EXISTS (SELECT 1 FROM cyb_layer l WHERE l.id = b.layer_uid
                                                       OR l.uid = b.layer_uid)
           THEN 'layer_uid does not resolve'
         WHEN b.uid <> 'BIND:' || b.scope_kind || ':' || b.band_code || ':' || b.table_name
           THEN 'uid does not match its own scope/band/table'
         ELSE NULL
       END AS issue
  FROM cyb_carrier_binding b
 WHERE b.status = 'live'
   AND (NOT EXISTS (SELECT 1 FROM cyb_layer l WHERE l.id = b.layer_uid OR l.uid = b.layer_uid)
        OR b.uid <> 'BIND:' || b.scope_kind || ':' || b.band_code || ':' || b.table_name);
