-- ─── 005 · sensors for study · content · retention ───────────────────────────
--
-- `cyb_sensor` held 749 rows: 748 build and one study. Content and Retention
-- had none at all, which is why every screen printed "not measured" for them —
-- correctly. This adds the three missing axes for the roots that have something
-- to measure.
--
-- WHAT EACH AXIS MEASURES, STATED SO IT CAN BE ARGUED WITH
--
--   study      metric `sources`   distinct source_slug in ar_ling_stg_claim,
--                                 CAPPED at expected 2. Comparing is a stage of
--                                 the Study loop and a layer resting on one
--                                 scholar has nothing to be compared against, so
--                                 two is the threshold at which comparison
--                                 becomes possible — not a target to exceed.
--                                 Uncapped, بين's 30 sources read as 1500%,
--                                 which is what a threshold looks like when it
--                                 is mistaken for a denominator.
--
--   content    metric `memlets`   ar_ling_learn_memlet for the root, expected 16
--                                 — the Membean layout declares sixteen panels,
--                                 so sixteen is what "made" means here.
--
--   retention  metric `recalled`  cards recalled, expected = the bank that
--                                 exists. Reading is 0 because core_srs_card is
--                                 empty: the deck was created in core 002 and
--                                 nobody has enrolled yet. That is a true zero,
--                                 not a missing sensor.
--
-- NO BANK, NO SENSOR. A root with no questions gets no retention row rather
-- than a 0/0 that would render as 0%%. "Not measured" and "measured at zero" are
-- different readings and the loop model depends on telling them apart.
--
-- Build is untouched. Its 748 rows are per (root × band × presence) and already
-- correct; these are rollups at the root, which is why `kind` is 'rollup' and
-- `band_code` is null.
--
-- Regenerate rather than hand-edit: readings are a snapshot and go stale the
-- moment a claim is staged.

INSERT OR REPLACE INTO cyb_sensor
  (id,node_id,axis,kind,band_code,metric,reading,expected,weight,state,health,trend,
   error_val,read_count,source_table,first_read_at,last_read_at)
VALUES
  ('SENSOR:CYB:quran:44:1-9:root:برك:study:sources','CYB:quran:44:1-9:root:برك','study','rollup',NULL,'sources',14.0,2.0,1,'filled','ok','flat',0.0,1,'ar_ling_stg_claim',datetime('now'),datetime('now')),
  ('SENSOR:CYB:quran:44:1-9:root:برك:content:memlets','CYB:quran:44:1-9:root:برك','content','rollup',NULL,'memlets',0.0,16.0,1,'empty','ok','flat',16.0,1,'ar_ling_learn_memlet',datetime('now'),datetime('now')),
  ('SENSOR:CYB:quran:44:1-9:root:بين:study:sources','CYB:quran:44:1-9:root:بين','study','rollup',NULL,'sources',30.0,2.0,1,'filled','ok','flat',0.0,1,'ar_ling_stg_claim',datetime('now'),datetime('now')),
  ('SENSOR:CYB:quran:44:1-9:root:بين:content:memlets','CYB:quran:44:1-9:root:بين','content','rollup',NULL,'memlets',14.0,16.0,1,'partial','ok','flat',2.0,1,'ar_ling_learn_memlet',datetime('now'),datetime('now')),
  ('SENSOR:CYB:quran:44:1-9:root:بين:retention:recalled','CYB:quran:44:1-9:root:بين','retention','rollup',NULL,'recalled',0.0,27.0,1,'empty','ok','flat',27.0,1,'core_srs_card',datetime('now'),datetime('now')),
  ('SENSOR:CYB:quran:44:1-9:root:كتب:study:sources','CYB:quran:44:1-9:root:كتب','study','rollup',NULL,'sources',7.0,2.0,1,'filled','ok','flat',0.0,1,'ar_ling_stg_claim',datetime('now'),datetime('now')),
  ('SENSOR:CYB:quran:44:1-9:root:كتب:content:memlets','CYB:quran:44:1-9:root:كتب','content','rollup',NULL,'memlets',0.0,16.0,1,'empty','ok','flat',16.0,1,'ar_ling_learn_memlet',datetime('now'),datetime('now')),
  ('SENSOR:CYB:quran:44:1-9:root:ليل:study:sources','CYB:quran:44:1-9:root:ليل','study','rollup',NULL,'sources',16.0,2.0,1,'filled','ok','flat',0.0,1,'ar_ling_stg_claim',datetime('now'),datetime('now')),
  ('SENSOR:CYB:quran:44:1-9:root:ليل:content:memlets','CYB:quran:44:1-9:root:ليل','content','rollup',NULL,'memlets',0.0,16.0,1,'empty','ok','flat',16.0,1,'ar_ling_learn_memlet',datetime('now'),datetime('now')),
  ('SENSOR:CYB:quran:44:1-9:root:نذر:study:sources','CYB:quran:44:1-9:root:نذر','study','rollup',NULL,'sources',13.0,2.0,1,'filled','ok','flat',0.0,1,'ar_ling_stg_claim',datetime('now'),datetime('now')),
  ('SENSOR:CYB:quran:44:1-9:root:نذر:content:memlets','CYB:quran:44:1-9:root:نذر','content','rollup',NULL,'memlets',11.0,16.0,1,'partial','ok','flat',5.0,1,'ar_ling_learn_memlet',datetime('now'),datetime('now')),
  ('SENSOR:CYB:quran:44:1-9:root:نذر:retention:recalled','CYB:quran:44:1-9:root:نذر','retention','rollup',NULL,'recalled',0.0,5.0,1,'empty','ok','flat',5.0,1,'core_srs_card',datetime('now'),datetime('now')),
  ('SENSOR:CYB:quran:44:1-9:root:نزل:study:sources','CYB:quran:44:1-9:root:نزل','study','rollup',NULL,'sources',18.0,2.0,1,'filled','ok','flat',0.0,1,'ar_ling_stg_claim',datetime('now'),datetime('now')),
  ('SENSOR:CYB:quran:44:1-9:root:نزل:content:memlets','CYB:quran:44:1-9:root:نزل','content','rollup',NULL,'memlets',0.0,16.0,1,'empty','ok','flat',16.0,1,'ar_ling_learn_memlet',datetime('now'),datetime('now'));
