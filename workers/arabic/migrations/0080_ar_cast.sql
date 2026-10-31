-- 0080_ar_cast.sql
--
-- The cast: every character of the family series, the everyday roles, the narrators and the «كليلة ودمنة» animals as
-- one profile — name, role, age, gender, a chip colour, a picture, and a VOICE (owner, 2026-10-31: "all different profiles
-- for audio"). The voice is a reference clip designed from `voice_prompt` with Qwen3-TTS VoiceDesign (Apache-2.0) and used
-- as SILMA's cloning reference (`voice_ref_text` is the clip's own text); `sample_key` is an audition clip in Arabic.
-- A reading names its speakers by this id (q_speaker / speaker in its ```read blocks; name and colour of the chip come
-- from here via the note's ```cast block). Source: kmaps-resources media/cast/cast.json; filled by
-- kmaps-resources/scripts/tts/publish_cast.py. Idempotent; not applied until the owner approves the voices.

CREATE TABLE IF NOT EXISTS ar_cast (
  id             TEXT PRIMARY KEY,                -- mommy, dad, ali, shopkeeper, storyteller, lion …
  name_en        TEXT NOT NULL,
  name_ar        TEXT NOT NULL,                   -- vowelled
  role           TEXT NOT NULL,                   -- mother, shopkeeper, the sly jackal …
  group_key      TEXT NOT NULL,                   -- family | everyday | friends | narration | story
  age_band       TEXT,                            -- 'adult 40', 'child 10', 'elder 70'
  gender         TEXT,                            -- m | f
  colour         TEXT NOT NULL,                   -- the speaker chip, #RRGGBB
  description    TEXT,                            -- the picture's fixed description (same style as cast.json)
  seed           INTEGER,                         -- the picture's seed
  picture_key    TEXT,                            -- R2 km-arabic-audio, served at /api/ar/audio/<key>
  voice_key      TEXT,                            -- the reference clip (wav)
  voice_ref_text TEXT,                            -- what the reference clip says
  voice_prompt   TEXT,                            -- the VoiceDesign prompt it was made from
  voice_json     TEXT,                            -- {model, license, speed, temperature, bridge…}
  sample_key     TEXT,                            -- an Arabic audition clip (m4a); story voices: narrated line + dialogue
  sample_text    TEXT,                            -- JSON [{speaker, text}]
  sort           INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'draft'    -- draft | approved | retired (the owner approves each voice)
);
CREATE INDEX IF NOT EXISTS idx_ar_cast_group ON ar_cast (group_key, sort);
