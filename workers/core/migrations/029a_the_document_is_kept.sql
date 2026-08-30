ALTER TABLE core_bank_import ADD COLUMN source_json TEXT;

ALTER TABLE core_bank_pack ADD COLUMN source_json TEXT;
ALTER TABLE core_bank_pack ADD COLUMN source_format TEXT;
