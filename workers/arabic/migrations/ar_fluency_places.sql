-- More places on the Everyday fluency map (owner, 2026-10-25): verbs, idioms, conversations, the Qurʾān's frequent words,
-- and the Companions' and the early righteous' stories, beside the moral stories and the daily-life places.
INSERT OR IGNORE INTO ar_curriculum_domain (id, slug, title, title_ar, description, sort_order) VALUES
  ('01ARDOM000000000000033', 'common_verbs', 'Common Verbs', 'أَفْعَالٌ شَائِعَةٌ', 'The verbs of every day, in short scenes', 6),
  ('01ARDOM000000000000034', 'idioms', 'Idioms & Expressions', 'تَعَابِيرُ وَأَمْثَالٌ', 'Set phrases and sayings, met in a story', 7),
  ('01ARDOM000000000000035', 'conversations', 'Conversations', 'مُحَادَثَاتٌ', 'Real exchanges: greetings, asking, thanking, helping', 8),
  ('01ARDOM000000000000036', 'quran_frequent', 'Qurʾān''s Frequent Words', 'كَلِمَاتٌ قُرْآنِيَّةٌ', 'The words the Qurʾān uses most, in everyday sentences', 9),
  ('01ARDOM000000000000037', 'companion_stories', 'Companions'' Stories', 'قِصَصُ الصَّحَابَةِ', 'Short true stories of the Companions, told simply', 10),
  ('01ARDOM000000000000038', 'early_stories', 'Stories of the Righteous', 'قِصَصُ السَّلَفِ', 'Early Muslims'' stories of patience, honesty and kindness', 11);
INSERT OR IGNORE INTO ar_curriculum_domain (id, slug, title, title_ar, description, sort_order) VALUES
  ('01ARDOM000000000000039', 'hadith_daily', 'Hadith for Daily Life', 'أَحَادِيثُ فِي الْأَخْلَاقِ', 'Short authentic hadiths on manners, each with its source', 12),
  ('01ARDOM000000000000040', 'prophetic_duas', 'Prophetic Duʿās', 'أَدْعِيَةٌ نَبَوِيَّةٌ', 'The duʿās of the day, from waking to sleeping, each with its source', 13);
-- the map: which places it shows, in journey order, and each place's picture
ALTER TABLE ar_curriculum_domain ADD COLUMN map_order INTEGER;
ALTER TABLE ar_curriculum_domain ADD COLUMN cover_key TEXT;
UPDATE ar_curriculum_domain SET map_order = CASE slug
  WHEN 'home_family' THEN 1 WHEN 'children_upbringing' THEN 2 WHEN 'food_drink' THEN 3 WHEN 'market_shopping' THEN 4
  WHEN 'education_school' THEN 5 WHEN 'conversations' THEN 6 WHEN 'common_verbs' THEN 7 WHEN 'prophetic_duas' THEN 8
  WHEN 'body_health' THEN 9 WHEN 'city_directions' THEN 10 WHEN 'travel_transport' THEN 11 WHEN 'work_profession' THEN 12
  WHEN 'worship_ritual' THEN 13 WHEN 'hadith_daily' THEN 14 WHEN 'quran_frequent' THEN 15 WHEN 'idioms' THEN 16
  WHEN 'moral_stories' THEN 17 WHEN 'companion_stories' THEN 18 WHEN 'early_stories' THEN 19 END;
