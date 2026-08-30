ALTER TABLE core_talk_card ADD COLUMN for_name TEXT;

ALTER TABLE core_talk_card ADD COLUMN for_ref TEXT;
ALTER TABLE core_talk_card ADD COLUMN asked_at TEXT;

CREATE INDEX IF NOT EXISTS ix_talk_card_for ON core_talk_card (for_name, asked_at);
