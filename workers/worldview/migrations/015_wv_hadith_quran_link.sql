-- Hadith -> Qur'an references. One row per (hadith, Qur'an place or concept, method).
-- hadith_ref = wv_corpus_block.id of a hadith corpus (wv-corp-hadith-*), e.g. SRC:HADITH:BUKHARI#4474,
-- the same ref ar_ling_source_citation uses. Typed refs only (QR:s:a, QR:s:a-b, GC:/CN: concept ids): no Qur'an text is copied.
--   method: tafsir_chapter (the book's own tafsir chapter heading names the sura/ayah)
--           quoted_text    (the hadith text contains a run of the ayah's words)
--           named          (the hadith or its heading names a sura / gives a verse reference)
--           concept_terms  (the concept's own label terms occur in the Arabic and English text; quran_ref NULL, join via the concept)
-- confidence: 0..1. tafsir_chapter/named/quoted 0.6-1.0; concept_terms 0.3-0.7. evidence: the matched words / the heading.
CREATE TABLE IF NOT EXISTS wv_hadith_quran_link (
  id            TEXT PRIMARY KEY,               -- <method>:<sha1(hadith|quran|concept)[:20]>, stable
  hadith_ref    TEXT NOT NULL,
  collection    TEXT NOT NULL,                  -- BUKHARI, MUSLIM, ABU_DAWUD, TIRMIDHI, NASAI, IBN_MAJAH, MALIK, NAWAWI40, QUDSI40
  quran_ref     TEXT,                           -- QR:2:255 | QR:1:1-7 ; NULL for a concept-only link
  surah         INTEGER,
  ayah_from     INTEGER,
  ayah_to       INTEGER,
  concept_ref   TEXT,                           -- core_concept.id (GC:…)
  method        TEXT NOT NULL CHECK (method IN ('tafsir_chapter','quoted_text','named','concept_terms')),
  confidence    REAL NOT NULL,
  evidence      TEXT NOT NULL,
  evidence_json TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_hqlink_hadith  ON wv_hadith_quran_link(hadith_ref);
CREATE INDEX IF NOT EXISTS ix_hqlink_quran   ON wv_hadith_quran_link(surah, ayah_from, ayah_to);
CREATE INDEX IF NOT EXISTS ix_hqlink_concept ON wv_hadith_quran_link(concept_ref);
CREATE INDEX IF NOT EXISTS ix_hqlink_method  ON wv_hadith_quran_link(collection, method);
