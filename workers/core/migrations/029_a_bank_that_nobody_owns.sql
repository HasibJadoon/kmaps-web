CREATE TABLE IF NOT EXISTS core_bank_pack (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  app           TEXT NOT NULL CHECK (app IN ('path','quiz','table')),
  title         TEXT NOT NULL,
  title_ar      TEXT,
  description_md TEXT,
  language      TEXT NOT NULL DEFAULT 'en',
  cefr_from     TEXT,
  cefr_to       TEXT,

  audience      TEXT CHECK (audience IS NULL OR audience IN
                  ('family','friends','couples','kids','work','mixed')),

  owner_ref     TEXT,
  workspace_ref TEXT,
  visibility    TEXT NOT NULL DEFAULT 'private'
                  CHECK (visibility IN ('private','workspace','public')),
  cover_r2_key  TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','live','retired')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS ix_bank_pack_app ON core_bank_pack (app, status);
CREATE INDEX IF NOT EXISTS ix_bank_pack_owner ON core_bank_pack (owner_ref);

CREATE TABLE IF NOT EXISTS core_bank_unit (
  id            TEXT PRIMARY KEY,
  pack_ref      TEXT NOT NULL REFERENCES core_bank_pack(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL,

  parent_ref    TEXT REFERENCES core_bank_unit(id),
  depth         INTEGER NOT NULL DEFAULT 0,
  unit_index    INTEGER NOT NULL DEFAULT 0,
  title         TEXT NOT NULL,
  title_ar      TEXT,
  subtitle      TEXT,

  node_type     TEXT NOT NULL DEFAULT 'lesson'
                  CHECK (node_type IN ('section','unit','lesson','practice',
                                       'review','story','checkpoint','chest','trophy')),
  icon          TEXT,
  colour        TEXT,

  item_count    INTEGER,
  item_order    TEXT NOT NULL DEFAULT 'fixed'
                  CHECK (item_order IN ('fixed','shuffle','weighted')),
  pass_threshold REAL NOT NULL DEFAULT 1.0,
  hearts        INTEGER,
  xp_award      INTEGER NOT NULL DEFAULT 10,
  estimated_mins INTEGER,

  module        TEXT,
  resource_ref  TEXT,
  step_key      TEXT,
  qr_scope_ref  TEXT,
  skill_focus   TEXT,
  level         TEXT,
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','live','retired')),
  meta_json     TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta_json)),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE (pack_ref, slug)
);
CREATE INDEX IF NOT EXISTS ix_bank_unit_tree ON core_bank_unit (pack_ref, parent_ref, unit_index);

CREATE TABLE IF NOT EXISTS core_bank_item (
  id            TEXT PRIMARY KEY,
  pack_ref      TEXT NOT NULL REFERENCES core_bank_pack(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL,

  prompt_en     TEXT,
  prompt_ar     TEXT,
  prompt_ur     TEXT,
  stimulus_md   TEXT,
  media_r2_key  TEXT,

  interaction   TEXT NOT NULL CHECK (interaction IN (
                  'choice','choice_multi','true_false','inline_choice',
                  'order','match','associate','gap_match',
                  'text_entry','extended_text',
                  'slider','hotspot','tap_word','pin',
                  'speak','listen',
                  'open_prompt')),

  scoring       TEXT NOT NULL DEFAULT 'match_correct'
                  CHECK (scoring IN ('match_correct','map_response','nearest','none')),

  response_json TEXT CHECK (response_json IS NULL OR json_valid(response_json)),
  seconds       INTEGER,
  points_style  TEXT NOT NULL DEFAULT 'standard'
                  CHECK (points_style IN ('standard','double','none')),
  speed_bonus   INTEGER NOT NULL DEFAULT 0,
  explanation_en TEXT,
  explanation_ar TEXT,
  explanation_ur TEXT,
  difficulty    INTEGER NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),

  renderer      TEXT,
  module        TEXT NOT NULL DEFAULT 'other'
                  CHECK (module IN ('AR','AL','QR','WV','EN','other')),
  resource_type TEXT,
  resource_ref  TEXT,
  surah         INTEGER,
  ayah_from     INTEGER,
  ayah_to       INTEGER,
  passage_ref   TEXT,
  step_key      TEXT,
  concept_ref   TEXT,
  root_norm     TEXT,
  lemma_ref     TEXT,
  tags          TEXT,
  source        TEXT NOT NULL DEFAULT 'authored'
                  CHECK (source IN ('authored','imported','generated','projected')),

  origin_ref    TEXT,
  import_ref    TEXT,

  content_digest TEXT,

  times_shown   INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0,
  discrimination REAL,
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','live','retired')),
  meta_json     TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta_json)),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE (pack_ref, slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_bank_item_origin
  ON core_bank_item (origin_ref) WHERE origin_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_bank_item_scope
  ON core_bank_item (module, surah, ayah_from, step_key);
CREATE INDEX IF NOT EXISTS ix_bank_item_pack ON core_bank_item (pack_ref, status);

CREATE TABLE IF NOT EXISTS core_bank_item_option (
  id            TEXT PRIMARY KEY,
  item_ref      TEXT NOT NULL REFERENCES core_bank_item(id) ON DELETE CASCADE,

  role          TEXT NOT NULL DEFAULT 'choice'
                  CHECK (role IN ('choice','order_token','match_left','match_right',
                                  'gap','distractor_pool')),
  label_en      TEXT,
  label_ar      TEXT,
  label_ur      TEXT,
  media_r2_key  TEXT,
  is_correct    INTEGER NOT NULL DEFAULT 0,

  pair_key      TEXT,
  credit        REAL,
  distractor_kind TEXT,
  why_wrong_en  TEXT,
  why_wrong_ar  TEXT,
  why_wrong_ur  TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  UNIQUE (item_ref, role, sort_order)
);

CREATE TABLE IF NOT EXISTS core_bank_unit_item (
  unit_ref      TEXT NOT NULL REFERENCES core_bank_unit(id) ON DELETE CASCADE,
  item_ref      TEXT NOT NULL REFERENCES core_bank_item(id) ON DELETE CASCADE,
  seq           INTEGER NOT NULL DEFAULT 0,
  weight        REAL NOT NULL DEFAULT 1.0,
  required      INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (unit_ref, item_ref)
);
CREATE INDEX IF NOT EXISTS ix_bank_unit_item_seq ON core_bank_unit_item (unit_ref, seq);

CREATE TABLE IF NOT EXISTS core_bank_import (
  id              TEXT PRIMARY KEY,
  pack_ref        TEXT REFERENCES core_bank_pack(id),
  actor_ref       TEXT NOT NULL,
  file_path       TEXT,
  file_digest     TEXT NOT NULL,
  dry_run         INTEGER NOT NULL DEFAULT 0,
  units_created   INTEGER NOT NULL DEFAULT 0,
  units_updated   INTEGER NOT NULL DEFAULT 0,
  items_created   INTEGER NOT NULL DEFAULT 0,
  items_updated   INTEGER NOT NULL DEFAULT 0,
  items_unchanged INTEGER NOT NULL DEFAULT 0,
  items_retired   INTEGER NOT NULL DEFAULT 0,
  errors_json     TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(errors_json)),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
