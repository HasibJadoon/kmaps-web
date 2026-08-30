ALTER TABLE core_srs_card ADD COLUMN card_kind TEXT;
ALTER TABLE core_srs_card ADD COLUMN concept_domain TEXT;

ALTER TABLE core_srs_library_card ADD COLUMN concept_domain TEXT;

CREATE INDEX IF NOT EXISTS idx_srs_card_kind
  ON core_srs_card (user_ref, module, card_kind, concept_domain);
