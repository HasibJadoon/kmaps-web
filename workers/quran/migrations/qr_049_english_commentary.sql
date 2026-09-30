-- qr_049_english_commentary.sql
--
-- English commentary beside the eight Arabic tafsīrs, from Quran.com / QUL:
--   · qr_tafsir_en: Ibn Kathīr (abridged), Muftī Shafīʿ's Maʿārif al-Qurʾān and Wahiduddin
--     Khan's Tazkīr al-Qurʾān — each piece on the stretch of āyāt it comments on (the source
--     puts it on the stretch's first āyah; it runs to the āyah before the next piece);
--   · qr_surah_info: Maududi's introduction to each surah (Tafhīm al-Qurʾān) — its name,
--     period of revelation, background and themes, as sections. This is the "context"
--     layer where a source states it.
--
-- Apply with `d1 execute --file` (see qr_046: do not `migrations apply` km_quran).
CREATE TABLE IF NOT EXISTS qr_tafsir_en (
  id          TEXT PRIMARY KEY,        -- <source_code>:<surah>:<ayah_from>
  source_code TEXT NOT NULL,           -- ibn-kathir-abridged | maarif | tazkir
  source_name TEXT NOT NULL,
  surah       INTEGER NOT NULL,
  ayah_from   INTEGER NOT NULL,
  ayah_to     INTEGER NOT NULL,
  text_html   TEXT NOT NULL,
  text_plain  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_qr_tafsir_en_range ON qr_tafsir_en(surah, ayah_from, ayah_to);
CREATE TABLE IF NOT EXISTS qr_surah_info (
  surah         INTEGER NOT NULL,
  source        TEXT NOT NULL,         -- who wrote the introduction
  short_text    TEXT,
  sections_json TEXT NOT NULL,         -- [{"heading": "Period of Revelation", "text": "…"}, …]
  text_html     TEXT NOT NULL,
  PRIMARY KEY (surah, source)
);
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_tafsir_en_i AFTER INSERT ON qr_tafsir_en BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_qr_surah_info_i AFTER INSERT ON qr_surah_info BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;
