-- ─── Scope is a facet, not a ladder ───────────────────────────────────────────
--
-- A question can be about a whole sūrah, or one passage, or a topic that runs
-- across both, or a worldview that has nothing to do with either. Forcing all
-- of those down one ladder — domain, then sūrah, then passage, then step —
-- makes the middle rungs mandatory, and a question about tawḥīd across the
-- Qurʾān then has to pretend to belong to a sūrah it does not.
--
-- So the columns are independent. A question fills in the ones it has:
--
--   surah alone            the whole sūrah
--   surah + ayah range     one passage
--   step_key               which part of studying it
--   topic                  a thread that runs across passages
--   concept_ref            a registered concept (CN:…), shared with worldviews
--
-- Any of them may be null, and a picker offers whichever the bank has.
ALTER TABLE core_quiz_question ADD COLUMN topic TEXT;
-- The global concept id, so a question and a worldview position can be about
-- provably the same thing rather than about two strings that look alike.
ALTER TABLE core_quiz_question ADD COLUMN concept_ref TEXT;

CREATE INDEX IF NOT EXISTS ix_quiz_question_topic   ON core_quiz_question (topic);
CREATE INDEX IF NOT EXISTS ix_quiz_question_concept ON core_quiz_question (concept_ref);
