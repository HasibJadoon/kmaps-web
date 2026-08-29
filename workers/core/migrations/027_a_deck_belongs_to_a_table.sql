-- ─── A deck belongs to a table ────────────────────────────────────────────────
--
-- N people prepare cards for the same table, so the deck needs to know which
-- table. `is_shared` was doing that job badly: it means "everyone with an
-- account can see this", which is fine for one household and wrong the moment
-- there is a second one.
--
-- A workspace is the group this project already has — the same one that owns
-- study material and members — so a family is a workspace and a dinner is its
-- table. Nothing new to invent, and membership is already someone else's job.
ALTER TABLE core_talk_deck ADD COLUMN workspace_ref TEXT;

CREATE INDEX IF NOT EXISTS ix_talk_deck_workspace ON core_talk_deck (workspace_ref);
