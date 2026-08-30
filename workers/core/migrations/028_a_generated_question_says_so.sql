-- ─── A generated question says so ─────────────────────────────────────────────
--
-- The QUESTION shape stays one shape. `core_quiz_question` already holds a
-- prompt, its options, the answer and the scope, and that is what lets one bank
-- be browsed by domain, sūrah, passage or step and one dashboard count all of
-- it. A second table for machine-made questions would split every one of those.
--
-- What differs is not the question, it is where it was EXTRACTED from — and the
-- sources genuinely differ: 242 of this learner's cards carry plain front/back
-- text, while the note-typed ones (root, lemma:sarf, word) carry no front text
-- at all and hold their content as structured fields. So the extraction is per
-- source, in code, and everything it produces lands in the one shape.
--
-- These two columns are what make that safe to re-run: a generated question
-- knows it was generated and which card it came from, so regenerating replaces
-- rather than duplicates, and an authored question is never touched by a job.
ALTER TABLE core_quiz_question ADD COLUMN source TEXT NOT NULL DEFAULT 'authored';
ALTER TABLE core_quiz_question ADD COLUMN generated_from TEXT;

-- One question per (card, template). Re-running the generator then updates in
-- place instead of laying a second copy of the same question beside the first.
CREATE UNIQUE INDEX IF NOT EXISTS ux_quiz_generated
  ON core_quiz_question (generated_from) WHERE generated_from IS NOT NULL;
