-- ─── A bank that nobody owns ──────────────────────────────────────────────────
--
-- Until now this database has had no owner-less content. `core_srs_card` is the
-- card AND one person's memory of it in the same row — every card carries a
-- `user_ref` — and the only stores without an owner are `cyb_card_type`, which
-- is a registry rather than cards, and `core_srs_library_card`, which is a
-- submission queue that gets COPIED into a personal card on take.
--
-- That is why a new account opens the path to nothing: there was nowhere for a
-- course to exist before somebody had already learned it.
--
-- The bank is the missing half. Content lives here, owner-less; what a person
-- did with it lives in `core_bank_attempt`/`_response`; what they must remember
-- goes on living in `core_srs_card`. Three ledgers, each answering the question
-- it is shaped for.
--
-- The item shape is QTI 3.0's decomposition, stored as columns rather than as
-- its XML: a stimulus and an interaction, a declared correct response, an
-- outcome, and a named rule for turning one into the other. That is what lets a
-- Duolingo word-bank sentence, each of Kahoot's nine question types and a
-- dinner-table conversation card sit in one table without any of them lying —
-- an unscored item is not a hack, it is `scoring = 'none'`, and QTI's own
-- response declaration is optional for exactly this reason.

-- ── The pack: a course, a quiz set, or a deck ────────────────────────────────
CREATE TABLE IF NOT EXISTS core_bank_pack (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,          -- hand-authored; the import key
  app           TEXT NOT NULL CHECK (app IN ('path','quiz','table')),
  title         TEXT NOT NULL,
  title_ar      TEXT,
  description_md TEXT,
  language      TEXT NOT NULL DEFAULT 'en',
  cefr_from     TEXT,
  cefr_to       TEXT,
  -- Lifted off core_talk_deck, where it described a deck but sat next to
  -- per-card columns. Who the pack is for is a property of the pack.
  audience      TEXT CHECK (audience IS NULL OR audience IN
                  ('family','friends','couples','kids','work','mixed')),
  -- THE COLUMN THAT MAKES THIS A BANK. NULL is the published corpus, which is
  -- what a new account walks into. A pack with an owner is somebody's private
  -- deck living in the same table.
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

-- ── The unit: a section, a lesson, a review node ─────────────────────────────
CREATE TABLE IF NOT EXISTS core_bank_unit (
  id            TEXT PRIMARY KEY,
  pack_ref      TEXT NOT NULL REFERENCES core_bank_pack(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL,
  -- Self-parenting, like ar_curriculum_container_unit: section → unit → node.
  parent_ref    TEXT REFERENCES core_bank_unit(id),
  depth         INTEGER NOT NULL DEFAULT 0,
  unit_index    INTEGER NOT NULL DEFAULT 0,     -- order among siblings
  title         TEXT NOT NULL,
  title_ar      TEXT,
  subtitle      TEXT,
  -- The icon on the path. Duolingo marks each node with what KIND of exercise
  -- waits there, which is the half a progress ring cannot say.
  node_type     TEXT NOT NULL DEFAULT 'lesson'
                  CHECK (node_type IN ('section','unit','lesson','practice',
                                       'review','story','checkpoint','chest','trophy')),
  icon          TEXT,
  colour        TEXT,
  -- Delivery. A lesson draws `item_count` from a larger membership, which is
  -- how the same unit stays worth replaying.
  item_count    INTEGER,
  item_order    TEXT NOT NULL DEFAULT 'fixed'
                  CHECK (item_order IN ('fixed','shuffle','weighted')),
  pass_threshold REAL NOT NULL DEFAULT 1.0,
  hearts        INTEGER,
  xp_award      INTEGER NOT NULL DEFAULT 10,
  estimated_mins INTEGER,
  -- Scope, in the vocabulary the rest of this database already speaks.
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

-- ── The item ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS core_bank_item (
  id            TEXT PRIMARY KEY,
  pack_ref      TEXT NOT NULL REFERENCES core_bank_pack(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL,
  -- Trilingual from the start. ar_ling_* already is, and adding _ur later is a
  -- table rewrite.
  prompt_en     TEXT,
  prompt_ar     TEXT,
  prompt_ur     TEXT,
  stimulus_md   TEXT,
  media_r2_key  TEXT,
  -- QTI's interaction names where QTI has one. A closed list on purpose: an
  -- open TEXT column is how a bank ends up holding 'mcq', 'MCQ' and 'choice'.
  interaction   TEXT NOT NULL CHECK (interaction IN (
                  'choice','choice_multi','true_false','inline_choice',
                  'order','match','associate','gap_match',
                  'text_entry','extended_text',
                  'slider','hotspot','tap_word','pin',
                  'speak','listen',
                  'open_prompt')),
  -- QTI's responseProcessing template.
  --   match_correct  exact match against the declared response
  --   map_response   per-option credit; partial marks
  --   nearest        numeric distance — a slider, a pin
  --   none           unscored: a poll, a word cloud, a conversation card
  scoring       TEXT NOT NULL DEFAULT 'match_correct'
                  CHECK (scoring IN ('match_correct','map_response','nearest','none')),
  -- The declared correct response, in whatever shape the template reads. JSON
  -- because its shape is a function of `interaction`, and a column cannot be.
  -- Choices and tokens are ROWS, not in here — see core_bank_item_option.
  response_json TEXT CHECK (response_json IS NULL OR json_valid(response_json)),
  seconds       INTEGER,                        -- NULL = untimed
  points_style  TEXT NOT NULL DEFAULT 'standard'
                  CHECK (points_style IN ('standard','double','none')),
  speed_bonus   INTEGER NOT NULL DEFAULT 0,
  explanation_en TEXT,
  explanation_ar TEXT,
  explanation_ur TEXT,
  difficulty    INTEGER NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
  -- A CLIENT COMPONENT KEY, not a template blob. core_srs_note_type.templates_json
  -- has never been read by anything — card-ds.repo.ts renders from a hard-coded
  -- switch instead — so this does not become a second unread template store.
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
  -- The upstream row this came from: AR:EX:… | AL:Q:… | CORE:QQ:… | QR:SQ:…
  origin_ref    TEXT,
  import_ref    TEXT,
  -- sha256 of the normalised payload, so a re-import can skip what has not
  -- changed and the dry run can show a diff worth reading.
  content_digest TEXT,
  -- Calibration, copied from ar_ling_learn_question, which already knew that a
  -- bank should learn which of its own questions are any good.
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
-- Re-projecting an upstream row replaces it rather than laying a second copy
-- beside the first. Migration 028's pattern, generalised.
CREATE UNIQUE INDEX IF NOT EXISTS ux_bank_item_origin
  ON core_bank_item (origin_ref) WHERE origin_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_bank_item_scope
  ON core_bank_item (module, surah, ayah_from, step_key);
CREATE INDEX IF NOT EXISTS ix_bank_item_pack ON core_bank_item (pack_ref, status);

-- ── The options ──────────────────────────────────────────────────────────────
--
-- Rows, not a JSON array — the one real upgrade over both
-- core_quiz_question.options_json and ar_exercises.options_json. A JSON array
-- cannot carry why a wrong answer is wrong, and that sentence is the difference
-- between a bank that tests and a bank that teaches. ar_ling_learn_question_
-- distractor already knew this; this table is that table, generalised.
CREATE TABLE IF NOT EXISTS core_bank_item_option (
  id            TEXT PRIMARY KEY,
  item_ref      TEXT NOT NULL REFERENCES core_bank_item(id) ON DELETE CASCADE,
  -- What this row IS inside the interaction. One table serves the choices of an
  -- MCQ, the movable tokens of an ordering, both sides of a matching pair, and
  -- the fillers of a gap.
  role          TEXT NOT NULL DEFAULT 'choice'
                  CHECK (role IN ('choice','order_token','match_left','match_right',
                                  'gap','distractor_pool')),
  label_en      TEXT,
  label_ar      TEXT,
  label_ur      TEXT,
  media_r2_key  TEXT,
  is_correct    INTEGER NOT NULL DEFAULT 0,
  -- The pairing key: match_left 'a' answers match_right 'a'; gap 'g2' fills
  -- blank 2. Order tokens use sort_order as their answer.
  pair_key      TEXT,
  credit        REAL,
  distractor_kind TEXT,
  why_wrong_en  TEXT,
  why_wrong_ar  TEXT,
  why_wrong_ur  TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  UNIQUE (item_ref, role, sort_order)
);

-- ── Membership ───────────────────────────────────────────────────────────────
-- N:M, so one item can be in a lesson AND in that unit's review node AND in a
-- checkpoint without being copied. core_srs_library_card copies on take; that
-- is the pattern this avoids.
CREATE TABLE IF NOT EXISTS core_bank_unit_item (
  unit_ref      TEXT NOT NULL REFERENCES core_bank_unit(id) ON DELETE CASCADE,
  item_ref      TEXT NOT NULL REFERENCES core_bank_item(id) ON DELETE CASCADE,
  seq           INTEGER NOT NULL DEFAULT 0,
  weight        REAL NOT NULL DEFAULT 1.0,
  required      INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (unit_ref, item_ref)
);
CREATE INDEX IF NOT EXISTS ix_bank_unit_item_seq ON core_bank_unit_item (unit_ref, seq);

-- ── The import ledger ────────────────────────────────────────────────────────
-- What a dry run has to write in order to be worth doing: the counts and the
-- errors, with the content rolled back.
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
