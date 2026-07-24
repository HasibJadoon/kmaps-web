-- 0041 — Registry repair (naming convention v2, phase 3, rule N21).
--
-- ar_ling_reg_table_map is meant to be the map of the database. It was missing
-- 18 of 106 tables — the entire STORY cluster, the staging spine, the run
-- tables and ar_ling_citations. A table absent from the registry is invisible
-- to every tool that walks the map, which is why the STORY layer reads as
-- unbuilt when it holds 133 rows across 14 tables.
--
-- Registered here under CURRENT names, deliberately: this runs before the
-- rename batches (0042+), and each of those carries its own reg_table_map
-- UPDATE. Registering first means the renames move a complete registry rather
-- than a partial one.
--
-- Also in this migration:
--   • 18-STAGE → 18-TATAWWUR. 'stage' is reserved for the staging pipeline
--     (rule N8); this sub-layer is مراحل التطور, developmental stages.
--   • carrier_state, splitting the useless fill_state. All 27 sub-layers claim
--     'has_carrier' including two whose carrier table holds 0 rows.
--   • two phantom tables dropped from 500-EXPR.tables_json.

-- ── The 18 unregistered tables ─────────────────────────────────────────────
INSERT OR IGNORE INTO ar_ling_reg_table_map
  (db, table_name, cluster, layer_code, role, sub_code, role_code, code_full, discipline) VALUES
  ('km_arabic_linguistic', 'ar_ling_citations', 'source', '010', 'ingest', '40-LINK', 'B', 'AL:010-SRC:--:40-LINK:B', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_root_stage', 'staging', '900', 'ingest', '00-CORE', 'P', 'AL:900-STG:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_kroot_run', 'infra', '900', 'ingest', '60-STAT', 'J', 'AL:900-INF:--:60-STAT:J', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_kroot_run_stage', 'infra', '900', 'ingest', '60-STAT', 'J', 'AL:900-INF:--:60-STAT:J', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_root_story', 'story', '950', 'synthesis', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_root_story_beat', 'story', '950', 'synthesis', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_root_story_blueprint', 'story', '950', 'synthesis', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_root_article', 'story', '950', 'synthesis', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_root_article_block', 'story', '950', 'synthesis', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_root_composition', 'story', '950', 'synthesis', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_root_movement', 'story', '950', 'synthesis', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_root_beat', 'story', '950', 'synthesis', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_root_illustration', 'story', '950', 'synthesis', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_root_schedule', 'story', '950', 'synthesis', '60-STAT', 'P', 'AL:950-STY:--:60-STAT:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_story_arc_stage', 'story', '950', 'reference', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_story_craft', 'story', '950', 'reference', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_story_format', 'story', '950', 'reference', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha'),
  ('km_arabic_linguistic', 'ar_ling_story_icon', 'story', '950', 'reference', '00-CORE', 'P', 'AL:950-STY:--:00-CORE:P', 'lugha');

-- ── carrier_state: distinguish 'a table exists' from 'it holds data' ───────
-- fill_state says has_carrier for all 27 sub-layers. 21-MAANI points at
-- ar_ling_form_semantics (0 rows) and 27-KHAT at ar_ling_orthography_rules
-- (0 rows) — both read as done. carrier_state is backfilled from the live row
-- counts by scripts/registry/backfill-carrier-state.ts; the column default is
-- deliberately 'unknown' so an unbackfilled row never masquerades as populated.
ALTER TABLE ar_ling_reg_sub_layer ADD COLUMN carrier_state TEXT NOT NULL DEFAULT 'unknown';
  -- unknown | none | table_only | populated

-- ── N8: 'stage' means the staging pipeline and nothing else ───────────────
UPDATE ar_ling_reg_sub_layer SET sub_code = '18-TATAWWUR' WHERE sub_code = '18-STAGE';
UPDATE ar_ling_reg_table_map SET sub_code = '18-TATAWWUR',
       code_full = REPLACE(code_full, '18-STAGE', '18-TATAWWUR')
 WHERE sub_code = '18-STAGE';

-- ── Phantom carriers ──────────────────────────────────────────────────────
-- 500-EXPR.tables_json names ar_ling_expression_tokens (does not exist) and
-- ar_applied_balagha (exists in km_arabic, not this database — it could never
-- have resolved from here).
UPDATE ar_ling_reg_sub_layer
   SET tables_json = json_remove(
         json_remove(tables_json,
           COALESCE((SELECT '$[' || key || ']' FROM json_each(tables_json)
                      WHERE value = 'ar_applied_balagha'), '$[#]')),
         COALESCE((SELECT '$[' || key || ']' FROM json_each(tables_json)
                    WHERE value = 'ar_ling_expression_tokens'), '$[#]'))
 WHERE sub_code = '500-EXPR';
