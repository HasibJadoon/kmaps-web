CREATE TABLE IF NOT EXISTS qr_study_questions (
  id            TEXT PRIMARY KEY,
  surah         INTEGER NOT NULL,
  passage_id    TEXT,
  scope_ref     TEXT,
  ayah_from     INTEGER,
  ayah_to       INTEGER,
  question_type TEXT NOT NULL DEFAULT 'comprehension',
  question_en   TEXT NOT NULL,
  question_ar   TEXT,
  options_json  TEXT,
  answer_md     TEXT,
  difficulty    TEXT NOT NULL DEFAULT 'standard',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'draft',
  note_md       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id),
  FOREIGN KEY (passage_id) REFERENCES qr_surah_study_passages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_qrsq_passage ON qr_study_questions(passage_id, sort_order);
