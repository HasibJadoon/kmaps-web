-- A recorded commentary's sentences, each with what it says and what it means, for the passage study's
-- "Understanding" step: the learner taps a sentence they don't follow and reads its concept and meaning;
-- a sentence marked "not understood" comes back as its drill (tafsir_understand: the gist among near misses).
-- A sentence is a run of a recording's lines (qr_tafsir_audio_segment seq), so its audio and words come from them.
CREATE TABLE IF NOT EXISTS qr_tafsir_sentence (
  id          TEXT PRIMARY KEY,                 -- tafsir_sent:<audio id>:<from>-<to>
  audio_id    TEXT NOT NULL REFERENCES qr_tafsir_audio(id),
  source_slug TEXT NOT NULL,
  seq_from    INTEGER NOT NULL,
  seq_to      INTEGER NOT NULL,
  surah       INTEGER NOT NULL,
  ayah_from   INTEGER NOT NULL,
  ayah_to     INTEGER NOT NULL,
  gist_en     TEXT NOT NULL,                    -- what it says, in one plain line: the drill's answer
  wrong_json  TEXT NOT NULL DEFAULT '[]',       -- near-miss misreadings: the drill's other choices
  concept_en  TEXT NOT NULL,                    -- the idea or language point, a short label
  concept_ar  TEXT,                             -- its registry term's Arabic name, when it is one
  terms_json  TEXT NOT NULL DEFAULT '[]',       -- the GT refs the sentence uses
  meaning_en  TEXT NOT NULL,                    -- what the commentator means, plainly
  status      TEXT NOT NULL DEFAULT 'live',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (seq_to >= seq_from)
);
CREATE INDEX IF NOT EXISTS idx_qr_tafsir_sentence_audio ON qr_tafsir_sentence (audio_id, seq_from);
