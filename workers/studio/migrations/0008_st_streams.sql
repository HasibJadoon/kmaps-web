-- The studio's home is three streams — Qurʾān, Arabic, Worldview — and the
-- production pipeline an episode moves along. Both are rows, not constants in
-- the app or the worker: a stream's words, script, colours, motif and the
-- infographic it shows are what this table says, so a fourth stream or a new
-- accent is an INSERT, not a build.
--
-- Idempotent: safe to run by `migrations apply` or by `d1 execute --file`.

CREATE TABLE IF NOT EXISTS st_streams (
  key          TEXT PRIMARY KEY,          -- matches st_episodes.ecosystem
  seq          INTEGER NOT NULL DEFAULT 0,
  title_en     TEXT NOT NULL,
  title_ar     TEXT NOT NULL,
  title_face   TEXT NOT NULL DEFAULT 'amiri',   -- 'uthmanic' | 'amiri'
  tagline      TEXT,
  icon         TEXT,                      -- SF Symbol
  accent       TEXT,                      -- JSON array of hex, light → deep
  glow         TEXT,                      -- hex
  tone         TEXT,                      -- DeckPalette tone for its infographics
  motif        TEXT NOT NULL DEFAULT 'star',    -- 'star' | 'ink' | 'constellation'
  meta_json    TEXT,                      -- the motif's own data
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- The pipeline, in order. `statuses` lists the st_episodes.status values a
-- stage holds; `in_can` marks the stages that count as shot ("in the can") —
-- the same split the app's EpisodeStatus.isShootable draws.
CREATE TABLE IF NOT EXISTS st_pipeline_stages (
  key          TEXT PRIMARY KEY,
  seq          INTEGER NOT NULL DEFAULT 0,
  label_en     TEXT NOT NULL,
  label_ar     TEXT NOT NULL,
  icon         TEXT,
  tone         TEXT,
  statuses     TEXT NOT NULL,             -- JSON array
  in_can       INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR REPLACE INTO st_streams
  (key, seq, title_en, title_ar, title_face, tagline, icon, accent, glow, tone, motif, meta_json)
VALUES
  ('quran', 1, 'Qurʾān', 'القرآن', 'uthmanic',
   'Passage by passage — the words, the grammar, the meaning',
   'book.closed', '["f6dc8c","c9a84c","6b5520"]', 'c9a84c', 'gold', 'star',
   '{"points":8,"rings":3}'),
  ('arabic', 2, 'Arabic', 'العربية', 'amiri',
   'Reading, speech and the words of the Qurʾān',
   'character.book.closed', '["a6e6d6","4ba8a4","1d5753"]', '4ba8a4', 'teal', 'ink',
   '{"letters":"ابتثجحخدذرزسشصضطظعغفقكلمنهوي","words":["كتب","قرأ","علم"]}'),
  ('worldview', 3, 'Worldview', 'التصور', 'amiri',
   'Ideas side by side — revelation and reason',
   'globe.europe.africa', '["dcc2f2","9b6cc9","4a2c6e"]', '9b6cc9', 'plum', 'constellation',
   '{"nodes":22,"labels":["الوحي","العقل","الإنسان","العالم"]}');

INSERT OR REPLACE INTO st_pipeline_stages
  (key, seq, label_en, label_ar, icon, tone, statuses, in_can)
VALUES
  ('draft',     1, 'Draft',      'مسودة',  'pencil.line',          'sand',  '["draft"]',                0),
  ('planned',   2, 'Planned',    'مخطط',   'calendar',             'plum',  '["planned"]',              0),
  ('ready',     3, 'Ready',      'جاهز',   'checkmark.seal',       'teal',  '["ready","live"]',         0),
  ('in_can',    4, 'In the can', 'مسجّل',  'film',                 'gold',  '["shot","done"]',          1),
  ('published', 5, 'Published',  'منشور',  'dot.radiowaves.left.and.right', 'sage', '["published"]', 1);
