-- Bayt al-Maqdis and the Children of Israel (owner, 2026-10-25: "Israelite, the Second Temple, Bayt al-Maqdis, the Night
-- Journey"): al-Aqṣā moves into its own district with the Night Journey and the two ruins of the House (al-Isrāʾ 17:4–7).
INSERT OR IGNORE INTO ar_curriculum_domain (id, slug, title, title_ar, description, sort_order, map_id, district, map_order) VALUES
 ('01ARDOM0000000000000105','isra_miraj','The Night Journey & the Ascension','الْإِسْرَاءُ وَالْمِعْرَاجُ','From al-Masjid al-Ḥarām to al-Masjid al-Aqṣā by night, and up through the heavens',279,'MAP:quran-lands','quds',122),
 ('01ARDOM0000000000000106','sulayman_temple','The House of Sulaymān','بَيْتُ الْمَقْدِسِ فِي عَهْدِ سُلَيْمَانَ','The house of worship raised in Sulaymān''s time, and the jinn who laboured on it',280,'MAP:quran-lands','quds',123),
 ('01ARDOM0000000000000107','two_corruptions','The Two Corruptions','الْإِفْسَادَتَانِ','Twice the Children of Israel spread corruption, and twice the House was ruined (al-Isrāʾ 17:4–7)',281,'MAP:quran-lands','quds',124),
 ('01ARDOM0000000000000108','first_destruction','The First Ruin & the Exile','الْخَرَابُ الْأَوَّلُ وَالسَّبْيُ','The armies of Babylon, the ruin of the House and the exile',282,'MAP:quran-lands','quds',125),
 ('01ARDOM0000000000000109','second_temple','The Second Temple','الْهَيْكَلُ الثَّانِي','The House rebuilt after the exile, and its second ruin by Rome',283,'MAP:quran-lands','quds',126),
 ('01ARDOM0000000000000110','talut_jalut','Ṭālūt & Jālūt','طَالُوتُ وَجَالُوتُ','The test at the river, the Ark returned, and Jālūt felled by Dāwūd',284,'MAP:quran-lands','israil',127),
 ('01ARDOM0000000000000111','the_cow','The Cow','الْبَقَرَةُ','The cow they were told to slaughter, and the slain man made to speak',285,'MAP:quran-lands','israil',128),
 ('01ARDOM0000000000000112','ashab_sabt','The Sabbath-Breakers','أَصْحَابُ السَّبْتِ','The town by the sea and the fish that came on the Sabbath',286,'MAP:quran-lands','israil',129),
 ('01ARDOM0000000000000113','ruined_town','The Ruined Town','الْقَرْيَةُ الْخَاوِيَةُ','The man who passed a ruined town, died a hundred years and was raised (al-Baqarah 2:259)',287,'MAP:quran-lands','israil',130);
UPDATE ar_curriculum_domain SET district = 'quds' WHERE slug = 'aqsa';
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE family = 'content';
