-- Each library work's shelf and reading level, as judged from the book itself (owner, 2026-11-07: "should come directly
-- from book … assign table"). One row per work: the shelf (meta.shape) and level it was given, the pages sampled, what
-- was measured on them, and why. ar_acquisition_ref.level and meta.shape carry the result the app reads; this table is
-- the evidence and the record of who assigned what, so a level can be checked and redone.
CREATE TABLE IF NOT EXISTS ar_work_assessment (
  work_id        TEXT PRIMARY KEY,           -- ar_acquisition_ref.id
  shape          TEXT,                       -- the shelf: prose, mukhtarat, shuruh, adab, khutab, akhbar, lugha, arud …
  level          TEXT,                       -- CEFR A1–C2 (band: A1–A2 Level 1, B1–B2 Level 2, C1–C2 Level 3)
  prev_shape     TEXT,
  prev_level     TEXT,
  sample_seqs    TEXT,                       -- JSON array of the ar_text_unit seqs read
  vowel_ratio    REAL,                       -- ḥarakāt per Arabic letter on the sample
  words_per_sentence REAL,                   -- average sentence (or verse line) length on the sample
  rare_ratio     REAL,                       -- share of rare words on the sample, when measured
  is_poetry      INTEGER,                    -- 1 when the sample is verse
  reason         TEXT,                       -- one line: why this shelf and level
  method         TEXT,                       -- how it was assessed (rubric version / who)
  assessed_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_work_assessment_level ON ar_work_assessment(level);
CREATE INDEX IF NOT EXISTS idx_ar_work_assessment_shape ON ar_work_assessment(shape);
