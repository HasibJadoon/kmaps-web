ALTER TABLE st_participants ADD COLUMN core_user_ref TEXT;
CREATE INDEX IF NOT EXISTS idx_st_participants_user
  ON st_participants(core_user_ref);
