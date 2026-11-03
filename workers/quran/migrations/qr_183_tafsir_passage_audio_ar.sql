-- A commentary passage read anew in Arabic (owner, 2026-11-04: "new audio upload — for passage"): the passage's lines
-- voiced offline by SILMA in a teacher's moods (kmaps-resources scripts/tts/silma_moods.py), the Qurʾān quotes cut from
-- the work's own recording. One file per work over the passage (R2 km-arabic-audio tafsir-moods/<work>/...); the
-- passage reader plays it in place of the work's recording, each line and word at its time in it (times_json:
-- {"<seq>": [[start, end], ...one per word]}). The recording and its segment times stay as they are for every other
-- reader (the book pages, the drills). Keyed like qr_tafsir_passage_audio_en.
CREATE TABLE IF NOT EXISTS qr_tafsir_passage_audio_ar (
  audio_id    TEXT NOT NULL,
  seq_from    INTEGER NOT NULL,
  seq_to      INTEGER NOT NULL,
  object_key  TEXT NOT NULL,
  times_json  TEXT NOT NULL,
  voice       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'live',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (audio_id, seq_from)
);
