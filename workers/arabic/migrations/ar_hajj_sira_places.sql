-- Hajj and its rites, Abraha and the Year of the Elephant, and the other major places of the sīra (owner, 2026-10-25:
-- "include all areas, also Hajj areas and rituals, Zamzam etc., Abraha"). Checked against the list of the Prophet's expeditions
-- and the Hajj holy sites; descriptions are plain facts, the lessons come later.
INSERT OR IGNORE INTO ar_curriculum_domain (id, slug, title, title_ar, description, sort_order, map_id, district) VALUES
 ('01ARDOM000000000000065','kaabah','The Kaʿbah & al-Masjid al-Ḥarām','الْكَعْبَةُ وَالْمَسْجِدُ الْحَرَامُ','The House, the ṭawāf, the Black Stone and the Station of Ibrāhīm',239,'MAP:early-arabia','hajj'),
 ('01ARDOM000000000000066','zamzam','Zamzam','زَمْزَمُ','The well that sprang up for Hājar and Ismāʿīl',240,'MAP:early-arabia','hajj'),
 ('01ARDOM000000000000067','safa_marwah','al-Ṣafā & al-Marwah','الصَّفَا وَالْمَرْوَةُ','The two hills of the saʿy, where Hājar searched for water',241,'MAP:early-arabia','hajj'),
 ('01ARDOM000000000000068','mina','Minā & the Jamarāt','مِنًى وَالْجَمَرَاتُ','The valley of tents, the stoning of the pillars and the sacrifice',242,'MAP:early-arabia','hajj'),
 ('01ARDOM000000000000069','arafah','ʿArafah','عَرَفَةُ','The standing on the ninth day, the heart of the Hajj',243,'MAP:early-arabia','hajj'),
 ('01ARDOM000000000000070','muzdalifah','Muzdalifah','الْمُزْدَلِفَةُ','The night under the sky and the gathering of pebbles',244,'MAP:early-arabia','hajj'),
 ('01ARDOM000000000000071','miqat','The Mīqāt','الْمِيقَاتُ','Where pilgrims enter iḥrām: Dhū al-Ḥulayfah and the other stations',245,'MAP:early-arabia','hajj'),
 ('01ARDOM000000000000072','elephant','Abraha & the Year of the Elephant','أَبْرَهَةُ وَعَامُ الْفِيلِ','The army with the elephant turned back from Makkah (Sūrat al-Fīl)',246,'MAP:early-arabia','makkah'),
 ('01ARDOM000000000000073','shib_abi_talib','Shiʿb Abī Ṭālib','شِعْبُ أَبِي طَالِبٍ','The valley of the three-year boycott',247,'MAP:early-arabia','makkah'),
 ('01ARDOM000000000000074','qiblatayn','Masjid al-Qiblatayn','مَسْجِدُ الْقِبْلَتَيْنِ','Where the qiblah turned to the Kaʿbah',248,'MAP:early-arabia','madinah'),
 ('01ARDOM000000000000075','hijra_road','The Road of the Hijra','طَرِيقُ الْهِجْرَةِ','The journey from Makkah to Madinah (1 AH)',249,'MAP:early-arabia','sira'),
 ('01ARDOM000000000000076','mutah','Muʾtah','مُؤْتَةُ','The battle far north in the land of Shām (8 AH)',250,'MAP:early-arabia','sira'),
 ('01ARDOM000000000000077','fath_makkah','The Opening of Makkah','فَتْحُ مَكَّةَ','The return to Makkah and the clearing of the Kaʿbah (8 AH)',251,'MAP:early-arabia','sira'),
 ('01ARDOM000000000000078','hajj_wada','The Farewell Hajj','حَجَّةُ الْوَدَاعِ','The one Hajj of the Prophet ﷺ and his sermon at ʿArafah (10 AH)',252,'MAP:early-arabia','sira'),
 ('01ARDOM000000000000079','habasha','Abyssinia (al-Ḥabashah)','الْحَبَشَةُ','Where the first emigrants found refuge with the Najāshī',253,'MAP:early-arabia','roads'),
 ('01ARDOM000000000000080','ukaz','Sūq ʿUkāẓ','سُوقُ عُكَاظٍ','The great market and poetry fair of the Arabs',254,'MAP:early-arabia','roads'),
 ('01ARDOM000000000000081','hijr','al-Ḥijr (Thamūd)','الْحِجْرُ','The rock-cut homes of Thamūd, passed on the way to Tabūk',255,'MAP:early-arabia','roads'),
 ('01ARDOM000000000000082','sham_road','The Road to Shām','طَرِيقُ الشَّامِ','The caravan road of Quraysh''s summer journey (Sūrat Quraysh)',256,'MAP:early-arabia','roads');
UPDATE ar_curriculum_domain SET map_order = CASE slug WHEN 'makkah_ancient' THEN 28 WHEN 'elephant' THEN 29 WHEN 'hira_thawr' THEN 30 WHEN 'shib_abi_talib' THEN 31 WHEN 'taif' THEN 32 WHEN 'kaabah' THEN 33 WHEN 'zamzam' THEN 34 WHEN 'safa_marwah' THEN 35 WHEN 'mina' THEN 36 WHEN 'arafah' THEN 37 WHEN 'muzdalifah' THEN 38 WHEN 'miqat' THEN 39 WHEN 'ancient_town' THEN 40 WHEN 'quba' THEN 41 WHEN 'qiblatayn' THEN 42 WHEN 'khaybar' THEN 43 WHEN 'hijra_road' THEN 44 WHEN 'badr' THEN 45 WHEN 'uhud' THEN 46 WHEN 'khandaq' THEN 47 WHEN 'hudaybiyah' THEN 48 WHEN 'mutah' THEN 49 WHEN 'fath_makkah' THEN 50 WHEN 'hunayn' THEN 51 WHEN 'tabuk' THEN 52 WHEN 'hajj_wada' THEN 53 WHEN 'habasha' THEN 54 WHEN 'ukaz' THEN 55 WHEN 'hijr' THEN 56 WHEN 'sham_road' THEN 57 WHEN 'najran' THEN 58 WHEN 'tribes' THEN 59 WHEN 'moral_stories' THEN 60 WHEN 'companion_stories' THEN 61 WHEN 'early_stories' THEN 62 ELSE map_order END WHERE map_id = 'MAP:early-arabia';
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE family = 'content';
