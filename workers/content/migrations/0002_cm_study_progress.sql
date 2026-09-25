-- Study progress: how far each person has got through each step of a study,
-- and how long they have actually spent on it. One row per study × person ×
-- step; the player reports as slides are read, the monitor reads it back.
-- active_seconds counts only time with the step open and the app in front.
CREATE TABLE IF NOT EXISTS cm_study_progress (
  study_id        TEXT NOT NULL REFERENCES cm_documents(doc_id),
  core_user_ref   TEXT NOT NULL,
  step_n          INTEGER NOT NULL,
  started_at      TEXT,
  last_at         TEXT,
  completed_at    TEXT,
  active_seconds  INTEGER NOT NULL DEFAULT 0,
  slides_seen     INTEGER NOT NULL DEFAULT 0,
  slide_count     INTEGER,
  PRIMARY KEY (study_id, core_user_ref, step_n)
);
CREATE INDEX IF NOT EXISTS idx_cm_study_progress_study ON cm_study_progress(study_id);
