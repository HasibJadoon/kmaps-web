ALTER TABLE core_talk_deck ADD COLUMN workspace_ref TEXT;

CREATE INDEX IF NOT EXISTS ix_talk_deck_workspace ON core_talk_deck (workspace_ref);
