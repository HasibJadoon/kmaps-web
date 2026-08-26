-- 024 — scope the logs to a user
--
-- 022 and 023 landed as single-user tables. The app surface is auth-gated, and
-- every other personal carrier in km_core (`core_study_session`, `core_srs_card`)
-- keys on `user_ref` set from the JWT server-side, so these two must match or
-- the routes would have to invent a scoping rule of their own.
--
-- The column is nullable, deliberately. The 69 rows already in
-- `core_source_log` were seeded from `cyb_source_registry` and
-- `ar_ling_gram_source_toc_rank` — they describe the corpus, not a person, and
-- belong to no one. Reads therefore filter `(user_ref = ? OR user_ref IS NULL)`:
-- shared reference data plus your own rows. Writes always stamp the caller.
--
-- Run one statement at a time.

ALTER TABLE core_daily_log  ADD COLUMN user_ref TEXT;
ALTER TABLE core_source_log ADD COLUMN user_ref TEXT;

CREATE INDEX IF NOT EXISTS idx_daily_log_user  ON core_daily_log(user_ref, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_source_log_user ON core_source_log(user_ref, explore_state);
