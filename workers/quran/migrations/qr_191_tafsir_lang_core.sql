-- qr_191 — the language of tafsīr worth mastering, learner-independent (owner 2026-11-25: "put frequency and must master
-- these concepts"). Formulas (تقدّم ذكره، فإن قيل … قلنا، والظاهر …), key words, grammar terms and translation rules, each with
-- how often it occurs across every tafsīr book (qr_tafsir_block_norm_fts) and a tier: 1 must master · 2 important · 3 later.
-- The owner's weak points link here (qr_tafsir_practice_weak.core_id); drills are authored from it later (cyb_drill bank).
CREATE TABLE IF NOT EXISTS qr_tafsir_lang_core (
  id            TEXT PRIMARY KEY,                    -- TLC:<kind>:<key>
  kind          TEXT NOT NULL CHECK (kind IN ('formula','word','phrase','term','rule')),
  key           TEXT NOT NULL,                       -- bare Arabic (or a rule slug)
  label_ar      TEXT,                                -- vocalised, as shown
  label_en      TEXT NOT NULL,                       -- what it means
  how_en        TEXT,                                -- how to put it into English
  corpus_query  TEXT,                                -- the bare form counted (single word: with clitic forms; phrase: exact)
  corpus_n      INTEGER,                             -- tafsīr blocks holding it (all books)
  books_n       INTEGER,                             -- how many tafsīr books use it
  by_book_json  TEXT CHECK (by_book_json IS NULL OR json_valid(by_book_json)),   -- {source_slug: n}
  tier          INTEGER NOT NULL DEFAULT 2 CHECK (tier IN (1,2,3)),
  gram_term_id  TEXT,                                -- km_arabic_linguistic ar_ling_gram_term id
  root_id       TEXT,                                -- km_arabic_linguistic ar_ling_roots id
  lesson_doc_id TEXT,                                -- km_content deck/doc that teaches it
  example_ar    TEXT,
  example_ref   TEXT,                                -- qr_tafsir_book_display_block.id
  note_md       TEXT,
  computed_at   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (kind, key)
);
CREATE INDEX IF NOT EXISTS idx_qr_tlc_tier ON qr_tafsir_lang_core (tier, corpus_n DESC);
ALTER TABLE qr_tafsir_practice_weak ADD COLUMN core_id TEXT;   -- → qr_tafsir_lang_core.id
