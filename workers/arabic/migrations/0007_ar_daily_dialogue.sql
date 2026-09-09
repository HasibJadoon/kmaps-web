-- Dialogues — the spoken opening of a domain, the way a unit of العربية بين
-- يديك opens: two people in the setting, a handful of turns, before any word
-- list. A learner who wants to speak the market needs to have heard someone
-- speak it; a vocabulary grid alone teaches recognition.
--
-- A dialogue belongs to a set (ar_daily_theme) like the words and passages
-- do, so it rolls up into its domain with them. Turns are rows, not a JSON
-- blob: each one is a line a learner will replay, record against, or hang a
-- note on, and each needs its own audio key.
--
-- image_key points into the kmaps-assets bucket: ABY puts a photograph beside
-- every dialogue and every presented word, and the picture is what makes a
-- word stick without a translation. NULL until the assets exist.

CREATE TABLE ar_daily_dialogue (
  id          TEXT PRIMARY KEY,               -- 'ARDD:<set slug>:<n>'
  theme_id    TEXT NOT NULL REFERENCES ar_daily_theme(id) ON DELETE CASCADE,
  title_ar    TEXT NOT NULL,                  -- e.g. 'فِي السُّوقِ'
  title_en    TEXT,
  setting_ar  TEXT,                           -- one line: who, where
  image_key   TEXT,                           -- kmaps-assets
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_daily_dialogue_turn (
  id          TEXT PRIMARY KEY,               -- '<dialogue id>:t<n>'
  dialogue_id TEXT NOT NULL REFERENCES ar_daily_dialogue(id) ON DELETE CASCADE,
  speaker_ar  TEXT NOT NULL,                  -- 'أَحْمَد'
  text_ar     TEXT NOT NULL,                  -- fully vocalised
  gloss_en    TEXT NOT NULL,
  word_id     TEXT REFERENCES ar_daily_word(id),  -- the word this turn puts to use, if one
  audio_key   TEXT,                           -- km-arabic-audio
  sort_order  INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE ar_daily_word ADD COLUMN image_key TEXT;

CREATE INDEX idx_ar_daily_dialogue_theme    ON ar_daily_dialogue(theme_id, sort_order);
CREATE INDEX idx_ar_daily_dialogue_turn_dlg ON ar_daily_dialogue_turn(dialogue_id, sort_order);
