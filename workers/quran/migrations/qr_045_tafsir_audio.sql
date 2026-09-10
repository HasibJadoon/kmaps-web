-- Tafsīr read aloud: a recording of a tafsīr book, synced to its text.
--
-- The tafsīr text lives in qr_tafsir_book_display_block (one entry per ayah
-- group, long entries split into paragraph blocks). A reading needs pages:
-- qr_tafsir_read_page is the page as read — an ayah group's entry in one piece,
-- or one of the book's front matter pieces (Ibn ʿĀshūr's ten muqaddimāt) that
-- the block table has no place for. Recordings are cut into parts that begin
-- and end on page boundaries; segments light one line at a time, with per-word
-- times in meta_json.w, exactly as ar_acq_audio_segment does for Arabic works.

CREATE TABLE IF NOT EXISTS qr_tafsir_read_page (
  id            TEXT PRIMARY KEY,                 -- QRTP:<source_slug>:<seq>
  source_slug   TEXT NOT NULL,                    -- → qr_tafsir_book_display_source.source_slug
  seq           INTEGER NOT NULL,                 -- reading order across the book
  kind          TEXT NOT NULL DEFAULT 'ayah',     -- 'front' | 'surah_preface' | 'ayah'
  surah_no      INTEGER,                          -- NULL for front matter
  ayah_group_key TEXT,                            -- "67:3-4"
  title_ar      TEXT,
  text_ar       TEXT NOT NULL,
  word_count    INTEGER NOT NULL DEFAULT 0,
  block_ids_json TEXT NOT NULL DEFAULT '[]',      -- the display blocks this page was built from
  status        TEXT NOT NULL DEFAULT 'live',
  meta_json     TEXT NOT NULL DEFAULT '{}',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source_slug, seq)
);
CREATE INDEX IF NOT EXISTS idx_qr_tafsir_read_page_surah ON qr_tafsir_read_page (source_slug, surah_no, seq);

CREATE TABLE IF NOT EXISTS qr_tafsir_audio (
  id            TEXT PRIMARY KEY,                 -- QRTA:<source_slug>:<nnn>
  source_slug   TEXT NOT NULL,
  seq           INTEGER NOT NULL,                 -- reading order of the recordings
  title_ar      TEXT,
  title_en      TEXT,
  speaker       TEXT,
  platform      TEXT,                             -- 'youtube' …
  source_url    TEXT,
  bucket        TEXT NOT NULL DEFAULT 'km-arabic-audio',
  object_key    TEXT NOT NULL UNIQUE,             -- served by /api/ar/audio/<key>
  mime_type     TEXT,
  duration_sec  REAL,
  size_bytes    INTEGER,
  sha256        TEXT,
  aligned       INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'live',
  meta_json     TEXT NOT NULL DEFAULT '{}',       -- {"pages": [...page ids...], "part": n, "reading": "full"|"parts"}
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_qr_tafsir_audio_source ON qr_tafsir_audio (source_slug, seq);

CREATE TABLE IF NOT EXISTS qr_tafsir_audio_segment (
  id          TEXT PRIMARY KEY,                   -- SEG:<audio id>:<seq>
  audio_id    TEXT NOT NULL REFERENCES qr_tafsir_audio(id),
  page_id     TEXT NOT NULL REFERENCES qr_tafsir_read_page(id),
  seq         INTEGER NOT NULL,
  start_sec   REAL NOT NULL,
  end_sec     REAL NOT NULL,
  text_ar     TEXT NOT NULL,
  confidence  REAL,
  meta_json   TEXT NOT NULL DEFAULT '{}',         -- {"w": [[start,end],...], "line": n}
  UNIQUE (audio_id, seq)
);
CREATE INDEX IF NOT EXISTS idx_qr_tafsir_audio_segment_page ON qr_tafsir_audio_segment (page_id, seq);
