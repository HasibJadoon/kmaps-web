-- ʿĪsā and the Gospel lands, and the Children of Israel in Egypt (owner, 2026-10-25: "Jesus and biblical also", "and Jewish Egypt").
-- Where a site rests on tradition the description says so; no prophet is pictured.
INSERT OR IGNORE INTO ar_curriculum_domain (id, slug, title, title_ar, description, sort_order, map_id, district, map_order) VALUES
 ('01ARDOM000000000000000163','bethlehem','Bethlehem','بَيْتُ لَحْمٍ','The town where Christian tradition places the birth of ʿĪsā',337,'MAP:quran-lands','isa',180),
 ('01ARDOM000000000000000164','nazareth','Nazareth','النَّاصِرَةُ','The town of ʿĪsā''s upbringing in the Gospels',338,'MAP:quran-lands','isa',181),
 ('01ARDOM000000000000000165','galilee','The Sea of Galilee','بُحَيْرَةُ طَبَرِيَّةَ','The lake of the fishermen who followed ʿĪsā, the disciples (al-ḥawāriyyūn)',339,'MAP:quran-lands','isa',182),
 ('01ARDOM000000000000000166','jordan_river','The River Jordan','نَهْرُ الْأُرْدُنِّ','The river of the Holy Land, from Galilee down to the Dead Sea',340,'MAP:quran-lands','isa',183),
 ('01ARDOM000000000000000167','hebron','Hebron (al-Khalīl)','الْخَلِيلُ','The town named after Ibrāhīm, the Friend of God, where tradition places his tomb',341,'MAP:quran-lands','isa',184),
 ('01ARDOM000000000000000168','jericho','Jericho','أَرِيحَا','One of the oldest towns on earth, by the Jordan near the Dead Sea',342,'MAP:quran-lands','isa',185),
 ('01ARDOM000000000000000169','israel_in_egypt','Israel in Egypt','بَنُو إِسْرَائِيلَ فِي مِصْرَ','The Children of Israel settle in Egypt after Yūsuf, until Mūsā leads them out',343,'MAP:quran-lands','egypt',186),
 ('01ARDOM000000000000000170','pharaoh_cities','The Cities of Pharaoh','مُدُنُ فِرْعَوْنَ','Memphis, Thebes and the great cities of the Nile',344,'MAP:quran-lands','egypt',187);
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE family = 'content';
