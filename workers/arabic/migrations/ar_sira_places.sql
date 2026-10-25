-- The major places of the sīra on the Early Arabia map (owner, 2026-10-25: "Uhud, Badr, all major areas, earlier, Tabuk"):
-- the two caves by Makkah, Qubāʾ by Madinah, and the battles and journeys on the Road of the Sīra, in date order.
INSERT OR IGNORE INTO ar_curriculum_domain (id, slug, title, title_ar, description, sort_order, map_id, district) VALUES
 ('01ARDOM000000000000057','hira_thawr','The Caves of Ḥirāʾ & Thawr','غَارُ حِرَاءٍ وَغَارُ ثَوْرٍ','The cave where revelation began, and the cave of the hijra',231,'MAP:early-arabia','makkah'),
 ('01ARDOM000000000000058','quba','Qubāʾ','قُبَاءٌ','The first masjid, built on the arrival in Madinah',232,'MAP:early-arabia','madinah'),
 ('01ARDOM000000000000059','badr','Badr','بَدْرٌ','The wells of Badr, where the first great battle was fought (2 AH)',233,'MAP:early-arabia','sira'),
 ('01ARDOM000000000000060','uhud','Uḥud','أُحُدٌ','The mountain north of Madinah and the battle at its foot (3 AH)',234,'MAP:early-arabia','sira'),
 ('01ARDOM000000000000061','khandaq','al-Khandaq','الْخَنْدَقُ','The trench dug round Madinah against the confederates (5 AH)',235,'MAP:early-arabia','sira'),
 ('01ARDOM000000000000062','hudaybiyah','al-Ḥudaybiyah','الْحُدَيْبِيَةُ','The treaty made at the edge of the sacred land (6 AH)',236,'MAP:early-arabia','sira'),
 ('01ARDOM000000000000063','hunayn','Ḥunayn','حُنَيْنٌ','The valley battle after the opening of Makkah (8 AH)',237,'MAP:early-arabia','sira'),
 ('01ARDOM000000000000064','tabuk','Tabūk','تَبُوكُ','The long march north in the summer heat (9 AH)',238,'MAP:early-arabia','sira');
UPDATE ar_curriculum_domain SET map_order = CASE slug
  WHEN 'makkah_ancient' THEN 28 WHEN 'hira_thawr' THEN 29 WHEN 'taif' THEN 30 WHEN 'ancient_town' THEN 31 WHEN 'quba' THEN 32
  WHEN 'khaybar' THEN 33 WHEN 'badr' THEN 34 WHEN 'uhud' THEN 35 WHEN 'khandaq' THEN 36 WHEN 'hudaybiyah' THEN 37
  WHEN 'hunayn' THEN 38 WHEN 'tabuk' THEN 39 WHEN 'najran' THEN 40 WHEN 'tribes' THEN 41 WHEN 'moral_stories' THEN 42
  WHEN 'companion_stories' THEN 43 WHEN 'early_stories' THEN 44 ELSE map_order END
 WHERE map_id = 'MAP:early-arabia';
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE family = 'content';
