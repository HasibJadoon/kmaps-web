-- ─── 0097 · the Senses band, at root scope ───────────────────────────────────
--
-- `14-SENSE` was one sub-layer inside Root intelligence (band 10 · SYN) carrying
-- six tables at once:
--
--   ar_ling_root_sense · ar_ling_root_sense_axis · ar_ling_root_tatawwur
--   ar_ling_sense_arc  · ar_ling_sense_arc_step  · ar_ling_sense_attestation
--
-- One row cannot report six carriers. It reads "filled" the moment any of them
-- holds anything, so a root with senses and no arcs reported the same as a root
-- with the whole graph — and the arcs, steps and attestations (81 · 171 · 1,686
-- rows live) had no sub-layer of their own to be counted in, mined into, or
-- drilled from.
--
-- They become their own band. Six sub-layers, one carrier each, which is what
-- makes each one separately senseable: a root can now read 1/6 and name which
-- five are missing.
--
-- Every carrier below was verified present in km_arabic_linguistic before this
-- migration was written. `ar_ling_root_asl` — the carrier the design gives
-- 12-ASL — does NOT exist, which is why that row keeps its empty tables_json
-- and is left alone here rather than quietly pointed at a table that is not
-- there.
--
-- Scope note: sense lives at root and lemma only. `ar_ling_sense_arc.scope_level`
-- is CHECK-constrained to ('root','lemma') — a word owns no sense, it owns a
-- link (km_quran.qr_word_sense_link). So this band is declared at root scope and
-- has no word counterpart.

-- ── 14-SENSE moves into its own band and narrows to one carrier ──────────────
UPDATE ar_ling_reg_sub_layer
   SET band          = 14,
       band_key      = 'SENSE',
       band_name_ar  = 'المعاني',
       band_name_en  = 'Senses',
       tables_json   = '["ar_ling_root_sense"]',
       display_order = 14
 WHERE sub_code = '14-SENSE' AND scope_level = 'root';

-- ── the five that had no row of their own ────────────────────────────────────
INSERT OR IGNORE INTO ar_ling_reg_sub_layer
  (sub_code, band, band_key, band_name_ar, band_name_en,
   name_ar, name_en, name_ur, scope_level, discipline, default_card,
   carrier_hint, display_order, status, tables_json, fill_state,
   produced_by, carrier_state)
VALUES
  ('15-AXIS', 14, 'SENSE', 'المعاني', 'Senses',
   'محاور المعنى', 'Sense axes', NULL, 'root', 'DL', 'P',
   'ar_ling_root_sense_axis', 15, 'live',
   '["ar_ling_root_sense_axis"]', 'has_carrier', 'ingest', 'unknown'),

  ('16-TAT', 14, 'SENSE', 'المعاني', 'Senses',
   'تطوّر المعنى', 'Sense evolution', NULL, 'root', 'DL', 'P',
   'ar_ling_root_tatawwur', 16, 'live',
   '["ar_ling_root_tatawwur"]', 'has_carrier', 'ingest', 'unknown'),

  ('17-ARC', 14, 'SENSE', 'المعاني', 'Senses',
   'قوس المعنى', 'Sense arc', NULL, 'root', 'DL', 'P',
   'ar_ling_sense_arc', 17, 'live',
   '["ar_ling_sense_arc"]', 'has_carrier', 'ingest', 'unknown'),

  ('18-STEP', 14, 'SENSE', 'المعاني', 'Senses',
   'خطوات القوس', 'Arc steps', NULL, 'root', 'DL', 'P',
   'ar_ling_sense_arc_step', 18, 'live',
   '["ar_ling_sense_arc_step"]', 'has_carrier', 'ingest', 'unknown'),

  ('19-ATT', 14, 'SENSE', 'المعاني', 'Senses',
   'شواهد المعنى', 'Attestations', NULL, 'root', 'DL', 'P',
   'ar_ling_sense_attestation', 19, 'live',
   '["ar_ling_sense_attestation"]', 'has_carrier', 'ingest', 'unknown');

-- ── keep the second mapping in step ──────────────────────────────────────────
-- `ar_ling_reg_table_map` is the other half of the registry and the two agreed
-- exactly before this change; adding sub-layers without it would be the first
-- divergence between them.
INSERT OR IGNORE INTO ar_ling_reg_table_map
  (db, table_name, cluster, layer_code, role, sub_code, discipline)
VALUES
  ('km_arabic_linguistic', 'ar_ling_root_sense_axis',    'SENSE', NULL, 'carrier', '15-AXIS', 'DL'),
  ('km_arabic_linguistic', 'ar_ling_root_tatawwur',      'SENSE', NULL, 'carrier', '16-TAT',  'DL'),
  ('km_arabic_linguistic', 'ar_ling_sense_arc',          'SENSE', NULL, 'carrier', '17-ARC',  'DL'),
  ('km_arabic_linguistic', 'ar_ling_sense_arc_step',     'SENSE', NULL, 'carrier', '18-STEP', 'DL'),
  ('km_arabic_linguistic', 'ar_ling_sense_attestation',  'SENSE', NULL, 'carrier', '19-ATT',  'DL');

UPDATE ar_ling_reg_table_map
   SET cluster = 'SENSE', sub_code = '14-SENSE'
 WHERE table_name = 'ar_ling_root_sense';
