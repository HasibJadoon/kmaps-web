-- The Lands of the Qurʾān (owner, 2026-10-25: "Qurʾānic historical" places): the peoples and prophets of the Qurʾān's
-- stories, as an era map before Early Arabia. Pictures are landscapes and objects only: no prophet or person is shown.
-- Where a place is disputed (the Cave, Dhū al-Qarnayn) the description names the story, not a location.
-- era gains 'quranic' (SQLite cannot alter a CHECK: the small table is rebuilt; places keep pointing at the same ids)
-- the places point at maps: unlink them for the rebuild and relink after (dropping a table that is pointed at fails)
CREATE TABLE tmp_map_ref AS SELECT id, map_id FROM ar_curriculum_domain WHERE map_id IS NOT NULL;
UPDATE ar_curriculum_domain SET map_id = NULL WHERE map_id IS NOT NULL;
CREATE TABLE ar_map_new (
  id TEXT PRIMARY KEY, parent_id TEXT REFERENCES ar_map(id), slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, title_ar TEXT,
  era TEXT NOT NULL CHECK (era IN ('quranic','early','classical','msa')), blurb TEXT, image_key TEXT, w REAL NOT NULL DEFAULT 1000,
  h REAL NOT NULL DEFAULT 1100, sort_order INTEGER NOT NULL DEFAULT 0, districts_json TEXT NOT NULL DEFAULT '[]');
INSERT INTO ar_map_new SELECT id, parent_id, slug, title, title_ar, era, blurb, image_key, w, h, sort_order, districts_json FROM ar_map;
DROP TABLE ar_map;
ALTER TABLE ar_map_new RENAME TO ar_map;
UPDATE ar_curriculum_domain SET map_id = (SELECT t.map_id FROM tmp_map_ref t WHERE t.id = ar_curriculum_domain.id)
 WHERE id IN (SELECT id FROM tmp_map_ref);
DROP TABLE tmp_map_ref;
UPDATE ar_map SET sort_order = sort_order + 1 WHERE sort_order >= 2 AND id != 'MAP:quran-lands';
INSERT OR IGNORE INTO ar_map (id, parent_id, slug, title, title_ar, era, blurb, image_key, w, h, sort_order, districts_json) VALUES
 ('MAP:quran-lands', NULL, 'quran-lands', 'The Lands of the Qurʾān', 'بِلَادُ الْقُرْآنِ', 'quranic',
  'The peoples and prophets of the Qurʾān''s stories: the flood, ʿĀd and Thamūd, Egypt and Sinai, the Holy Land, Saba', 'reading/places/town-quranic.jpg', 1000, 1100, 2, '[]');
INSERT OR IGNORE INTO ar_curriculum_domain (id, slug, title, title_ar, description, sort_order, map_id, district, map_order) VALUES
 ('01ARDOM000000000000083','nuh_ark','Nūḥ & the Ark','نُوحٌ وَالسَّفِينَةُ','The flood, the ark and its resting on al-Jūdī',257,'MAP:quran-lands','first',100),
 ('01ARDOM000000000000084','ad_iram','ʿĀd & Iram','عَادٌ وَإِرَمُ','The people of the tall pillars in the sand dunes of al-Aḥqāf',258,'MAP:quran-lands','first',101),
 ('01ARDOM000000000000085','thamud','Thamūd & the She-Camel','ثَمُودُ وَالنَّاقَةُ','The people who carved homes in the rock, and the she-camel of Ṣāliḥ',259,'MAP:quran-lands','first',102),
 ('01ARDOM000000000000086','lut_towns','The Towns of Lūṭ','قُرَى لُوطٍ','The towns overturned, by the sea that is dead',260,'MAP:quran-lands','first',103),
 ('01ARDOM000000000000087','madyan','Madyan','مَدْيَنُ','The people of Shuʿayb, the measure and the scale',261,'MAP:quran-lands','first',104),
 ('01ARDOM000000000000088','ibrahim_fire','The Fire & the Idols','النَّارُ وَالْأَصْنَامُ','The idols broken, and the fire made cool and safe',262,'MAP:quran-lands','ibrahim',105),
 ('01ARDOM000000000000089','ibrahim_house','The House Raised','رَفْعُ الْبَيْتِ','Ibrāhīm and Ismāʿīl raise the foundations of the House in the barren valley',263,'MAP:quran-lands','ibrahim',106),
 ('01ARDOM000000000000090','yusuf_egypt','Yūsuf in Egypt','يُوسُفُ فِي مِصْرَ','The well, the palace, the dream and the storehouses',264,'MAP:quran-lands','egypt',107),
 ('01ARDOM000000000000091','musa_firawn','Mūsā & Firʿawn','مُوسَى وَفِرْعَوْنُ','The river, the palace and the magicians',265,'MAP:quran-lands','egypt',108),
 ('01ARDOM000000000000092','sea_crossing','The Parting of the Sea','انْفِلَاقُ الْبَحْرِ','The sea split, and Firʿawn drowned',266,'MAP:quran-lands','egypt',109),
 ('01ARDOM000000000000093','tur_sinai','Mount Ṭūr','جَبَلُ الطُّورِ','The fire on the mountain, the call and the tablets',267,'MAP:quran-lands','egypt',110),
 ('01ARDOM000000000000094','wilderness','The Wilderness','التِّيهُ','Forty years of wandering, the manna and the quails',268,'MAP:quran-lands','egypt',111),
 ('01ARDOM000000000000095','aqsa','al-Masjid al-Aqṣā','الْمَسْجِدُ الْأَقْصَى','The far masjid of the Night Journey',269,'MAP:quran-lands','holy',112),
 ('01ARDOM000000000000096','dawud_sulayman','Dāwūd & Sulaymān','دَاوُدُ وَسُلَيْمَانُ','Iron made soft, the wind, the jinn and the ants',270,'MAP:quran-lands','holy',113),
 ('01ARDOM000000000000097','maryam_isa','Maryam & ʿĪsā','مَرْيَمُ وَعِيسَى','The miḥrāb, the palm tree and the spring',271,'MAP:quran-lands','holy',114),
 ('01ARDOM000000000000098','zakariyya_yahya','Zakariyyā & Yaḥyā','زَكَرِيَّا وَيَحْيَى','The prayer in the miḥrāb and the son given in old age',272,'MAP:quran-lands','holy',115),
 ('01ARDOM000000000000099','saba','Saba & the Great Dam','سَبَأٌ وَالسَّدُّ','The queen, the hoopoe''s news, the gardens and the flood of the dam',273,'MAP:quran-lands','far',116),
 ('01ARDOM0000000000000100','yunus_nineveh','Yūnus & Nineveh','يُونُسُ وَنِينَوَى','The whale, the gourd plant and the town that believed',274,'MAP:quran-lands','far',117),
 ('01ARDOM0000000000000101','babil','Bābil','بَابِلُ','Hārūt and Mārūt in Babylon',275,'MAP:quran-lands','far',118),
 ('01ARDOM0000000000000102','kahf','The People of the Cave','أَصْحَابُ الْكَهْفِ','The young men who slept in the cave, and their dog',276,'MAP:quran-lands','far',119),
 ('01ARDOM0000000000000103','dhul_qarnayn','Dhū al-Qarnayn''s Wall','سَدُّ ذِي الْقَرْنَيْنِ','The journey east and west, and the wall of iron and copper',277,'MAP:quran-lands','far',120),
 ('01ARDOM0000000000000104','ukhdud','The People of the Ditch','أَصْحَابُ الْأُخْدُودِ','The believers and the burning ditch (Sūrat al-Burūj)',278,'MAP:quran-lands','far',121);
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE family = 'content';
