-- The prayers as a tool to get better at them (owner, 2026-10-21: "Prayer click start end and khushooh so I can get
-- better with salah, how many rakat, and also Ishraq, Tahajjud"; "Once logged cannot undo"; "If missed, made [up] or
-- not"; "Friday also"; "proper animation and checked all prayed").
--
--  * core_body_prayer is rebuilt (SQLite cannot alter a CHECK): Friday (jumuah), Ishraq and Tahajjud join the five;
--    each row is a session — started_at, ended_at, minutes, rakʿāt (total and by part), khushūʿ 1–5, reflection tags,
--    a note — and a status: on_time, or qada (made up after its time). prayed_at is NULL while a session runs and set
--    once it is logged; a logged row is final (routes/body-prayer.ts refuses to change or delete it). on_date is the
--    prayer day, which rolls over at Fajr, not at midnight (Isha at 1 am and Tahajjud at 4 am belong to the night
--    before). The owner's earlier ticks are kept as on_time.
--  * core_body_prayer_times: the day's sun times the app works out from the location (PrayerTimesCalculator), so the
--    worker can decide each prayer's window, what is open, what is missed. Past days are never rewritten.
--  * core_body_friday_done: the Friday sunnahs ticked for the day.
--  * Words: each prayer's rakʿāt plan as commonly prayed in the Ḥanafī school (as in Pakistan), its window, the kinds
--    of rakʿāt, the khushūʿ scale and reflection tags, the Friday checklist, the screen's words. Plain English, Arabic
--    terms in Arabic script.

CREATE TABLE core_body_prayer_new (
  owner_ref  TEXT NOT NULL,
  on_date    TEXT NOT NULL,
  prayer     TEXT NOT NULL CHECK (prayer IN ('fajr', 'dhuhr', 'jumuah', 'asr', 'maghrib', 'isha', 'ishraq', 'tahajjud')),
  status     TEXT NOT NULL DEFAULT 'on_time' CHECK (status IN ('on_time', 'qada')),
  started_at TEXT,
  ended_at   TEXT,
  minutes    REAL,
  rakat      INTEGER,
  rakat_json TEXT,
  khushu     INTEGER CHECK (khushu IS NULL OR khushu BETWEEN 1 AND 5),
  tags_json  TEXT,
  note       TEXT,
  prayed_at  TEXT,
  PRIMARY KEY (owner_ref, on_date, prayer)
);
INSERT INTO core_body_prayer_new (owner_ref, on_date, prayer, status, prayed_at)
  SELECT owner_ref, on_date, prayer, 'on_time', prayed_at FROM core_body_prayer;
DROP TABLE core_body_prayer;
ALTER TABLE core_body_prayer_new RENAME TO core_body_prayer;

CREATE TABLE IF NOT EXISTS core_body_prayer_times (
  owner_ref  TEXT NOT NULL,
  on_date    TEXT NOT NULL,
  times_json TEXT NOT NULL,          -- {"fajr","sunrise","dhuhr","asr","maghrib","isha"}: ISO instants
  place      TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (owner_ref, on_date)
);

CREATE TABLE IF NOT EXISTS core_body_friday_done (
  owner_ref TEXT NOT NULL,
  on_date   TEXT NOT NULL,
  item_key  TEXT NOT NULL,
  done_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (owner_ref, on_date, item_key)
);

-- ── the prayers: words, rakʿāt plan (Ḥanafī), window ──
-- parts: key, label, count, kind (body_prayer_part), optional (not part of the usual count), min/max (nafl),
--        qada (prayed when it is made up). window: from/to are fajr sunrise dhuhr asr maghrib isha fajr_next last_third,
--        with minutes added (from_min, to_min).
INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('body_prayer', 'fajr', NULL, 'Fajr', 'الفجر', 'Dawn', 'sunrise.fill', '#5DA9E9',
 '{"kind":"fard","tone":"teal","madhhab":"hanafi","window":{"from":"fajr","to":"sunrise"},"parts":[
   {"key":"sunnah_before","label":"Sunnah before","count":2,"kind":"sunnah_muakkada"},
   {"key":"fard","label":"Obligatory","count":2,"kind":"fard","qada":true}]}', 1),
('body_prayer', 'dhuhr', NULL, 'Dhuhr', 'الظهر', 'Midday', 'sun.max.fill', '#F2CC8F',
 '{"kind":"fard","tone":"sand","madhhab":"hanafi","window":{"from":"dhuhr","to":"asr"},"parts":[
   {"key":"sunnah_before","label":"Sunnah before","count":4,"kind":"sunnah_muakkada"},
   {"key":"fard","label":"Obligatory","count":4,"kind":"fard","qada":true},
   {"key":"sunnah_after","label":"Sunnah after","count":2,"kind":"sunnah_muakkada"}]}', 2),
('body_prayer', 'jumuah', NULL, 'Friday', 'الجمعة', 'In place of Dhuhr on Fridays', 'building.columns.fill', '#E8B04B',
 '{"kind":"fard","tone":"gold","madhhab":"hanafi","slot":"dhuhr","qada_as":"dhuhr","qada_note":"A missed Friday prayer is made up as Dhuhr: 4 obligatory",
   "window":{"from":"dhuhr","to":"asr"},"parts":[
   {"key":"sunnah_before","label":"Sunnah before","count":4,"kind":"sunnah_muakkada"},
   {"key":"fard","label":"Obligatory, after the sermon","count":2,"kind":"fard"},
   {"key":"sunnah_after","label":"Sunnah after","count":4,"kind":"sunnah_muakkada"},
   {"key":"sunnah_after2","label":"Sunnah after, then","count":2,"kind":"sunnah_muakkada"}]}', 3),
('body_prayer', 'asr', NULL, 'Asr', 'العصر', 'Afternoon', 'sun.haze.fill', '#E8B04B',
 '{"kind":"fard","tone":"mauve","madhhab":"hanafi","window":{"from":"asr","to":"maghrib"},"parts":[
   {"key":"sunnah_before","label":"Sunnah before","count":4,"kind":"sunnah_ghayr","optional":true},
   {"key":"fard","label":"Obligatory","count":4,"kind":"fard","qada":true}]}', 4),
('body_prayer', 'maghrib', NULL, 'Maghrib', 'المغرب', 'Sunset', 'sunset.fill', '#E07A5F',
 '{"kind":"fard","tone":"rust","madhhab":"hanafi","window":{"from":"maghrib","to":"isha"},"parts":[
   {"key":"fard","label":"Obligatory","count":3,"kind":"fard","qada":true},
   {"key":"sunnah_after","label":"Sunnah after","count":2,"kind":"sunnah_muakkada"}]}', 5),
('body_prayer', 'isha', NULL, 'Isha', 'العشاء', 'Night', 'moon.stars.fill', '#9C89B8',
 '{"kind":"fard","tone":"plum","madhhab":"hanafi","window":{"from":"isha","to":"fajr_next"},"parts":[
   {"key":"sunnah_before","label":"Sunnah before","count":4,"kind":"sunnah_ghayr","optional":true},
   {"key":"fard","label":"Obligatory","count":4,"kind":"fard","qada":true},
   {"key":"sunnah_after","label":"Sunnah after","count":2,"kind":"sunnah_muakkada"},
   {"key":"witr","label":"وتر","count":3,"kind":"witr","qada":true}]}', 6),
('body_prayer', 'ishraq', NULL, 'Ishraq', 'إشراق', 'After sunrise, until late morning', 'sun.horizon.fill', '#F2CC8F',
 '{"kind":"nafl","tone":"sand","madhhab":"hanafi","window":{"from":"sunrise","from_min":20,"to":"dhuhr","to_min":-30},"parts":[
   {"key":"nafl","label":"Voluntary","count":2,"min":2,"max":4,"kind":"nafl"}]}', 7),
('body_prayer', 'tahajjud', NULL, 'Tahajjud', 'تهجد', 'The last third of the night', 'moon.zzz.fill', '#9C89B8',
 '{"kind":"nafl","tone":"plum","madhhab":"hanafi","window":{"from":"last_third","to":"fajr_next"},"parts":[
   {"key":"nafl","label":"Voluntary","count":8,"min":2,"max":12,"kind":"nafl"}]}', 8);

-- the kinds of rakʿāt (short is the word in the plan line: "2 sunnah · 2 obligatory")
INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('body_prayer_part', 'fard',            NULL, 'Obligatory',       'فرض',           'Must be prayed; made up if missed',            NULL, NULL, '{"short":"obligatory","tone":"gold"}', 1),
('body_prayer_part', 'sunnah_muakkada', NULL, 'Sunnah',           'سنة مؤكدة',     'The Prophet ﷺ kept to it',                     NULL, NULL, '{"short":"sunnah","tone":"sage"}', 2),
('body_prayer_part', 'sunnah_ghayr',    NULL, 'Optional sunnah',  'سنة غير مؤكدة', 'Prayed at times; good, not kept to',           NULL, NULL, '{"short":"optional sunnah","tone":"teal"}', 3),
('body_prayer_part', 'witr',            NULL, 'وتر',              'وتر',           'Necessary (واجب) in the Ḥanafī school; made up if missed', NULL, NULL, '{"short":"وتر","tone":"plum"}', 4),
('body_prayer_part', 'nafl',            NULL, 'Voluntary',        'نفل',           'Extra, for the reward',                         NULL, NULL, '{"short":"voluntary","tone":"mauve"}', 5);

-- the khushūʿ scale and the reflection tags (sign -1: something to work on; tip: the takeaway when it leads)
INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('body_khushu', 'level1', NULL, 'Distracted',        NULL, 'The heart was elsewhere',           'circle.dotted',          NULL, '{"kind":"level","level":1,"tone":"rust"}', 1),
('body_khushu', 'level2', NULL, 'Mostly distracted', NULL, 'A few moments of presence',         'circle.bottomhalf.filled', NULL, '{"kind":"level","level":2,"tone":"sand"}', 2),
('body_khushu', 'level3', NULL, 'Present at times',  NULL, 'Came back, drifted, came back',     'circle.lefthalf.filled', NULL, '{"kind":"level","level":3,"tone":"mauve"}', 3),
('body_khushu', 'level4', NULL, 'Mostly present',    NULL, 'Knew what was being said',          'circle.tophalf.filled',  NULL, '{"kind":"level","level":4,"tone":"teal"}', 4),
('body_khushu', 'level5', NULL, 'Fully present',     NULL, 'Stood before Allah, unhurried',     'circle.fill',            NULL, '{"kind":"level","level":5,"tone":"gold"}', 5),
('body_khushu', 'rushed',       NULL, 'Rushed',                         NULL, NULL, 'hare.fill',                  NULL, '{"kind":"tag","sign":-1,"tone":"rust","tip":"{prayer} is where you rush most — try 2 extra minutes"}', 10),
('body_khushu', 'wandered',     NULL, 'Mind wandered',                  NULL, NULL, 'cloud.fill',                 NULL, '{"kind":"tag","sign":-1,"tone":"sand","tip":"Your mind wanders most at {prayer} — read slower and think on the meaning"}', 11),
('body_khushu', 'phone',        NULL, 'Phone nearby',                   NULL, NULL, 'iphone.gen3',                NULL, '{"kind":"tag","sign":-1,"tone":"mauve","tip":"The phone is nearby most at {prayer} — leave it in another room"}', 12),
('body_khushu', 'understood',   NULL, 'Understood the recitation',      NULL, NULL, 'text.book.closed.fill',      NULL, '{"kind":"tag","sign":1,"tone":"teal"}', 13),
('body_khushu', 'unhurried',    NULL, 'Unhurried ركوع and سجود',        NULL, NULL, 'figure.mind.and.body',       NULL, '{"kind":"tag","sign":1,"tone":"sage"}', 14),
('body_khushu', 'dua_after',    NULL, 'Made دعاء after',                NULL, NULL, 'hands.and.sparkles.fill',    NULL, '{"kind":"tag","sign":1,"tone":"gold"}', 15),
('body_khushu', 'first_time',   NULL, 'Prayed at the start of its time', NULL, NULL, 'clock.badge.checkmark.fill', NULL, '{"kind":"tag","sign":1,"tone":"sage"}', 16),
('body_khushu', 'congregation', NULL, 'At the mosque, in congregation', NULL, NULL, 'person.3.fill',              NULL, '{"kind":"tag","sign":1,"tone":"plum"}', 17),
('body_khushu', 'early',        NULL, 'Arrived early',                  NULL, NULL, 'figure.walk.arrival',        NULL, '{"kind":"tag","sign":1,"tone":"gold","only":["jumuah"]}', 18),
('body_khushu', 'khutbah',      NULL, 'Listened to the خطبة',           NULL, NULL, 'ear.fill',                   NULL, '{"kind":"tag","sign":1,"tone":"teal","only":["jumuah"]}', 19),
('body_khushu', 'kahf',         NULL, 'Read سورة الكهف',                NULL, NULL, 'book.fill',                  NULL, '{"kind":"tag","sign":1,"tone":"sage","only":["jumuah"]}', 20),
('body_khushu', 'salawat',      NULL, 'Sent صلوات on the Prophet ﷺ',    NULL, NULL, 'heart.text.square.fill',     NULL, '{"kind":"tag","sign":1,"tone":"mauve","only":["jumuah"]}', 21);

-- the Friday checklist, ticked for the day
INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('body_friday', 'ghusl',   NULL, 'A full bath before the prayer',            'غسل',           NULL, 'drop.fill',               NULL, '{"tone":"teal"}', 1),
('body_friday', 'kahf',    NULL, 'Read سورة الكهف',                          'سورة الكهف',    NULL, 'book.fill',               NULL, '{"tone":"sage"}', 2),
('body_friday', 'early',   NULL, 'Went early to the mosque',                 'التبكير',       NULL, 'figure.walk.arrival',     NULL, '{"tone":"gold"}', 3),
('body_friday', 'salawat', NULL, 'Sent صلوات on the Prophet ﷺ',              'الصلاة على النبي', NULL, 'heart.text.square.fill', NULL, '{"tone":"mauve"}', 4),
('body_friday', 'dua',     NULL, 'Made دعاء in the last hour before Maghrib', 'ساعة الإجابة',  NULL, 'hands.and.sparkles.fill', NULL, '{"tone":"plum"}', 5);

-- the screen's words. {time} {n} {of} {prayer} {avg} are filled by the worker. reckoning: how the app works out the sun
-- times (method id from PrayerMethod, ʿaṣr school) and the first day judged for missed prayers.
INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('body_prayer_ui', 'reckoning',        NULL, 'Prayer times',            NULL,             'Muslim World League angles; Asr by the Ḥanafī shadow', 'location.fill', NULL, '{"method":"mwl","asr":"hanafi","since":"2026-10-21"}', 1),
('body_prayer_ui', 'fard',             NULL, 'Today''s prayers',        'الصلوات الخمس',   'Tap one to begin',                  'moon.stars.fill',              NULL, '{"tone":"plum"}', 2),
('body_prayer_ui', 'extra',            NULL, 'Extra prayers',           'النوافل',         'Voluntary — never missed, only prayed or not', 'sparkles',         NULL, '{"tone":"sand"}', 3),
('body_prayer_ui', 'owed',             NULL, 'To make up',              'القضاء',          'Missed prayers, oldest first',      'arrow.uturn.backward.circle.fill', NULL, '{"tone":"rust"}', 4),
('body_prayer_ui', 'insights',         NULL, 'Focus',                   'الخشوع',          'The last 30 days',                  'heart.circle.fill',            NULL, '{"tone":"teal"}', 5),
('body_prayer_ui', 'friday',           NULL, 'Friday',                  'يوم الجمعة',      'The day''s sunnahs',                'building.columns.fill',        NULL, '{"tone":"gold"}', 6),
('body_prayer_ui', 'state_not_yet',    NULL, 'Opens {time}',            NULL, NULL, 'clock',                        NULL, '{"tone":"muted"}', 10),
('body_prayer_ui', 'state_open',       NULL, 'Now · until {time}',      NULL, NULL, 'circle.circle',                NULL, '{"tone":"gold"}', 11),
('body_prayer_ui', 'state_in_progress',NULL, 'In prayer since {time}',  NULL, NULL, 'hourglass',                    NULL, '{"tone":"teal"}', 12),
('body_prayer_ui', 'state_on_time',    NULL, 'Prayed on time',          NULL, NULL, 'checkmark.circle.fill',        NULL, '{"tone":"sage"}', 13),
('body_prayer_ui', 'state_qada',       NULL, 'Made up (قضاء)',          NULL, NULL, 'arrow.uturn.backward.circle.fill', NULL, '{"tone":"sand"}', 14),
('body_prayer_ui', 'state_missed',     NULL, 'Missed · its time ended {time}', NULL, NULL, 'exclamationmark.circle.fill', NULL, '{"tone":"rust"}', 15),
('body_prayer_ui', 'state_passed',     NULL, 'Not prayed today',        NULL, NULL, 'circle.dashed',                NULL, '{"tone":"muted"}', 16),
('body_prayer_ui', 'state_prayed',     NULL, 'Prayed',                  NULL, NULL, 'checkmark.circle.fill',        NULL, '{"tone":"sage"}', 17),
('body_prayer_ui', 'start',            NULL, 'Start',                   NULL, 'The timer runs quietly while you pray', 'play.fill', NULL, NULL, 20),
('body_prayer_ui', 'end',              NULL, 'End',                     NULL, NULL, 'stop.fill',                    NULL, NULL, 21),
('body_prayer_ui', 'quick',            NULL, 'Prayed — no details',     NULL, NULL, 'checkmark',                    NULL, NULL, 22),
('body_prayer_ui', 'cancel',           NULL, 'Cancel — not logged',     NULL, NULL, 'xmark',                        NULL, NULL, 23),
('body_prayer_ui', 'save',             NULL, 'Save — final once saved', NULL, NULL, 'lock.fill',                    NULL, NULL, 24),
('body_prayer_ui', 'make_up',          NULL, 'Make up now (قضاء)',      NULL, 'Only the obligatory, and وتر for Isha', 'arrow.uturn.backward', NULL, '{"tone":"sand"}', 25),
('body_prayer_ui', 'not_made_up',      NULL, 'Not made up yet',         NULL, 'It stays in the list until it is', 'tray.full.fill', NULL, '{"tone":"muted"}', 26),
('body_prayer_ui', 'locked',           NULL, 'Logged — final',          NULL, 'A logged prayer cannot be changed', 'lock.fill', NULL, '{"tone":"muted"}', 27),
('body_prayer_ui', 'running',          NULL, 'Take your time',          NULL, 'The screen stays awake', 'leaf.fill', NULL, '{"tone":"teal"}', 28),
('body_prayer_ui', 'reflect',          NULL, 'How was it?',             NULL, NULL, 'heart.text.square',            NULL, NULL, 29),
('body_prayer_ui', 'rakat',            NULL, 'Units prayed',           'ركعات',  NULL, 'square.stack.fill',      NULL, NULL, 30),
('body_prayer_ui', 'rakat_unit',       NULL, 'ركعات',                   NULL, NULL, NULL,                           NULL, NULL, 31),
('body_prayer_ui', 'khushu',           NULL, 'Focus',                   'خشوع',   'How present was the heart?', 'heart.fill', NULL, NULL, 32),
('body_prayer_ui', 'tags',             NULL, 'What was it like?',       NULL, NULL, 'tag.fill',                     NULL, NULL, 33),
('body_prayer_ui', 'note',             NULL, 'A note (optional)',       NULL, NULL, 'square.and.pencil',            NULL, NULL, 34),
('body_prayer_ui', 'of_five',          NULL, '{n} of 5 today',          NULL, NULL, NULL,                           NULL, NULL, 40),
('body_prayer_ui', 'streak',           NULL, '{n} full days',           NULL, 'Days with all five on time', 'flame.fill', NULL, '{"tone":"rust"}', 41),
('body_prayer_ui', 'owed_count',       NULL, '{n} to make up',          NULL, NULL, 'arrow.uturn.backward.circle.fill', NULL, '{"tone":"rust"}', 42),
('body_prayer_ui', 'complete',         NULL, 'All five prayed today',   'الحمد لله', 'All on time', 'moon.stars.fill', NULL, '{"tone":"gold"}', 43),
('body_prayer_ui', 'complete_soft',    NULL, 'All five prayed today',   'الحمد لله', 'Some were made up (قضاء) — tomorrow, all on time', 'moon.fill', NULL, '{"tone":"sand"}', 44),
('body_prayer_ui', 'takeaway_low',     NULL, '{prayer} has your lowest focus ({avg} of 5) — slow down there first', NULL, NULL, 'lightbulb.fill', NULL, NULL, 50),
('body_prayer_ui', 'takeaway_good',    NULL, 'Your focus is steady across the five — keep it', NULL, NULL, 'lightbulb.fill', NULL, NULL, 51),
('body_prayer_ui', 'takeaway_none',    NULL, 'Log a few prayers with their focus to see your pattern', NULL, NULL, 'lightbulb', NULL, NULL, 52),
('body_prayer_ui', 'avg_focus',        NULL, 'Average focus, by prayer', NULL, NULL, 'chart.bar.fill',              NULL, NULL, 53),
('body_prayer_ui', 'avg_minutes',      NULL, 'Minutes',                 NULL, NULL, 'timer',                        NULL, NULL, 54),
('body_prayer_ui', 'trend',            NULL, 'Focus, day by day',       NULL, NULL, 'chart.xyaxis.line',            NULL, NULL, 55),
('body_prayer_ui', 'on_time',          NULL, 'On time',                 NULL, NULL, 'checkmark.circle.fill',        NULL, '{"tone":"sage"}', 56),
('body_prayer_ui', 'missed',           NULL, 'Missed',                  NULL, NULL, 'exclamationmark.circle.fill',  NULL, '{"tone":"rust"}', 57),
('body_prayer_ui', 'made_up',          NULL, 'Made up',                 NULL, NULL, 'arrow.uturn.backward.circle.fill', NULL, '{"tone":"sand"}', 58),
('body_prayer_ui', 'nafl_7',           NULL, 'Extra prayers, last 7 days', NULL, NULL, 'sparkles',                  NULL, NULL, 59),
('body_prayer_ui', 'fridays',          NULL, 'Friday prayer: {n} of the last {of}', NULL, 'Fridays prayed at the mosque', 'building.columns.fill', NULL, '{"tone":"gold"}', 60),
('body_prayer_ui', 'fridays_none',     NULL, 'Your Fridays will show here', NULL, NULL, 'building.columns',         NULL, '{"tone":"gold"}', 61),
('body_prayer_ui', 'top_tags',         NULL, 'What comes up most',      NULL, NULL, 'tag.fill',                     NULL, NULL, 62);
