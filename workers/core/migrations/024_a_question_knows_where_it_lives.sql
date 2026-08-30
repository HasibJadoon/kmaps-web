ALTER TABLE core_quiz_question ADD COLUMN surah INTEGER;
ALTER TABLE core_quiz_question ADD COLUMN ayah_from INTEGER;
ALTER TABLE core_quiz_question ADD COLUMN ayah_to INTEGER;
ALTER TABLE core_quiz_question ADD COLUMN passage_ref TEXT;

ALTER TABLE core_quiz_question ADD COLUMN step_key TEXT;

CREATE INDEX IF NOT EXISTS ix_quiz_question_scope
  ON core_quiz_question (module, surah, ayah_from, ayah_to);
CREATE INDEX IF NOT EXISTS ix_quiz_question_step
  ON core_quiz_question (step_key);
