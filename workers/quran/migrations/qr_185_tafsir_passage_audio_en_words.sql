-- A passage's English read with its words timed (owner, 2026-11-04: "English words are not timed … word slider and timing
-- in English same way as Arabic, moving"): every word of the passage's English as served (split on spaces) with its
-- [start, end] in the recording, and the span its heading is said in — {"w": [[s, e], …], "h": [s, e]}. Written by
-- kmaps-resources scripts/tts/en_moods.py; null for an English recording read without them.
ALTER TABLE qr_tafsir_passage_audio_en ADD COLUMN words_json TEXT;
