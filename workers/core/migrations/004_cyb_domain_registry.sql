CREATE TABLE IF NOT EXISTS cyb_domain (
  slug          TEXT PRIMARY KEY,
  lane          TEXT NOT NULL,
  name_ar       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  name_ur       TEXT,
  hint          TEXT,

  content_db    TEXT NOT NULL,

  learner_db    TEXT NOT NULL,

  unit_kind     TEXT NOT NULL,
  color_hex     TEXT,
  symbol        TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'live',
  meta_json     TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta_json)),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO cyb_domain
  (slug, lane, name_ar, name_en, hint, content_db, learner_db, unit_kind,
   color_hex, symbol, display_order)
VALUES
  ('quran', 'quran', 'القرآن', 'Qurʾān',
   '114 surahs · passages · words',
   'km_quran', 'km_core', 'passage',
   '#e8c96a', 'book.closed', 10),

  ('arabic', 'language', 'العربية', 'Classical Arabic',
   '1,642 roots · 4,908 lemmas',
   'km_arabic_linguistic', 'km_arabic', 'root',
   '#4dd9a8', 'character.textbox', 20),

  ('wv', 'worldview', 'رؤية العالم', 'Worldview',
   'concepts · claims · evidence',
   'km_worldview', 'km_core', 'concept',
   '#c58ad9', 'globe.europe.africa', 30);

INSERT OR IGNORE INTO cyb_domain
  (slug, lane, name_ar, name_en, hint, content_db, learner_db, unit_kind,
   color_hex, symbol, display_order, status)
VALUES
  ('ling', 'quran', 'اللسانيات', 'Linguistics',
   'legacy · pieces under Qurʾān passages',
   'km_arabic_linguistic', 'km_core', 'piece',
   '#8fa0b8', 'text.magnifyingglass', 90, 'retired');
