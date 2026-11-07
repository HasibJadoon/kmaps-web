-- A Daily Fuṣḥā reading told as a film, the way the Kalīla stories are (owner, 2026-11-07: daily readings play in the
-- Kalīla film reader). Same columns as ar_storybook_telling, keyed by the reading ('ARDR:<slug>') instead of a story-book
-- row — ar_storybook_telling.story_id references ar_storybook(id) and a reading is not a story-book story.
-- Read by GET /ar/daily/readings/:slug/book (tellings + telling, ?lang=); written by kmaps-resources
-- scripts/tts/daily_media_queue.py (film step).
CREATE TABLE IF NOT EXISTS ar_reading_telling (
  reading_id     TEXT NOT NULL,                   -- 'ARDR:<slug>' (ar_daily_reading.slug)
  lang           TEXT NOT NULL,                   -- ar | en → ar_practice_label scope 'storybook_lang'
  audio_key      TEXT NOT NULL,                   -- the mixed soundtrack (km-arabic-audio)
  audio_seconds  REAL,
  intro_sec      REAL NOT NULL DEFAULT 0,
  story_sec      REAL,
  film_json      TEXT NOT NULL DEFAULT '{}',      -- {opening, ending, style, shots[], phrases[], pages[]}
  grid_json      TEXT,
  status         TEXT NOT NULL DEFAULT 'live',
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (reading_id, lang)
);
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_reading_telling_i AFTER INSERT ON ar_reading_telling BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_reading_telling_u AFTER UPDATE ON ar_reading_telling BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_reading_telling_d AFTER DELETE ON ar_reading_telling BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
