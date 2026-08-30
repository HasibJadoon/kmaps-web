CREATE TABLE IF NOT EXISTS qr_morph_display_sources (
  id                 TEXT PRIMARY KEY,
  source_slug        TEXT NOT NULL UNIQUE,
  kind               TEXT NOT NULL,
  title_ar           TEXT,
  title_en           TEXT,
  title_ur           TEXT,
  author_name_ar     TEXT,
  author_name_en     TEXT,
  author_name_ur     TEXT,
  death_year_hijri   INTEGER,
  register           TEXT,
  badge_color        TEXT,
  badge_glyph        TEXT,
  display_order      INTEGER NOT NULL DEFAULT 0,
  is_visible         INTEGER NOT NULL DEFAULT 1,
  meta_json          JSON,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS qr_morph_display_words (
  id                 TEXT PRIMARY KEY,
  word_occ_ref       TEXT,
  surah_no           INTEGER NOT NULL,
  ayah_no            INTEGER NOT NULL,
  word_index         INTEGER NOT NULL,
  ayah_key           TEXT,

  surface_ar         TEXT NOT NULL,
  surface_bare       TEXT,
  lemma_ar           TEXT,
  root_ar            TEXT,
  root_display       TEXT,
  root_ref           TEXT,

  word_group         TEXT NOT NULL,
  pos_ar             TEXT,
  pos_en             TEXT,
  pos_ur             TEXT,
  gloss_ar           TEXT,
  gloss_en           TEXT,
  gloss_ur           TEXT,
  badge_color        TEXT,

  derived_type_ar    TEXT,
  derived_type_en    TEXT,
  derived_type_ur    TEXT,
  wazn_ar            TEXT,
  form_roman         TEXT,
  features_json      JSON,

  is_promoted        INTEGER NOT NULL DEFAULT 1,
  is_content_word    INTEGER NOT NULL DEFAULT 1,
  is_anchor          INTEGER NOT NULL DEFAULT 0,
  importance         INTEGER NOT NULL DEFAULT 3,
  difficulty         INTEGER,
  frequency_quran    INTEGER,

  status             TEXT NOT NULL DEFAULT 'live',
  display_order      INTEGER NOT NULL DEFAULT 0,
  meta_json          JSON,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(surah_no, ayah_no, word_index)
);

CREATE TABLE IF NOT EXISTS qr_morph_display_blocks (
  id                 TEXT PRIMARY KEY,
  scope_level        TEXT NOT NULL,
  scope_key          TEXT NOT NULL,

  word_occ_ref       TEXT,
  surah_no           INTEGER,
  ayah_no            INTEGER,
  word_index         INTEGER,
  ayah_key           TEXT,
  root_ar            TEXT,
  lemma_ar           TEXT,

  block_type         TEXT NOT NULL,
  block_subtype      TEXT,
  display_order      INTEGER NOT NULL DEFAULT 0,

  title_ar           TEXT,
  title_en           TEXT,
  title_ur           TEXT,
  text_ar            TEXT,
  text_en            TEXT,
  text_ur            TEXT,
  data_json          JSON NOT NULL DEFAULT '{}',

  source_slug        TEXT,
  source_ref         TEXT,
  source_page        TEXT,
  is_synthesis       INTEGER NOT NULL DEFAULT 0,
  register           TEXT,

  confidence         TEXT DEFAULT 'medium',
  status             TEXT NOT NULL DEFAULT 'live',
  meta_json          JSON,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE(scope_level, scope_key, block_type, block_subtype)
);

CREATE INDEX IF NOT EXISTS idx_morph_words_passage
  ON qr_morph_display_words(surah_no, ayah_no, word_index);
CREATE INDEX IF NOT EXISTS idx_morph_words_grid
  ON qr_morph_display_words(surah_no, is_promoted, word_group, display_order);
CREATE INDEX IF NOT EXISTS idx_morph_words_root
  ON qr_morph_display_words(root_ar);
CREATE INDEX IF NOT EXISTS idx_morph_blocks_scope
  ON qr_morph_display_blocks(scope_level, scope_key, display_order);
CREATE INDEX IF NOT EXISTS idx_morph_blocks_root
  ON qr_morph_display_blocks(root_ar, scope_level);
CREATE INDEX IF NOT EXISTS idx_morph_blocks_ayah
  ON qr_morph_display_blocks(ayah_key, scope_level);
