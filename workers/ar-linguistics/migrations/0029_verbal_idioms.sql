-- 0029_verbal_idioms.sql
-- Mir, *Verbal Idioms of the Qurʾān* — re-ingested from the source PDF.
--
-- The previous import stored a mangled OCR of this book as 2,189 rows typed
-- `quranic_expression`: pipe-joined root fragments for headwords, garbled English, and
-- primary_lemma_id NULL on every row, so nothing joined to a root. Those rows are
-- replaced here.
--
-- Every new row is anchored to a real Qurʾānic word: the citation's root must be
-- attested in the cited ayah (qr_word_occurrences). The Arabic stored below therefore
-- comes from QAC, never from the PDF's Arabic layer, which drops letters. `confidence`
-- records how the anchor was found; rows that could not be anchored are kept as
-- `needs_review` and must not be presented as verified data.

ALTER TABLE ar_ling_expressions ADD COLUMN source_slug      TEXT;
ALTER TABLE ar_ling_expressions ADD COLUMN root_ar          TEXT;
ALTER TABLE ar_ling_expressions ADD COLUMN lemma_ar         TEXT;   -- QAC lemma (vocalised)
ALTER TABLE ar_ling_expressions ADD COLUMN surface_ar       TEXT;   -- the ayah's surface form
ALTER TABLE ar_ling_expressions ADD COLUMN preposition_ar   TEXT;
ALTER TABLE ar_ling_expressions ADD COLUMN surah            INTEGER;
ALTER TABLE ar_ling_expressions ADD COLUMN ayah             INTEGER;
ALTER TABLE ar_ling_expressions ADD COLUMN source_page      INTEGER; -- printed page in Mir
ALTER TABLE ar_ling_expressions ADD COLUMN construction_en  TEXT;   -- "as a verb with a preposition"
ALTER TABLE ar_ling_expressions ADD COLUMN notes_md         TEXT;
ALTER TABLE ar_ling_expressions ADD COLUMN usage_note       TEXT;
ALTER TABLE ar_ling_expressions ADD COLUMN match_method     TEXT;   -- exact | verb_form | letters_dropped | …
ALTER TABLE ar_ling_expressions ADD COLUMN confidence       TEXT;   -- verified | derived | needs_review
ALTER TABLE ar_ling_expressions ADD COLUMN status           TEXT NOT NULL DEFAULT 'live';
ALTER TABLE ar_ling_expressions ADD COLUMN updated_at       TEXT;

CREATE INDEX IF NOT EXISTS idx_alx_ayah       ON ar_ling_expressions(surah, ayah);
CREATE INDEX IF NOT EXISTS idx_alx_root       ON ar_ling_expressions(root_ar);
CREATE INDEX IF NOT EXISTS idx_alx_type       ON ar_ling_expressions(expression_type_id);
CREATE INDEX IF NOT EXISTS idx_alx_confidence ON ar_ling_expressions(confidence);
CREATE INDEX IF NOT EXISTS idx_alx_source     ON ar_ling_expressions(source_slug);

-- The book itself, so the UI can label and cite it from data.
INSERT INTO ar_ling_sources
  (id, slug, title_ar, title_en, author_name, source_type, genre, origin, source_order)
VALUES
  ('SRC:MIR:VERBAL_IDIOMS', 'mir_verbal_idioms',
   'التعبيرات الفعلية الاصطلاحية في القرآن', 'Verbal Idioms of the Qurʾān',
   'Mustansir Mir', 'modern_scholarship', 'quranic_idiom_dictionary', 'import', 22)
ON CONFLICT(id) DO UPDATE SET
  title_en = excluded.title_en, genre = excluded.genre, source_order = excluded.source_order;
