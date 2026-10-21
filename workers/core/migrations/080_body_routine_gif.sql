-- Every routine move as a designed GIF, played by the phone as a picture and kept on it after the first load (owner,
-- 2026-10-21: "this screen is heavy, make it light"; "use gif, better design gif and store locally"). The GIFs are drawn
-- from the poses (kmaps-resources scripts/body/routine_poses.py → kmaps-ios AccountFeatureTests RoutineGifExport) on one
-- dark stage, each move in its own tone; in R2 km-personal demo/<key>/move-<n>.gif, served by GET /core/body/demo
-- (public). A new drawing takes the next <n>, so the phone's kept copy is never stale.
-- The five once shown by photos now have poses too, so every move is drawn the same way.
-- The full follow-along video (ZidP_sFbaqQ) was taken down; it becomes a ten-minute standing beginner session — no floor
-- work and no jumping (Ivy K Fitness, F7DA3Z0cJmM; checked with YouTube oEmbed 2026-10-21).

ALTER TABLE core_body_routine_item ADD COLUMN gif TEXT;
UPDATE core_body_routine_item SET gif = '/api/core/body/demo/march/move-1.gif' WHERE key = 'march';
UPDATE core_body_routine_item SET gif = '/api/core/body/demo/armcircles/move-1.gif' WHERE key = 'armcircles';
UPDATE core_body_routine_item SET gif = '/api/core/body/demo/kneeraise/move-1.gif' WHERE key = 'kneeraise';
UPDATE core_body_routine_item SET gif = '/api/core/body/demo/sitstand/move-1.gif' WHERE key = 'sitstand';
UPDATE core_body_routine_item SET gif = '/api/core/body/demo/wallsit/move-1.gif' WHERE key = 'wallsit';
UPDATE core_body_routine_item SET gif = '/api/core/body/demo/stepup/move-1.gif' WHERE key = 'stepup';
UPDATE core_body_routine_item SET gif = '/api/core/body/demo/lunge/move-1.gif' WHERE key = 'lunge';
UPDATE core_body_routine_item SET gif = '/api/core/body/demo/sideleg/move-1.gif' WHERE key = 'sideleg';
UPDATE core_body_routine_item SET gif = '/api/core/body/demo/bridge/move-1.gif' WHERE key = 'bridge';
UPDATE core_body_routine_item SET gif = '/api/core/body/demo/calfraise/move-1.gif' WHERE key = 'calfraise';
UPDATE core_body_routine_item SET gif = '/api/core/body/demo/wallpush/move-1.gif' WHERE key = 'wallpush';
UPDATE core_body_routine_item SET gif = '/api/core/body/demo/inclinepush/move-1.gif' WHERE key = 'inclinepush';
UPDATE core_body_routine_item SET gif = '/api/core/body/demo/wallangel/move-1.gif' WHERE key = 'wallangel';
UPDATE core_body_routine_item SET gif = '/api/core/body/demo/towelrow/move-1.gif' WHERE key = 'towelrow';
UPDATE core_body_routine_item SET gif = '/api/core/body/demo/birddog/move-1.gif' WHERE key = 'birddog';
UPDATE core_body_routine_item SET gif = '/api/core/body/demo/deadbug/move-1.gif' WHERE key = 'deadbug';
UPDATE core_body_routine_item SET gif = '/api/core/body/demo/plank/move-1.gif' WHERE key = 'plank';
UPDATE core_body_routine_item SET gif = '/api/core/body/demo/sideplank/move-1.gif' WHERE key = 'sideplank';
UPDATE core_body_routine_item SET gif = '/api/core/body/demo/balance/move-1.gif' WHERE key = 'balance';
UPDATE core_body_routine_item SET gif = '/api/core/body/demo/stretch/move-1.gif' WHERE key = 'stretch';

UPDATE core_body_routine_item SET pose_json = '{"view":"front","ms":240,"frames":[{"hip":[0.0,0.515],"torso":180,"ua_n":90,"la_n":90,"ua_f":-90,"la_f":-90,"th_n":4,"sh_n":4,"th_f":-4,"sh_f":-4},{"hip":[0.0,0.515],"torso":180,"ua_n":100,"la_n":100,"ua_f":-100,"la_f":-100,"th_n":4,"sh_n":4,"th_f":-4,"sh_f":-4},{"hip":[0.0,0.515],"torso":180,"ua_n":90,"la_n":90,"ua_f":-90,"la_f":-90,"th_n":4,"sh_n":4,"th_f":-4,"sh_f":-4},{"hip":[0.0,0.515],"torso":180,"ua_n":80,"la_n":80,"ua_f":-80,"la_f":-80,"th_n":4,"sh_n":4,"th_f":-4,"sh_f":-4}],"bones":{"sw":0.085,"hw":0.05}}' WHERE key = 'armcircles';
UPDATE core_body_routine_item SET pose_json = '{"view":"front","ms":650,"frames":[{"hip":[0.0,0.515],"torso":180,"ua_n":38,"la_n":-28,"ua_f":-38,"la_f":28,"th_n":4,"sh_n":4,"th_f":-4,"sh_f":-4},{"hip":[0.0,0.515],"torso":176,"ua_n":38,"la_n":-28,"ua_f":-38,"la_f":28,"th_n":34,"sh_n":34,"th_f":-2,"sh_f":-2},{"hip":[0.0,0.515],"torso":176,"ua_n":38,"la_n":-28,"ua_f":-38,"la_f":28,"th_n":34,"sh_n":34,"th_f":-2,"sh_f":-2},{"hip":[0.0,0.515],"torso":180,"ua_n":38,"la_n":-28,"ua_f":-38,"la_f":28,"th_n":4,"sh_n":4,"th_f":-4,"sh_f":-4}],"bones":{"sw":0.085,"hw":0.05}}' WHERE key = 'sideleg';
UPDATE core_body_routine_item SET pose_json = '{"view":"side","ms":900,"frames":[{"hip":[0.0,0.07],"torso":-90,"head":-90,"ua_n":90,"la_n":90,"ua_f":92,"la_f":92,"th_n":133.2,"sh_n":29.7,"th_f":133.2,"sh_f":29.7,"ft_n":72,"ft_f":72},{"hip":[-0.057,0.246],"torso":-54.0,"head":-90,"ua_n":90,"la_n":90,"ua_f":92,"la_f":92,"th_n":89.3,"sh_n":27.2,"th_f":89.3,"sh_f":27.2,"ft_n":72,"ft_f":72},{"hip":[-0.057,0.246],"torso":-54.0,"head":-90,"ua_n":90,"la_n":90,"ua_f":92,"la_f":92,"th_n":89.3,"sh_n":27.2,"th_f":89.3,"sh_f":27.2,"ft_n":72,"ft_f":72},{"hip":[0.0,0.07],"torso":-90,"head":-90,"ua_n":90,"la_n":90,"ua_f":92,"la_f":92,"th_n":133.2,"sh_n":29.7,"th_f":133.2,"sh_f":29.7,"ft_n":72,"ft_f":72}]}' WHERE key = 'bridge';
UPDATE core_body_routine_item SET pose_json = '{"view":"side","ms":800,"frames":[{"hip":[0.295,0.431],"torso":143.0,"th_n":-37.0,"sh_n":-37.0,"th_f":-37.0,"sh_f":-37.0,"ft_n":60,"ft_f":60,"ua_n":3.0,"la_n":28.3,"ua_f":-4.0,"la_f":28.2},{"hip":[0.375,0.355],"torso":130.0,"th_n":-50.0,"sh_n":-50.0,"th_f":-50.0,"sh_f":-50.0,"ft_n":60,"ft_f":60,"ua_n":-69.2,"la_n":40.9,"ua_f":-73.8,"la_f":33.7},{"hip":[0.375,0.355],"torso":130.0,"th_n":-50.0,"sh_n":-50.0,"th_f":-50.0,"sh_f":-50.0,"ft_n":60,"ft_f":60,"ua_n":-69.2,"la_n":40.9,"ua_f":-73.8,"la_f":33.7},{"hip":[0.295,0.431],"torso":143.0,"th_n":-37.0,"sh_n":-37.0,"th_f":-37.0,"sh_f":-37.0,"ft_n":60,"ft_f":60,"ua_n":3.0,"la_n":28.3,"ua_f":-4.0,"la_f":28.2}],"props":[{"rect":[0.47,0.0,0.34,0.355]}]}' WHERE key = 'inclinepush';
UPDATE core_body_routine_item SET pose_json = '{"view":"side","ms":900,"frames":[{"hip":[0.0,0.07],"torso":-90,"head":-90,"ua_n":180,"la_n":180,"ua_f":176,"la_f":176,"th_n":180,"sh_n":90,"th_f":176,"sh_f":88,"ft_n":160,"ft_f":158},{"hip":[0.0,0.07],"torso":-90,"head":-90,"ua_n":272,"la_n":272,"ua_f":176,"la_f":176,"th_n":180,"sh_n":90,"th_f":96,"sh_f":96,"ft_n":160,"ft_f":170},{"hip":[0.0,0.07],"torso":-90,"head":-90,"ua_n":272,"la_n":272,"ua_f":176,"la_f":176,"th_n":180,"sh_n":90,"th_f":96,"sh_f":96,"ft_n":160,"ft_f":170},{"hip":[0.0,0.07],"torso":-90,"head":-90,"ua_n":180,"la_n":180,"ua_f":176,"la_f":176,"th_n":180,"sh_n":90,"th_f":176,"sh_f":88,"ft_n":160,"ft_f":158},{"hip":[0.0,0.07],"torso":-90,"head":-90,"ua_n":180,"la_n":180,"ua_f":268,"la_f":268,"th_n":96,"sh_n":96,"th_f":176,"sh_f":88,"ft_n":170,"ft_f":158},{"hip":[0.0,0.07],"torso":-90,"head":-90,"ua_n":180,"la_n":180,"ua_f":268,"la_f":268,"th_n":96,"sh_n":96,"th_f":176,"sh_f":88,"ft_n":170,"ft_f":158}]}' WHERE key = 'deadbug';

UPDATE core_app_label
   SET extra_json = '{"video_url":"https://www.youtube.com/watch?v=F7DA3Z0cJmM","video_label":"Follow a 10-minute standing routine","video_id":"F7DA3Z0cJmM"}'
 WHERE scope = 'body_ui' AND key = 'routine';
