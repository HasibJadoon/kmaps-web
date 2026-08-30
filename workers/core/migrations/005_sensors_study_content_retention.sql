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
