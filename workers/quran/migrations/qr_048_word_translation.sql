-- qr_048_word_translation.sql
--
-- Word by word: each word's meaning in its āyah, in English and Urdu (Quran.com's
-- word-by-word, which QUL also publishes). This is what vocabulary acquisition needs:
-- a word's meaning where it stands, not only its lemma's dictionary gloss.
--
-- Keyed by the word's position as Quran.com numbers it. That numbering matches
-- qr_word_occurrence.word_index on ~97% of āyāt (the same split as the recitation's
-- word timings); `aligned` marks the āyāt where it does, and only those are joined
-- to the corpus's words.
--
-- Apply with `d1 execute --file` (see qr_046: do not `migrations apply` km_quran).
CREATE TABLE IF NOT EXISTS qr_word_translation (
  surah     INTEGER NOT NULL,
  ayah      INTEGER NOT NULL,
  position  INTEGER NOT NULL,       -- Quran.com word position (1-based)
  lang      TEXT NOT NULL,          -- en | ur
  text      TEXT NOT NULL,
  word_ar   TEXT,                   -- the word as Quran.com writes it (to check the alignment)
  aligned   INTEGER NOT NULL DEFAULT 0,  -- 1 when the āyah's positions equal the corpus's word_index
  PRIMARY KEY (surah, ayah, position, lang)
);
CREATE INDEX IF NOT EXISTS idx_qr_word_translation_ayah ON qr_word_translation(surah, ayah, lang);
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_word_translation_i AFTER INSERT ON qr_word_translation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_word_translation_u AFTER UPDATE ON qr_word_translation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;
