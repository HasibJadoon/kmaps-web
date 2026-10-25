-- Before Islam: the epigraphic landscape of pre-Islamic Arabia and the origin of Arabic (owner, 2026-10-25), a map opened
-- from Early Arabia. Dates are the inscriptions' own, as commonly given; the script's origin is told as the main (Nabataean)
-- view with the Syriac view named.
INSERT OR IGNORE INTO ar_map (id, parent_id, slug, title, title_ar, era, blurb, image_key, w, h, sort_order, districts_json) VALUES
 ('MAP:arabic-origins', 'MAP:early-arabia', 'arabic-origins', 'Before Islam: the Origin of Arabic', 'قَبْلَ الْإِسْلَامِ: أَصْلُ الْعَرَبِيَّةِ', 'early',
  'The old scripts of Arabia, the Nabataeans, the first Arabic inscriptions and the poets', 'reading/places/town-origins.jpg', 1000, 1100, 10, '[]');
INSERT OR IGNORE INTO ar_curriculum_domain (id, slug, title, title_ar, description, sort_order, map_id, district, map_order) VALUES
 ('01ARDOM0000000000000114','safaitic','Safaitic','الصَّفَائِيَّةُ','Thousands of rock graffiti in the black basalt desert of southern Syria and north-east Jordan',288,'MAP:arabic-origins','north',131),
 ('01ARDOM0000000000000115','hismaic','Hismaic','الْحِسْمَائِيَّةُ','Rock inscriptions of the Ḥismā desert, between southern Jordan and north-west Arabia',289,'MAP:arabic-origins','north',132),
 ('01ARDOM0000000000000116','dadanitic','Dadanitic (Dedan)','الدَّادَانِيَّةُ','The script of the oasis kingdom of Dedan, today al-ʿUlā',290,'MAP:arabic-origins','north',133),
 ('01ARDOM0000000000000117','taymanitic','Taymanitic (Taymāʾ)','التَّيْمَائِيَّةُ','The script of the oasis of Taymāʾ',291,'MAP:arabic-origins','north',134),
 ('01ARDOM0000000000000118','musnad_marib','Saba & the Musnad','سَبَأٌ وَخَطُّ الْمُسْنَدِ','The monumental script of Saba, Maʿīn, Qatabān and Ḥaḍramawt, at Maʾrib',292,'MAP:arabic-origins','south',135),
 ('01ARDOM0000000000000119','himyar','Ḥimyar','حِمْيَرُ','The last great kingdom of the south, in the centuries before Islam',293,'MAP:arabic-origins','south',136),
 ('01ARDOM0000000000000120','qaryat_faw','Qaryat al-Faw','قَرْيَةُ الْفَاوِ','The caravan city of Kindah, with an early Arabic text written in the Musnad script',294,'MAP:arabic-origins','south',137),
 ('01ARDOM0000000000000121','petra','Petra','الْبَتْرَاءُ','The rock-cut capital of the Nabataeans, whose script grew into the Arabic script',295,'MAP:arabic-origins','nabataeans',138),
 ('01ARDOM0000000000000122','hegra','Hegra (al-Ḥijr)','الْحِجْرُ','Nabataean tomb inscriptions, among them the Raqūsh epitaph (267 CE) moving towards Arabic',296,'MAP:arabic-origins','nabataeans',139),
 ('01ARDOM0000000000000123','en_avdat','ʿEn ʿAvdat','عَيْنُ عَبْدَة','Lines of Arabic in Nabataean letters in the Negev, among the earliest Arabic texts',297,'MAP:arabic-origins','nabataeans',140),
 ('01ARDOM0000000000000124','namara','al-Namārah (328 CE)','نَقْشُ النَّمَارَةِ','The epitaph of Imruʾ al-Qays, "king of all the Arabs", in Arabic written in Nabataean letters',298,'MAP:arabic-origins','firsts',141),
 ('01ARDOM0000000000000125','zebed','Zebed (512 CE)','نَقْشُ زَبَد','A church inscription in Greek, Syriac and Arabic, near Aleppo',299,'MAP:arabic-origins','firsts',142),
 ('01ARDOM0000000000000126','jabal_usays','Jabal Usays (528 CE)','نَقْشُ جَبَلِ أُسَيْسٍ','A short Arabic text in the early Arabic script, south-east of Damascus',300,'MAP:arabic-origins','firsts',143),
 ('01ARDOM0000000000000127','harran','Ḥarrān (568 CE)','نَقْشُ حَرَّانَ','A Greek and Arabic inscription over a church door in southern Syria',301,'MAP:arabic-origins','firsts',144),
 ('01ARDOM0000000000000128','hira','al-Ḥīrah','الْحِيرَةُ','The court of the Lakhmids by the Euphrates, named in reports of how Arabic writing spread',302,'MAP:arabic-origins','courts',145),
 ('01ARDOM0000000000000129','ghassan','The Ghassānids','الْغَسَاسِنَةُ','The Arab kings on the edge of Byzantine Syria',303,'MAP:arabic-origins','courts',146),
 ('01ARDOM0000000000000130','muallaqat','The Hanging Odes','الْمُعَلَّقَاتُ','The great poems of the Arabs before Islam, the high Arabic the Qurʾān was revealed into',304,'MAP:arabic-origins','courts',147),
 ('01ARDOM0000000000000131','script_story','From Nabataean to Arabic','مِنَ النَّبَطِيِّ إِلَى الْعَرَبِيِّ','How the letters changed shape and joined, step by step, into the Arabic script (the main view; another links it to Syriac)',305,'MAP:arabic-origins','courts',148);
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE family = 'content';
