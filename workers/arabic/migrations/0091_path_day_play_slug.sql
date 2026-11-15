-- The Qurʾān path is told in 3 pieces a day (owner 2026-11-12: "3 artifacts only"): Story (qissa), Series (play — a
-- musalsal-style drama serial) and Poem (shiir). ar_path_day gets the Series slot; maqala_slug / hiwar_slug stay as
-- columns (the essay and dialogue are retired). Applied remotely by executing this file and recording it in d1_migrations
-- (as 0090 was) — not via `wrangler d1 migrations apply`, which would also run older unrecorded files.
ALTER TABLE ar_path_day ADD COLUMN play_slug TEXT;
