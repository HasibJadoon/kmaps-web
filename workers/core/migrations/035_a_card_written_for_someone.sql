ALTER TABLE core_bank_item ADD COLUMN addressed_to_ref TEXT;
ALTER TABLE core_bank_item ADD COLUMN addressed_to_name TEXT;

CREATE INDEX IF NOT EXISTS ix_bank_item_addressed
  ON core_bank_item (addressed_to_ref) WHERE addressed_to_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_bank_pack_owner_app
  ON core_bank_pack (owner_ref, app) WHERE owner_ref IS NOT NULL;
