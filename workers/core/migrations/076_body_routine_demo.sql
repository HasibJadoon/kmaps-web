-- Each move of the daily routine shown moving, and every video played inside the app (owner, 2026-10-21: "this grid
-- and get gif animation or create per exercise"; "video in app view"); the weight journey's words.
--
-- frames_json / frame_ms: real demonstration photos, a start and an end position, played as a soft loop. From
--   free-exercise-db (github.com/yuhonas/free-exercise-db, public domain / Unlicense), only where an entry is truly the
--   same move; copied to R2 km-personal demo/<key>/<n>.jpg and served by GET /core/body/demo/:key/:file (public).
-- pose_json: for the rest, a stick figure drawn by the app from keyframes of joint angles, authored in
--   kmaps-resources scripts/body/routine_poses.py (the model is described there; print the UPDATEs with --sql).
-- video_id: the YouTube id each ▶ plays in the app's own player; video_url stays as the outside fallback.

ALTER TABLE core_body_routine_item ADD COLUMN frames_json TEXT;
ALTER TABLE core_body_routine_item ADD COLUMN frame_ms INTEGER;
ALTER TABLE core_body_routine_item ADD COLUMN pose_json TEXT;
ALTER TABLE core_body_routine_item ADD COLUMN demo_source TEXT;
ALTER TABLE core_body_routine_item ADD COLUMN video_id TEXT;

-- the photographed five (free-exercise-db id in demo_source)
UPDATE core_body_routine_item SET frames_json = '["/api/core/body/demo/armcircles/0.jpg","/api/core/body/demo/armcircles/1.jpg"]', frame_ms = 700,
  demo_source = 'free-exercise-db Arm_Circles (public domain)' WHERE key = 'armcircles';
UPDATE core_body_routine_item SET frames_json = '["/api/core/body/demo/sideleg/0.jpg","/api/core/body/demo/sideleg/1.jpg"]', frame_ms = 800,
  demo_source = 'free-exercise-db Side_Leg_Raises (public domain)' WHERE key = 'sideleg';
UPDATE core_body_routine_item SET frames_json = '["/api/core/body/demo/bridge/0.jpg","/api/core/body/demo/bridge/1.jpg"]', frame_ms = 900,
  demo_source = 'free-exercise-db Butt_Lift_Bridge (public domain)' WHERE key = 'bridge';
UPDATE core_body_routine_item SET frames_json = '["/api/core/body/demo/inclinepush/0.jpg","/api/core/body/demo/inclinepush/1.jpg"]', frame_ms = 800,
  demo_source = 'free-exercise-db Incline_Push-Up (public domain)' WHERE key = 'inclinepush';
UPDATE core_body_routine_item SET frames_json = '["/api/core/body/demo/deadbug/0.jpg","/api/core/body/demo/deadbug/1.jpg"]', frame_ms = 900,
  demo_source = 'free-exercise-db Dead_Bug (public domain)' WHERE key = 'deadbug';

-- the drawn fifteen
UPDATE core_body_routine_item SET pose_json = '{"view":"side","ms":420,"frames":[{"hip":[0.0,0.515],"torso":180,"ua_n":-32,"la_n":-8,"ua_f":38,"la_f":100,"th_n":85,"sh_n":4,"th_f":0,"sh_f":0},{"hip":[0.0,0.515],"torso":180,"ua_n":4,"la_n":10,"ua_f":-4,"la_f":4,"th_n":0,"sh_n":0,"th_f":0,"sh_f":0},{"hip":[0.0,0.515],"torso":180,"ua_n":38,"la_n":100,"ua_f":-32,"la_f":-8,"th_n":0,"sh_n":0,"th_f":85,"sh_f":4},{"hip":[0.0,0.515],"torso":180,"ua_n":4,"la_n":10,"ua_f":-4,"la_f":4,"th_n":0,"sh_n":0,"th_f":0,"sh_f":0}]}' WHERE key = 'march';
UPDATE core_body_routine_item SET pose_json = '{"view":"side","ms":650,"frames":[{"hip":[0.0,0.515],"torso":180,"ua_n":-20.4,"la_n":41.4,"ua_f":-25.6,"la_f":38.2,"th_n":0,"sh_n":0,"th_f":0,"sh_f":0},{"hip":[0.0,0.515],"torso":178,"ua_n":-23.2,"la_n":39.9,"ua_f":-28.1,"la_f":36.4,"th_n":118,"sh_n":18,"th_f":0,"sh_f":0},{"hip":[0.0,0.515],"torso":178,"ua_n":-23.2,"la_n":39.9,"ua_f":-28.1,"la_f":36.4,"th_n":118,"sh_n":18,"th_f":0,"sh_f":0},{"hip":[0.0,0.515],"torso":180,"ua_n":-20.4,"la_n":41.4,"ua_f":-25.6,"la_f":38.2,"th_n":0,"sh_n":0,"th_f":0,"sh_f":0},{"hip":[0.0,0.515],"torso":178,"ua_n":-23.2,"la_n":39.9,"ua_f":-28.1,"la_f":36.4,"th_n":0,"sh_n":0,"th_f":118,"sh_f":18},{"hip":[0.0,0.515],"torso":178,"ua_n":-23.2,"la_n":39.9,"ua_f":-28.1,"la_f":36.4,"th_n":0,"sh_n":0,"th_f":118,"sh_f":18}]}' WHERE key = 'kneeraise';
UPDATE core_body_routine_item SET pose_json = '{"view":"side","ms":750,"frames":[{"hip":[-0.02,0.3],"torso":170,"th_n":82.6,"sh_n":6.3,"th_f":82.6,"sh_f":6.3,"ft_n":72,"ft_f":72,"head":175,"ua_n":-7.6,"la_n":48.1,"ua_f":-13.8,"la_f":46.5},{"hip":[0.03,0.33],"torso":138,"head":150,"ua_n":72,"la_n":84,"ua_f":66,"la_f":80,"th_n":75.7,"sh_n":-4.1,"th_f":75.7,"sh_f":-4.1,"ft_n":72,"ft_f":72},{"hip":[0.2,0.515],"torso":178,"ua_n":4,"la_n":10,"ua_f":-4,"la_f":4,"th_n":7.0,"sh_n":4.7,"th_f":7.0,"sh_f":4.7,"ft_n":72,"ft_f":72},{"hip":[0.2,0.515],"torso":178,"ua_n":4,"la_n":10,"ua_f":-4,"la_f":4,"th_n":7.0,"sh_n":4.7,"th_f":7.0,"sh_f":4.7,"ft_n":72,"ft_f":72},{"hip":[0.03,0.33],"torso":138,"head":150,"ua_n":72,"la_n":84,"ua_f":66,"la_f":80,"th_n":75.7,"sh_n":-4.1,"th_f":75.7,"sh_f":-4.1,"ft_n":72,"ft_f":72},{"hip":[-0.02,0.3],"torso":170,"th_n":82.6,"sh_n":6.3,"th_f":82.6,"sh_f":6.3,"ft_n":72,"ft_f":72,"head":175,"ua_n":-7.6,"la_n":48.1,"ua_f":-13.8,"la_f":46.5}],"props":[{"rect":[-0.24,0.24,0.27,0.03]},{"line":[-0.225,0.27,-0.225,0.64]},{"line":[-0.21,0.0,-0.21,0.24]},{"line":[0.015,0.0,0.015,0.24]}]}' WHERE key = 'sitstand';
UPDATE core_body_routine_item SET pose_json = '{"view":"side","ms":900,"frames":[{"hip":[-0.1,0.43],"torso":180,"ua_n":6,"la_n":12,"ua_f":-2,"la_f":6,"th_n":43.5,"sh_n":21.9,"th_f":43.5,"sh_f":21.9,"ft_n":72,"ft_f":72},{"hip":[-0.1,0.275],"torso":180,"th_n":88.7,"sh_n":3.5,"th_f":88.7,"sh_f":3.5,"ft_n":72,"ft_f":72,"ua_n":33.2,"la_n":36.0,"ua_f":30.3,"la_f":33.1},{"hip":[-0.1,0.275],"torso":180,"th_n":88.7,"sh_n":3.5,"th_f":88.7,"sh_f":3.5,"ft_n":72,"ft_f":72,"ua_n":33.2,"la_n":36.0,"ua_f":30.3,"la_f":33.1},{"hip":[-0.1,0.275],"torso":180,"th_n":88.7,"sh_n":3.5,"th_f":88.7,"sh_f":3.5,"ft_n":72,"ft_f":72,"ua_n":33.2,"la_n":36.0,"ua_f":30.3,"la_f":33.1}],"props":[{"line":[-0.165,0.0,-0.165,1.02]}]}' WHERE key = 'wallsit';
UPDATE core_body_routine_item SET pose_json = '{"view":"side","ms":700,"frames":[{"hip":[-0.02,0.515],"torso":180,"ua_n":4,"la_n":10,"ua_f":-4,"la_f":4,"th_n":0,"sh_n":0,"th_f":0,"sh_f":0},{"hip":[0.0,0.47],"torso":172,"ua_n":-18,"la_n":-5,"ua_f":24,"la_f":50,"th_n":70.5,"sh_n":-7.2,"th_f":22.0,"sh_f":-27.2,"ft_n":72,"ft_f":72},{"hip":[0.2,0.635],"torso":180,"ua_n":4,"la_n":10,"ua_f":-4,"la_f":4,"th_n":1.2,"sh_n":-1.2,"th_f":1.2,"sh_f":-1.2,"ft_n":72,"ft_f":72},{"hip":[0.2,0.635],"torso":180,"ua_n":4,"la_n":10,"ua_f":-4,"la_f":4,"th_n":1.2,"sh_n":-1.2,"th_f":1.2,"sh_f":-1.2,"ft_n":72,"ft_f":72},{"hip":[0.0,0.47],"torso":172,"ua_n":-18,"la_n":-5,"ua_f":24,"la_f":50,"th_n":70.5,"sh_n":-7.2,"th_f":22.0,"sh_f":-27.2,"ft_n":72,"ft_f":72}],"props":[{"rect":[0.08,0.0,0.34,0.12]}]}' WHERE key = 'stepup';
UPDATE core_body_routine_item SET pose_json = '{"view":"side","ms":850,"frames":[{"hip":[0.0,0.515],"torso":180,"ua_n":29.1,"la_n":79.1,"ua_f":24.7,"la_f":81.1,"th_n":0,"sh_n":0,"th_f":0,"sh_f":0},{"hip":[-0.07,0.34],"torso":178,"ft_f":22,"th_n":64.0,"sh_n":-32.1,"th_f":-13.6,"sh_f":-81.3,"ft_n":72,"ua_n":68.0,"la_n":114.0,"ua_f":63.8,"la_f":118.3},{"hip":[-0.07,0.34],"torso":178,"ft_f":22,"th_n":64.0,"sh_n":-32.1,"th_f":-13.6,"sh_f":-81.3,"ft_n":72,"ua_n":68.0,"la_n":114.0,"ua_f":63.8,"la_f":118.3}],"props":[{"line":[0.235,0.27,0.235,0.64]},{"rect":[0.22,0.24,0.27,0.03]},{"line":[0.235,0.0,0.235,0.24]},{"line":[0.475,0.0,0.475,0.24]}]}' WHERE key = 'lunge';
UPDATE core_body_routine_item SET pose_json = '{"view":"side","ms":650,"frames":[{"hip":[0.0,0.515],"torso":180,"ua_n":71.8,"la_n":99.0,"ua_f":70.0,"la_f":93.5,"th_n":0,"sh_n":0,"th_f":0,"sh_f":0},{"hip":[0.031,0.552],"torso":180,"ua_n":50.7,"la_n":104.2,"ua_f":49.0,"la_f":98.3,"th_n":0,"sh_n":0,"th_f":0,"sh_f":0,"ft_n":30,"ft_f":30},{"hip":[0.031,0.552],"torso":180,"ua_n":50.7,"la_n":104.2,"ua_f":49.0,"la_f":98.3,"th_n":0,"sh_n":0,"th_f":0,"sh_f":0,"ft_n":30,"ft_f":30}],"props":[{"line":[0.31,0.0,0.31,1.05]}]}' WHERE key = 'calfraise';
UPDATE core_body_routine_item SET pose_json = '{"view":"side","ms":800,"frames":[{"hip":[0.174,0.483],"torso":159.2,"th_n":-20.8,"sh_n":-20.8,"th_f":-20.8,"sh_f":-20.8,"ft_n":72,"ft_f":72,"ua_n":61.8,"la_n":106.5,"ua_f":59.3,"la_f":101.4},{"hip":[0.267,0.436],"torso":147.0,"th_n":-33.0,"sh_n":-33.0,"th_f":-33.0,"sh_f":-33.0,"ft_n":72,"ft_f":72,"ua_n":15.8,"la_n":140.8,"ua_f":9.5,"la_f":132.4}],"props":[{"line":[0.58,0.0,0.58,1.05]}]}' WHERE key = 'wallpush';
UPDATE core_body_routine_item SET pose_json = '{"view":"front","ms":1100,"frames":[{"hip":[0.0,0.515],"torso":180,"ua_n":58,"la_n":160,"ua_f":-58,"la_f":-160,"th_n":4,"sh_n":4,"th_f":-4,"sh_f":-4},{"hip":[0.0,0.515],"torso":180,"ua_n":148,"la_n":168,"ua_f":-148,"la_f":-168,"th_n":4,"sh_n":4,"th_f":-4,"sh_f":-4}],"bones":{"sw":0.085,"hw":0.05},"props":[{"rect":[-0.36,0.0,0.72,1.12]}]}' WHERE key = 'wallangel';
UPDATE core_body_routine_item SET pose_json = '{"view":"side","ms":850,"frames":[{"hip":[0.085,0.465],"torso":206.0,"th_n":26.0,"sh_n":26.0,"th_f":26.0,"sh_f":26.0,"ft_n":72,"ft_f":72,"ua_n":62.3,"la_n":91.0,"ua_f":58.6,"la_f":90.6},{"hip":[0.198,0.504],"torso":192.0,"th_n":12.0,"sh_n":12.0,"th_f":12.0,"sh_f":12.0,"ft_n":72,"ft_f":72,"ua_n":-30.4,"la_n":109.3,"ua_f":-34.5,"la_f":103.3},{"hip":[0.198,0.504],"torso":192.0,"th_n":12.0,"sh_n":12.0,"th_f":12.0,"sh_f":12.0,"ft_n":72,"ft_f":72,"ua_n":-30.4,"la_n":109.3,"ua_f":-34.5,"la_f":103.3}],"props":[{"line":[0.52,0.0,0.52,1.05]},{"tether":[0.52,0.6,"hand_n"]}]}' WHERE key = 'towelrow';
UPDATE core_body_routine_item SET pose_json = '{"view":"side","ms":900,"frames":[{"hip":[0.0,0.275],"torso":100.6,"head":102,"ua_n":0,"la_n":0,"ua_f":0,"la_f":0,"th_n":0,"sh_n":-90,"th_f":0,"sh_f":-90,"ft_n":-88,"ft_f":-88},{"hip":[0.0,0.275],"torso":100.6,"head":102,"ua_n":93,"la_n":92,"ua_f":0,"la_f":0,"th_n":0,"sh_n":-90,"th_f":-92,"sh_f":-92,"ft_n":-88,"ft_f":-60},{"hip":[0.0,0.275],"torso":100.6,"head":102,"ua_n":93,"la_n":92,"ua_f":0,"la_f":0,"th_n":0,"sh_n":-90,"th_f":-92,"sh_f":-92,"ft_n":-88,"ft_f":-60},{"hip":[0.0,0.275],"torso":100.6,"head":102,"ua_n":0,"la_n":0,"ua_f":0,"la_f":0,"th_n":0,"sh_n":-90,"th_f":0,"sh_f":-90,"ft_n":-88,"ft_f":-88},{"hip":[0.0,0.275],"torso":100.6,"head":102,"ua_n":0,"la_n":0,"ua_f":93,"la_f":92,"th_n":-92,"sh_n":-92,"th_f":0,"sh_f":-90,"ft_n":-60,"ft_f":-88},{"hip":[0.0,0.275],"torso":100.6,"head":102,"ua_n":0,"la_n":0,"ua_f":93,"la_f":92,"th_n":-92,"sh_n":-92,"th_f":0,"sh_f":-90,"ft_n":-60,"ft_f":-88}]}' WHERE key = 'birddog';
UPDATE core_body_routine_item SET pose_json = '{"view":"side","ms":1500,"frames":[{"hip":[0.295,0.431],"torso":143.0,"th_n":-37.0,"sh_n":-37.0,"th_f":-37.0,"sh_f":-37.0,"ft_n":60,"ft_f":60,"ua_n":6.1,"la_n":8.8,"ua_f":2.7,"la_f":5.5},{"hip":[0.289,0.435],"torso":143.8,"th_n":-36.2,"sh_n":-36.2,"th_f":-36.2,"sh_f":-36.2,"ft_n":60,"ft_f":60,"ua_n":7.5,"la_n":10.2,"ua_f":4.2,"la_f":6.9}],"props":[{"rect":[0.44,0.0,0.36,0.32]}]}' WHERE key = 'plank';
UPDATE core_body_routine_item SET pose_json = '{"view":"side","ms":1400,"frames":[{"hip":[-0.085,0.045],"torso":115.4,"head":123.4,"th_n":-86.0,"th_f":-82.0,"sh_n":-96,"sh_f":-92,"ft_n":-100,"ft_f":-96,"ua_n":0,"la_n":90,"ua_f":-91.2,"la_f":-51.9},{"hip":[-0.066,0.102],"torso":107.0,"head":115.0,"th_n":-72.9,"th_f":-68.9,"sh_n":-96,"sh_f":-92,"ft_n":-100,"ft_f":-96,"ua_n":0,"la_n":90,"ua_f":-114.5,"la_f":-49.4},{"hip":[-0.066,0.102],"torso":107.0,"head":115.0,"th_n":-72.9,"th_f":-68.9,"sh_n":-96,"sh_f":-92,"ft_n":-100,"ft_f":-96,"ua_n":0,"la_n":90,"ua_f":-114.5,"la_f":-49.4},{"hip":[-0.066,0.102],"torso":107.0,"head":115.0,"th_n":-72.9,"th_f":-68.9,"sh_n":-96,"sh_f":-92,"ft_n":-100,"ft_f":-96,"ua_n":0,"la_n":90,"ua_f":-114.5,"la_f":-49.4}],"bones":{"torso":0.3,"la":0.12,"sh":0.13,"ft":0.05}}' WHERE key = 'sideplank';
UPDATE core_body_routine_item SET pose_json = '{"view":"side","ms":900,"frames":[{"hip":[0.0,0.515],"torso":180,"ua_n":67.0,"la_n":107.3,"ua_f":-4,"la_f":4,"th_n":0,"sh_n":0,"th_f":0,"sh_f":0},{"hip":[0.0,0.515],"torso":180,"ua_n":67.0,"la_n":107.3,"ua_f":-4,"la_f":4,"th_n":0,"sh_n":0,"th_f":15,"sh_f":-55},{"hip":[0.008,0.515],"torso":179,"ua_n":60.8,"la_n":113.2,"ua_f":-4,"la_f":4,"th_n":0,"sh_n":0,"th_f":15,"sh_f":-55},{"hip":[0.0,0.515],"torso":180,"ua_n":67.0,"la_n":107.3,"ua_f":-4,"la_f":4,"th_n":0,"sh_n":0,"th_f":15,"sh_f":-55}],"props":[{"line":[0.3,0.0,0.3,1.05]}]}' WHERE key = 'balance';
UPDATE core_body_routine_item SET pose_json = '{"view":"side","ms":1000,"frames":[{"hip":[0.0,0.515],"torso":180,"ua_n":150,"la_n":170,"ua_f":146,"la_f":166,"th_n":0,"sh_n":0,"th_f":0,"sh_f":0,"head":182},{"hip":[0.0,0.515],"torso":180,"ua_n":150,"la_n":170,"ua_f":146,"la_f":166,"th_n":0,"sh_n":0,"th_f":0,"sh_f":0,"head":182},{"hip":[-0.06,0.5],"torso":60,"head":52,"ua_n":-20,"la_n":335,"ua_f":-14,"la_f":340,"th_n":19.5,"sh_n":-5.1,"th_f":19.5,"sh_f":-5.1,"ft_n":72,"ft_f":72},{"hip":[-0.06,0.5],"torso":60,"head":52,"ua_n":-20,"la_n":335,"ua_f":-14,"la_f":340,"th_n":19.5,"sh_n":-5.1,"th_f":19.5,"sh_f":-5.1,"ft_n":72,"ft_f":72},{"hip":[0.0,0.515],"torso":180,"ua_n":-21.4,"la_n":347.3,"ua_f":80,"la_f":446,"th_n":-14,"sh_n":-172,"th_f":0,"sh_f":0,"ft_n":240},{"hip":[0.0,0.515],"torso":180,"ua_n":-21.4,"la_n":347.3,"ua_f":80,"la_f":446,"th_n":-14,"sh_n":-172,"th_f":0,"sh_f":0,"ft_n":240}]}' WHERE key = 'stretch';
UPDATE core_body_routine_item SET demo_source = 'drawn: kmaps-resources scripts/body/routine_poses.py' WHERE pose_json IS NOT NULL;

-- the videos, played in the app: ids from the existing watch links, and a chosen beginner demonstration where the link
-- was only a search (or the NHS page)
UPDATE core_body_routine_item SET video_id = CASE key
  WHEN 'march'       THEN 'Iccv7TpkDks'
  WHEN 'armcircles'  THEN '4TJv9YmECjc'   -- "How to Do: ARM CIRCLES"
  WHEN 'kneeraise'   THEN 'Iccv7TpkDks'
  WHEN 'sitstand'    THEN 'eutszbtbJM8'   -- "How To Do A Sit To Stand"
  WHEN 'wallsit'     THEN 'rHRVy2j85EE'
  WHEN 'stepup'      THEN 'eYIUPRMm13A'
  WHEN 'lunge'       THEN 'azx15iak_X0'   -- "How to Do a Reverse Lunge with Chair Support"
  WHEN 'sideleg'     THEN 'HT7_uRcPUDw'   -- "Chair Assisted Lateral Leg Raises"
  WHEN 'bridge'      THEN 'iwHvjHh59f8'
  WHEN 'calfraise'   THEN 'M49slU9_0tY'   -- "Calf Raises for Beginners"
  WHEN 'wallpush'    THEN 'YB0egDzsu18'
  WHEN 'inclinepush' THEN 'PwQm5urhZsQ'
  WHEN 'wallangel'   THEN 'HKxYl-6fAF8'
  WHEN 'towelrow'    THEN 'g8wWFlr2gQU'   -- "Bodyweight Door Rows"
  WHEN 'birddog'     THEN 'oV1_T-5ksj8'
  WHEN 'deadbug'     THEN 'XcYtWYMz39w'
  WHEN 'plank'       THEN '8BPRH34Z8Ak'
  WHEN 'sideplank'   THEN 'oEs8ZvVDOzI'
  WHEN 'balance'     THEN 'R1RF1PbYSQQ'   -- "Single Leg Balance Exercise for Seniors"
  WHEN 'stretch'     THEN 'yW5tv05K9D4'
END;
UPDATE core_body_routine_item SET video_url = 'https://www.youtube.com/watch?v=' || video_id
 WHERE video_url LIKE '%youtube.com/results%' OR video_url LIKE '%nhs.uk%';

-- the whole routine's follow-along, played in the app too
UPDATE core_app_label SET extra_json = json_set(COALESCE(extra_json, '{}'), '$.video_id', 'ZidP_sFbaqQ')
 WHERE scope = 'body_ui' AND key = 'routine';

-- the weight screen's words: the journey's marks, the healthy range, the milestones, the empty states
-- (extra.tone: the palette tone the app draws each in)
INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('body_weight', 'start',       NULL, 'Start',         NULL, NULL,                                       'circle.fill',    NULL, '{"tone":"sand"}', 1),
('body_weight', 'now',         NULL, 'Now',           NULL, NULL,                                       'figure.walk',    NULL, '{"tone":"gold"}', 2),
('body_weight', 'goal',        NULL, 'Goal',          NULL, NULL,                                       'flag.fill',      NULL, '{"tone":"teal"}', 3),
('body_weight', 'ideal',       NULL, 'Ideal',         NULL, 'Top of the healthy range for your height', 'star.fill',      NULL, '{"tone":"sage"}', 4),
('body_weight', 'healthy',     NULL, 'Healthy range', NULL, 'BMI 18.5 to 24.9',                         'heart.fill',     NULL, '{"tone":"sage"}', 5),
('body_weight', 'milestone',   NULL, 'Milestones',    NULL, 'Every 10 kg, then the goal and the ideal', 'medal.fill',     NULL, '{"tone":"gold","every":10}', 6),
('body_weight', 'chart_empty', NULL, 'Weigh in weekly', NULL, 'Send Claude your weight — the line starts with the second weigh-in.', 'scalemass.fill', NULL, '{"tone":"sand"}', 7),
('body_weight', 'pace_pending',NULL, 'after 2 weigh-ins', NULL, NULL,                                   NULL,             NULL, NULL, 8),
('body_weight', 'last_weighed',NULL, 'Last weighed',  NULL, NULL,                                       'calendar',       NULL, NULL, 9),
('body_weight', 'journey',     NULL, 'The way down',  NULL, 'Each step is 10 kg; the light is where you stand.', 'stairs', NULL, '{"tone":"gold"}', 10);
