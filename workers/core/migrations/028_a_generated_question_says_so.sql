ALTER TABLE core_quiz_question ADD COLUMN source TEXT NOT NULL DEFAULT 'authored';
ALTER TABLE core_quiz_question ADD COLUMN generated_from TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS ux_quiz_generated
  ON core_quiz_question (generated_from) WHERE generated_from IS NOT NULL;
