ALTER TABLE core_bank_response ADD COLUMN created_at TEXT
  NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'));

CREATE UNIQUE INDEX IF NOT EXISTS ux_bank_response_once
  ON core_bank_response (attempt_ref, item_ref);

CREATE INDEX IF NOT EXISTS ix_bank_unit_item_item
  ON core_bank_unit_item (item_ref);

CREATE INDEX IF NOT EXISTS ix_bank_unit_parent
  ON core_bank_unit (parent_ref);
CREATE INDEX IF NOT EXISTS ix_bank_attempt_unit
  ON core_bank_attempt (unit_ref);
CREATE INDEX IF NOT EXISTS ix_bank_import_pack
  ON core_bank_import (pack_ref);

CREATE INDEX IF NOT EXISTS ix_srs_card_user_module_res
  ON core_srs_card (user_ref, module, resource_ref);

UPDATE core_quiz_question SET step_key = 'sentence_structure'
 WHERE step_key = 'structure';
