-- ─── A question knows where it lives ──────────────────────────────────────────
--
-- `resource_ref` alone cannot answer the questions a host actually asks when
-- picking: "everything on sūrah 44", "just this passage", "the vocabulary step",
-- "44:3 to 44:9". A single text column can hold one of those and be searched
-- with LIKE for another, badly.
--
-- So the scope is spelled out. The order is the one a host narrows in:
--
--   module   the domain — Qurʾān, linguistics, worldview, Arabic, English
--   surah    then, inside the Qurʾān
--   from/to  the verses, which is what makes a passage a passage
--   step     and which part of studying it — reading, vocabulary, grammar…
--
-- `passage_ref` keeps the canonical id (QR:SP:44:1-9) when the question was
-- written against an authored passage, so a question survives a boundary being
-- re-cut: the range says where it is now, the ref says what it was written for.

ALTER TABLE core_quiz_question ADD COLUMN surah INTEGER;
ALTER TABLE core_quiz_question ADD COLUMN ayah_from INTEGER;
ALTER TABLE core_quiz_question ADD COLUMN ayah_to INTEGER;
ALTER TABLE core_quiz_question ADD COLUMN passage_ref TEXT;
-- One of cyb_process_step's keys: reading | vocabulary | sentence_structure |
-- passage_structure | tafsir | worldview. Left free rather than CHECKed because
-- the step registry lives in another database and a copy of its vocabulary here
-- would be a second place to keep in step.
ALTER TABLE core_quiz_question ADD COLUMN step_key TEXT;

CREATE INDEX IF NOT EXISTS ix_quiz_question_scope
  ON core_quiz_question (module, surah, ayah_from, ayah_to);
CREATE INDEX IF NOT EXISTS ix_quiz_question_step
  ON core_quiz_question (step_key);
