ALTER TABLE core_quiz_question ADD COLUMN topic TEXT;

ALTER TABLE core_quiz_question ADD COLUMN concept_ref TEXT;

CREATE INDEX IF NOT EXISTS ix_quiz_question_topic   ON core_quiz_question (topic);
CREATE INDEX IF NOT EXISTS ix_quiz_question_concept ON core_quiz_question (concept_ref);
