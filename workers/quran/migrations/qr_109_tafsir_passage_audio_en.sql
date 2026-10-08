-- Each commentary passage's English read aloud: one recording per work over the passage (R2 km-arabic-audio,
-- tafsir-en/<work>/<sūra>-<from>-<to>.m4a), each editor's cut a span of it. Voiced offline (Kokoro, a British voice)
-- from the cut's own lines' English as spoken: Arabic glosses in brackets dropped, bare Arabic said in transliteration.
-- Keyed like qr_tafsir_passage_heading (recording, first line), so a cut and its English audio are one passage.
CREATE TABLE IF NOT EXISTS qr_tafsir_passage_audio_en (
  audio_id    TEXT NOT NULL,
  seq_from    INTEGER NOT NULL,
  seq_to      INTEGER NOT NULL,
  object_key  TEXT NOT NULL,
  start_sec   REAL NOT NULL,
  end_sec     REAL NOT NULL,
  voice       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'live',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (audio_id, seq_from)
);
