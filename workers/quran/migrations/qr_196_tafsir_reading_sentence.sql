-- qr_196 — owner 2026-11-25 (decision B): qr_tafsir_sentence becomes the one reading-unit table for every tafsīr book.
-- Before: only audio-backed sentences (a span of recorded lines + English gist/meaning, all NOT NULL).
-- After:  the same rows (unit_kind 'audio_sentence', untouched) plus reading-sheet sentences (unit_kind 'reading') that
--         point at a span of a read page's text, with their passage and reading order. Audio and English become optional.
-- Re-cuts never delete a referenced row: old rows get status 'superseded'; `cut` names the cut (r1, r2, …).
-- Reading rows are loaded with status 'reading' so the practice screen (status = 'live') keeps showing only audio sentences.
-- Links out (grammar books, WV, Shamela, slides) use existing link tables with the sentence id as the scope ref:
--   km_arabic_linguistic.ar_ling_concept_external_link (to_kind 'quran_scope', role 'applied_at'), km_worldview
--   wv_node_quran_links / wv_evidence_scope_links, km_quran qr_doc_link / qr_lc_binding. No new table.
PRAGMA defer_foreign_keys = true;

CREATE TABLE qr_tafsir_sentence_new (
  id          TEXT PRIMARY KEY,
  audio_id    TEXT REFERENCES qr_tafsir_audio(id),          -- NULL for a reading unit without audio
  source_slug TEXT NOT NULL,
  seq_from    INTEGER,                                      -- recorded-line span (audio sentences)
  seq_to      INTEGER,
  surah       INTEGER NOT NULL,
  ayah_from   INTEGER NOT NULL,
  ayah_to     INTEGER NOT NULL,
  gist_en     TEXT,
  wrong_json  TEXT NOT NULL DEFAULT '[]',
  concept_en  TEXT,
  concept_ar  TEXT,
  terms_json  TEXT NOT NULL DEFAULT '[]',                   -- grammar/term refs (GT:…), filled gradually as they are studied
  meaning_en  TEXT,
  status      TEXT NOT NULL DEFAULT 'live',                 -- live (audio, on the practice screen) | reading | superseded
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  word_from   INTEGER NOT NULL DEFAULT 0,
  unit_kind   TEXT NOT NULL DEFAULT 'audio_sentence',       -- audio_sentence | reading
  passage_id  TEXT,                                         -- qr_surah_study_passage.id, or QR:SP:<surah>:intro
  seq         INTEGER,                                      -- reading order within the passage = qr_tafsir_practice_attempt.seq
  page_id     TEXT,                                         -- qr_tafsir_read_page.id the text is cut from
  char_start  INTEGER,                                      -- 0-based offset of text_ar in that page's text_ar (NULL if not found verbatim)
  char_len    INTEGER,
  text_ar     TEXT,                                         -- the sentence, verbatim
  cut         TEXT,                                         -- which segmentation (r1 = first reading-sheet cut)
  updated_at  TEXT,
  CHECK (seq_to >= seq_from)
);
INSERT INTO qr_tafsir_sentence_new (id,audio_id,source_slug,seq_from,seq_to,surah,ayah_from,ayah_to,gist_en,wrong_json,concept_en,
  concept_ar,terms_json,meaning_en,status,created_at,word_from)
SELECT id,audio_id,source_slug,seq_from,seq_to,surah,ayah_from,ayah_to,gist_en,wrong_json,concept_en,
  concept_ar,terms_json,meaning_en,status,created_at,word_from FROM qr_tafsir_sentence;
DROP TABLE qr_tafsir_sentence;
ALTER TABLE qr_tafsir_sentence_new RENAME TO qr_tafsir_sentence;
CREATE INDEX idx_qr_tafsir_sentence_audio ON qr_tafsir_sentence (audio_id, seq_from);
CREATE INDEX idx_qr_tafsir_sentence_span ON qr_tafsir_sentence (surah, status, ayah_from, ayah_to);
CREATE UNIQUE INDEX idx_qr_tafsir_sentence_reading ON qr_tafsir_sentence (source_slug, passage_id, cut, seq) WHERE unit_kind = 'reading';

-- the practice log points at the exact unit it translated
ALTER TABLE qr_tafsir_practice_attempt ADD COLUMN sentence_id TEXT;
