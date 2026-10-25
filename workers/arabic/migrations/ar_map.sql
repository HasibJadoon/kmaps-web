-- An atlas of maps across the eras (owner, 2026-10-25): early society, the classical city, the modern town, the village;
-- a map can hold sub-maps (parent_id). Places stand on one map, in a district, at x, y.
CREATE TABLE IF NOT EXISTS ar_map (
  id TEXT PRIMARY KEY, parent_id TEXT REFERENCES ar_map(id), slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, title_ar TEXT,
  era TEXT NOT NULL CHECK (era IN ('early','classical','msa')), blurb TEXT, image_key TEXT, w REAL NOT NULL DEFAULT 1000,
  h REAL NOT NULL DEFAULT 1100, sort_order INTEGER NOT NULL DEFAULT 0, districts_json TEXT NOT NULL DEFAULT '[]');
ALTER TABLE ar_curriculum_domain ADD COLUMN map_id TEXT REFERENCES ar_map(id);
INSERT OR REPLACE INTO ar_map (id,parent_id,slug,title,title_ar,era,blurb,image_key,w,h,sort_order,districts_json) VALUES ('MAP:modern-town',NULL,'modern-town','The Modern Town','الْمَدِينَةُ الْحَدِيثَةُ','msa','Everyday life in Modern Standard Arabic: home, school, market, work, health, the masjid','reading/places/town-modern.jpg',1000,1100,1,'[{"key": "home", "title": "Home Street", "titleAr": "شَارِعُ الْبَيْتِ", "x": 0.26, "y": 0.05}, {"key": "centre", "title": "Town Centre", "titleAr": "وَسَطُ الْبَلَدِ", "x": 0.74, "y": 0.05}, {"key": "health", "title": "Health Corner", "titleAr": "حَيُّ الصِّحَّةِ", "x": 0.76, "y": 0.4}, {"key": "mosque", "title": "Masjid Square", "titleAr": "سَاحَةُ الْمَسْجِدِ", "x": 0.32, "y": 0.42}, {"key": "garden", "title": "The Language Garden", "titleAr": "حَدِيقَةُ اللُّغَةِ", "x": 0.3, "y": 0.78}]');
INSERT OR REPLACE INTO ar_map (id,parent_id,slug,title,title_ar,era,blurb,image_key,w,h,sort_order,districts_json) VALUES ('MAP:early-arabia',NULL,'early-arabia','Early Society','الْمُجْتَمَعُ الْأَوَّلُ','early','Arabia in the Prophet’s time: Makkah, Madinah, the caravan roads, the tribes and their stories','reading/places/town-early.jpg',1000,1100,2,'[{"key": "makkah", "title": "Makkah", "titleAr": "مَكَّةُ", "x": 0.25, "y": 0.08}, {"key": "madinah", "title": "Madinah", "titleAr": "الْمَدِينَةُ", "x": 0.72, "y": 0.08}, {"key": "roads", "title": "The Caravan Roads", "titleAr": "طُرُقُ الْقَوَافِلِ", "x": 0.5, "y": 0.46}, {"key": "stories", "title": "The Story Tents", "titleAr": "خِيَامُ الْقِصَصِ", "x": 0.3, "y": 0.78}]');
INSERT OR REPLACE INTO ar_map (id,parent_id,slug,title,title_ar,era,blurb,image_key,w,h,sort_order,districts_json) VALUES ('MAP:classical-city',NULL,'classical-city','The Classical City','الْمَدِينَةُ الْكِلَاسِيكِيَّةُ','classical','Baghdad and al-Andalus: libraries, markets, scholars and the language of the classics','reading/places/town-classical.jpg',1000,1100,3,'[]');
INSERT OR REPLACE INTO ar_map (id,parent_id,slug,title,title_ar,era,blurb,image_key,w,h,sort_order,districts_json) VALUES ('MAP:village',NULL,'village','The Village','الْقَرْيَةُ','msa','Farm, well, flock and harvest: the countryside in plain fuṣḥā','reading/places/town-village.jpg',1000,1100,4,'[]');
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='home', map_x=0.12, map_y=0.12 WHERE slug='morning_routine';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='home', map_x=0.3, map_y=0.14 WHERE slug='home_family';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='home', map_x=0.12, map_y=0.24 WHERE slug='food_drink';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='home', map_x=0.3, map_y=0.27 WHERE slug='children_upbringing';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='home', map_x=0.44, map_y=0.2 WHERE slug='neighbours';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='home', map_x=0.16, map_y=0.36 WHERE slug='evening_routine';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='home', map_x=0.34, map_y=0.38 WHERE slug='night_routine';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='centre', map_x=0.58, map_y=0.12 WHERE slug='education_school';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='centre', map_x=0.74, map_y=0.19 WHERE slug='market_shopping';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='centre', map_x=0.89, map_y=0.12 WHERE slug='work_profession';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='centre', map_x=0.6, map_y=0.3 WHERE slug='government_office';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='centre', map_x=0.77, map_y=0.33 WHERE slug='city_directions';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='centre', map_x=0.91, map_y=0.27 WHERE slug='travel_transport';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='health', map_x=0.62, map_y=0.49 WHERE slug='human_body';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='health', map_x=0.79, map_y=0.5 WHERE slug='body_health';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='health', map_x=0.68, map_y=0.61 WHERE slug='pharmacy';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='health', map_x=0.88, map_y=0.6 WHERE slug='hospital';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='mosque', map_x=0.42, map_y=0.54 WHERE slug='worship_ritual';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='mosque', map_x=0.26, map_y=0.51 WHERE slug='prophetic_duas';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='mosque', map_x=0.48, map_y=0.66 WHERE slug='hadith_daily';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='mosque', map_x=0.32, map_y=0.64 WHERE slug='quran_frequent';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='mosque', map_x=0.14, map_y=0.6 WHERE slug='weekend_friday';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='mosque', map_x=0.12, map_y=0.71 WHERE slug='ramadan_eid';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='mosque', map_x=0.26, map_y=0.76 WHERE slug='weather_seasons';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='garden', map_x=0.12, map_y=0.86 WHERE slug='conversations';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='garden', map_x=0.3, map_y=0.9 WHERE slug='common_verbs';
UPDATE ar_curriculum_domain SET map_id='MAP:modern-town', district='garden', map_x=0.48, map_y=0.88 WHERE slug='idioms';
UPDATE ar_curriculum_domain SET map_id='MAP:early-arabia', district='makkah', map_x=0.25, map_y=0.2 WHERE slug='makkah_ancient';
UPDATE ar_curriculum_domain SET map_id='MAP:early-arabia', district='madinah', map_x=0.72, map_y=0.2 WHERE slug='ancient_town';
UPDATE ar_curriculum_domain SET map_id='MAP:early-arabia', district='makkah', map_x=0.12, map_y=0.34 WHERE slug='taif';
UPDATE ar_curriculum_domain SET map_id='MAP:early-arabia', district='madinah', map_x=0.88, map_y=0.32 WHERE slug='khaybar';
UPDATE ar_curriculum_domain SET map_id='MAP:early-arabia', district='roads', map_x=0.3, map_y=0.52 WHERE slug='najran';
UPDATE ar_curriculum_domain SET map_id='MAP:early-arabia', district='roads', map_x=0.66, map_y=0.54 WHERE slug='tribes';
UPDATE ar_curriculum_domain SET map_id='MAP:early-arabia', district='stories', map_x=0.16, map_y=0.86 WHERE slug='moral_stories';
UPDATE ar_curriculum_domain SET map_id='MAP:early-arabia', district='stories', map_x=0.42, map_y=0.88 WHERE slug='companion_stories';
UPDATE ar_curriculum_domain SET map_id='MAP:early-arabia', district='stories', map_x=0.68, map_y=0.86 WHERE slug='early_stories';
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE family='content';
