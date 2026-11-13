-- The Qurʾān PATH voices: how a word must be said, and every fix made to a voiced line (owner 2026-11-13: "build dictionary
-- in ElevenLabs for future — should not cause issue … store in ElevenLabs dictionary and your future reference … you can
-- make DB entries to quick verify"). Written by kmaps-resources scripts/tts/pronunciation_sync.py from
-- data/everyday/ur_say.json (+ ur_say_notes.json) — the same rows feed the generation pipeline (say_ur) and the ElevenLabs
-- workspace dictionary (voices/eleven/dictionaries/path_<lang>.pls). Not read by any app screen yet: a check table.

-- One row per word/phrase the voice must say a set way.
CREATE TABLE IF NOT EXISTS ar_path_pronunciation (
  lang        TEXT NOT NULL,                 -- ur | ar | en
  written     TEXT NOT NULL,                 -- as scripts write it (the grapheme)
  say         TEXT NOT NULL,                 -- what the voice is given instead (vowelled respelling / safer word)
  kind        TEXT NOT NULL DEFAULT 'vowel', -- homograph | vowel | name | word_swap
  meaning     TEXT,                          -- 'crows', 'sheep', 'foot'
  misread_as  TEXT,                          -- what the voice said wrongly ('koe', 'bhīṛ = crowd')
  decided_by  TEXT,                          -- 'owner 2026-11-13' …
  example     TEXT,                          -- where it was heard: 'D001 Series UR b106'
  in_eleven   INTEGER NOT NULL DEFAULT 0,    -- 1 once the rule is in the ElevenLabs workspace dictionary
  status      TEXT NOT NULL DEFAULT 'live',
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (lang, written)
);

-- One row per fix applied to a voiced line.
CREATE TABLE IF NOT EXISTS ar_path_voice_fix (
  id          TEXT PRIMARY KEY,              -- 'D001-play-ur-b106-kawway'
  day         INTEGER NOT NULL,
  piece       TEXT NOT NULL,                 -- story | series | poem
  lang        TEXT NOT NULL,
  line        TEXT NOT NULL,                 -- the run id: b106, b49c, l09r0
  word        TEXT,                          -- the word that was wrong
  fixed_to    TEXT,                          -- what it says now
  method      TEXT NOT NULL,                 -- patch (sentence/phrase spliced) | retake (whole line)
  span        TEXT,                          -- the replaced span in the take, '0.00-1.50 s'
  credits     INTEGER,
  generation  TEXT,                          -- ElevenLabs generation id
  backup      TEXT,                          -- where the old take was kept
  heard_ok    INTEGER,                       -- 1 = owner confirmed by ear
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_ar_path_voice_fix_day ON ar_path_voice_fix (day, piece, lang);
