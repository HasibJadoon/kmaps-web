UPDATE cyb_carrier_binding
   SET bind_kind = 'scope', bind_col = 'scope_id', bind_via = 'scope_type'
 WHERE status = 'live' AND domain = 'quran'
   AND table_name IN ('qr_ss_scope_morph_link', 'qr_ss_scope_grammar_link',
                      'qr_ss_scope_balagha_link', 'qr_ss_scope_nuance',
                      'qr_ss_scope_reading', 'qr_ss_scope_member_map',
                      'qr_ss_discourse_note');

UPDATE cyb_carrier_binding
   SET bind_kind = 'scope', bind_col = 'from_scope_id', bind_via = 'from_scope_type'
 WHERE status = 'live' AND domain = 'quran' AND table_name = 'qr_ss_scope_link';

UPDATE cyb_carrier_binding
   SET bind_kind = 'scope', bind_col = 'sentence_id', bind_via = NULL,
       scope_kind = 'sentence'
 WHERE status = 'live' AND domain = 'quran'
   AND table_name IN ('qr_ss_tree', 'qr_ss_ellipsis_event');

UPDATE cyb_carrier_binding
   SET bind_kind = 'scope', bind_col = 'tree_id', bind_via = NULL,
       scope_kind = 'tree'
 WHERE status = 'live' AND domain = 'quran'
   AND table_name IN ('qr_ss_tree_node', 'qr_ss_tree_edge', 'qr_ss_tree_layout');

UPDATE cyb_carrier_binding
   SET bind_kind = 'scope', bind_col = 'translation_unit_id', bind_via = NULL,
       scope_kind = 'translation_unit'
 WHERE status = 'live' AND domain = 'quran'
   AND table_name = 'qr_ss_translation_nuance';

UPDATE cyb_carrier_binding
   SET bind_kind = 'scope', bind_col = 'note_id', bind_via = NULL,
       scope_kind = 'discourse_note'
 WHERE status = 'live' AND domain = 'quran'
   AND table_name IN ('qr_ss_discourse_citation', 'qr_ss_discourse_source_link');

UPDATE cyb_carrier_binding
   SET bind_kind = 'scope', bind_col = 'reading_id', bind_via = NULL,
       scope_kind = 'scope_reading'
 WHERE status = 'live' AND domain = 'quran'
   AND table_name = 'qr_ss_scope_reading_evidence_link';

INSERT OR IGNORE INTO cyb_carrier_binding
  (uid, domain, lane, layer_uid, band_uid, band_code, scope_kind,
   db_name, table_name, bind_col, bind_kind, bind_via, role, bind_note)
VALUES
  ('BIND:ss:300-40-JISR:qr_word_occurrence', 'quran', 'quran', 'quran:ss',
   'BND:ss:300-40-JISR', '300-40-JISR', 'word', 'km_quran',
   'qr_word_occurrence', 'id', 'scope', NULL, 'carrier',
   'the word surfaces the parses hang off');
