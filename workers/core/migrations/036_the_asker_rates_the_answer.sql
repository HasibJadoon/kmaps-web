ALTER TABLE core_bank_response ADD COLUMN asker_rating INTEGER
  CHECK (asker_rating IS NULL OR asker_rating BETWEEN 1 AND 5);
ALTER TABLE core_bank_response ADD COLUMN asker_ref TEXT;

CREATE INDEX IF NOT EXISTS ix_bank_response_rated
  ON core_bank_response (respondent_ref, asker_rating)
  WHERE asker_rating IS NOT NULL;
