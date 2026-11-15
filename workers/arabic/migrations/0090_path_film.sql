-- The Qurʾān path's FINAL films (owner 2026-11-11: "Surah → day → the same 4 final artifacts and audio … this will cover
-- the entire Qurʾān"): per piece of a day (ar_daily_reading 'ARDR:path-dNNN-<piece>') and per language, the finished film
-- (mp4, phone size), the same piece as audio only, and a poster. Written by kmaps-resources scripts/tts/publish_path_films.py
-- once the owner has finalised a day; read by GET /ar/quran/surahs and /ar/quran/surahs/:no (routes/quran-path.ts).
-- Each language's poem keeps its own poet, bed and look, so a row is never shared across languages.
CREATE TABLE IF NOT EXISTS ar_path_film (
  reading_id   TEXT NOT NULL,                     -- 'ARDR:<slug>' (ar_daily_reading.slug)
  lang         TEXT NOT NULL,                     -- ar | en | ur → ar_practice_label scope 'storybook_lang'
  video_key    TEXT NOT NULL,                     -- km-arabic-audio key, video/mp4
  audio_key    TEXT,                              -- the film's sound alone, audio/mp4
  poster_key   TEXT,                              -- image/jpeg
  seconds      REAL,
  width        INTEGER,
  height       INTEGER,
  status       TEXT NOT NULL DEFAULT 'live',
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (reading_id, lang)
);
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_path_film_i AFTER INSERT ON ar_path_film BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_path_film_u AFTER UPDATE ON ar_path_film BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_path_film_d AFTER DELETE ON ar_path_film BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
