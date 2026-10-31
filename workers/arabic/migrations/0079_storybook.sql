-- 0079_storybook.sql
--
-- Story books: a work's tales (the 58 stories of «كليلة ودمنة» in its 19 chapters) set as picture pages read
-- aloud — each page the book's own Arabic, a plain English line, a picture, and its stretch of the recording
-- with a time for every word; a frame tale's pages are its own text, with a link page where a story is told
-- inside it; each story ends on a "Remember" page (the moral, and checks on the text).
--
-- A chapter is a row too (kind 'bab'): it carries the look its stories share (look_json: accent, gradient,
-- motif). Themes are labels (scope 'storybook_theme'); a story names its own in themes_json.
-- Filled by kmaps-resources/scripts/kalila/publish_book.py from data/kalila/book/*.json; served by
-- GET /ar/text/storybooks?work=… (the list: by chapter and by theme) and GET /ar/text/storybooks/:id.
-- Idempotent.

CREATE TABLE IF NOT EXISTS ar_storybook (
  id             TEXT PRIMARY KEY,                -- KD:05 (a chapter) or KD:05:03 (a story)
  acq_ref_id     TEXT NOT NULL,                   -- the work: ACQ:SHM:6321
  parent_id      TEXT,                            -- the chapter, or the story it is told inside
  chapter_id     TEXT,                            -- its chapter (a chapter: itself)
  kind           TEXT NOT NULL,                   -- bab | main | fable | parable | anecdote
  depth          INTEGER NOT NULL DEFAULT 0,
  seq            INTEGER NOT NULL DEFAULT 0,      -- reading order within the work
  title_ar       TEXT NOT NULL,
  title_en       TEXT,
  summary_en     TEXT,
  themes_json    TEXT NOT NULL DEFAULT '[]',      -- ["friendship", …] → ar_practice_label scope 'storybook_theme'
  look_json      TEXT NOT NULL DEFAULT '{}',      -- a chapter's {accent, gradient:[top,bottom], motif}
  audio_key      TEXT,                            -- the story's own cut (km-arabic-audio), page times relative to it
  audio_seconds  REAL,
  cover_key      TEXT,
  remember_json  TEXT NOT NULL DEFAULT '{}',      -- {title_en, speaker_en, moral_ar, moral_en, lesson_en, words, start, end, checks[]}
  authored       INTEGER NOT NULL DEFAULT 0,      -- 1 once vowelled, translated and checked by hand
  notes_json     TEXT NOT NULL DEFAULT '{}',
  status         TEXT NOT NULL DEFAULT 'live',
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_ar_storybook_ref ON ar_storybook (acq_ref_id, status, seq);
CREATE INDEX IF NOT EXISTS ix_ar_storybook_parent ON ar_storybook (parent_id, seq);

CREATE TABLE IF NOT EXISTS ar_storybook_page (
  story_id       TEXT NOT NULL REFERENCES ar_storybook(id),
  no             INTEGER NOT NULL,                -- 1-based
  kind           TEXT NOT NULL DEFAULT 'story',   -- story | link (a story told here: link_id)
  link_id        TEXT,
  text_ar        TEXT,                            -- as read (vowelled once authored)
  text_en        TEXT,                            -- a plain English line, shown on demand
  words_json     TEXT NOT NULL DEFAULT '[]',      -- [{t, s, e}]: each word, seconds in the story's own audio
  start_sec      REAL,                            -- in the story's own audio
  end_sec        REAL,
  rec_key        TEXT,                            -- the whole recording it is cut from, and where
  rec_start      REAL,
  rec_end        REAL,
  picture_key    TEXT,
  placeholder    INTEGER NOT NULL DEFAULT 1,      -- 1 while the picture is a placeholder card
  picture_brief  TEXT,
  lines_json     TEXT NOT NULL DEFAULT '[]',      -- Story mode: [{speaker, name?, text, from, to, audio: {key, start, end} | null}]
  sound_json     TEXT NOT NULL DEFAULT '{}',      -- {ambience: {id, gain_db, scene_in}, spots: [{id, word, gain_db}]} → ar_sfx
  PRIMARY KEY (story_id, no)
);

-- The shared sound library (kmaps-resources data/sfx/library.json → ~/Projects/sfx-library → km-arabic-audio sfx/…):
-- an id is what page data names; its key carries a content hash, so a re-rolled sound is a new key.
CREATE TABLE IF NOT EXISTS ar_sfx (
  id             TEXT PRIMARY KEY,                -- wind_breeze, drum_boom …
  object_key     TEXT NOT NULL,                   -- km-arabic-audio key of the m4a
  scene_in_key   TEXT,                            -- an ambience's short opening swell
  loopable       INTEGER NOT NULL DEFAULT 0,
  duration_sec   REAL,
  grp            TEXT,                            -- wind | ocean | water | forest | open | place | spot
  description    TEXT,
  source         TEXT,
  license        TEXT
);

-- the content cache version moves on any write (see kmaps_cache_version.sql)
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_storybook_i AFTER INSERT ON ar_storybook BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_storybook_u AFTER UPDATE ON ar_storybook BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_storybook_d AFTER DELETE ON ar_storybook BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_storybook_page_i AFTER INSERT ON ar_storybook_page BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_storybook_page_u AFTER UPDATE ON ar_storybook_page BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_sfx_i AFTER INSERT ON ar_sfx BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_sfx_u AFTER UPDATE ON ar_sfx BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_storybook_page_d AFTER DELETE ON ar_storybook_page BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

-- The words the story book shows. The app renders them as sent; none is written in Swift.
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('storybook', 'entry',      'Read as a story book', 'قِصَصٌ مُصَوَّرَةٌ', 'The fables, a picture on every page, read aloud', 'book.pages', '#C9A84C', NULL, NULL, 1),
 ('storybook', 'by_chapter', 'By chapter', 'الْأَبْوَابُ', NULL, 'list.bullet.indent', NULL, NULL, NULL, 2),
 ('storybook', 'by_theme',   'By theme', 'الْمَوْضُوعَاتُ', NULL, 'square.grid.2x2', NULL, NULL, NULL, 3),
 ('storybook', 'english',    'English', NULL, 'Show the English line', 'character.bubble', NULL, NULL, NULL, 4),
 ('storybook', 'remember',   'Remember', 'تَذَكَّرْ', NULL, 'lightbulb', '#E8C96A', NULL, NULL, 5),
 ('storybook', 'checks',     'Check yourself', NULL, 'Questions on the story', 'checkmark.circle', NULL, NULL, NULL, 6),
 ('storybook', 'right',      'Right', NULL, NULL, 'checkmark', '#7BC47F', NULL, NULL, 7),
 ('storybook', 'wrong',      'Not quite', NULL, NULL, 'xmark', '#E07A6B', NULL, NULL, 8),
 ('storybook', 'again',      'Read it again', NULL, NULL, 'arrow.counterclockwise', NULL, NULL, NULL, 9),
 ('storybook', 'next',       'Next story', NULL, NULL, 'arrow.right', NULL, NULL, NULL, 10),
 ('storybook', 'inside',     'A story told here', NULL, 'Open it, then come back to this page', 'book.closed', NULL, NULL, NULL, 11),
 ('storybook', 'open',       'Open the story', NULL, NULL, 'arrow.up.right', NULL, NULL, NULL, 12),
 ('storybook', 'pages',      'pages', NULL, NULL, NULL, NULL, NULL, NULL, 13),
('storybook', 'sound',      'Sound', NULL, 'Scene sounds under the reading', 'speaker.wave.2.fill', NULL, NULL, NULL, 15),
 ('storybook', 'read_mode',  'Read', NULL, 'The recording', 'waveform', NULL, NULL, NULL, 16),
 ('storybook', 'story_mode', 'Story', NULL, 'A cast of voices', 'person.wave.2', NULL, NULL, NULL, 17),
 ('storybook', 'not_yet',    'Arabic not yet vowelled', NULL, 'This story is shown as the edition prints it until its pages are checked by hand', 'textformat', NULL, NULL, NULL, 14),
 ('storybook_theme', 'friendship', 'Friendship and loyalty', 'الصَّدَاقَةُ وَالْوَفَاءُ', NULL, 'person.2.fill', '#7FB685', NULL, NULL, 1),
 ('storybook_theme', 'slander',    'Deceit and slander', 'الْمَكْرُ وَالْوِشَايَةُ', NULL, 'theatermasks.fill', '#C77D7D', NULL, NULL, 2),
 ('storybook_theme', 'greed',      'Greed and contentment', 'الطَّمَعُ وَالْقَنَاعَةُ', NULL, 'bag.fill', '#D9A15B', NULL, NULL, 3),
 ('storybook_theme', 'haste',      'Haste and patience', 'الْعَجَلَةُ وَالْأَنَاةُ', NULL, 'hourglass', '#8FA8D8', NULL, NULL, 4),
 ('storybook_theme', 'kingship',   'Counsel and kingship', 'الْمَشُورَةُ وَالْمُلْكُ', NULL, 'crown.fill', '#C9A84C', NULL, NULL, 5),
 ('storybook_theme', 'trust',      'Trust and betrayal', 'الْأَمَانَةُ وَالْخِيَانَةُ', NULL, 'hand.raised.fill', '#B48CC8', NULL, NULL, 6),
 ('storybook_theme', 'knowledge',  'Knowledge and action', 'الْعِلْمُ وَالْعَمَلُ', NULL, 'book.fill', '#6FB7B7', NULL, NULL, 7),
 ('storybook_theme', 'caution',    'Fate and caution', 'الْقَدَرُ وَالْحَذَرُ', NULL, 'shield.lefthalf.filled', '#9AA7B5', NULL, NULL, 8),
 ('storybook_theme', 'wit',        'Wit over strength', 'الْحِيلَةُ وَالْقُوَّةُ', NULL, 'lightbulb.fill', '#E3C565', NULL, NULL, 9),
 ('storybook_theme', 'speech',     'Speech and silence', 'الْكَلَامُ وَالصَّمْتُ', NULL, 'bubble.left.fill', '#A8CDF0', NULL, NULL, 10),
 ('storybook_theme', 'place',      'Knowing your place', 'مَعْرِفَةُ الْمَرْءِ قَدْرَهُ', NULL, 'figure.stand', '#C49A6C', NULL, NULL, 11),
 ('storybook_theme', 'justice',    'Justice and mercy', 'الْعَدْلُ وَالرَّحْمَةُ', NULL, 'scalemass.fill', '#86B0A0', NULL, NULL, 12);
