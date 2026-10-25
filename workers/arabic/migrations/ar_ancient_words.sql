-- Ancient words in their first meanings (owner, 2026-10-25: "ancient meaning in Arabia, early Islamic and Qur'anic verbs and
-- idioms"): verbs of the desert, the concrete first sense behind Qur'anic words, Qur'anic idioms and old sayings; inside Early Arabia.
INSERT OR IGNORE INTO ar_map (id, parent_id, slug, title, title_ar, era, blurb, image_key, w, h, sort_order, districts_json) VALUES
 ('MAP:ancient-words', 'MAP:early-arabia', 'ancient-words', 'Ancient Words in Action', 'أَلْفَاظٌ قَدِيمَةٌ فِي الْحَرَكَةِ', 'early',
  'Verbs of the desert, the first meanings behind Qur''anic words, Qur''anic idioms and old sayings', 'reading/places/town-ancient-words.jpg', 1000, 1100, 12, '[]');
INSERT OR IGNORE INTO ar_curriculum_domain (id, slug, title, title_ar, description, sort_order, map_id, district, map_order) VALUES
 ('01ARDOM0000000000000146','desert_travel','Setting Out & Camping','الرَّحِيلُ وَالنُّزُولُ','رَحَلَ، سَارَ، نَزَلَ: the caravan moves and makes camp',320,'MAP:ancient-words','desert',163),
 ('01ARDOM0000000000000147','herding','Herding & Watering','الرَّعْيُ وَالسَّقْيُ','رَعَى، سَقَى، وَرَدَ: flocks, wells and the watering place',321,'MAP:ancient-words','desert',164),
 ('01ARDOM0000000000000148','desert_raids','Raid & Defence','الْغَزْوُ وَالْكَرُّ','غَزَا، أَغَارَ، كَرَّ وَفَرَّ: the words of old desert warfare',322,'MAP:ancient-words','desert',165),
 ('01ARDOM0000000000000149','caravan_trade','Caravan Trade','تِجَارَةُ الْقَوَافِلِ','بَاعَ، اشْتَرَى، رَبِحَ: buying and selling at the old markets',323,'MAP:ancient-words','desert',166),
 ('01ARDOM0000000000000150','kafara','كَفَرَ: To Cover','كَفَرَ','First, to cover, as a farmer covers seed with earth; then to cover over a truth',324,'MAP:ancient-words','first',167),
 ('01ARDOM0000000000000151','sabara','صَبَرَ: To Hold Fast','صَبَرَ','First, to hold back and bind; then patience, holding oneself firm',325,'MAP:ancient-words','first',168),
 ('01ARDOM0000000000000152','dalla','ضَلَّ: To Lose the Way','ضَلَّ','First, to lose one''s way in the desert; then to go astray',326,'MAP:ancient-words','first',169),
 ('01ARDOM0000000000000153','hada','هَدَى: To Guide','هَدَى','First, to lead someone along the road; then guidance',327,'MAP:ancient-words','first',170),
 ('01ARDOM0000000000000154','taba','تَابَ: To Turn Back','تَابَ','First, to return; then to turn back to God in repentance',328,'MAP:ancient-words','first',171),
 ('01ARDOM0000000000000155','zaka','زَكَا: To Grow','زَكَا','First, to grow and thrive; then purity and the zakāh',329,'MAP:ancient-words','first',172),
 ('01ARDOM0000000000000156','quran_idioms','Idioms of the Qurʾān','تَعَابِيرُ قُرْآنِيَّةٌ','ضَرَبَ مَثَلًا، أَلْقَى السَّمْعَ، وَلَّى مُدْبِرًا',330,'MAP:ancient-words','quran',173),
 ('01ARDOM0000000000000157','quran_verb_particles','One Verb, Two Particles','فِعْلٌ وَحَرْفَانِ','تَابَ إِلَى and تَابَ عَلَى، رَغِبَ فِي and رَغِبَ عَنْ: the particle turns the meaning',331,'MAP:ancient-words','quran',174),
 ('01ARDOM0000000000000158','proverbs','Old Arab Proverbs','أَمْثَالُ الْعَرَبِ','The short sayings the Arabs lived by',332,'MAP:ancient-words','sayings',175),
 ('01ARDOM0000000000000159','poets_idioms','The Poets'' Expressions','تَعَابِيرُ الشُّعَرَاءِ','The images and turns of phrase of the old poems',333,'MAP:ancient-words','sayings',176);
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE family = 'content';
