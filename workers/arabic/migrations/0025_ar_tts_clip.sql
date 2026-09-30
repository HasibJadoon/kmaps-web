-- A voice for Arabic that nobody recorded: SILMA TTS clips, rendered on this side
-- (kmaps-resources scripts/tts/silma_clips.py), checked word by word with Whisper, stored in
-- the km-arabic-audio bucket and served like every other recording (GET /ar/audio/<key>).
--
-- A clip is keyed by the text it speaks: text_hash = sha1 of the text as shown (NFC, runs of
-- white space as one space, trimmed), so any drill — a book sentence, a lexicon quote, an arc
-- rung, a grammar example — finds its audio by hashing its own text. words_json times each
-- white-space token of that text: [[start, end], …] in seconds inside the clip.
-- Qurʾān text is never rendered here: it has al-ʿAfāsī's recitation.
CREATE TABLE IF NOT EXISTS ar_tts_clip (
  text_hash    TEXT PRIMARY KEY,
  text_ar      TEXT NOT NULL,          -- the text as shown (the tokens words_json times)
  spoken_ar    TEXT,                   -- what the voice was given (vocalised, symbols and numbers spelled)
  voice        TEXT NOT NULL DEFAULT 'silma',
  object_key   TEXT NOT NULL,          -- km-arabic-audio key
  duration_sec REAL NOT NULL,
  words_json   TEXT NOT NULL,
  match_rate   REAL,                   -- share of words Whisper heard as written in the kept take
  source       TEXT,                   -- read_pool | arc_rung | gram_example | request
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Texts a drill asked for and found no clip: the render script drains this queue.
CREATE TABLE IF NOT EXISTS ar_tts_request (
  text_hash    TEXT PRIMARY KEY,
  text_ar      TEXT NOT NULL,
  source       TEXT,
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  status       TEXT NOT NULL DEFAULT 'pending'   -- pending | done | skipped (Qurʾān, unreadable)
);
CREATE INDEX IF NOT EXISTS idx_ar_tts_request_status ON ar_tts_request(status);

-- The book sentences (Read & fill) carry their clip like the listening lines carry theirs.
ALTER TABLE ar_read_pool ADD COLUMN object_key TEXT;
ALTER TABLE ar_read_pool ADD COLUMN start_sec REAL;
ALTER TABLE ar_read_pool ADD COLUMN end_sec REAL;
ALTER TABLE ar_read_pool ADD COLUMN words_json TEXT;
