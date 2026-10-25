-- A shelf's categories (owner, 2026-10-25: the Arabic Reading shelf grouped by category). A note joins one through
-- meta_json.category; the shelf lists its notes under these headings, in this order.
CREATE TABLE IF NOT EXISTS cm_note_group (
  domain_key TEXT NOT NULL,
  group_key  TEXT NOT NULL,
  title      TEXT NOT NULL,
  title_ar   TEXT,
  icon       TEXT,
  accent     TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (domain_key, group_key)
);
INSERT OR REPLACE INTO cm_note_group (domain_key, group_key, title, title_ar, icon, accent, sort_order) VALUES
  ('arabic', 'moral_stories', 'Moral Stories', 'قِصَصٌ وَعِبَرٌ', 'sparkles', '#E8C96A', 1),
  ('arabic', 'home_family', 'Home & Family', 'الْبَيْتُ وَالْأُسْرَةُ', 'house', '#D9BC8C', 2),
  ('arabic', 'education_school', 'School', 'الْمَدْرَسَةُ', 'graduationcap', '#7EAAB0', 3),
  ('arabic', 'work_profession', 'Work', 'الْعَمَلُ', 'briefcase', '#9DB89A', 4),
  ('arabic', 'market_shopping', 'Market', 'السُّوقُ', 'cart', '#C8643F', 5),
  ('arabic', 'travel_transport', 'Travel & Airport', 'السَّفَرُ وَالْمَطَارُ', 'airplane', '#8A88B4', 6),
  ('arabic', 'body_health', 'Health', 'الصِّحَّةُ', 'heart', '#B49AA6', 7),
  ('arabic', 'worship_ritual', 'Mosque & Worship', 'الْمَسْجِدُ وَالْعِبَادَةُ', 'moon.stars', '#4BA8A4', 8),
  ('arabic', 'daily_life', 'Daily Life', 'الْحَيَاةُ الْيَوْمِيَّةُ', 'sun.max', '#D9BC8C', 9);
UPDATE cm_notes SET meta_json = json_set(COALESCE(meta_json, '{}'), '$.category', 'moral_stories'),
  tags_json = '["reading","moral_stories"]' WHERE note_id = 'NOTE:AR:reading:honesty-saves';
UPDATE cm_notes SET meta_json = json_set(COALESCE(meta_json, '{}'), '$.category', 'worship_ritual'),
  tags_json = '["reading","worship_ritual"]' WHERE note_id = 'NOTE:AR:reading:friday';
