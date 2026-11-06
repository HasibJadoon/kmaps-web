-- 0082_storybook_telling.sql
--
-- A finished story told the way its film tells it, once per language (Arabic, English, Urdu): the film's own mixed
-- soundtrack (storyteller, music, ambience and every effect), its shots with their timing and camera moves, the
-- words at the bottom in phrases of at most two lines (each word with its time and whether it is a key word of the
-- story), the title card and the end card; the Arabic telling ends on the story's word grid (verbs, nouns,
-- expressions — pictures and the grid's own soundtrack, each card with when it lands and when each form is said).
--
-- Every time is in seconds of the telling's soundtrack. Filled by kmaps-resources/scripts/kalila/publish_tellings.py
-- from the film files (~/Projects/kalila-book/<KD_05_03>/trials, data/kalila/{films,moods,vocab}); served by
-- GET /ar/text/storybooks/:id?lang=ar|en|ur, and the shelf lists each story's languages. Idempotent.

CREATE TABLE IF NOT EXISTS ar_storybook_telling (
  story_id       TEXT NOT NULL REFERENCES ar_storybook(id),
  lang           TEXT NOT NULL,                   -- ar | en | ur → ar_practice_label scope 'storybook_lang'
  audio_key      TEXT NOT NULL,                   -- the film's soundtrack, ending music included (km-arabic-audio)
  audio_seconds  REAL,
  intro_sec      REAL NOT NULL DEFAULT 0,         -- the title card's seconds before the telling starts
  story_sec      REAL,                            -- where the end card begins
  film_json      TEXT NOT NULL DEFAULT '{}',      -- {opening, ending, style, shots[], phrases[], pages[]}
  grid_json      TEXT,                            -- the word grid (Arabic): {audio_key, seconds, heading_at, sections[], pages[], idioms[]}
  status         TEXT NOT NULL DEFAULT 'live',
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (story_id, lang)
);

CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_storybook_telling_i AFTER INSERT ON ar_storybook_telling BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_storybook_telling_u AFTER UPDATE ON ar_storybook_telling BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;
CREATE TRIGGER IF NOT EXISTS trg_kcv_ar_storybook_telling_d AFTER DELETE ON ar_storybook_telling BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

-- The languages a story is told in: the toggle's words, the way the text runs, and its face (an app font's
-- PostScript name — AmiriQuran for Arabic, Baloo 2 for English, Noto Nastaliq for Urdu) with the size it is set at, and the
-- face of the title and end cards (the films' rounded Baloo; Nastaliq for Urdu), and the size its translation line is
-- set at when it runs under another language's telling (lineSize).
-- The word grid's heading and section names (Arabic, as the film shows them). The app draws them as sent.
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('storybook_lang', 'ar', 'Arabic',  'العربية', 'The story told in Arabic',  NULL, NULL, NULL, '{"dir":"rtl","font":"AmiriQuran-Regular","size":30,"lineHeight":1.9,"titleFont":"BalooBhaijaan2-Regular","lineSize":18}', 1),
 ('storybook_lang', 'en', 'English', 'English',  'The story told in English', NULL, NULL, NULL, '{"dir":"ltr","font":"Baloo2-Regular","size":29,"weight":800,"lineHeight":1.25,"titleFont":"Baloo2-Regular","lineSize":16}', 2),
 ('storybook_lang', 'ur', 'Urdu',    'اردو',     'The story told in Urdu',    NULL, NULL, NULL, '{"dir":"rtl","font":"NotoNastaliqUrdu-Regular","size":25,"lineHeight":2.1,"titleFont":"NotoNastaliqUrdu-Regular","lineSize":15}', 3),
 ('storybook', 'language',   'Language', NULL, 'Hear the story in another language', 'globe', NULL, NULL, NULL, 23),
 ('storybook', 'translation', 'Translation', NULL, 'The line in another language under the words', 'character.bubble', NULL, NULL, NULL, 26),
 ('storybook', 'search',     'Search stories in this book', 'اِبْحَثْ', 'The shelf''s search field', 'magnifyingglass', NULL, NULL, NULL, 27),
 ('storybook', 'no_match',   'No story matches', NULL, 'The shelf when a search finds nothing', NULL, NULL, NULL, NULL, 28),
 ('storybook', 'words_grid', 'Words from the story', 'كَلِمَاتُ الْقِصَّةِ', 'The story''s verbs, nouns and expressions', 'square.grid.2x2', '#E8C96A', NULL, NULL, 24),
 ('storybook_grid', 'verb',  'Verbs',       'الأَفْعالُ',   NULL, NULL, '#F5D675', NULL, NULL, 1),
 ('storybook_grid', 'noun',  'Nouns',       'الأَسْماءُ',   NULL, NULL, '#F5D675', NULL, NULL, 2),
 ('storybook_grid', 'idiom', 'Expressions', 'التَّعابِيرُ', NULL, NULL, '#F5D675', NULL, NULL, 3);
