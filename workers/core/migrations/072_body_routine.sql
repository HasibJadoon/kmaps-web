-- The dashboard's daily routine and steps (owner, 2026-10-21: "basic exercises, 10 sets of 10, good for an average
-- person, animated, checked online so I can follow — YouTube — daily, must do, at home or a park"; "steps daily in the
-- app"). Ten low-impact moves for a heavy beginner: nothing that jumps, every one possible beside a wall, a chair or a
-- park bench. Each has a form cue and a follow-along video; the whole set also has one (the beginner full-body video).
-- Steps come from the iPhone's own pedometer (Core Motion) and are posted here each day (POST /core/body/steps).

CREATE TABLE IF NOT EXISTS core_body_routine_item (
  key        TEXT PRIMARY KEY,
  seq        INTEGER NOT NULL,
  name       TEXT NOT NULL,
  reps       INTEGER NOT NULL DEFAULT 10,
  unit       TEXT NOT NULL DEFAULT 'reps',     -- reps | each side | breaths
  icon       TEXT NOT NULL,                    -- an SF Symbol figure, animated in the app
  tone       TEXT,                             -- plum sand sage teal mauve rust
  cue        TEXT NOT NULL,                    -- one line of form
  easier     TEXT,                             -- the easier way, for a heavy day
  place      TEXT NOT NULL DEFAULT 'home or park',
  video_url  TEXT,
  live       INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS core_body_routine_done (
  owner_ref  TEXT NOT NULL,
  on_date    TEXT NOT NULL,
  item_key   TEXT NOT NULL,
  done_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (owner_ref, on_date, item_key)
);

CREATE TABLE IF NOT EXISTS core_body_steps (
  owner_ref  TEXT NOT NULL,
  on_date    TEXT NOT NULL,
  steps      INTEGER NOT NULL,
  km         REAL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (owner_ref, on_date)
);

ALTER TABLE core_body_profile ADD COLUMN steps_target INTEGER DEFAULT 8000;

INSERT OR REPLACE INTO core_body_routine_item (key, seq, name, reps, unit, icon, tone, cue, easier, place, video_url) VALUES
('march',     1, 'March in place',     10, 'each side', 'figure.walk.motion',                 'sage',  'Lift each knee to hip height, swing the arms, stand tall.', 'Hold a wall or chair back for balance.', 'home or park', 'https://www.youtube.com/watch?v=Iccv7TpkDks'),
('wallpush',  2, 'Wall push-up',       10, 'reps',      'figure.strengthtraining.functional', 'sand',  'Hands on the wall at chest height, body straight, chest to the wall and back.', 'Stand closer to the wall.', 'home or park', 'https://www.youtube.com/watch?v=HHnpgHNkLcE'),
('sitstand',  3, 'Sit to stand',       10, 'reps',      'figure.cross.training',              'teal',  'From a sturdy chair or bench, stand up with the legs, sit back down slowly.', 'Use your hands on your knees to help.', 'home or park', 'https://www.nhs.uk/live-well/exercise/strength-and-flexibility-exercises/strength-exercises/'),
('bridge',    4, 'Glute bridge',       10, 'reps',      'figure.core.training',               'plum',  'On your back, knees bent, press through the heels and lift the hips; hold one second.', 'Smaller lift, slower lowering.', 'home', 'https://www.youtube.com/watch?v=iwHvjHh59f8'),
('birddog',   5, 'Bird dog',           10, 'each side', 'figure.mind.and.body',               'mauve', 'On hands and knees, reach one arm and the opposite leg long; keep the back flat.', 'Move only the leg, or only the arm.', 'home', 'https://www.youtube.com/watch?v=oV1_T-5ksj8'),
('deadbug',   6, 'Dead bug',           10, 'each side', 'figure.pilates',                     'rust',  'On your back, arms up, lower the opposite arm and leg slowly; low back stays down.', 'Lower only the legs, heels tapping the floor.', 'home', 'https://www.youtube.com/watch?v=XcYtWYMz39w'),
('kneeraise', 7, 'Standing knee raise', 10, 'each side', 'figure.highintensity.intervaltraining', 'sage', 'Stand tall, bring one knee up toward the chest, lower with control.', 'Hold a wall or tree.', 'home or park', 'https://www.youtube.com/watch?v=Iccv7TpkDks'),
('stepup',    8, 'Step-up',            10, 'each side', 'figure.step.training',               'sand',  'Step up onto a stair or low bench with the whole foot, stand tall, step down.', 'Use the lowest step and a rail.', 'park', 'https://www.youtube.com/watch?v=eYIUPRMm13A'),
('calfraise', 9, 'Calf raise',         10, 'reps',      'figure.stairs',                      'teal',  'Hands on a wall, rise onto the toes, pause, lower slowly.', 'Both hands on the wall, small rise.', 'home or park', 'https://www.youtube.com/results?search_query=calf+raises+beginner+form'),
('plank',    10, 'Incline plank',      10, 'breaths',   'figure.cooldown',                    'plum',  'Hands on a bench or table, body in one line, breathe slowly ten times.', 'Hands on a wall instead of a bench.', 'home or park', 'https://www.youtube.com/results?search_query=incline+plank+beginner');

-- the whole set, followed along in one video; the routine's and steps' words
INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('body_ui', 'routine', NULL, 'Daily routine', 'التمرين اليومي', 'Ten moves, ten each — home or park', 'figure.strengthtraining.functional', '#E07A5F',
 '{"video_url":"https://m.youtube.com/watch?v=ZidP_sFbaqQ","video_label":"Follow the full beginner routine"}', 11),
('body_ui', 'steps',   NULL, 'Steps',         'الخطوات',        'From Apple Health',              'shoeprints.fill',                    '#81B29A', NULL, 12);
