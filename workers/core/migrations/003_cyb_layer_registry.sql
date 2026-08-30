CREATE TABLE IF NOT EXISTS cyb_layer (
  id            TEXT PRIMARY KEY,
  domain        TEXT NOT NULL,
  lane          TEXT NOT NULL,
  layer_key     TEXT NOT NULL,
  name_ar       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  name_ur       TEXT,
  hint          TEXT,

  db_name       TEXT NOT NULL,
  color_hex     TEXT,
  symbol        TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'live',
  meta_json     TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta_json)),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (domain, layer_key)
);
CREATE INDEX IF NOT EXISTS cyb_layer_domain ON cyb_layer(domain, display_order);

INSERT OR IGNORE INTO cyb_layer
  (id, domain, lane, layer_key, name_ar, name_en, hint, db_name, color_hex, symbol, display_order)
VALUES
  ('quran:vocabulary', 'quran', 'quran', 'vocabulary', 'المفردات', 'Root / Vocabulary',
   'roots', 'km_quran', '#e8c96a', 'textformat.abc', 10),
  ('quran:reading', 'quran', 'quran', 'reading', 'القراءة', 'Reading',
   'tilāwa · tajwīd', 'km_quran', '#e8b45c', 'waveform', 20),
  ('quran:ss', 'quran', 'quran', 'ss', 'الإعراب', 'Sentence Structure',
   'iʿrāb', 'km_quran', '#6bbaff', 'point.topleft.down.curvedto.point.bottomright.up', 30),
  ('quran:structure', 'quran', 'quran', 'structure', 'النظم', 'Passage Structure',
   'naẓm · coherence', 'km_quran', '#c58ad9', 'square.stack.3d.up', 40),
  ('quran:tafsir', 'quran', 'quran', 'tafsir', 'التفسير', 'Tafsīr',
   'books', 'km_quran', '#4dd9a8', 'books.vertical', 50),

  ('quran:translation', 'quran', 'quran', 'translation', 'الترجمة', 'Translation',
   'derived · literal → fluent', 'km_quran', '#e0785c', 'character.book.closed', 60);

INSERT OR IGNORE INTO cyb_layer
  (id, domain, lane, layer_key, name_ar, name_en, hint, db_name, color_hex, symbol, display_order)
VALUES
  ('arabic:CORE',   'arabic', 'language', 'CORE',   'الأصل',        'Identity',
   'root identity', 'km_arabic_linguistic', '#e8c96a', 'circle.lefthalf.filled', 10),
  ('arabic:SYN',    'arabic', 'language', 'SYN',    'ذكاء الجذر',   'Root intelligence',
   'dna · aṣl', 'km_arabic_linguistic', '#4dd9a8', 'sparkle', 20),
  ('arabic:SENSE',  'arabic', 'language', 'SENSE',  'المعاني',      'Senses',
   'senses · arcs · attestations', 'km_arabic_linguistic', '#c58ad9', 'circle.hexagongrid', 30),
  ('arabic:GRAPH',  'arabic', 'language', 'GRAPH',  'شبكة الجذر',   'Root graph',
   'antonyms · fields', 'km_arabic_linguistic', '#6bbaff', 'arrow.left.arrow.right', 40),
  ('arabic:LINK',   'arabic', 'language', 'LINK',   'الروابط',      'Bridges',
   'cross-links', 'km_arabic_linguistic', '#8fa0b8', 'link', 50),
  ('arabic:SOURCE', 'arabic', 'language', 'SOURCE', 'المصادر',      'Sources',
   'provenance', 'km_arabic_linguistic', '#e8b45c', 'text.book.closed', 60),
  ('arabic:LEARN',  'arabic', 'language', 'LEARN',  'التعلّم',       'Learning',
   'vocab · memlets', 'km_arabic_linguistic', '#4dd9a8', 'graduationcap', 70),
  ('arabic:SARF',   'arabic', 'language', 'SARF',   'الصرف',        'Morphology',
   'lemma · paradigm', 'km_arabic_linguistic', '#e8c96a', 'square.grid.2x2', 80),
  ('arabic:KIN',    'arabic', 'language', 'KIN',    'المقاربات',    'Kindred',
   'near-synonyms · furūq', 'km_arabic_linguistic', '#6bbaff', 'circle.circle', 90),
  ('arabic:EXPR',   'arabic', 'language', 'EXPR',   'التعابير',     'Expressions',
   'idioms', 'km_arabic_linguistic', '#c58ad9', 'text.quote', 100);

INSERT OR IGNORE INTO cyb_layer
  (id, domain, lane, layer_key, name_ar, name_en, hint, db_name, color_hex, symbol, display_order)
VALUES
  ('wv:concept',   'wv', 'worldview', 'concept',   'المفاهيم',   'Concepts',
   'the ideas themselves', 'km_worldview', '#e8c96a', 'lightbulb', 10),
  ('wv:evidence',  'wv', 'worldview', 'evidence',  'الشواهد',    'Evidence',
   'what backs a claim', 'km_worldview', '#4dd9a8', 'doc.text.magnifyingglass', 20),
  ('wv:claim',     'wv', 'worldview', 'claim',     'الدعاوى',    'Claims',
   'asserted positions', 'km_worldview', '#6bbaff', 'quote.bubble', 30),
  ('wv:counter_claim', 'wv', 'worldview', 'counter_claim', 'الدعاوى المضادة', 'Counter-claims',
   'what contests them', 'km_worldview', '#e0785c', 'arrow.triangle.2.circlepath', 40),
  ('wv:person',    'wv', 'worldview', 'person',    'الأشخاص',    'People',
   'who said it', 'km_worldview', '#c58ad9', 'person', 50),
  ('wv:thinker',   'wv', 'worldview', 'thinker',   'المفكّرون',   'Thinkers',
   'schools and figures', 'km_worldview', '#e8b45c', 'person.bust', 60),
  ('wv:trope',     'wv', 'worldview', 'trope',     'الأنماط',    'Tropes',
   'recurring shapes', 'km_worldview', '#8fa0b8', 'theatermasks', 70),
  ('wv:motif',     'wv', 'worldview', 'motif',     'الزخارف',    'Motifs',
   'recurring images', 'km_worldview', '#6bbaff', 'scribble', 80),
  ('wv:era',       'wv', 'worldview', 'era',       'العصور',     'Eras',
   'when', 'km_worldview', '#4dd9a8', 'clock', 90),
  ('wv:framework', 'wv', 'worldview', 'framework', 'الأطر',      'Frameworks',
   'how it is organised', 'km_worldview', '#e8c96a', 'square.stack.3d.up', 100);
