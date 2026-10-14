-- The grade by the AL lemma it is (vocab_grade.py matches root + lemma to ar_ling_root_lemma), so a worker that
-- holds AL ids — the AR scene words — can ask how hard a word is in the Qurʾān (POST /qr/internal/rows).
ALTER TABLE qr_vocab_grade ADD COLUMN al_lemma_ref TEXT;
CREATE INDEX IF NOT EXISTS idx_qr_vocab_grade_al ON qr_vocab_grade (al_lemma_ref);
