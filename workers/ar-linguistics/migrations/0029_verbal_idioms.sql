ALTER TABLE ar_ling_expressions ADD COLUMN source_slug      TEXT;
ALTER TABLE ar_ling_expressions ADD COLUMN root_ar          TEXT;
ALTER TABLE ar_ling_expressions ADD COLUMN lemma_ar         TEXT;
ALTER TABLE ar_ling_expressions ADD COLUMN surface_ar       TEXT;
ALTER TABLE ar_ling_expressions ADD COLUMN preposition_ar   TEXT;
ALTER TABLE ar_ling_expressions ADD COLUMN surah            INTEGER;
ALTER TABLE ar_ling_expressions ADD COLUMN ayah             INTEGER;
ALTER TABLE ar_ling_expressions ADD COLUMN source_page      INTEGER;
ALTER TABLE ar_ling_expressions ADD COLUMN construction_en  TEXT;
ALTER TABLE ar_ling_expressions ADD COLUMN notes_md         TEXT;
ALTER TABLE ar_ling_expressions ADD COLUMN usage_note       TEXT;
ALTER TABLE ar_ling_expressions ADD COLUMN match_method     TEXT;
ALTER TABLE ar_ling_expressions ADD COLUMN confidence       TEXT;
ALTER TABLE ar_ling_expressions ADD COLUMN status           TEXT NOT NULL DEFAULT 'live';
ALTER TABLE ar_ling_expressions ADD COLUMN updated_at       TEXT;

CREATE INDEX IF NOT EXISTS idx_alx_ayah       ON ar_ling_expressions(surah, ayah);
CREATE INDEX IF NOT EXISTS idx_alx_root       ON ar_ling_expressions(root_ar);
CREATE INDEX IF NOT EXISTS idx_alx_type       ON ar_ling_expressions(expression_type_id);
CREATE INDEX IF NOT EXISTS idx_alx_confidence ON ar_ling_expressions(confidence);
CREATE INDEX IF NOT EXISTS idx_alx_source     ON ar_ling_expressions(source_slug);

INSERT INTO ar_ling_sources
  (id, slug, title_ar, title_en, author_name, source_type, genre, origin, source_order)
VALUES
  ('SRC:MIR:VERBAL_IDIOMS', 'mir_verbal_idioms',
   'التعبيرات الفعلية الاصطلاحية في القرآن', 'Verbal Idioms of the Qurʾān',
   'Mustansir Mir', 'modern_scholarship', 'quranic_idiom_dictionary', 'import', 22)
ON CONFLICT(id) DO UPDATE SET
  title_en = excluded.title_en, genre = excluded.genre, source_order = excluded.source_order;
