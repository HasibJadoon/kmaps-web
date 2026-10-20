-- The personal dashboard (owner, 2026-10-21): weight toward a goal, one meal a day, exercise, the five prayers.
-- Private to its owner: every row carries owner_ref and every read is the signed-in reader's own. Meals, weights and
-- exercise are written by Claude from what the owner sends (a photo of the meal, the scale, the session) —
-- kmaps-resources scripts/body/log.py; the prayers are also ticked in the app (POST /core/body/prayer).
-- Meal photos live in R2 km-personal under body/<owner>/<meal id>.<ext>, served signed (GET /core/body/img/…).

CREATE TABLE IF NOT EXISTS core_body_profile (
  owner_ref        TEXT PRIMARY KEY,
  start_kg         REAL NOT NULL,
  start_date       TEXT NOT NULL,                 -- YYYY-MM-DD
  goal_kg          REAL NOT NULL,
  target_date      TEXT NOT NULL,                 -- YYYY-MM-DD
  plan             TEXT NOT NULL DEFAULT 'omad',  -- one meal a day
  kcal_target      INTEGER,                       -- the one meal's calories (set with the owner)
  protein_g_target INTEGER,
  height_cm        REAL,
  tz               TEXT NOT NULL DEFAULT 'Australia/Sydney',
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS core_body_weight (
  owner_ref  TEXT NOT NULL,
  on_date    TEXT NOT NULL,                       -- YYYY-MM-DD, the owner's day
  kg         REAL NOT NULL,
  note       TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (owner_ref, on_date)
);

CREATE TABLE IF NOT EXISTS core_body_meal (
  id         TEXT PRIMARY KEY,
  owner_ref  TEXT NOT NULL,
  eaten_at   TEXT NOT NULL,                       -- ISO, UTC
  on_date    TEXT NOT NULL,                       -- the owner's day
  title      TEXT NOT NULL,
  items_json TEXT,                                -- [{name, kcal, grams?}] as estimated from the photo
  kcal       INTEGER NOT NULL,
  protein_g  REAL, carbs_g REAL, fat_g REAL, fibre_g REAL,
  image_key  TEXT,                                -- R2 km-personal key
  note       TEXT,                                -- Claude's short read of the plate
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_core_body_meal_owner ON core_body_meal (owner_ref, on_date);

CREATE TABLE IF NOT EXISTS core_body_exercise (
  id         TEXT PRIMARY KEY,
  owner_ref  TEXT NOT NULL,
  on_date    TEXT NOT NULL,
  kind       TEXT NOT NULL,                       -- walk, gym, swim, cycle, … (core_app_label scope body_exercise)
  title      TEXT,
  minutes    INTEGER NOT NULL,
  kcal       INTEGER,                             -- burned, estimated
  steps      INTEGER,
  note       TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_core_body_exercise_owner ON core_body_exercise (owner_ref, on_date);

CREATE TABLE IF NOT EXISTS core_body_prayer (
  owner_ref  TEXT NOT NULL,
  on_date    TEXT NOT NULL,
  prayer     TEXT NOT NULL CHECK (prayer IN ('fajr', 'dhuhr', 'asr', 'maghrib', 'isha')),
  prayed_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (owner_ref, on_date, prayer)
);

-- the dashboard's words: sections, the five prayers, exercise kinds, the menu entry
INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('body_ui', 'menu',     NULL, 'Dashboard',          'لوحتي',        'Weight, meals, exercise and prayers',          'gauge.with.dots.needle.67percent', '#E8B04B', NULL, 1),
('body_ui', 'title',    NULL, 'My Dashboard',       'لوحتي',        'One meal a day, toward the goal',              'gauge.with.dots.needle.67percent', '#E8B04B', NULL, 2),
('body_ui', 'weight',   NULL, 'Weight',             'الوزن',        'Toward the goal',                              'scalemass.fill',                   '#E8B04B', NULL, 3),
('body_ui', 'meal',     NULL, 'Today''s meal',      'وجبة اليوم',   'One meal a day',                               'fork.knife',                       '#81B29A', NULL, 4),
('body_ui', 'fast',     NULL, 'Fasting',            'الصيام',       'Since the last meal',                          'hourglass',                        '#5DA9E9', NULL, 5),
('body_ui', 'week',     NULL, 'This week',          'هذا الأسبوع',  'Calories in each day''s meal',                 'chart.bar.fill',                   '#E07A5F', NULL, 6),
('body_ui', 'exercise', NULL, 'Exercise',           'الرياضة',      'Moved today',                                  'figure.run',                       '#F2CC8F', NULL, 7),
('body_ui', 'prayers',  NULL, 'Prayers',            'الصلوات',      'The five daily prayers',                       'moon.stars.fill',                  '#9C89B8', NULL, 8),
('body_ui', 'gallery',  NULL, 'Meals',              'الوجبات',      'Every plate, as sent',                         'photo.stack.fill',                 '#81B29A', NULL, 9),
('body_ui', 'pace',     NULL, 'Pace',               'الوتيرة',      'Needed against actual, kg a week',             'speedometer',                      '#E07A5F', NULL, 10),
('body_prayer', 'fajr',    NULL, 'Fajr',    'الفجر',  'Dawn',      'sunrise.fill',    '#5DA9E9', NULL, 1),
('body_prayer', 'dhuhr',   NULL, 'Dhuhr',   'الظهر',  'Midday',    'sun.max.fill',    '#F2CC8F', NULL, 2),
('body_prayer', 'asr',     NULL, 'Asr',     'العصر',  'Afternoon', 'sun.haze.fill',   '#E8B04B', NULL, 3),
('body_prayer', 'maghrib', NULL, 'Maghrib', 'المغرب', 'Sunset',    'sunset.fill',     '#E07A5F', NULL, 4),
('body_prayer', 'isha',    NULL, 'Isha',    'العشاء', 'Night',     'moon.stars.fill', '#9C89B8', NULL, 5),
('body_exercise', 'walk',    NULL, 'Walk',     'مشي',      NULL, 'figure.walk',              '#81B29A', NULL, 1),
('body_exercise', 'run',     NULL, 'Run',      'جري',      NULL, 'figure.run',               '#E07A5F', NULL, 2),
('body_exercise', 'gym',     NULL, 'Gym',      'نادٍ',      NULL, 'dumbbell.fill',            '#E8B04B', NULL, 3),
('body_exercise', 'cycle',   NULL, 'Cycle',    'دراجة',    NULL, 'figure.outdoor.cycle',     '#5DA9E9', NULL, 4),
('body_exercise', 'swim',    NULL, 'Swim',     'سباحة',    NULL, 'figure.pool.swim',         '#5DA9E9', NULL, 5),
('body_exercise', 'other',   NULL, 'Exercise', 'رياضة',    NULL, 'figure.mixed.cardio',      '#F2CC8F', NULL, 6);
