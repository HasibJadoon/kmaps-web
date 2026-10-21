-- The CHILD mode of the dashboard (owner, 2026-10-21: "Setup arham dashboard" — his son Arham, 10). A child's day is
-- moving, eating well and praying; nothing about weight or calories. Safety first:
--  * no weight, no BMI, no calorie numbers, no one-meal-a-day or fasting, nothing "burned". routes/body.ts answers a
--    child profile (plan = 'child') with mode "child" and none of those blocks at all.
--  * "My plate": a meal is its photo, its title, its items and the food groups on it (core_body_meal.groups_json:
--    veg fruit protein grains dairy water — the words, icons and gentle nudges are core_app_label body_plate). Never
--    a score, never shaming: what he had today, and one gentle "add a fruit tomorrow".
--  * Move: the WHO / Australian 24-hour movement guidelines for 5–17 year olds — at least 60 minutes of moderate to
--    vigorous activity a day, and muscle- and bone-strengthening activity at least 3 days a week. A kids' set of moves
--    (core_body_routine_item.set_key = 'kids'), separate from the adult twenty; each tick credits its minutes.
--  * Prayers: the five, with the Friday prayer in Dhuhr's place on Fridays — no Ishraq or Tahajjud, no Friday list.
--    Before puberty the prayer is not yet obligatory, so nothing is "missed" and nothing is "to make up": a prayer whose
--    time has gone shows gently as not prayed. Start/end, focus, the streak and "all five prayed" stay.
-- Every switch above is data: core_app_label scope body_mode, key = the profile's plan. The words a child reads come
-- from the *_child scopes, laid over the adult ones key by key. The owner's adult dashboard is unchanged.

-- ── the profile: a child has no weight, no goal and no dates, so those columns become optional ──
-- (SQLite cannot drop NOT NULL: the table is rebuilt and its rows copied)
CREATE TABLE core_body_profile_new (
  owner_ref        TEXT PRIMARY KEY,
  start_kg         REAL,                          -- NULL for a child
  start_date       TEXT,                          -- YYYY-MM-DD; NULL for a child
  goal_kg          REAL,                          -- NULL for a child
  target_date      TEXT,                          -- YYYY-MM-DD; NULL for a child
  plan             TEXT NOT NULL DEFAULT 'omad',  -- 'omad' one meal a day (adult) · 'child' (core_app_label body_mode child)
  kcal_target      INTEGER,
  protein_g_target INTEGER,
  height_cm        REAL,
  tz               TEXT NOT NULL DEFAULT 'Australia/Sydney',
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  steps_target     INTEGER DEFAULT 8000
);
INSERT INTO core_body_profile_new (owner_ref, start_kg, start_date, goal_kg, target_date, plan, kcal_target, protein_g_target,
                                   height_cm, tz, updated_at, steps_target)
  SELECT owner_ref, start_kg, start_date, goal_kg, target_date, plan, kcal_target, protein_g_target, height_cm, tz, updated_at, steps_target
    FROM core_body_profile;
DROP TABLE core_body_profile;
ALTER TABLE core_body_profile_new RENAME TO core_body_profile;

-- Arham Jadoon, 10 — the owner's son. No weight, no calories; 12,000 steps (a common daily guide for children).
INSERT OR REPLACE INTO core_body_profile (owner_ref, plan, tz, steps_target)
  VALUES ('CORE:01M4EW8PGF3G5NRZVWKNXRNCX3', 'child', 'Australia/Sydney', 12000);

-- ── My plate: the food groups on a meal, ["veg","fruit",…] (kmaps-resources scripts/body/log.py --groups) ──
ALTER TABLE core_body_meal ADD COLUMN groups_json TEXT;

-- ── the kids' moves: their own set; each tick credits the move's active minutes ──
ALTER TABLE core_body_routine_item ADD COLUMN set_key TEXT NOT NULL DEFAULT 'adult';
ALTER TABLE core_body_routine_item ADD COLUMN minutes REAL;            -- active minutes a tick credits (NULL: 1.5, the adult rule)

-- poses: kmaps-resources scripts/body/routine_poses.py --kids --sql; videos checked to exist (YouTube oEmbed) — a
-- kids' or children's-hospital demonstration of the move where one was found, none otherwise (the play items).
INSERT OR REPLACE INTO core_body_routine_item (key, seq, set_key, part, name, reps, unit, icon, tone, cue, easier, place, minutes, video_id, video_url, pose_json, live) VALUES
('jumpingjacks', 1, 'kids', 'Jump and hop', 'Jumping jacks', 20, 'jumps', 'figure.mixed.cardio', 'sand', 'Jump your feet wide as your arms go up, then jump them together as your arms come down.', 'Step one foot out at a time instead of jumping.', 'home or park', 2, 'GOhV5lwc17U', 'https://www.youtube.com/watch?v=GOhV5lwc17U',
 '{"view":"front","ms":240,"frames":[{"hip":[0.0,0.515],"torso":180,"ua_n":6,"la_n":4,"ua_f":-6,"la_f":-4,"th_n":2,"sh_n":2,"th_f":-2,"sh_f":-2},{"hip":[0.0,0.575],"torso":180,"ua_n":82,"la_n":92,"ua_f":-82,"la_f":-92,"th_n":8,"sh_n":8,"th_f":-8,"sh_f":-8},{"hip":[0.0,0.498],"torso":180,"ua_n":152,"la_n":166,"ua_f":-152,"la_f":-166,"th_n":15,"sh_n":15,"th_f":-15,"sh_f":-15},{"hip":[0.0,0.575],"torso":180,"ua_n":82,"la_n":92,"ua_f":-82,"la_f":-92,"th_n":8,"sh_n":8,"th_f":-8,"sh_f":-8}],"bones":{"sw":0.085,"hw":0.05}}', 1),
('starjump', 2, 'kids', 'Jump and hop', 'Star jumps', 10, 'jumps', 'star.fill', 'gold', 'Crouch down, then jump up high and spread your arms and legs like a star. Land softly with bent knees.', 'Small jumps, or reach up on your toes.', 'home or park', 2, 'lkYtECQYrWo', 'https://www.youtube.com/watch?v=lkYtECQYrWo',
 '{"view":"front","ms":340,"frames":[{"hip":[0.0,0.483],"torso":180,"ua_n":-12,"la_n":-34,"ua_f":12,"la_f":34,"th_n":28,"sh_n":-10,"th_f":-28,"sh_f":10,"head":180},{"hip":[0.0,0.675],"torso":180,"ua_n":132,"la_n":138,"ua_f":-132,"la_f":-138,"th_n":30,"sh_n":30,"th_f":-30,"sh_f":-30},{"hip":[0.0,0.675],"torso":180,"ua_n":132,"la_n":138,"ua_f":-132,"la_f":-138,"th_n":30,"sh_n":30,"th_f":-30,"sh_f":-30},{"hip":[0.0,0.483],"torso":180,"ua_n":-12,"la_n":-34,"ua_f":12,"la_f":34,"th_n":28,"sh_n":-10,"th_f":-28,"sh_f":10,"head":180},{"hip":[0.0,0.515],"torso":180,"ua_n":6,"la_n":4,"ua_f":-6,"la_f":-4,"th_n":0,"sh_n":0,"th_f":0,"sh_f":0}],"bones":{"sw":0.085,"hw":0.05}}', 1),
('skipping', 3, 'kids', 'Jump and hop', 'Skipping', 50, 'skips', 'figure.jumprope', 'teal', 'Turn the rope with your wrists and make small bounces on your toes. No rope? Pretend!', 'Bounce without the rope first.', 'home or park', 5, 'ABGzgz6E0VI', 'https://www.youtube.com/watch?v=ABGzgz6E0VI',
 '{"view":"side","ms":230,"frames":[{"hip":[0.0,0.515],"torso":180,"ua_n":8,"la_n":72,"ua_f":4,"la_f":64,"th_n":0,"sh_n":0,"th_f":0,"sh_f":0,"ft_n":40,"ft_f":40},{"hip":[0.0,0.575],"torso":180,"ua_n":14,"la_n":104,"ua_f":10,"la_f":96,"th_n":0,"sh_n":-4,"th_f":0,"sh_f":-6,"ft_n":20,"ft_f":20}],"props":[{"line":[-0.6,0.004,0.6,0.004]}]}', 1),
('frogjump', 4, 'kids', 'Jump and hop', 'Frog jumps', 8, 'jumps', 'figure.jumprope', 'sage', 'Squat low with your hands on the floor, then jump forward like a frog and land back in a squat.', 'Smaller hops, or stand up between jumps.', 'home or park', 2, 'DUe5IC982HM', 'https://www.youtube.com/watch?v=DUe5IC982HM',
 '{"view":"side","ms":420,"frames":[{"hip":[-0.09,0.2],"torso":138,"head":150,"th_n":98.8,"sh_n":-29.9,"th_f":98.8,"sh_f":-29.9,"ft_n":72,"ft_f":72,"ua_n":1.3,"la_n":3.6,"ua_f":-0.1,"la_f":-2.4},{"hip":[-0.09,0.2],"torso":138,"head":150,"th_n":98.8,"sh_n":-29.9,"th_f":98.8,"sh_f":-29.9,"ft_n":72,"ft_f":72,"ua_n":1.3,"la_n":3.6,"ua_f":-0.1,"la_f":-2.4},{"hip":[0.0,0.645],"torso":172,"ua_n":158,"la_n":168,"ua_f":150,"la_f":162,"th_n":-6,"sh_n":-24,"th_f":-10,"sh_f":-30,"ft_n":40,"ft_f":40},{"hip":[-0.09,0.2],"torso":138,"head":150,"th_n":98.8,"sh_n":-29.9,"th_f":98.8,"sh_f":-29.9,"ft_n":72,"ft_f":72,"ua_n":1.3,"la_n":3.6,"ua_f":-0.1,"la_f":-2.4}]}', 1),
('hopscotch', 5, 'kids', 'Jump and hop', 'Hopscotch hops', 10, 'each leg', 'figure.step.training', 'rust', 'Hop on one foot, hop again, then land on two feet — like playing hopscotch.', 'Hold a wall or a friend''s hand for the one-foot hops.', 'home or park', 3, 'Py51N-5WFPQ', 'https://www.youtube.com/watch?v=Py51N-5WFPQ',
 '{"view":"side","ms":300,"frames":[{"hip":[0.0,0.515],"torso":180,"ua_n":40,"la_n":50,"ua_f":-40,"la_f":-30,"th_n":0,"sh_n":0,"th_f":18,"sh_f":-75},{"hip":[0.0,0.585],"torso":180,"ua_n":60,"la_n":70,"ua_f":-50,"la_f":-40,"th_n":6,"sh_n":-10,"th_f":22,"sh_f":-70,"ft_n":30},{"hip":[0.0,0.515],"torso":180,"ua_n":40,"la_n":50,"ua_f":-40,"la_f":-30,"th_n":0,"sh_n":0,"th_f":18,"sh_f":-75},{"hip":[0.0,0.585],"torso":180,"ua_n":60,"la_n":70,"ua_f":-50,"la_f":-40,"th_n":6,"sh_n":-10,"th_f":22,"sh_f":-70,"ft_n":30},{"hip":[0.0,0.45],"torso":178,"ua_n":20,"la_n":40,"ua_f":-20,"la_f":-10,"th_n":40.9,"sh_n":-11.9,"th_f":11.9,"sh_f":-40.9,"ft_n":72,"ft_f":72},{"hip":[0.0,0.45],"torso":178,"ua_n":20,"la_n":40,"ua_f":-20,"la_f":-10,"th_n":40.9,"sh_n":-11.9,"th_f":11.9,"sh_f":-40.9,"ft_n":72,"ft_f":72}],"props":[{"rect":[-0.5,0.0,0.32,0.006]},{"rect":[-0.12,0.0,0.32,0.006]},{"rect":[0.26,0.0,0.32,0.006]}]}', 1),
('bearcrawl', 6, 'kids', 'Animal walks', 'Bear crawl', 2, 'lengths', 'pawprint.fill', 'plum', 'Hands and feet on the floor, knees just off it, back flat like a table. Crawl across the room and back.', 'Let your knees touch the floor as you crawl.', 'home or park', 2, 'XbV5tZ98JoA', 'https://www.youtube.com/watch?v=XbV5tZ98JoA',
 '{"view":"side","ms":420,"frames":[{"hip":[0.0,0.3],"torso":97,"head":104,"th_n":28.7,"sh_n":-75.8,"th_f":5.4,"sh_f":-82.7,"ft_n":80,"ft_f":80,"ua_n":4.2,"la_n":7.1,"ua_f":-9.8,"la_f":-7.0},{"hip":[0.0,0.3],"torso":97,"head":104,"th_n":5.4,"sh_n":-82.7,"th_f":28.7,"sh_f":-75.8,"ft_n":80,"ft_f":80,"ua_n":-9.8,"la_n":-7.0,"ua_f":4.2,"la_f":7.1}],"props":[{"line":[-0.55,0.003,0.7,0.003]}]}', 1),
('crabwalk', 7, 'kids', 'Animal walks', 'Crab walk', 2, 'lengths', 'figure.flexibility', 'mauve', 'Sit, put your hands behind you and your feet in front, lift your bottom up, and walk like a crab.', 'Go a short way, or rest your bottom down between steps.', 'home or park', 2, '_ysM6pYDR0g', 'https://www.youtube.com/watch?v=_ysM6pYDR0g',
 '{"view":"side","ms":460,"frames":[{"hip":[0.0,0.21],"torso":-115,"head":160,"th_n":103.7,"sh_n":7.5,"th_f":103.8,"sh_f":-6.5,"ft_n":72,"ft_f":72,"ua_n":1.8,"la_n":-1.1,"ua_f":-11.6,"la_f":-8.8},{"hip":[0.02,0.23],"torso":-115,"head":160,"th_n":98.0,"sh_n":-12.4,"th_f":99.4,"sh_f":1.9,"ft_n":72,"ft_f":72,"ua_n":-14.2,"la_n":-11.6,"ua_f":-4.4,"la_f":-1.8}],"props":[{"line":[-0.65,0.003,0.6,0.003]}]}', 1),
('kidsquat', 8, 'kids', 'Strong body', 'Squats', 12, 'reps', 'figure.strengthtraining.functional', 'teal', 'Feet apart, arms out in front, sit back like there is a chair behind you, then stand up tall.', 'Squat onto a real chair and stand up again.', 'home or park', 2, '2RfVwwpgxCU', 'https://www.youtube.com/watch?v=2RfVwwpgxCU',
 '{"view":"side","ms":650,"frames":[{"hip":[0.0,0.515],"torso":180,"ua_n":90,"la_n":90,"ua_f":86,"la_f":86,"th_n":0,"sh_n":0,"th_f":0,"sh_f":0},{"hip":[-0.13,0.3],"torso":148,"head":168,"ua_n":92,"la_n":92,"ua_f":88,"la_f":88,"th_n":76.9,"sh_n":-26.3,"th_f":76.9,"sh_f":-26.3,"ft_n":72,"ft_f":72},{"hip":[-0.13,0.3],"torso":148,"head":168,"ua_n":92,"la_n":92,"ua_f":88,"la_f":88,"th_n":76.9,"sh_n":-26.3,"th_f":76.9,"sh_f":-26.3,"ft_n":72,"ft_f":72},{"hip":[0.0,0.515],"torso":180,"ua_n":90,"la_n":90,"ua_f":86,"la_f":86,"th_n":0,"sh_n":0,"th_f":0,"sh_f":0}]}', 1),
('kidlunge', 9, 'kids', 'Strong body', 'Lunges', 6, 'each leg', 'figure.cross.training', 'sand', 'Take a big step forward and bend both knees, back knee toward the floor. Push back up and switch legs.', 'Smaller steps, and hold a wall.', 'home or park', 2, 'ie17b3QHpJo', 'https://www.youtube.com/watch?v=ie17b3QHpJo',
 '{"view":"side","ms":700,"frames":[{"hip":[0.0,0.515],"torso":180,"ua_n":-20.4,"la_n":41.4,"ua_f":-25.6,"la_f":38.2,"th_n":0,"sh_n":0,"th_f":0,"sh_f":0},{"hip":[0.0,0.31],"torso":180,"ft_f":22,"th_n":80.6,"sh_n":-0.4,"th_f":-13.0,"sh_f":-88.5,"ft_n":72,"ua_n":-20.4,"la_n":41.4,"ua_f":-25.6,"la_f":38.2},{"hip":[0.0,0.31],"torso":180,"ft_f":22,"th_n":80.6,"sh_n":-0.4,"th_f":-13.0,"sh_f":-88.5,"ft_n":72,"ua_n":-20.4,"la_n":41.4,"ua_f":-25.6,"la_f":38.2},{"hip":[0.0,0.515],"torso":180,"ua_n":-20.4,"la_n":41.4,"ua_f":-25.6,"la_f":38.2,"th_n":0,"sh_n":0,"th_f":0,"sh_f":0}]}', 1),
('kidplank', 10, 'kids', 'Strong body', 'Plank', 20, 'seconds', 'figure.core.training', 'rust', 'Elbows under your shoulders, body straight like a plank of wood from head to heels. Breathe and hold.', 'Knees down on the floor.', 'home', 1, 'zC44AJlJPho', 'https://www.youtube.com/watch?v=zC44AJlJPho',
 '{"view":"side","ms":1300,"frames":[{"hip":[0.482,0.123],"torso":100.4,"head":94.4,"th_n":-79.6,"sh_n":-79.6,"th_f":-79.6,"sh_f":-79.6,"ft_n":4,"ft_f":4,"ua_n":0.0,"la_n":90,"ua_f":0.0,"la_f":90},{"hip":[0.48,0.132],"torso":101.4,"head":95.4,"th_n":-78.6,"sh_n":-78.6,"th_f":-78.6,"sh_f":-78.6,"ft_n":4,"ft_f":4,"ua_n":0.0,"la_n":90,"ua_f":0.0,"la_f":90}]}', 1),
('superman', 11, 'kids', 'Strong body', 'Superman', 8, 'reps', 'figure.pool.swim', 'plum', 'Lie on your tummy, arms out in front. Lift your arms and legs up a little, like flying. Hold, then rest.', 'Lift just the arms, or just the legs.', 'home', 1, 'J9zXkxUAfUA', 'https://www.youtube.com/watch?v=J9zXkxUAfUA',
 '{"view":"side","ms":900,"frames":[{"hip":[0.0,0.05],"torso":90,"head":92,"ua_n":90,"la_n":90,"ua_f":91,"la_f":91,"th_n":-90,"sh_n":-90,"th_f":-91,"sh_f":-91,"ft_n":-96,"ft_f":-96},{"hip":[0.0,0.05],"torso":99,"head":106,"ua_n":108,"la_n":112,"ua_f":106,"la_f":110,"th_n":-101,"sh_n":-105,"th_f":-100,"sh_f":-104,"ft_n":-110,"ft_f":-110},{"hip":[0.0,0.05],"torso":99,"head":106,"ua_n":108,"la_n":112,"ua_f":106,"la_f":110,"th_n":-101,"sh_n":-105,"th_f":-100,"sh_f":-104,"ft_n":-110,"ft_f":-110},{"hip":[0.0,0.05],"torso":90,"head":92,"ua_n":90,"la_n":90,"ua_f":91,"la_f":91,"th_n":-90,"sh_n":-90,"th_f":-91,"sh_f":-91,"ft_n":-96,"ft_f":-96}]}', 1),
('flamingo', 12, 'kids', 'Balance', 'Flamingo stand', 20, 'seconds each leg', 'figure.mind.and.body', 'sage', 'Stand on one leg, rest the other foot on your knee, arms out like wings. Stay still, then switch.', 'Touch a wall with one finger.', 'home or park', 1, 'Z9_ThjKQyOg', 'https://www.youtube.com/watch?v=Z9_ThjKQyOg',
 '{"view":"front","ms":950,"frames":[{"hip":[0.0,0.515],"torso":180,"ua_n":88,"la_n":92,"ua_f":-88,"la_f":-92,"th_n":1,"sh_n":1,"th_f":-52,"sh_f":42,"ft_f":-60},{"hip":[0.012,0.515],"torso":178,"ua_n":88,"la_n":92,"ua_f":-88,"la_f":-92,"th_n":1,"sh_n":1,"th_f":-52,"sh_f":42,"ft_f":-60},{"hip":[0.0,0.515],"torso":180,"ua_n":150,"la_n":170,"ua_f":-150,"la_f":-170,"th_n":1,"sh_n":1,"th_f":-52,"sh_f":42,"ft_f":-60},{"hip":[0.0,0.515],"torso":180,"ua_n":150,"la_n":170,"ua_f":-150,"la_f":-170,"th_n":1,"sh_n":1,"th_f":-52,"sh_f":42,"ft_f":-60},{"hip":[0.0,0.515],"torso":180,"ua_n":88,"la_n":92,"ua_f":-88,"la_f":-92,"th_n":1,"sh_n":1,"th_f":-52,"sh_f":42,"ft_f":-60}],"bones":{"sw":0.085,"hw":0.05}}', 1),
('playrun', 13, 'kids', 'Play', 'Run and play outside', 20, 'minutes', 'figure.run', 'gold', 'Chase, tag, football, the playground — anything that makes you puff counts.', 'A brisk walk counts too.', 'park', 20, NULL, NULL,
 '{"view":"side","ms":280,"frames":[{"hip":[0.0,0.495],"torso":170,"ua_n":-38,"la_n":52,"ua_f":42,"la_f":128,"th_n":62,"sh_n":4,"th_f":-26,"sh_f":-104,"ft_n":74,"ft_f":-30},{"hip":[0.0,0.535],"torso":170,"ua_n":0,"la_n":80,"ua_f":8,"la_f":96,"th_n":30,"sh_n":-20,"th_f":-8,"sh_f":-70,"ft_n":60,"ft_f":-20},{"hip":[0.0,0.495],"torso":170,"ua_n":42,"la_n":128,"ua_f":-38,"la_f":52,"th_n":-26,"sh_n":-104,"th_f":62,"sh_f":4,"ft_f":74,"ft_n":-30},{"hip":[0.0,0.535],"torso":170,"ua_n":8,"la_n":96,"ua_f":0,"la_f":80,"th_n":-8,"sh_n":-70,"th_f":30,"sh_f":-20,"ft_f":60,"ft_n":-20}]}', 1),
('bikeride', 14, 'kids', 'Play', 'Bike or scooter', 15, 'minutes', 'figure.outdoor.cycle', 'teal', 'Ride with a helmet on, somewhere safe, with a grown-up nearby.', 'A slower ride, or a walk with the bike.', 'park', 15, NULL, NULL,
 '{"view":"side","ms":260,"frames":[{"hip":[0.0,0.6],"torso":138,"head":150,"ft_n":95,"ft_f":95,"th_n":26.0,"sh_n":-1.8,"th_f":69.3,"sh_f":-31.8,"ua_n":19.8,"la_n":115.0,"ua_f":15.1,"la_f":112.6},{"hip":[0.0,0.6],"torso":138,"head":150,"ft_n":95,"ft_f":95,"th_n":56.4,"sh_n":-4.4,"th_f":41.4,"sh_f":-36.8,"ua_n":19.8,"la_n":115.0,"ua_f":15.1,"la_f":112.6},{"hip":[0.0,0.6],"torso":138,"head":150,"ft_n":95,"ft_f":95,"th_n":69.3,"sh_n":-31.8,"th_f":26.0,"sh_f":-1.8,"ua_n":19.8,"la_n":115.0,"ua_f":15.1,"la_f":112.6},{"hip":[0.0,0.6],"torso":138,"head":150,"ft_n":95,"ft_f":95,"th_n":41.4,"sh_n":-36.8,"th_f":56.4,"sh_f":-4.4,"ua_n":19.8,"la_n":115.0,"ua_f":15.1,"la_f":112.6}],"props":[{"line":[-0.06,0.58,0.06,0.58]},{"line":[0.0,0.58,0.1,0.22]},{"line":[0.1,0.22,0.38,0.62]},{"line":[0.38,0.62,0.4,0.74]},{"line":[0.0,0.5599999999999999,0.38,0.64]}]}', 1);

-- ── the words ──
-- body_plate: the six groups (the Australian Guide to Healthy Eating's five, and water), each with its gentle nudge
INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('body_plate', 'veg', NULL, 'Vegetables', NULL, 'Carrots, salad, peas, broccoli', 'carrot.fill', '#81B29A', '{"tone":"sage","emoji":"🥦","nudge":"Add a vegetable tomorrow — crunchy carrots count"}', 1),
('body_plate', 'fruit', NULL, 'Fruit', NULL, 'An apple, a banana, berries, dates', 'leaf.fill', '#E07A5F', '{"tone":"rust","emoji":"🍎","nudge":"Add a fruit tomorrow"}', 2),
('body_plate', 'protein', NULL, 'Protein', NULL, 'Meat, fish, eggs, beans, lentils, nuts', 'fish.fill', '#9C89B8', '{"tone":"plum","emoji":"🍗","nudge":"Add some protein tomorrow — eggs, beans or chicken"}', 3),
('body_plate', 'grains', NULL, 'Grains', NULL, 'Bread, roti, rice, pasta, oats', 'birthday.cake', '#F2CC8F', '{"tone":"sand","emoji":"🍞","nudge":"Add some grains tomorrow — bread, rice or oats"}', 4),
('body_plate', 'dairy', NULL, 'Milk and yoghurt', NULL, 'Milk, yoghurt, cheese', 'cup.and.saucer.fill', '#F4EFE4', '{"tone":"teal","emoji":"🥛","nudge":"Add milk or yoghurt tomorrow"}', 5),
('body_plate', 'water', NULL, 'Water', NULL, 'Water is the best drink', 'drop.fill', '#5DA9E9', '{"tone":"teal","emoji":"💧","nudge":"Have a glass of water with your meal tomorrow"}', 6);

-- body_mode: what a plan shows (key = core_body_profile.plan). No row (the adult 'omad'): everything, as before.
INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('body_mode', 'child', NULL, 'Child', NULL, 'Age 5–12: no weight or calories; move 60 minutes; the five prayers, never missed', NULL, NULL,
 '{"prayers":["fajr","dhuhr","jumuah","asr","maghrib","isha"],"missed":false,"owed":false,"friday_list":false,"insights":false,"streak":"all_prayed","words":"child","routine_set":"kids","move_goal_min":60,"strength_parts":["Animal walks","Strong body"],"strength_days":3,"hide_words":["owed","owed_count","make_up","not_made_up","state_missed","missed","made_up","complete_soft","extra","insights","friday","fridays","fridays_none","nafl_7","takeaway_low","takeaway_good","takeaway_none","avg_focus","avg_minutes","trend","on_time","top_tags"]}', 1);

-- body_ui_child: the child's words, laid over body_ui key by key ({min} {goal} {left} {n} {of} filled by the worker)
INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('body_ui_child', 'title', NULL, 'My day', 'يومي', 'Move, eat well and pray', 'sun.max.fill', '#E8B04B', NULL, 1),
('body_ui_child', 'plate', NULL, 'My plate', NULL, 'What was on my plate today', 'fork.knife', '#81B29A', '{"tone":"sage"}', 2),
('body_ui_child', 'routine', NULL, 'Move', NULL, 'Moves and play — 60 minutes every day', 'figure.run', '#E07A5F', '{"tone":"rust"}', 3),
('body_ui_child', 'prayers', NULL, 'Prayers', 'الصلوات', 'The five daily prayers', 'moon.stars.fill', '#9C89B8', NULL, 4),
('body_ui_child', 'steps', NULL, 'Steps', NULL, 'From Apple Health', 'shoeprints.fill', '#81B29A', NULL, 5),
('body_ui_child', 'move_goal', NULL, '{min} of {goal} active minutes', NULL, 'Kids need at least 60 minutes of moving every day', 'flame.fill', NULL, '{"tone":"rust"}', 10),
('body_ui_child', 'move_reached', NULL, '60 minutes today — brilliant!', NULL, NULL, 'star.fill', NULL, '{"tone":"gold"}', 11),
('body_ui_child', 'move_left', NULL, '{left} minutes to go', NULL, NULL, 'figure.run', NULL, '{"tone":"sand"}', 12),
('body_ui_child', 'moves_line', NULL, '{n} of {of} moves', NULL, NULL, 'checkmark.circle.fill', NULL, '{"tone":"teal"}', 13),
('body_ui_child', 'move_streak', NULL, '{n} days in a row with 60 minutes', NULL, NULL, 'flame.fill', NULL, '{"tone":"rust"}', 14),
('body_ui_child', 'strength', NULL, 'Strong body: {n} of {goal} days this week', NULL, 'Animal walks and strong-body moves, 3 days a week, build muscles and bones', 'bolt.heart.fill', NULL, '{"tone":"plum"}', 15),
('body_ui_child', 'move_week', NULL, 'Active minutes this week', NULL, NULL, 'chart.bar.fill', NULL, '{"tone":"rust"}', 16),
('body_ui_child', 'plate_had', NULL, '{n} of {of} food groups today', NULL, NULL, 'checkmark.seal.fill', NULL, '{"tone":"sage"}', 20),
('body_ui_child', 'plate_all', NULL, 'All six today — a rainbow plate!', NULL, NULL, 'star.fill', NULL, '{"tone":"gold"}', 21),
('body_ui_child', 'plate_empty', NULL, 'Your plate shows here once a meal is added', NULL, NULL, 'fork.knife', NULL, '{"tone":"muted"}', 22),
('body_ui_child', 'plate_meals', NULL, 'Today''s meals', NULL, NULL, 'photo.fill', NULL, '{"tone":"sage"}', 23),
('body_ui_child', 'plate_week', NULL, 'My plate this week', NULL, 'A dot for each food group I had', 'calendar', NULL, '{"tone":"teal"}', 24),
('body_ui_child', 'plate_nudge', NULL, 'A little tip', NULL, NULL, 'lightbulb.fill', NULL, '{"tone":"sand"}', 25),
('body_ui_child', 'plate_gallery', NULL, 'My plates', NULL, 'Every plate, newest first', 'photo.stack.fill', NULL, '{"tone":"teal"}', 26);

-- body_prayer_ui_child: the prayer screen's words for a child, laid over body_prayer_ui (nothing missed, nothing owed)
INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('body_prayer_ui_child', 'fard', NULL, 'My prayers', 'الصلوات الخمس', 'Tap one to begin', 'moon.stars.fill', NULL, '{"tone":"plum"}', 2),
('body_prayer_ui_child', 'state_passed', NULL, 'Not prayed — next time, إن شاء الله', NULL, NULL, 'leaf', NULL, '{"tone":"muted"}', 16),
('body_prayer_ui_child', 'state_qada', NULL, 'Prayed a little late', NULL, NULL, 'checkmark.circle.fill', NULL, '{"tone":"sand"}', 14),
('body_prayer_ui_child', 'state_on_time', NULL, 'Prayed on time', NULL, NULL, 'checkmark.circle.fill', NULL, '{"tone":"sage"}', 13),
('body_prayer_ui_child', 'start', NULL, 'Start', NULL, 'Take your time — the timer runs quietly', 'play.fill', NULL, NULL, 20),
('body_prayer_ui_child', 'quick', NULL, 'I prayed', NULL, NULL, 'checkmark', NULL, NULL, 22),
('body_prayer_ui_child', 'cancel', NULL, 'Cancel', NULL, NULL, 'xmark', NULL, NULL, 23),
('body_prayer_ui_child', 'save', NULL, 'Save', NULL, NULL, 'checkmark.circle.fill', NULL, NULL, 24),
('body_prayer_ui_child', 'locked', NULL, 'Saved', NULL, 'A saved prayer stays saved', 'checkmark.seal.fill', NULL, '{"tone":"muted"}', 27),
('body_prayer_ui_child', 'running', NULL, 'Take your time', NULL, 'The screen stays on', 'leaf.fill', NULL, '{"tone":"teal"}', 28),
('body_prayer_ui_child', 'reflect', NULL, 'How did it go?', NULL, NULL, 'heart.text.square', NULL, NULL, 29),
('body_prayer_ui_child', 'khushu', NULL, 'Focus', 'خشوع', 'How much was your mind on your prayer?', 'heart.fill', NULL, NULL, 32),
('body_prayer_ui_child', 'tags', NULL, 'What helped?', NULL, NULL, 'tag.fill', NULL, NULL, 33),
('body_prayer_ui_child', 'note', NULL, 'A note (if you like)', NULL, NULL, 'square.and.pencil', NULL, NULL, 34),
('body_prayer_ui_child', 'streak', NULL, '{n} days with all five', NULL, 'Days with all five prayed', 'flame.fill', NULL, '{"tone":"rust"}', 41),
('body_prayer_ui_child', 'complete', NULL, 'All five prayed today!', 'الحمد لله', 'Well done — keep it up tomorrow', 'moon.stars.fill', NULL, '{"tone":"gold"}', 43);

-- body_khushu_child: the focus scale and "what helped" in a child's words (only good things to tick)
INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('body_khushu_child', 'level1', NULL, 'My mind was busy', NULL, 'Thinking about other things', 'circle.dotted', NULL, '{"kind":"level","level":1,"tone":"sand"}', 1),
('body_khushu_child', 'level2', NULL, 'A little focused', NULL, 'Some of the time', 'circle.bottomhalf.filled', NULL, '{"kind":"level","level":2,"tone":"sand"}', 2),
('body_khushu_child', 'level3', NULL, 'Half and half', NULL, 'My mind came back', 'circle.lefthalf.filled', NULL, '{"kind":"level","level":3,"tone":"mauve"}', 3),
('body_khushu_child', 'level4', NULL, 'Mostly focused', NULL, 'I knew what I was saying', 'circle.tophalf.filled', NULL, '{"kind":"level","level":4,"tone":"teal"}', 4),
('body_khushu_child', 'level5', NULL, 'Really focused', NULL, 'My heart was in it', 'circle.fill', NULL, '{"kind":"level","level":5,"tone":"gold"}', 5),
('body_khushu_child', 'family', NULL, 'Prayed with my family', NULL, NULL, 'person.3.fill', NULL, '{"kind":"tag","sign":1,"tone":"plum"}', 10),
('body_khushu_child', 'mosque', NULL, 'At the mosque', NULL, NULL, 'building.columns.fill', NULL, '{"kind":"tag","sign":1,"tone":"gold"}', 11),
('body_khushu_child', 'slow', NULL, 'Went slowly', NULL, NULL, 'tortoise.fill', NULL, '{"kind":"tag","sign":1,"tone":"sage"}', 12),
('body_khushu_child', 'meaning', NULL, 'Knew what I was saying', NULL, NULL, 'text.book.closed.fill', NULL, '{"kind":"tag","sign":1,"tone":"teal"}', 13),
('body_khushu_child', 'dua', NULL, 'Made دعاء after', NULL, NULL, 'hands.and.sparkles.fill', NULL, '{"kind":"tag","sign":1,"tone":"gold"}', 14),
('body_khushu_child', 'first_time', NULL, 'Prayed as soon as it started', NULL, NULL, 'clock.badge.checkmark.fill', NULL, '{"kind":"tag","sign":1,"tone":"sage"}', 15);
