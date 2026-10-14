-- Schema for km_core.
-- Generated from remote Cloudflare D1 sqlite_schema with data excluded, 2026-10-02.
-- Internal D1 bookkeeping tables and FTS5 shadow tables are omitted.
-- Regenerate with scripts/regen_schemas.py — do not hand-edit.

-- ── Tables (96) ──────────────────────────────────────────────────

CREATE TABLE core_activity_events (
  id              TEXT PRIMARY KEY,               -- ULID
  workspace_id    TEXT,
  actor_user_ref  TEXT NOT NULL,                  -- 'CORE:<user_id>'
  event_type      TEXT NOT NULL,
    -- 'resource_created'|'resource_updated'|'resource_deleted'|'member_joined'|
    -- 'comment_added'|'suggestion_approved'|'plan_completed'|'session_logged'|'other'
  resource_ref    TEXT,                           -- typed ref to affected resource
  resource_type   TEXT,
  payload_json    TEXT,                           -- contextual data snapshot
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES core_workspaces(id)
);

CREATE TABLE core_app_label (
  scope       TEXT NOT NULL,                 -- room · door · today
  key         TEXT NOT NULL,
  parent      TEXT,                          -- a door's room
  label       TEXT NOT NULL,
  label_ar    TEXT,
  detail      TEXT,
  icon        TEXT,
  color       TEXT,
  extra_json  TEXT,
  sort        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (scope, key)
);

CREATE TABLE core_audit_log (
  id              TEXT PRIMARY KEY,
  workspace_id    TEXT,
  actor_user_ref  TEXT NOT NULL,
  action          TEXT NOT NULL,
    -- 'policy_changed'|'grant_issued'|'grant_revoked'|'member_removed'|
    -- 'visibility_changed'|'publication_state_changed'|'auth_token_issued'|
    -- 'auth_token_revoked'|'user_suspended'|'workspace_archived'|'other'
  resource_ref    TEXT,
  before_json     TEXT,                           -- snapshot before change
  after_json      TEXT,                           -- snapshot after change
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE core_auth_sessions (
  id              TEXT PRIMARY KEY,               -- ULID
  user_id         TEXT NOT NULL,
  session_token   TEXT NOT NULL UNIQUE,
  session_type    TEXT NOT NULL DEFAULT 'web',
    -- 'web'|'mobile'|'api'|'service'
  device_info     TEXT,
  ip_address      TEXT,
  user_agent      TEXT,
  last_seen_at    TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at      TEXT NOT NULL,
  is_revoked      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES core_users(id)
);

CREATE TABLE core_auth_tokens (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  token_hash      TEXT NOT NULL UNIQUE,           -- SHA-256 hash of raw token
  token_type      TEXT NOT NULL DEFAULT 'api_key',
    -- 'api_key'|'invitation'|'password_reset'|'email_verify'|'link_share'
  name            TEXT,
  scopes_json     TEXT,                           -- JSON [string] — granted scopes
  workspace_id    TEXT,                           -- optional workspace scope
  expires_at      TEXT,
  used_at         TEXT,
  revoked_at      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES core_users(id)
);

CREATE TABLE core_bank_attempt (
  id            TEXT PRIMARY KEY,
  user_ref      TEXT NOT NULL,
  
  
  unit_ref      TEXT REFERENCES core_bank_unit(id),
  pack_ref      TEXT NOT NULL REFERENCES core_bank_pack(id),
  mode          TEXT NOT NULL DEFAULT 'solo'
                  CHECK (mode IN ('solo','live','table')),
  
  
  room_code     TEXT,
  started_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  finished_at   TEXT,
  score         REAL,                            
  points        INTEGER NOT NULL DEFAULT 0,      
  xp            INTEGER NOT NULL DEFAULT 0,
  hearts_left   INTEGER,
  
  
  
  passed_at     TEXT,
  
  
  
  current_item_ref TEXT REFERENCES core_bank_item(id),
  
  
  CHECK (unit_ref IS NOT NULL OR room_code IS NOT NULL)
);

CREATE TABLE core_bank_import (
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
, source_json TEXT);

CREATE TABLE core_bank_item (
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
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')), addressed_to_ref TEXT, addressed_to_name TEXT,
  UNIQUE (pack_ref, slug)
);

CREATE TABLE core_bank_item_feedback (
  id          TEXT PRIMARY KEY,
  item_ref    TEXT NOT NULL REFERENCES core_bank_item(id) ON DELETE CASCADE,
  user_ref    TEXT NOT NULL,
  rating      INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  flag        TEXT CHECK (flag IS NULL OR flag IN
                ('ambiguous','wrong_answer','too_easy','too_hard','typo','other')),
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  -- One standing verdict per person per item; saying it again replaces it.
  UNIQUE (item_ref, user_ref)
);

CREATE TABLE core_bank_item_option (
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

CREATE TABLE core_bank_item_share (
  item_ref      TEXT NOT NULL REFERENCES core_bank_item(id) ON DELETE CASCADE,
  workspace_id  TEXT NOT NULL REFERENCES core_workspaces(id),
  shared_by     TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (item_ref, workspace_id)
);

CREATE TABLE core_bank_pack (
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
, source_json TEXT, source_format TEXT);

CREATE TABLE core_bank_profile (
  user_ref      TEXT NOT NULL,
  pack_ref      TEXT NOT NULL REFERENCES core_bank_pack(id) ON DELETE CASCADE,
  xp            INTEGER NOT NULL DEFAULT 0,
  streak_days   INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  hearts        INTEGER,
  last_active_on TEXT,
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (user_ref, pack_ref)
);

CREATE TABLE core_bank_response (
  id            TEXT PRIMARY KEY,
  attempt_ref   TEXT NOT NULL REFERENCES core_bank_attempt(id) ON DELETE CASCADE,
  item_ref      TEXT NOT NULL REFERENCES core_bank_item(id),
  user_ref      TEXT NOT NULL,
  seq           INTEGER NOT NULL DEFAULT 0,
  response_json TEXT,
  is_correct    INTEGER,
  credit        REAL NOT NULL DEFAULT 0,
  latency_ms    INTEGER,
  points        INTEGER NOT NULL DEFAULT 0,
  hinted        INTEGER NOT NULL DEFAULT 0,
  respondent_ref  TEXT,
  respondent_name TEXT,
  answered_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
, asker_rating INTEGER
  CHECK (asker_rating IS NULL OR asker_rating BETWEEN 1 AND 5), asker_ref TEXT);

CREATE TABLE core_bank_unit (
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

CREATE TABLE core_bank_unit_item (
  unit_ref      TEXT NOT NULL REFERENCES core_bank_unit(id) ON DELETE CASCADE,
  item_ref      TEXT NOT NULL REFERENCES core_bank_item(id) ON DELETE CASCADE,
  seq           INTEGER NOT NULL DEFAULT 0,
  weight        REAL NOT NULL DEFAULT 1.0,
  required      INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (unit_ref, item_ref)
);

CREATE TABLE core_concept (
  id         TEXT PRIMARY KEY,          -- CN:{domain}:{key}
  uid        TEXT NOT NULL UNIQUE,      -- 26-hex, the convention the other registries use
  concept_key TEXT NOT NULL,
  label_en   TEXT,
  label_ar   TEXT,
  domain     TEXT NOT NULL,
  origin     TEXT NOT NULL,             -- which side first named it
  status     TEXT NOT NULL DEFAULT 'live',
  note_md    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE core_concept_binding (
  concept_ref  TEXT NOT NULL,
  source_db    TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_id    TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'expresses',
  note         TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (concept_ref, source_db, source_table, source_id)
);

CREATE TABLE "core_concept_outbox" (
  seq        INTEGER PRIMARY KEY AUTOINCREMENT,
  op         TEXT NOT NULL,
  concept_id TEXT NOT NULL,
  payload    TEXT,
  changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  applied_km_quran     INTEGER NOT NULL DEFAULT 0,
  applied_km_worldview INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE core_daily_log (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  log_date        TEXT NOT NULL DEFAULT (date('now')),
  project         TEXT NOT NULL,
  focus           TEXT NOT NULL DEFAULT 'other'
                    CHECK (focus IN ('registry','sources','morphology','cards','schema','app','docs','other')),
  unit_kind       TEXT CHECK (unit_kind IS NULL OR unit_kind IN ('source_root','gram_term','adima_toc','ayah','root','lemma','table','other')),
  unit_ref        TEXT,
  source_slug     TEXT,
  whats_new       TEXT NOT NULL,
  state           TEXT NOT NULL DEFAULT 'done' CHECK (state IN ('done','partial','blocked','abandoned','exploring')),
  next_step       TEXT,
  already_checked TEXT,
  minutes         INTEGER CHECK (minutes IS NULL OR minutes >= 0),
  energy          INTEGER CHECK (energy IS NULL OR energy BETWEEN 1 AND 5),
  felt            TEXT,
  session_url     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
, user_ref TEXT);

CREATE TABLE core_drill_class (
  id               TEXT PRIMARY KEY,
  user_ref         TEXT NOT NULL,
  scope_ref        TEXT NOT NULL,
  module           TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'in_progress',
  started_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  last_at          TEXT,
  completed_at     TEXT,
  days_taken       INTEGER,
  active_days      INTEGER NOT NULL DEFAULT 0,
  sessions         INTEGER NOT NULL DEFAULT 0,
  active_seconds   INTEGER NOT NULL DEFAULT 0,
  items_total      INTEGER NOT NULL DEFAULT 0,
  first_try_right  INTEGER NOT NULL DEFAULT 0,
  score            INTEGER,
  rating           INTEGER,
  steps_json       TEXT NOT NULL DEFAULT '{}', resume_json TEXT, resume_at TEXT,
  UNIQUE (user_ref, scope_ref)
);

CREATE TABLE core_drill_class_day (
  class_id   TEXT NOT NULL REFERENCES core_drill_class(id) ON DELETE CASCADE,
  day        TEXT NOT NULL,
  seconds    INTEGER NOT NULL DEFAULT 0,
  items      INTEGER NOT NULL DEFAULT 0,
  right      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (class_id, day)
);

CREATE TABLE core_drill_class_item (
  class_id    TEXT NOT NULL REFERENCES core_drill_class(id) ON DELETE CASCADE,
  item_ref    TEXT NOT NULL,
  node_key    TEXT NOT NULL,
  first_right INTEGER NOT NULL DEFAULT 0,
  misses      INTEGER NOT NULL DEFAULT 0,
  streak      INTEGER NOT NULL DEFAULT 0,
  state       TEXT NOT NULL DEFAULT 'right',
  card_json   TEXT,
  filed_card  TEXT,
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')), missed_json TEXT,
  PRIMARY KEY (class_id, item_ref)
);

CREATE TABLE core_drill_feedback (
  id              TEXT PRIMARY KEY,                -- DFB:<ulid>
  user_ref        TEXT NOT NULL,
  drill_id        TEXT NOT NULL,                   -- the drill's id as the worker dealt it
  module          TEXT,                            -- QR · AR …
  kind            TEXT,                            -- the drill's kind (its skill)
  resource_ref    TEXT,                            -- the card it files, when it has one
  reason          TEXT NOT NULL,                   -- a 'feedback' label key
  note            TEXT,
  drill_json      TEXT,                            -- the drill as it was shown
  status          TEXT NOT NULL DEFAULT 'open',    -- open · resolved · dismissed · removed
  resolved_by     TEXT,
  resolution_note TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  resolved_at     TEXT
);

CREATE TABLE core_external_refs (
  id              TEXT PRIMARY KEY,
  legacy_source   TEXT NOT NULL,                  -- e.g. 'knowledgemap'|'old_wv'|'import_v1'
  legacy_id       TEXT NOT NULL,
  legacy_type     TEXT,                           -- old table/type name
  new_module      TEXT NOT NULL,                  -- module code: 'QR'|'AL'|'WV'|'CM'|etc.
  new_typed_ref   TEXT NOT NULL,                  -- 'QR:<id>' | 'AL:<id>' etc.
  migration_batch TEXT,
  note            TEXT,
  migrated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (legacy_source, legacy_id, legacy_type)
);

CREATE TABLE core_feature_flags (
  id              TEXT PRIMARY KEY,
  flag_key        TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  is_enabled      INTEGER NOT NULL DEFAULT 0,
  rollout_percent INTEGER NOT NULL DEFAULT 0,     -- 0–100
  enabled_for     TEXT,                           -- JSON [user_ref or workspace_ref]
  description     TEXT,
  updated_by_ref  TEXT,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE core_notifications (
  id              TEXT PRIMARY KEY,               -- ULID
  user_ref        TEXT NOT NULL,                  -- 'CORE:<user_id>'
  workspace_id    TEXT,
  notif_type      TEXT NOT NULL,
    -- 'mention'|'comment'|'approval_request'|'assignment'|'milestone'|
    -- 'suggestion'|'system'|'review'|'other'
  title           TEXT NOT NULL,
  body_md         TEXT,
  resource_ref    TEXT,
  is_read         INTEGER NOT NULL DEFAULT 0,
  read_at         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE core_people (
  id              TEXT PRIMARY KEY,               -- ULID
  workspace_id    TEXT NOT NULL,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  email           TEXT,
  relationship    TEXT,                           -- 'family'|'colleague'|'friend'|'contact'|'other'
  linked_user_id  TEXT,                           -- → core_users.id if they have an account
  visibility      TEXT NOT NULL DEFAULT 'private',
    -- 'private'|'workspace'
  notes_md        TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id)   REFERENCES core_workspaces(id),
  FOREIGN KEY (linked_user_id) REFERENCES core_users(id)
);

CREATE TABLE core_person (
  id            TEXT PRIMARY KEY,        -- PN:{slug}
  uid           TEXT NOT NULL UNIQUE,    -- 26-hex, the convention the others use
  person_key    TEXT NOT NULL,           -- the slug, on its own
  name_en       TEXT NOT NULL,
  name_ar       TEXT,
  name_native   TEXT,                    -- as written in their own language
  -- scholar | poet | philosopher | thinker | author | host | guest | figure
  person_type   TEXT NOT NULL DEFAULT 'figure',
  birth_year    INTEGER,
  death_year    INTEGER,
  -- Free text on purpose: "13th century", "fl. 900s", "contemporary". Dates are
  -- the precise field; this is what you say when precision is not available.
  era           TEXT,
  nationality   TEXT,
  tradition_ref TEXT,                    -- wv_traditions.id, where one applies
  bio_md        TEXT,
  origin        TEXT NOT NULL DEFAULT 'worldview',   -- which side first named them
  status        TEXT NOT NULL DEFAULT 'live',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE core_platform_config (
  id              TEXT PRIMARY KEY,
  config_key      TEXT NOT NULL UNIQUE,
  config_value    TEXT NOT NULL,
  value_type      TEXT NOT NULL DEFAULT 'string',
    -- 'string'|'integer'|'boolean'|'json'
  description     TEXT,
  updated_by_ref  TEXT,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE core_podcast_participants (
  id           TEXT PRIMARY KEY,
  podcast_id   TEXT NOT NULL,
  person_id    TEXT,                              -- → core_people.id (private) or NULL
  user_ref     TEXT,                              -- 'CORE:<user_id>' if has account
  role         TEXT NOT NULL DEFAULT 'guest',     -- 'host'|'guest'|'moderator'|'producer'
  display_name TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (podcast_id) REFERENCES core_podcasts(id),
  FOREIGN KEY (person_id)  REFERENCES core_people(id)
);

CREATE TABLE core_podcasts (
  id              TEXT PRIMARY KEY,               -- ULID
  workspace_id    TEXT NOT NULL,
  title           TEXT NOT NULL,
  description_md  TEXT,
  podcast_type    TEXT NOT NULL DEFAULT 'discussion',
    -- 'discussion'|'lecture'|'interview'|'reading_session'|'other'
  status          TEXT NOT NULL DEFAULT 'planned',
    -- 'planned'|'recorded'|'published'|'archived'
  recorded_at     TEXT,
  duration_secs   INTEGER,
  media_ref       TEXT,                           -- 'CM:<media_asset_id>'
  host_user_ref   TEXT,                           -- 'CORE:<user_id>'
  visibility      TEXT NOT NULL DEFAULT 'workspace',
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES core_workspaces(id)
);

CREATE TABLE core_quiz_answer (
  id            TEXT PRIMARY KEY,
  session_ref   TEXT NOT NULL REFERENCES core_quiz_session(id) ON DELETE CASCADE,
  question_ref  TEXT NOT NULL,
  user_ref      TEXT NOT NULL,
  choice        INTEGER,                          -- NULL when they ran out of time
  correct       INTEGER NOT NULL DEFAULT 0,
  -- Milliseconds from the question appearing to the answer landing. Kept raw so
  -- the scoring rule can change without losing what actually happened.
  ms            INTEGER,
  points        INTEGER NOT NULL DEFAULT 0,
  answered_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE (session_ref, question_ref, user_ref)
);

CREATE TABLE core_quiz_question (
  id            TEXT PRIMARY KEY,
  author_ref    TEXT NOT NULL,                    -- CORE:ULID → core_users
  module        TEXT NOT NULL CHECK (module IN ('QR','AL','AR','WV','EN','other')),
  domain        TEXT,                             -- concept domain, when it has one
  resource_ref  TEXT,                             -- "44:3", a lemma id, a concept ref
  prompt        TEXT NOT NULL,
  -- A JSON array of strings. Two to six of them; the count is what the client
  -- draws, so it is not fixed at four.
  options_json  TEXT NOT NULL CHECK (json_valid(options_json)),
  -- Index into options_json. Never sent to a player before the reveal.
  correct_index INTEGER NOT NULL,
  explanation   TEXT,
  -- How long the room gets. Speed is half the score, so the limit is part of
  -- the question rather than a session-wide setting.
  seconds       INTEGER NOT NULL DEFAULT 20,
  difficulty    TEXT,
  tags          TEXT,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','retired')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
, surah INTEGER, ayah_from INTEGER, ayah_to INTEGER, passage_ref TEXT, step_key TEXT, topic TEXT, concept_ref TEXT, source TEXT NOT NULL DEFAULT 'authored', generated_from TEXT);

CREATE TABLE core_quiz_session (
  id           TEXT PRIMARY KEY,
  code         TEXT NOT NULL UNIQUE,              -- the six letters read out loud
  host_ref     TEXT NOT NULL,
  title        TEXT,
  module       TEXT,
  status       TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby','live','ended')),
  started_at   TEXT,
  ended_at     TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE core_resource_grants (
  id              TEXT PRIMARY KEY,
  resource_ref    TEXT NOT NULL,                  -- typed ref to resource
  subject_ref     TEXT NOT NULL,                  -- 'CORE:<user_id>' or 'CORE:<group_id>'
  subject_type    TEXT NOT NULL DEFAULT 'user',   -- 'user'|'group'|'role'|'anyone'
  access_role     TEXT NOT NULL DEFAULT 'viewer',
    -- 'viewer'|'commenter'|'editor'|'manager'|'owner'
  granted_by_ref  TEXT NOT NULL,                  -- 'CORE:<user_id>'
  granted_at      TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at      TEXT,
  is_inheritance_break INTEGER NOT NULL DEFAULT 0,
  revoked_at      TEXT,
  note            TEXT,
  UNIQUE (resource_ref, subject_ref, access_role)
);

CREATE TABLE core_resource_policies (
  id                 TEXT PRIMARY KEY,
  resource_ref       TEXT NOT NULL UNIQUE,        -- typed ref: 'CM:xx'|'WV:xx'|etc.
  resource_type      TEXT NOT NULL,
    -- 'document'|'note'|'source'|'media'|'comparison'|'plan'|'session'|'other'
  owner_user_ref     TEXT NOT NULL,               -- 'CORE:<user_id>'
  workspace_ref      TEXT,                        -- 'CORE:<workspace_id>'
  visibility_scope   TEXT NOT NULL DEFAULT 'workspace',
    -- 'private'|'workspace'|'link_share'|'public'
  publication_state  TEXT NOT NULL DEFAULT 'draft',
    -- 'draft'|'review'|'published'|'archived'|'rejected'
  is_discoverable    INTEGER NOT NULL DEFAULT 1,
  allow_comments     TEXT NOT NULL DEFAULT 'workspace',
    -- 'none'|'workspace'|'public'
  allow_downloads    INTEGER NOT NULL DEFAULT 0,
  inherits_from_ref  TEXT,                        -- parent container resource_ref
  override_flag      INTEGER NOT NULL DEFAULT 0,  -- 1 = breaks inheritance explicitly
  meta_json          TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE core_root_build_stat (root_ar TEXT PRIMARY KEY, freq_quran INTEGER NOT NULL DEFAULT 0, build_pct INTEGER NOT NULL DEFAULT 0, synced_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')));

CREATE TABLE core_root_surah_map (root_uid TEXT PRIMARY KEY, spread TEXT, n_surahs INTEGER, total_occur INTEGER);

CREATE TABLE core_root_uid_map (root_ar TEXT PRIMARY KEY, root_uid TEXT NOT NULL, synced_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')));

CREATE TABLE core_source_log (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  title         TEXT NOT NULL,
  author        TEXT,
  domain        TEXT NOT NULL DEFAULT 'other' CHECK (domain IN ('arabic','quran','worldview','other')),
  source_kind   TEXT,
  source_slug   TEXT,
  locator       TEXT,
  explore_state TEXT NOT NULL DEFAULT 'want' CHECK (explore_state IN ('want','exploring','explored','parked','rejected')),
  priority      INTEGER CHECK (priority IS NULL OR priority BETWEEN 1 AND 5),
  why           TEXT,
  found_what    TEXT,
  verdict       TEXT,
  first_seen    TEXT NOT NULL DEFAULT (date('now')),
  last_touched  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
, registered_in TEXT NOT NULL DEFAULT 'none', user_ref TEXT);

CREATE TABLE "core_srs_card" (
  id             TEXT PRIMARY KEY,
  deck_id        TEXT NOT NULL REFERENCES core_srs_deck(id) ON DELETE CASCADE,
  user_ref       TEXT NOT NULL,
  module         TEXT NOT NULL CHECK (module IN ('AR','AL','QR','WV','EN','other')),
  resource_type  TEXT NOT NULL CHECK (resource_type IN
                   ('vocabulary','grammar','root','lemma','word','ayah','passage','concept','other')),
  resource_ref   TEXT NOT NULL,
  card_template  TEXT NOT NULL DEFAULT 'freeform',
  front_text     TEXT NOT NULL DEFAULT '',
  back_text      TEXT NOT NULL DEFAULT '',
  extra_json     TEXT,
  tags           TEXT,
  suspended      INTEGER NOT NULL DEFAULT 0,
  stability      REAL,
  difficulty     REAL,
  card_state     TEXT NOT NULL DEFAULT 'new'
                   CHECK (card_state IN ('new','learning','review','relearning')),
  learning_step  INTEGER NOT NULL DEFAULT 0,
  reps           INTEGER NOT NULL DEFAULT 0,
  lapses         INTEGER NOT NULL DEFAULT 0,
  elapsed_days   INTEGER NOT NULL DEFAULT 0,
  scheduled_days INTEGER NOT NULL DEFAULT 0,
  last_review_at TEXT,
  next_review_at TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  card_kind      TEXT,
  concept_domain TEXT,
  note_id        TEXT,
  intro_surah    INTEGER,
  intro_ayah     INTEGER,
  corpus         TEXT,
  source_db      TEXT,
  library_ref    TEXT,
  note_type_id   TEXT REFERENCES core_srs_note_type(id),
  fields_json    TEXT,
  discipline     TEXT REFERENCES cyb_discipline(code),
  root_norm      TEXT,
  concept_topic  TEXT,
  UNIQUE (deck_id, resource_ref, card_template)
);
ALTER TABLE core_srs_card ADD COLUMN work_ref TEXT;
ALTER TABLE core_srs_card ADD COLUMN leech INTEGER NOT NULL DEFAULT 0;

CREATE TABLE core_srs_card_concept (
  card_id      TEXT NOT NULL REFERENCES core_srs_card(id) ON DELETE CASCADE,
  concept_ref  TEXT NOT NULL,
  concept_uid  TEXT,
  sense_ref    TEXT,
  sense_uid    TEXT,
  source_db    TEXT NOT NULL DEFAULT 'km_arabic_linguistic',
  role         TEXT NOT NULL DEFAULT 'primary' CHECK (role IN ('primary','secondary','contrast')),
  note         TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (card_id, concept_ref)
);

CREATE TABLE core_srs_card_scope_audit (
 card_id TEXT PRIMARY KEY, lemma_ar TEXT, arc_rungs INTEGER, lemma_index INTEGER,
 rungs_before INTEGER, rungs_after INTEGER, sibling_rungs INTEGER, bytes INTEGER,
 verdict TEXT, audited_at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE TABLE core_srs_card_surah (
  card_id TEXT NOT NULL REFERENCES core_srs_card(id) ON DELETE CASCADE,
  surah INTEGER NOT NULL,
  n_occur INTEGER NOT NULL DEFAULT 0,
  is_intro INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (card_id, surah)
);

CREATE TABLE core_srs_deck (
  id            TEXT PRIMARY KEY,
  user_ref      TEXT NOT NULL,
  workspace_id  TEXT,
  title         TEXT NOT NULL,
  deck_type     TEXT NOT NULL DEFAULT 'mixed',
  description   TEXT,
  is_shared     INTEGER NOT NULL DEFAULT 0,
  meta_json     TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
, parent_id TEXT REFERENCES core_srs_deck(id), slug TEXT, sort_order INTEGER DEFAULT 0, new_per_day INTEGER, review_per_day INTEGER, limit_scope TEXT DEFAULT 'tree');

CREATE TABLE core_srs_library_card (
  id            TEXT PRIMARY KEY,
  author_ref    TEXT NOT NULL,              -- CORE:ULID → core_users
  module        TEXT NOT NULL,              -- QR | AL | AR | WV | other
  resource_type TEXT NOT NULL,
  resource_ref  TEXT NOT NULL,              -- "44:3", a root, a lemma id
  card_kind     TEXT,                       -- free label, e.g. ss_nahw_rule
  front_text    TEXT NOT NULL,
  back_text     TEXT,
  tags          TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
  review_note   TEXT,
  reviewed_by   TEXT,                       -- CORE:ULID → core_users
  reviewed_at   TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
, concept_domain TEXT, payload_json TEXT);

CREATE TABLE core_srs_note_type (
  id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, version INTEGER NOT NULL,
  direction TEXT NOT NULL DEFAULT 'rtl_mixed',
  fields_json TEXT NOT NULL CHECK (json_valid(fields_json)),
  templates_json TEXT NOT NULL CHECK (json_valid(templates_json)),
  render_hints_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(render_hints_json)),
  sub_schema_json TEXT CHECK (sub_schema_json IS NULL OR json_valid(sub_schema_json)),
  note_md TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE TABLE core_srs_params (
  user_ref          TEXT PRIMARY KEY,
  weights_json      TEXT NOT NULL,
  desired_retention REAL NOT NULL DEFAULT 0.9,
  maximum_interval  INTEGER NOT NULL DEFAULT 36500,
  learning_steps    TEXT NOT NULL DEFAULT '["1m","10m"]',
  relearning_steps  TEXT NOT NULL DEFAULT '["10m"]',
  fitted_at         TEXT,
  fitted_reviews    INTEGER NOT NULL DEFAULT 0,
  log_loss_before   REAL,
  log_loss_after    REAL,
  note              TEXT,
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
, new_per_day INTEGER, review_per_day INTEGER);

CREATE TABLE core_srs_registry (
  id              TEXT PRIMARY KEY,               -- ULID
  user_ref        TEXT NOT NULL,                  -- 'CORE:<user_id>'
  workspace_id    TEXT,
  resource_ref    TEXT NOT NULL,                  -- typed ref to the item being learned
  resource_type   TEXT NOT NULL,
    -- 'vocabulary'|'grammar'|'root'|'lemma'|'ayah'|'concept'|'other'
  module          TEXT NOT NULL,                  -- 'AR'|'AL'|'QR'|'WV'|'other'
  card_ref        TEXT,                           -- 'AR:<srs_card_id>' once created
  enqueued_at     TEXT NOT NULL DEFAULT (datetime('now')),
  last_review_at  TEXT,
  next_review_at  TEXT,
  total_reviews   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_ref, resource_ref)
);

CREATE TABLE core_srs_review (
  id                   TEXT PRIMARY KEY,
  card_id              TEXT NOT NULL REFERENCES core_srs_card(id) ON DELETE CASCADE,
  user_ref             TEXT NOT NULL,
  rating               INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 4),
  state_before         TEXT,
  stability_after      REAL,
  difficulty_after     REAL,
  elapsed_days         INTEGER,
  scheduled_days_after INTEGER,
  state_after          TEXT,
  review_duration_secs INTEGER,
  reviewed_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
ALTER TABLE core_srs_review ADD COLUMN op_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_core_srs_review_op ON core_srs_review (op_id) WHERE op_id IS NOT NULL;

CREATE TABLE core_study_session (
  id            TEXT PRIMARY KEY,
  user_ref      TEXT NOT NULL,
  domain        TEXT NOT NULL CHECK (domain IN ('quran','arabic','wv')),
  lane          TEXT NOT NULL CHECK (lane IN ('quran','language','worldview')),
  layer_id      TEXT,
  band_code     TEXT,
  scope_kind    TEXT NOT NULL,
  scope_ref     TEXT NOT NULL,
  node_id       TEXT REFERENCES cyb_node(id) ON DELETE SET NULL,
  activity      TEXT NOT NULL CHECK (activity IN ('read','listen','watch','class','review','write','teach','discuss')),
  source_kind   TEXT,
  source_ref    TEXT,
  started_at    TEXT NOT NULL,
  ended_at      TEXT,
  duration_secs INTEGER,
  confidence    INTEGER CHECK (confidence IS NULL OR confidence BETWEEN 1 AND 4),
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE core_talk_card (
  id         TEXT PRIMARY KEY,
  deck_ref   TEXT NOT NULL REFERENCES core_talk_deck(id) ON DELETE CASCADE,
  prompt     TEXT NOT NULL,
  -- 1 light · 2 real · 3 the one you ask last.
  depth      INTEGER NOT NULL DEFAULT 1 CHECK (depth BETWEEN 1 AND 3),
  tags       TEXT,
  seq        INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
, for_name TEXT, for_ref TEXT, asked_at TEXT);

CREATE TABLE core_talk_deck (
  id          TEXT PRIMARY KEY,
  owner_ref   TEXT NOT NULL,                      -- CORE:ULID → core_users
  title       TEXT NOT NULL,
  description TEXT,
  -- Who it is for. The same question is a different question across a dinner
  -- table and a long drive with one friend.
  audience    TEXT NOT NULL DEFAULT 'friends'
                CHECK (audience IN ('family','friends','couples','kids','work','mixed')),
  language    TEXT NOT NULL DEFAULT 'en',
  is_shared   INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
, workspace_ref TEXT);

CREATE TABLE core_talking_points (
  id             TEXT PRIMARY KEY,
  podcast_id     TEXT NOT NULL,
  speaker_ref    TEXT,                            -- participant or user
  timestamp_secs INTEGER,
  content        TEXT NOT NULL,
  topic_ref      TEXT,                            -- typed ref to WV topic or QR scope
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (podcast_id) REFERENCES core_podcasts(id)
);

CREATE TABLE core_users (
  id                TEXT PRIMARY KEY,             -- ULID
  email             TEXT NOT NULL UNIQUE,
  display_name      TEXT NOT NULL,
  username          TEXT UNIQUE,
  avatar_url        TEXT,
  bio_md            TEXT,
  user_type         TEXT NOT NULL DEFAULT 'human',
    -- 'human'|'service_account'|'api_key'|'other'
  platform_role     TEXT NOT NULL DEFAULT 'member',
    -- 'superadmin'|'admin'|'member'|'guest'
  account_status    TEXT NOT NULL DEFAULT 'active',
    -- 'active'|'inactive'|'suspended'|'pending_verification'|'deleted'
  email_verified    INTEGER NOT NULL DEFAULT 0,
  last_active_at    TEXT,
  timezone          TEXT,
  locale            TEXT NOT NULL DEFAULT 'en',
  preferences_json  TEXT NOT NULL DEFAULT '{}',   -- {theme, lang, notifications, srs_mode}
  meta_json         TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE core_users_fts USING fts5(
  display_name, username, content='core_users', content_rowid='rowid'
);

CREATE TABLE core_workspace_group_members (
  id           TEXT PRIMARY KEY,
  group_id     TEXT NOT NULL,
  user_id      TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'member',   -- 'admin'|'member'
  joined_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (group_id) REFERENCES core_workspace_groups(id),
  FOREIGN KEY (user_id)  REFERENCES core_users(id),
  UNIQUE (group_id, user_id)
);

CREATE TABLE core_workspace_groups (
  id              TEXT PRIMARY KEY,
  workspace_id    TEXT NOT NULL,
  name            TEXT NOT NULL,
  group_type      TEXT NOT NULL DEFAULT 'team',
    -- 'team'|'class'|'cohort'|'role_group'|'other'
  description     TEXT,
  created_by_id   TEXT NOT NULL,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id)  REFERENCES core_workspaces(id),
  FOREIGN KEY (created_by_id) REFERENCES core_users(id),
  UNIQUE (workspace_id, name)
);

CREATE TABLE core_workspace_member_roles (
  id          TEXT PRIMARY KEY,
  member_id   TEXT NOT NULL,
  role_id     TEXT NOT NULL,
  granted_by  TEXT,
  granted_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT,
  FOREIGN KEY (member_id) REFERENCES core_workspace_members(id),
  FOREIGN KEY (role_id)   REFERENCES core_workspace_roles(id),
  UNIQUE (member_id, role_id)
);

CREATE TABLE core_workspace_members (
  id              TEXT PRIMARY KEY,               -- ULID
  workspace_id    TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  membership_role TEXT NOT NULL DEFAULT 'member',
    -- 'owner'|'admin'|'member'|'viewer'|'guest'
  status          TEXT NOT NULL DEFAULT 'active',
    -- 'invited'|'active'|'paused'|'left'|'removed'
  invited_by_id   TEXT,
  joined_at       TEXT,
  left_at         TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id)  REFERENCES core_workspaces(id),
  FOREIGN KEY (user_id)       REFERENCES core_users(id),
  UNIQUE (workspace_id, user_id)
);

CREATE TABLE core_workspace_plans (
  id              TEXT PRIMARY KEY,
  workspace_id    TEXT NOT NULL,
  pl_plan_ref     TEXT NOT NULL UNIQUE,           -- 'PL:<pl_plans.id>'
  title           TEXT NOT NULL,
  plan_type       TEXT NOT NULL DEFAULT 'study',
    -- 'study'|'curriculum'|'class'|'personal'|'team'|'other'
  owner_user_ref  TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',
    -- 'active'|'paused'|'completed'|'archived'
  visibility      TEXT NOT NULL DEFAULT 'workspace',
  started_at      TEXT,
  target_end_at   TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES core_workspaces(id)
);

CREATE TABLE core_workspace_policies (
  id                       TEXT PRIMARY KEY,
  workspace_id             TEXT NOT NULL UNIQUE,
  max_visibility           TEXT NOT NULL DEFAULT 'workspace',
    -- 'private'|'workspace'|'link_share'|'public'
  allow_public_publish     INTEGER NOT NULL DEFAULT 0,
  allow_link_share         INTEGER NOT NULL DEFAULT 1,
  allow_guest_access       INTEGER NOT NULL DEFAULT 0,
  guest_max_visibility     TEXT NOT NULL DEFAULT 'workspace',
  default_discovery        TEXT NOT NULL DEFAULT 'workspace_searchable',
    -- 'hidden'|'workspace_searchable'|'public_indexed'
  allow_member_invitations INTEGER NOT NULL DEFAULT 1,
  review_required_for_publish INTEGER NOT NULL DEFAULT 0,
  comment_policy           TEXT NOT NULL DEFAULT 'members',
    -- 'members'|'workspace'|'public'|'disabled'
  extra_json               TEXT,
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES core_workspaces(id)
);

CREATE TABLE core_workspace_roles (
  id              TEXT PRIMARY KEY,
  workspace_id    TEXT NOT NULL,
  role_key        TEXT NOT NULL,
  title           TEXT NOT NULL,
  permissions_json TEXT NOT NULL DEFAULT '{}',   -- {can_publish, can_invite, can_manage, etc.}
  is_system_role  INTEGER NOT NULL DEFAULT 0,     -- predefined platform role
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES core_workspaces(id),
  UNIQUE (workspace_id, role_key)
);

CREATE TABLE core_workspaces (
  id              TEXT PRIMARY KEY,               -- ULID
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  description_md  TEXT,
  workspace_type  TEXT NOT NULL DEFAULT 'personal',
    -- 'personal'|'family'|'team'|'study_group'|'class'|'organization'
  owner_id        TEXT NOT NULL,                  -- → core_users.id
  status          TEXT NOT NULL DEFAULT 'active',
    -- 'draft'|'active'|'archived'|'suspended'
  allow_guests    INTEGER NOT NULL DEFAULT 0,
  allow_public_publish INTEGER NOT NULL DEFAULT 0,
  default_visibility TEXT NOT NULL DEFAULT 'workspace',
    -- 'private'|'workspace'|'link_share'|'public'
  settings_json   TEXT NOT NULL DEFAULT '{}',
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (owner_id) REFERENCES core_users(id)
);

CREATE TABLE cyb_agent_rule (id TEXT PRIMARY KEY, domain TEXT NOT NULL, db_scope TEXT NOT NULL DEFAULT '*', applies_to TEXT NOT NULL, trigger_md TEXT NOT NULL, rule_md TEXT NOT NULL, rationale_md TEXT, symptom_md TEXT, antipattern TEXT, correct TEXT, check_sql TEXT, expected REAL NOT NULL DEFAULT 0, severity TEXT NOT NULL DEFAULT 'high' CHECK (severity IN ('critical','high','medium','low')), discovered_on TEXT, discovered_in TEXT, status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live','draft','retired')), meta_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta_json)), created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE TABLE cyb_card (
  id        TEXT PRIMARY KEY,
  node_id   TEXT NOT NULL REFERENCES cyb_node(id) ON DELETE CASCADE,
  card_kind TEXT NOT NULL,
  front_md  TEXT,
  back_md   TEXT,
  tags_json TEXT
);

CREATE TABLE cyb_card_type (
  card_type_code TEXT PRIMARY KEY,
  scope_level    TEXT NOT NULL CHECK (scope_level IN ('word','lemma','root')),
  type_ord       INTEGER NOT NULL,
  name_ar        TEXT NOT NULL,
  name_en        TEXT NOT NULL,
  name_ur        TEXT,
  schema_id      TEXT NOT NULL,
  note_type_id   TEXT,
  card_template  TEXT NOT NULL,
  card_kind      TEXT NOT NULL,
  deck_id        TEXT NOT NULL,
  discipline     TEXT NOT NULL,
  carriers_json  TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(carriers_json)),
  feeds_bands_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(feeds_bands_json)),
  required_fields_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(required_fields_json)),
  may_reference_json   TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(may_reference_json)),
  must_not_carry_json  TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(must_not_carry_json)),
  integrity_rule TEXT,
  prompt_en      TEXT,
  weight         REAL NOT NULL DEFAULT 1.0,
  gate_mode      TEXT NOT NULL DEFAULT 'warn',
  retention_target_days INTEGER NOT NULL DEFAULT 21,
  mastery_pct    INTEGER NOT NULL DEFAULT 95,
  status         TEXT NOT NULL DEFAULT 'live',
  note           TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')));

CREATE TABLE "cyb_carrier_binding" (
  uid TEXT PRIMARY KEY,
  domain TEXT NOT NULL CHECK (domain IN ('quran','arabic','wv')),
  lane TEXT NOT NULL CHECK (lane IN ('quran','language','worldview')),
  layer_uid TEXT, band_uid TEXT, band_code TEXT,
  scope_kind TEXT NOT NULL, db_name TEXT NOT NULL, table_name TEXT NOT NULL,
  bind_col TEXT,
  bind_kind TEXT NOT NULL DEFAULT 'unset' CHECK (bind_kind IN ('text','id','none','unset','scope')),
  bind_via TEXT, bind_note TEXT,
  role TEXT NOT NULL DEFAULT 'carrier',
  sensor_class TEXT NOT NULL DEFAULT 'measured',
  authority TEXT, status TEXT NOT NULL DEFAULT 'live', source_reg TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (db_name, table_name, band_code, scope_kind)
);

CREATE TABLE cyb_config (key TEXT PRIMARY KEY, value TEXT NOT NULL, note TEXT);

CREATE TABLE cyb_discipline (
  code TEXT PRIMARY KEY, ord INTEGER NOT NULL,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT,
  question_en TEXT NOT NULL, deck_id TEXT NOT NULL,
  card_kinds_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(card_kinds_json)),
  bands_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(bands_json)),
  status TEXT NOT NULL DEFAULT 'live', note TEXT);

CREATE TABLE cyb_disturbance (
  id         TEXT PRIMARY KEY,
  node_id    TEXT REFERENCES cyb_node(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  sensor_id  TEXT,
  detail     TEXT,
  severity   INTEGER NOT NULL DEFAULT 3,
  resolved   INTEGER NOT NULL DEFAULT 0,
  raised_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE cyb_doc_band (
  band_code TEXT PRIMARY KEY, layer_code TEXT NOT NULL, band_ord INTEGER NOT NULL,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT,
  scope_level TEXT NOT NULL, discipline TEXT NOT NULL,
  prereq_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(prereq_json)),
  build_owner INTEGER NOT NULL DEFAULT 1,
  build_carriers TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(build_carriers)),
  build_authority TEXT, denom_kind TEXT,
  content_owner INTEGER NOT NULL DEFAULT 0, gate_mode TEXT NOT NULL DEFAULT 'warn',
  weight REAL NOT NULL DEFAULT 1.0, status TEXT NOT NULL DEFAULT 'live', synced_at TEXT);

CREATE TABLE cyb_domain (
  slug          TEXT PRIMARY KEY,           -- matches cyb_node.domain
  lane          TEXT NOT NULL,              -- matches cyb_node.lane
  name_ar       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  name_ur       TEXT,
  hint          TEXT,
  -- Where the knowledge is built. Build senses this.
  content_db    TEXT NOT NULL,
  -- Where the learner's own state lives. Study and Retention sense this.
  learner_db    TEXT NOT NULL,
  -- What one unit of work is called in this domain — the thing a loop closes
  -- over. Qurʾān works a passage, Arabic a root, Worldview a concept.
  unit_kind     TEXT NOT NULL,
  color_hex     TEXT,
  symbol        TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'live',
  meta_json     TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta_json)),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE cyb_edge (
  id        TEXT PRIMARY KEY,
  from_node TEXT NOT NULL REFERENCES cyb_node(id) ON DELETE CASCADE,
  to_node   TEXT NOT NULL REFERENCES cyb_node(id) ON DELETE CASCADE,
  kind      TEXT NOT NULL,
  meta_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta_json)),
  UNIQUE(from_node, to_node, kind)
);

CREATE TABLE cyb_feedback (
  id         TEXT PRIMARY KEY,
  node_id    TEXT NOT NULL REFERENCES cyb_node(id) ON DELETE CASCADE,
  axis       TEXT NOT NULL,
  signal     TEXT NOT NULL,
  detail     TEXT,
  moved_sensor TEXT,
  at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE cyb_gauge (
  id          TEXT PRIMARY KEY,
  node_id     TEXT NOT NULL REFERENCES cyb_node(id) ON DELETE CASCADE,
  gauge_kind  TEXT NOT NULL,
  score       INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  actor       TEXT NOT NULL DEFAULT 'hasib',
  card_id     TEXT,
  attempt_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  meta_json   TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta_json))
);

CREATE TABLE cyb_job (
  id          TEXT PRIMARY KEY,
  node_id     TEXT NOT NULL REFERENCES cyb_node(id) ON DELETE CASCADE,
  op          TEXT NOT NULL,
  band_code   TEXT,
  source_slug TEXT,
  actuator    TEXT NOT NULL DEFAULT 'claude',
  skill       TEXT,
  depends_on  TEXT,
  readiness   TEXT NOT NULL DEFAULT 'ready',
  error_val   REAL NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE cyb_layer (
  id            TEXT PRIMARY KEY,           -- "<domain>:<layer_key>"
  domain        TEXT NOT NULL,              -- quran | arabic | wv | …
  lane          TEXT NOT NULL,
  layer_key     TEXT NOT NULL,              -- matches cyb_node.layer
  name_ar       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  name_ur       TEXT,
  hint          TEXT,                       -- "tilāwa · tajwīd"
  -- Which database holds this layer's content. The control plane is in km_core;
  -- the content never is.
  db_name       TEXT NOT NULL,
  color_hex     TEXT,
  symbol        TEXT,                       -- SF Symbol name
  display_order INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'live',
  meta_json     TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta_json)),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (domain, layer_key)
);

CREATE TABLE cyb_node (
  id            TEXT PRIMARY KEY,
  domain        TEXT NOT NULL,
  lane          TEXT NOT NULL DEFAULT 'quran',
  parent_id     TEXT REFERENCES cyb_node(id) ON DELETE CASCADE,
  scale         TEXT NOT NULL,
  target_kind   TEXT,
  target_ref    TEXT,
  layer         TEXT,
  piece_kind    TEXT,
  build_state   TEXT NOT NULL DEFAULT 'empty',
  build_pct     INTEGER NOT NULL DEFAULT 0,
  study_state   TEXT NOT NULL DEFAULT 'unseen',
  study_pct     INTEGER NOT NULL DEFAULT 0,
  content_state TEXT NOT NULL DEFAULT 'none',
  content_pct   INTEGER NOT NULL DEFAULT 0,
  setpoint_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(setpoint_json)),
  priority      INTEGER NOT NULL DEFAULT 5,
  meta_json     TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta_json)),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
, retention_state TEXT NOT NULL DEFAULT 'none', retention_pct INTEGER NOT NULL DEFAULT 0, build_measured     INTEGER NOT NULL DEFAULT 0, study_measured     INTEGER NOT NULL DEFAULT 0, content_measured   INTEGER NOT NULL DEFAULT 0, retention_measured INTEGER NOT NULL DEFAULT 0, build_stale        INTEGER NOT NULL DEFAULT 0);

CREATE TABLE cyb_process (
  uid         TEXT PRIMARY KEY,
  domain      TEXT NOT NULL CHECK (domain IN ('quran','arabic','wv')),
  lane        TEXT NOT NULL CHECK (lane IN ('quran','language','worldview')),
  scope_kind  TEXT NOT NULL,
  name_ar     TEXT NOT NULL,
  name_en     TEXT NOT NULL,
  name_ur     TEXT,
  note_md     TEXT,
  status      TEXT NOT NULL DEFAULT 'live',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE cyb_process_step (
  uid          TEXT PRIMARY KEY,
  process_uid  TEXT NOT NULL REFERENCES cyb_process(uid) ON DELETE CASCADE,
  step_key     TEXT NOT NULL,
  step_no      INTEGER NOT NULL,
  scope_kind   TEXT NOT NULL DEFAULT 'passage',
  name_ar      TEXT NOT NULL,
  name_en      TEXT NOT NULL,
  name_ur      TEXT,
  covers_md    TEXT,
  key_info_md  TEXT,
  merged_from_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(merged_from_json)),
  prereq_json  TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(prereq_json)),
  status       TEXT NOT NULL DEFAULT 'live',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (process_uid, step_key)
);

CREATE TABLE cyb_process_step_layer (
  uid         TEXT PRIMARY KEY,
  step_uid    TEXT NOT NULL REFERENCES cyb_process_step(uid) ON DELETE CASCADE,
  layer_uid   TEXT NOT NULL,
  skill_slug  TEXT,
  role        TEXT NOT NULL DEFAULT 'primary' CHECK (role IN ('primary','secondary')),
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE cyb_production (
  id          TEXT PRIMARY KEY,
  node_id     TEXT NOT NULL REFERENCES cyb_node(id) ON DELETE CASCADE,
  format      TEXT NOT NULL,
  target      TEXT NOT NULL,
  with_whom   TEXT,
  youtube_ref TEXT,
  state       TEXT NOT NULL DEFAULT 'drafted',
  gated_ok    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
, studio_ref TEXT, channel TEXT);

CREATE TABLE cyb_ps_band (
  band_code TEXT PRIMARY KEY, layer_code TEXT NOT NULL, band_ord INTEGER NOT NULL,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT,
  scope_level TEXT NOT NULL, discipline TEXT NOT NULL,
  prereq_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(prereq_json)),
  build_owner INTEGER NOT NULL DEFAULT 0,
  build_carriers TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(build_carriers)),
  build_authority TEXT, denom_kind TEXT,
  study_owner INTEGER NOT NULL DEFAULT 0, card_kind TEXT, card_prompt_en TEXT,
  content_owner INTEGER NOT NULL DEFAULT 0, scene_key TEXT, gate_mode TEXT NOT NULL DEFAULT 'warn',
  retention_target_days INTEGER NOT NULL DEFAULT 21, mastery_pct INTEGER NOT NULL DEFAULT 95,
  weight REAL NOT NULL DEFAULT 1.0, status TEXT NOT NULL DEFAULT 'live', synced_at TEXT, layer_key TEXT);

CREATE TABLE cyb_pt_band (
  band_code TEXT PRIMARY KEY, layer_code TEXT NOT NULL, band_ord INTEGER NOT NULL,
  section_kind TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT,
  discipline TEXT NOT NULL,
  carrier_table TEXT NOT NULL DEFAULT 'qr_surah_passage_tafsir_section',
  build_authority TEXT NOT NULL DEFAULT 'mufassir_text',
  weight REAL NOT NULL DEFAULT 1.0, status TEXT NOT NULL DEFAULT 'live');

CREATE TABLE cyb_root_band (
  band_code TEXT PRIMARY KEY, layer_code TEXT NOT NULL, band_ord INTEGER NOT NULL,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT,
  scope_level TEXT NOT NULL, discipline TEXT NOT NULL,
  prereq_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(prereq_json)),
  build_owner INTEGER NOT NULL DEFAULT 0, build_carriers TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(build_carriers)),
  build_authority TEXT, denom_kind TEXT,
  study_owner INTEGER NOT NULL DEFAULT 0, card_kind TEXT, card_prompt_en TEXT,
  content_owner INTEGER NOT NULL DEFAULT 0, scene_key TEXT, gate_mode TEXT NOT NULL DEFAULT 'warn',
  retention_target_days INTEGER NOT NULL DEFAULT 21, mastery_pct INTEGER NOT NULL DEFAULT 95,
  weight REAL NOT NULL DEFAULT 1.0, status TEXT NOT NULL DEFAULT 'live', synced_at TEXT);

CREATE TABLE cyb_sensor (
  id           TEXT PRIMARY KEY,
  node_id      TEXT NOT NULL REFERENCES cyb_node(id) ON DELETE CASCADE,
  axis         TEXT NOT NULL,
  kind         TEXT NOT NULL,
  band_code    TEXT,
  metric       TEXT NOT NULL,
  reading      REAL NOT NULL DEFAULT 0,
  expected     REAL NOT NULL DEFAULT 1,
  weight       REAL NOT NULL DEFAULT 1,
  state        TEXT NOT NULL DEFAULT 'empty',
  health       TEXT NOT NULL DEFAULT 'unknown',
  trend        TEXT NOT NULL DEFAULT 'flat',
  prev_reading REAL,
  error_val    REAL NOT NULL DEFAULT 0,
  read_count   INTEGER NOT NULL DEFAULT 0,
  source_table TEXT,
  source_slug  TEXT,
  first_read_at TEXT,
  last_read_at  TEXT,
  UNIQUE(node_id, axis, band_code, metric, source_slug)
);

CREATE TABLE cyb_sensor_def (
  id          TEXT PRIMARY KEY,
  axis        TEXT NOT NULL,
  applies_to  TEXT NOT NULL,
  band_code   TEXT,
  metric      TEXT NOT NULL,
  reader      TEXT NOT NULL,
  reader_args TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(reader_args)),
  expected    REAL NOT NULL DEFAULT 1,
  weight      REAL NOT NULL DEFAULT 1,
  stale_days  INTEGER NOT NULL DEFAULT 30,
  status      TEXT NOT NULL DEFAULT 'live',
  note        TEXT
);

CREATE TABLE cyb_sensor_reading (
  id        TEXT PRIMARY KEY,
  sensor_id TEXT NOT NULL REFERENCES cyb_sensor(id) ON DELETE CASCADE,
  reading   REAL NOT NULL,
  state     TEXT NOT NULL,
  tick_id   TEXT,
  at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE cyb_skill (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  loop_key TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  description TEXT,
  stages TEXT,
  orchestrates TEXT,
  refs_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(refs_json)),
  body_md TEXT,
  artifact_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  meta_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(meta_json))
);

CREATE TABLE cyb_skill_file (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  ord INTEGER NOT NULL,
  mime TEXT NOT NULL DEFAULT 'text/markdown',
  byte_len INTEGER,
  body_md TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(skill_id, filename)
);

CREATE TABLE cyb_source_registry (
  id             TEXT PRIMARY KEY,
  loop_key       TEXT NOT NULL,
  domain         TEXT NOT NULL,
  source_slug    TEXT NOT NULL,
  title_ar TEXT, title_en TEXT, author TEXT,
  source_kind    TEXT NOT NULL,
  authority_rank INTEGER NOT NULL DEFAULT 5,
  binding        TEXT NOT NULL,
  locator        TEXT NOT NULL,
  entry_locator  TEXT NOT NULL,
  trilingual     INTEGER NOT NULL DEFAULT 0,
  license        TEXT,
  coverage_state TEXT NOT NULL DEFAULT 'catalogued',
  note           TEXT,
  meta_json      TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta_json)), db TEXT, db_id TEXT, legacy_code TEXT, feeds TEXT, scope TEXT,
  UNIQUE(loop_key, source_slug)
);

CREATE TABLE cyb_ss_band (
  band_code TEXT PRIMARY KEY, layer_code TEXT NOT NULL, band_ord INTEGER NOT NULL,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT,
  scope_level TEXT NOT NULL, discipline TEXT NOT NULL,
  prereq_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(prereq_json)),
  build_owner INTEGER NOT NULL DEFAULT 0,
  build_carriers TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(build_carriers)),
  build_authority TEXT, denom_kind TEXT,
  study_owner INTEGER NOT NULL DEFAULT 0, card_kind TEXT, card_prompt_en TEXT,
  content_owner INTEGER NOT NULL DEFAULT 0, scene_key TEXT,
  gate_mode TEXT NOT NULL DEFAULT 'warn',
  retention_target_days INTEGER NOT NULL DEFAULT 21,
  mastery_pct INTEGER NOT NULL DEFAULT 95,
  weight REAL NOT NULL DEFAULT 1.0,
  status TEXT NOT NULL DEFAULT 'live', synced_at TEXT);

CREATE TABLE cyb_tick (
  id         TEXT PRIMARY KEY,
  ran_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  sensed     INTEGER, drifts INTEGER, actuated INTEGER, corrected INTEGER,
  summary    TEXT
);

CREATE TABLE cyb_wv_band (
  band_code TEXT PRIMARY KEY, layer_code TEXT NOT NULL, band_ord INTEGER NOT NULL,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT,
  scope_level TEXT NOT NULL, discipline TEXT NOT NULL,
  wv_domain_slug TEXT,
  prereq_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(prereq_json)),
  build_owner INTEGER NOT NULL DEFAULT 0,
  build_carriers TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(build_carriers)),
  build_authority TEXT, denom_kind TEXT,
  study_owner INTEGER NOT NULL DEFAULT 0, card_kind TEXT, card_prompt_en TEXT,
  content_owner INTEGER NOT NULL DEFAULT 0, scene_key TEXT,
  gate_mode TEXT NOT NULL DEFAULT 'warn',
  retention_target_days INTEGER NOT NULL DEFAULT 21,
  mastery_pct INTEGER NOT NULL DEFAULT 95,
  weight REAL NOT NULL DEFAULT 1.0,
  status TEXT NOT NULL DEFAULT 'live', synced_at TEXT);


-- ── Views (27) ───────────────────────────────────────────────────

CREATE VIEW core_person_violations AS
  SELECT 'id_shape' AS kind, id AS row_id, id AS wrote FROM core_person
   WHERE id NOT LIKE 'PN:%'
  UNION ALL
  SELECT 'key_mismatch', id, person_key FROM core_person
   WHERE id <> 'PN:' || person_key
  UNION ALL
  -- Died before born. Cheap to check and the kind of thing a bulk import does.
  SELECT 'dates', id, CAST(birth_year AS TEXT) || '–' || CAST(death_year AS TEXT)
    FROM core_person
   WHERE birth_year IS NOT NULL AND death_year IS NOT NULL AND death_year < birth_year;

CREATE VIEW cyb_control_kpi AS
SELECT COUNT(*) AS roots,
  SUM(CASE WHEN id LIKE 'CYB:ling:root:%' THEN 1 ELSE 0 END) AS canonical_roots,
  ROUND(AVG(build_pct),1) AS avg_build, ROUND(AVG(study_pct),1) AS avg_study,
  ROUND(AVG(content_pct),1) AS avg_content, ROUND(AVG(retention_pct),1) AS avg_retention,
  SUM(CASE WHEN study_state='mastered' THEN 1 ELSE 0 END) AS mastered,
  SUM(CASE WHEN content_state='published' THEN 1 ELSE 0 END) AS published,
  (SELECT COUNT(*) FROM cyb_disturbance d JOIN cyb_node dn ON dn.id=d.node_id WHERE dn.target_kind='root' AND d.resolved=0) AS open_drifts,
  (SELECT COUNT(*) FROM cyb_job j JOIN cyb_node jn ON jn.id=j.node_id WHERE jn.target_kind='root' AND j.readiness='ready') AS ready_jobs,
  (SELECT MAX(ran_at) FROM cyb_tick) AS last_tick
FROM cyb_node WHERE target_kind='root';

CREATE VIEW cyb_coupling AS
  SELECT p.id AS production_id, p.node_id, p.format, p.state, p.gated_ok,
         n.study_state, n.study_pct,
         CASE WHEN n.study_state <> 'mastered' THEN 1 ELSE 0 END AS gate_violation
  FROM cyb_production p JOIN cyb_node n ON n.id = p.node_id
  WHERE n.study_state <> 'mastered';

CREATE VIEW cyb_dashboard AS
  SELECT n.domain,
         COUNT(*) AS nodes,
         ROUND(AVG(n.build_pct),1)   AS avg_build_pct,
         ROUND(AVG(n.study_pct),1)   AS avg_study_pct,
         ROUND(AVG(n.content_pct),1) AS avg_content_pct,
         SUM(CASE WHEN n.study_state='mastered' THEN 1 ELSE 0 END) AS mastered_nodes,
         SUM(CASE WHEN n.content_state='published' THEN 1 ELSE 0 END) AS published_nodes,
         (SELECT COUNT(*) FROM cyb_disturbance d
            JOIN cyb_node dn ON dn.id=d.node_id
            WHERE dn.domain=n.domain AND d.resolved=0) AS open_drifts
  FROM cyb_node n
  GROUP BY n.domain;

CREATE VIEW cyb_drift_open AS
SELECT d.id, n.target_ref AS root, n.id AS node_id, d.kind, d.severity, d.detail, d.sensor_id, d.raised_at
FROM cyb_disturbance d JOIN cyb_node n ON n.id=d.node_id
WHERE d.resolved=0 ORDER BY d.severity DESC, d.raised_at DESC;

CREATE VIEW cyb_job_board AS
SELECT j.id AS job_id, n.target_ref AS root, n.id AS node_id, j.op, j.band_code,
  j.source_slug, j.actuator, j.skill, j.readiness, j.error_val, j.depends_on, j.created_at
FROM cyb_job j JOIN cyb_node n ON n.id=j.node_id
ORDER BY (j.readiness='ready') DESC, j.error_val DESC, j.created_at;

CREATE VIEW cyb_ps_build AS
SELECT n.id node_id, n.target_ref passage, b.band_code, b.name_en band, b.band_ord, b.discipline, b.prereq_json,
 MAX(CASE WHEN d.metric='presence'   THEN COALESCE(s.reading,0) END) presence,
 MAX(CASE WHEN d.metric='coverage'   THEN COALESCE(s.reading,0) END) coverage,
 MAX(CASE WHEN d.metric='provenance' THEN COALESCE(s.reading,0) END) provenance,
 MAX(CASE WHEN d.metric='trilingual' THEN COALESCE(s.reading,0) END) trilingual,
 COUNT(s.id) sensors_read, COUNT(d.id) sensors_expected,
 ROUND(SUM(COALESCE(s.reading,0)*d.weight)/NULLIF(SUM(d.weight),0),3) band_score,
 CASE WHEN COUNT(s.id)=0 THEN 'unread'
      WHEN MAX(CASE WHEN d.metric='presence' THEN COALESCE(s.reading,0) END)=0 THEN 'empty'
      WHEN ROUND(SUM(COALESCE(s.reading,0)*d.weight)/NULLIF(SUM(d.weight),0),3)>=0.95 THEN 'done'
      ELSE 'partial' END band_state,
 MAX(s.last_read_at) last_read_at
FROM cyb_node n
JOIN cyb_ps_band b ON b.status='live' AND b.build_carriers<>'[]'
JOIN cyb_sensor_def d ON d.applies_to='passage' AND d.axis='build' AND d.band_code=b.band_code
LEFT JOIN cyb_sensor s ON s.node_id=n.id AND s.axis='build' AND s.band_code=b.band_code AND s.metric=d.metric
WHERE n.scale='passage' OR n.target_kind='passage'
GROUP BY n.id, b.band_code;

CREATE VIEW cyb_pt_board AS
SELECT node_id, tafsir_ref, COUNT(*) bands, SUM(band_state='done') bands_done, SUM(band_state='empty') bands_empty, SUM(band_state='unread') bands_unread,
 ROUND(AVG(band_score)*100,1) measured_pct, ROUND(AVG(heading_fidelity)*100,1) heading_fidelity_pct
FROM cyb_pt_build GROUP BY node_id;

CREATE VIEW cyb_pt_build AS
SELECT n.id node_id, n.target_ref tafsir_ref, b.band_code, b.name_en band, b.band_ord, b.discipline, b.section_kind,
 MAX(CASE WHEN d.metric='presence' THEN COALESCE(s.reading,0) END) presence,
 MAX(CASE WHEN d.metric='heading_fidelity' THEN COALESCE(s.reading,0) END) heading_fidelity,
 MAX(CASE WHEN d.metric='trilingual' THEN COALESCE(s.reading,0) END) trilingual,
 MAX(CASE WHEN d.metric='provenance' THEN COALESCE(s.reading,0) END) provenance,
 MAX(CASE WHEN d.metric='terms_bound' THEN COALESCE(s.reading,0) END) terms_bound,
 COUNT(s.id) sensors_read, COUNT(d.id) sensors_expected,
 ROUND(SUM(COALESCE(s.reading,0)*d.weight)/NULLIF(SUM(d.weight),0),3) band_score,
 CASE WHEN COUNT(s.id)=0 THEN 'unread'
      WHEN MAX(CASE WHEN d.metric='presence' THEN COALESCE(s.reading,0) END)=0 THEN 'empty'
      WHEN ROUND(SUM(COALESCE(s.reading,0)*d.weight)/NULLIF(SUM(d.weight),0),3)>=0.95 THEN 'done'
      ELSE 'partial' END band_state,
 MAX(s.last_read_at) last_read_at
FROM cyb_node n
JOIN cyb_pt_band b ON b.status='live'
JOIN cyb_sensor_def d ON d.applies_to='passage_tafsir' AND d.axis='build' AND d.band_code=b.band_code
LEFT JOIN cyb_sensor s ON s.node_id=n.id AND s.axis='build' AND s.band_code=b.band_code AND s.metric=d.metric
WHERE n.target_kind='passage_tafsir'
GROUP BY n.id, b.band_code;

CREATE VIEW cyb_queue AS
  SELECT n.id AS node_id, n.domain, n.lane, n.layer, n.piece_kind, n.priority, n.build_pct,
         COUNT(s.id) AS open_sensors,
         ROUND(SUM(MAX(0, s.error_val)), 4) AS total_error,
         ROUND(SUM(MAX(0, s.error_val)) * n.priority, 4) AS ranked_error
  FROM cyb_node n
  JOIN cyb_sensor s ON s.node_id = n.id AND s.axis='build'
  WHERE s.error_val > 0
  GROUP BY n.id
  ORDER BY ranked_error DESC, n.build_pct DESC;

CREATE VIEW cyb_root_board AS
SELECT n.id node_id, n.target_ref root, n.domain, n.scale,
 (SELECT ROUND(AVG(band_score)*100,1) FROM cyb_root_build x WHERE x.node_id=n.id) build_pct,
 (SELECT SUM(band_state='done')    FROM cyb_root_build x WHERE x.node_id=n.id) bands_done,
 (SELECT SUM(band_state='partial') FROM cyb_root_build x WHERE x.node_id=n.id) bands_partial,
 (SELECT SUM(band_state='empty')   FROM cyb_root_build x WHERE x.node_id=n.id) bands_empty,
 (SELECT SUM(band_state='unread')  FROM cyb_root_build x WHERE x.node_id=n.id) bands_unread,
 (SELECT ROUND(SUM(sensors_read)*100.0/NULLIF(SUM(sensors_expected),0),1) FROM cyb_root_build x WHERE x.node_id=n.id) measured_pct,
 (SELECT COUNT(*) FROM cyb_job j WHERE j.node_id=n.id AND j.readiness<>'done') open_jobs
FROM cyb_node n WHERE n.target_kind='root';

CREATE VIEW cyb_root_build AS
SELECT n.id node_id, n.target_ref root, n.domain,
 b.band_code, b.name_en band, b.band_ord, b.layer_code, b.scope_level, b.discipline, b.prereq_json, b.build_authority,
 MAX(CASE WHEN d.metric='presence'   THEN COALESCE(s.reading,0) END) presence,
 MAX(CASE WHEN d.metric='coverage'   THEN COALESCE(s.reading,0) END) coverage,
 MAX(CASE WHEN d.metric='provenance' THEN COALESCE(s.reading,0) END) provenance,
 MAX(CASE WHEN d.metric='trilingual' THEN COALESCE(s.reading,0) END) trilingual,
 MAX(CASE WHEN d.metric='audited'    THEN COALESCE(s.reading,0) END) audited,
 COUNT(s.id) sensors_read, COUNT(d.id) sensors_expected,
 ROUND(SUM(COALESCE(s.reading,0)*d.weight)/NULLIF(SUM(d.weight),0),3) band_score,
 CASE WHEN COUNT(s.id)=0 THEN 'unread'
      WHEN MAX(CASE WHEN d.metric='presence' THEN COALESCE(s.reading,0) END)=0 THEN 'empty'
      WHEN ROUND(SUM(COALESCE(s.reading,0)*d.weight)/NULLIF(SUM(d.weight),0),3)>=0.95 THEN 'done'
      ELSE 'partial' END band_state,
 MAX(s.last_read_at) last_read_at
FROM cyb_node n
JOIN cyb_root_band b ON b.status='live' AND b.build_carriers<>'[]'
JOIN cyb_sensor_def d ON d.applies_to='root' AND d.axis='build' AND d.band_code=b.band_code AND d.status='live'
LEFT JOIN cyb_sensor s ON s.node_id=n.id AND s.axis='build' AND s.band_code=b.band_code AND s.metric=d.metric
WHERE n.target_kind='root'
GROUP BY n.id, b.band_code;

CREATE VIEW cyb_root_content AS
SELECT n.id node_id, n.target_ref root, b.band_code, b.name_en band, b.scene_key, b.gate_mode,
 COUNT(p.id) productions,
 SUM(p.state='drafted') drafted, SUM(p.state='produced') produced, SUM(p.state='published') published,
 SUM(p.gated_ok) gate_ok,
 (SELECT band_state FROM cyb_root_build v WHERE v.node_id=n.id AND v.band_code=b.band_code) build_state,
 CASE WHEN (SELECT band_state FROM cyb_root_build v WHERE v.node_id=n.id AND v.band_code=b.band_code)
           IN ('empty','broken')
      THEN CASE b.gate_mode WHEN 'block' THEN 'BLOCKED' ELSE 'WARN' END
      ELSE 'clear' END publish_gate
FROM cyb_node n
JOIN cyb_root_band b ON b.content_owner=1 AND b.status='live'
LEFT JOIN cyb_production p ON p.node_id=n.id AND p.target=b.scene_key
WHERE n.target_kind='root'
GROUP BY n.id, b.band_code;

CREATE VIEW cyb_root_sensor AS
SELECT n.target_ref AS root, n.id AS node_id, s.axis, s.band_code, s.metric,
  s.reading, s.expected, s.error_val, s.state, s.health, s.trend,
  CASE WHEN s.error_val<=0 THEN 'green' ELSE 'red' END AS light,
  s.source_slug, s.last_read_at
FROM cyb_sensor s JOIN cyb_node n ON n.id=s.node_id
WHERE n.target_kind='root'
ORDER BY n.target_ref, s.axis, s.band_code, s.metric;

CREATE VIEW cyb_sensor_health AS
SELECT s.id, s.node_id, s.axis, s.band_code, s.metric, s.reading, s.expected, s.error_val,
       s.trend, s.state,
       CAST((julianday('now') - julianday(s.last_read_at)) AS INT) AS days_since_read,
       CASE
         WHEN s.reading = 0 AND s.metric='presence'            THEN 'missing'
         WHEN s.prev_reading IS NOT NULL AND s.reading < s.prev_reading THEN 'regressed'
         WHEN (julianday('now') - julianday(s.last_read_at)) > 30 THEN 'stale'
         WHEN s.state='conflicting'                            THEN 'conflicting'
         ELSE 'ok' END AS alert
FROM cyb_sensor s;

CREATE VIEW cyb_skill_board AS
SELECT k.slug, k.name, k.version, k.loop_key, k.status, k.stages, k.orchestrates,
  json_array_length(k.refs_json) AS refs,
  (SELECT COUNT(*) FROM cyb_skill_file f WHERE f.skill_id=k.id) AS files,
  k.artifact_ref, k.updated_at
FROM cyb_skill k ORDER BY k.updated_at DESC;

CREATE VIEW cyb_source_for_loop AS
  SELECT loop_key, source_slug, source_kind, authority_rank, binding, locator, entry_locator, coverage_state
  FROM cyb_source_registry ORDER BY loop_key, authority_rank;

CREATE VIEW cyb_ss_board AS
SELECT n.id node_id, n.target_ref sentence,
 json_extract(n.meta_json,'$.ayah') ayah, json_extract(n.meta_json,'$.words') words,
 json_extract(n.meta_json,'$.role') discourse_role,
 COALESCE(json_extract(n.meta_json,'$.is_virtual'),0) is_virtual,
 (SELECT ROUND(AVG(band_score)*100,1) FROM cyb_ss_build x WHERE x.node_id=n.id) build_pct,
 (SELECT SUM(band_state='done')    FROM cyb_ss_build x WHERE x.node_id=n.id) bands_done,
 (SELECT SUM(band_state='partial') FROM cyb_ss_build x WHERE x.node_id=n.id) bands_partial,
 (SELECT SUM(band_state='empty')   FROM cyb_ss_build x WHERE x.node_id=n.id) bands_empty,
 (SELECT SUM(band_state='unread')  FROM cyb_ss_build x WHERE x.node_id=n.id) bands_unread,
 (SELECT SUM(sensors_read) FROM cyb_ss_build x WHERE x.node_id=n.id) sensors_read,
 (SELECT SUM(sensors_expected) FROM cyb_ss_build x WHERE x.node_id=n.id) sensors_expected,
 (SELECT ROUND(SUM(sensors_read)*100.0/NULLIF(SUM(sensors_expected),0),1) FROM cyb_ss_build x WHERE x.node_id=n.id) measured_pct
FROM cyb_node n WHERE n.layer='ss' AND n.piece_kind='sentence';

CREATE VIEW cyb_ss_build AS
SELECT n.id node_id, n.target_ref sentence, n.parent_id stage_node,
 json_extract(n.meta_json,'$.ayah') ayah, json_extract(n.meta_json,'$.words') words,
 b.band_code, b.name_en band, b.band_ord, b.discipline, b.prereq_json,
 MAX(CASE WHEN d.metric='presence'   THEN COALESCE(s.reading,0) END) presence,
 MAX(CASE WHEN d.metric='coverage'   THEN COALESCE(s.reading,0) END) coverage,
 MAX(CASE WHEN d.metric='provenance' THEN COALESCE(s.reading,0) END) provenance,
 MAX(CASE WHEN d.metric='trilingual' THEN COALESCE(s.reading,0) END) trilingual,
 COUNT(s.id) sensors_read, COUNT(d.id) sensors_expected,
 ROUND(SUM(COALESCE(s.reading,0)*d.weight)/NULLIF(SUM(d.weight),0),3) band_score,
 CASE WHEN COALESCE(json_extract(n.meta_json,'$.is_virtual'),0)=1 THEN 'virtual'
      WHEN COUNT(s.id)=0 THEN 'unread'
      WHEN MAX(CASE WHEN d.metric='presence' THEN COALESCE(s.reading,0) END)=0 THEN 'empty'
      WHEN ROUND(SUM(COALESCE(s.reading,0)*d.weight)/NULLIF(SUM(d.weight),0),3)>=0.95 THEN 'done'
      ELSE 'partial' END band_state,
 MAX(s.last_read_at) last_read_at
FROM cyb_node n
JOIN cyb_ss_band b ON b.status='live' AND b.build_carriers<>'[]' AND b.scope_level='sentence'
JOIN cyb_sensor_def d ON d.applies_to='ayah' AND d.axis='build' AND d.band_code=b.band_code
     AND d.metric IN ('presence','coverage','provenance','trilingual')
LEFT JOIN cyb_sensor s ON s.node_id=n.id AND s.axis='build' AND s.band_code=b.band_code AND s.metric=d.metric
WHERE n.layer='ss' AND n.piece_kind='sentence'
GROUP BY n.id, b.band_code;

CREATE VIEW cyb_ss_content AS
SELECT n.id node_id, n.target_ref ayah, b.band_code, b.name_en band, b.scene_key, b.gate_mode,
 COUNT(p.id) productions,
 SUM(p.state='drafted') drafted, SUM(p.state='produced') produced, SUM(p.state='published') published,
 SUM(p.gated_ok) gate_ok,
 (SELECT band_state FROM cyb_ss_build v WHERE v.node_id=n.id AND v.band_code=b.band_code) build_state,
 CASE WHEN (SELECT band_state FROM cyb_ss_build v WHERE v.node_id=n.id AND v.band_code=b.band_code)
           IN ('empty','broken')
      THEN CASE b.gate_mode WHEN 'block' THEN 'BLOCKED' ELSE 'WARN' END
      ELSE 'clear' END publish_gate
FROM cyb_node n
JOIN cyb_ss_band b ON b.content_owner=1 AND b.status='live'
LEFT JOIN cyb_production p ON p.node_id=n.id AND p.target=b.scene_key
WHERE n.layer='ss'
GROUP BY n.id, b.band_code;

CREATE VIEW cyb_tick_log AS
SELECT id, ran_at, sensed, drifts, actuated, corrected, summary
FROM cyb_tick ORDER BY ran_at DESC LIMIT 50;

CREATE VIEW v_cyb_binding_broken AS SELECT b.uid, b.domain, b.db_name, b.table_name, b.layer_uid, b.band_code, b.role, CASE WHEN b.layer_uid IS NULL THEN 'carrier names no layer' WHEN NOT EXISTS (SELECT 1 FROM cyb_layer l WHERE l.id=b.layer_uid) THEN 'layer_uid resolves to no cyb_layer' ELSE 'uid does not name its band family' END AS issue FROM cyb_carrier_binding b WHERE b.status='live' AND b.role='carrier' AND (b.layer_uid IS NULL OR NOT EXISTS (SELECT 1 FROM cyb_layer l WHERE l.id=b.layer_uid) OR b.uid <> 'BIND:' || (CASE WHEN EXISTS (SELECT 1 FROM cyb_root_band z WHERE z.band_code=b.band_code) THEN 'root' WHEN EXISTS (SELECT 1 FROM cyb_ps_band z WHERE z.band_code=b.band_code) THEN 'passage' WHEN EXISTS (SELECT 1 FROM cyb_ss_band z WHERE z.band_code=b.band_code) THEN 'ss' WHEN EXISTS (SELECT 1 FROM cyb_wv_band z WHERE z.band_code=b.band_code) THEN 'wv' WHEN EXISTS (SELECT 1 FROM cyb_doc_band z WHERE z.band_code=b.band_code) THEN 'doc' WHEN EXISTS (SELECT 1 FROM cyb_pt_band z WHERE z.band_code=b.band_code) THEN 'pt' ELSE 'unknown' END) || ':' || b.band_code || ':' || b.table_name);

CREATE VIEW v_cyb_binding_unresolved AS
SELECT uid, domain, db_name, table_name, band_code
  FROM cyb_carrier_binding
 WHERE bind_kind = 'unset' AND status = 'live';

CREATE VIEW v_cyb_node_reading AS
SELECT n.id AS node_id, 'build' AS axis,
       n.build_pct AS pct, n.build_measured AS measured, n.build_stale AS stale,
       (SELECT COUNT(*) FROM cyb_sensor s WHERE s.node_id = n.id AND s.axis = 'build') AS sensors,
       (SELECT COUNT(*) FROM cyb_sensor s WHERE s.node_id = n.id AND s.axis = 'build' AND s.read_count > 0) AS read_sensors
  FROM cyb_node n
UNION ALL
SELECT n.id, 'study', n.study_pct, n.study_measured, 0,
       (SELECT COUNT(*) FROM cyb_sensor s WHERE s.node_id = n.id AND s.axis = 'study'),
       (SELECT COUNT(*) FROM cyb_sensor s WHERE s.node_id = n.id AND s.axis = 'study' AND s.read_count > 0)
  FROM cyb_node n
UNION ALL
SELECT n.id, 'content', n.content_pct, n.content_measured, 0,
       (SELECT COUNT(*) FROM cyb_sensor s WHERE s.node_id = n.id AND s.axis = 'content'),
       (SELECT COUNT(*) FROM cyb_sensor s WHERE s.node_id = n.id AND s.axis = 'content' AND s.read_count > 0)
  FROM cyb_node n
UNION ALL
SELECT n.id, 'retention', n.retention_pct, n.retention_measured, 0,
       (SELECT COUNT(*) FROM cyb_sensor s WHERE s.node_id = n.id AND s.axis = 'retention'),
       (SELECT COUNT(*) FROM cyb_sensor s WHERE s.node_id = n.id AND s.axis = 'retention' AND s.read_count > 0)
  FROM cyb_node n;

CREATE VIEW v_cyb_node_unsourced AS
SELECT r.node_id, r.axis, r.pct
  FROM v_cyb_node_reading r
  JOIN cyb_node n ON n.id = r.node_id
 WHERE r.measured = 1 AND r.pct > 0 AND r.sensors = 0
   AND n.scale NOT IN ('surah','stage','domain','programme')
   AND NOT (n.scale = 'root' AND EXISTS (
        SELECT 1 FROM core_root_build_stat st
         WHERE st.root_ar = COALESCE(json_extract(n.meta_json,'$.root_ar'), n.target_ref)
           AND st.build_pct = r.pct AND r.axis = 'build'));

CREATE VIEW v_cyb_process_doc AS SELECT s.uid AS step_uid, s.step_no, s.step_key, s.name_en AS step_name, s.scope_kind, l.id AS layer_id, l.name_en AS layer_name, l.db_name, b.skill_slug, c.band_code, c.table_name, c.bind_col, c.bind_kind, c.scope_kind AS carrier_scope FROM cyb_process_step s JOIN cyb_process_step_layer b ON b.step_uid = s.uid LEFT JOIN cyb_layer l ON l.id = b.layer_uid LEFT JOIN cyb_carrier_binding c ON c.layer_uid = b.layer_uid AND c.status = 'live';

CREATE VIEW v_cyb_sensor_dead_source AS
SELECT s.id AS sensor_id, s.node_id, s.axis, s.band_code, s.metric, s.source_table, s.state,
       CASE WHEN s.source_table IS NULL THEN 'null_source'
            WHEN s.source_table LIKE 'km/_%' ESCAPE '/' THEN 'db_name_not_table'
            WHEN s.source_table LIKE '%+%' THEN 'composite_string'
            WHEN s.state = 'pending_carrier' THEN 'pending_carrier_decision'
            ELSE 'check_exists' END AS issue
FROM cyb_sensor s
WHERE s.source_table IS NULL
   OR s.source_table LIKE 'km/_%' ESCAPE '/'
   OR s.source_table LIKE '%+%'
   OR s.state = 'pending_carrier';


-- ── Indexes (125) ────────────────────────────────────────────────

CREATE INDEX core_srs_card_deck ON core_srs_card(deck_id);

CREATE INDEX core_srs_card_due ON core_srs_card(user_ref, next_review_at);

CREATE INDEX core_srs_card_res ON core_srs_card(module, resource_ref);

CREATE INDEX core_srs_deck_parent ON core_srs_deck(parent_id);

CREATE INDEX core_srs_deck_user ON core_srs_deck(user_ref);

CREATE INDEX core_srs_review_card ON core_srs_review(card_id, reviewed_at);

CREATE INDEX core_srs_review_day ON core_srs_review(user_ref, reviewed_at);

CREATE INDEX core_srs_review_user ON core_srs_review(user_ref, reviewed_at);

CREATE INDEX cyb_layer_domain ON cyb_layer(domain, display_order);

CREATE INDEX cyb_node_layer  ON cyb_node(domain, layer);

CREATE INDEX cyb_node_parent ON cyb_node(parent_id);

CREATE INDEX cyb_sensor_bad  ON cyb_sensor(health);

CREATE INDEX cyb_sensor_node ON cyb_sensor(node_id, axis);

CREATE INDEX cyb_sensor_reading_s ON cyb_sensor_reading(sensor_id, at);

CREATE INDEX idx_ccb_concept ON core_concept_binding (concept_ref);

CREATE INDEX idx_ccb_source  ON core_concept_binding (source_db, source_table);

CREATE INDEX idx_core_al_action   ON core_audit_log(action);

CREATE INDEX idx_core_al_actor    ON core_audit_log(actor_user_ref);

CREATE INDEX idx_core_al_at       ON core_audit_log(created_at);

CREATE INDEX idx_core_al_resource ON core_audit_log(resource_ref);

CREATE INDEX idx_core_al_ws       ON core_audit_log(workspace_id);

CREATE INDEX idx_core_bank_item_share_ws ON core_bank_item_share(workspace_id);

CREATE INDEX idx_core_concept_domain ON core_concept (domain);

CREATE INDEX idx_core_concept_key    ON core_concept (concept_key);

CREATE INDEX idx_core_drill_class_item_open ON core_drill_class_item(class_id, state);

CREATE INDEX idx_core_drill_class_user ON core_drill_class(user_ref, module, status);

CREATE INDEX idx_core_drill_feedback_status ON core_drill_feedback(status, created_at);

CREATE INDEX idx_core_drill_feedback_user ON core_drill_feedback(user_ref, drill_id);

CREATE INDEX idx_core_er_legacy ON core_external_refs(legacy_source, legacy_id);

CREATE INDEX idx_core_er_module ON core_external_refs(new_module);

CREATE INDEX idx_core_er_ref    ON core_external_refs(new_typed_ref);

CREATE INDEX idx_core_notif_unread ON core_notifications(user_ref, is_read);

CREATE INDEX idx_core_notif_user   ON core_notifications(user_ref);

CREATE INDEX idx_core_notif_ws     ON core_notifications(workspace_id);

CREATE INDEX idx_core_person_born ON core_person (birth_year);

CREATE INDEX idx_core_person_key  ON core_person (person_key);

CREATE INDEX idx_core_person_type ON core_person (person_type, status);

CREATE INDEX idx_core_pod_status ON core_podcasts(status);

CREATE INDEX idx_core_pod_ws     ON core_podcasts(workspace_id);

CREATE INDEX idx_core_pp_podcast ON core_podcast_participants(podcast_id);

CREATE INDEX idx_core_ppl_visibility ON core_people(visibility);

CREATE INDEX idx_core_ppl_ws         ON core_people(workspace_id);

CREATE INDEX idx_core_rg_expires  ON core_resource_grants(expires_at);

CREATE INDEX idx_core_rg_resource ON core_resource_grants(resource_ref);

CREATE INDEX idx_core_rg_subject  ON core_resource_grants(subject_ref);

CREATE INDEX idx_core_rp_owner      ON core_resource_policies(owner_user_ref);

CREATE INDEX idx_core_rp_pub_state  ON core_resource_policies(publication_state);

CREATE INDEX idx_core_rp_ref        ON core_resource_policies(resource_ref);

CREATE INDEX idx_core_rp_visibility ON core_resource_policies(visibility_scope);

CREATE INDEX idx_core_rp_ws         ON core_resource_policies(workspace_ref);

CREATE INDEX idx_core_srs_module   ON core_srs_registry(module);

CREATE INDEX idx_core_srs_next     ON core_srs_registry(next_review_at);

CREATE INDEX idx_core_srs_user     ON core_srs_registry(user_ref);

CREATE INDEX idx_core_tp_podcast ON core_talking_points(podcast_id);

CREATE INDEX idx_core_wg_ws ON core_workspace_groups(workspace_id);

CREATE INDEX idx_core_wgm_group ON core_workspace_group_members(group_id);

CREATE INDEX idx_core_wgm_user  ON core_workspace_group_members(user_id);

CREATE INDEX idx_core_wmr_member ON core_workspace_member_roles(member_id);

CREATE INDEX idx_core_wmr_role   ON core_workspace_member_roles(role_id);

CREATE INDEX idx_core_wpl_owner  ON core_workspace_plans(owner_user_ref);

CREATE INDEX idx_core_wpl_status ON core_workspace_plans(status);

CREATE INDEX idx_core_wpl_ws     ON core_workspace_plans(workspace_id);

CREATE INDEX idx_core_wpo_ws ON core_workspace_policies(workspace_id);

CREATE INDEX idx_core_wr_ws ON core_workspace_roles(workspace_id);

CREATE INDEX idx_cyb_card_node ON cyb_card(node_id);

CREATE INDEX idx_cyb_skill_loop ON cyb_skill(loop_key);

CREATE INDEX idx_daily_log_date ON core_daily_log(log_date DESC);

CREATE INDEX idx_daily_log_focus ON core_daily_log(focus, log_date DESC);

CREATE INDEX idx_daily_log_source ON core_daily_log(source_slug);

CREATE INDEX idx_daily_log_unit ON core_daily_log(unit_ref);

CREATE INDEX idx_daily_log_user ON core_daily_log(user_ref, log_date DESC);

CREATE UNIQUE INDEX idx_process_step_layer_unique ON cyb_process_step_layer (step_uid, layer_uid, COALESCE(skill_slug,''));

CREATE INDEX idx_source_log_registered ON core_source_log(registered_in, explore_state);

CREATE INDEX idx_source_log_slug ON core_source_log(source_slug);

CREATE INDEX idx_source_log_state ON core_source_log(explore_state, domain);

CREATE INDEX idx_source_log_title ON core_source_log(title);

CREATE INDEX idx_source_log_user ON core_source_log(user_ref, explore_state);

CREATE INDEX idx_srs_card_kind ON core_srs_card (user_ref, module, card_kind, concept_domain);

CREATE INDEX idx_srs_card_surah_surah ON core_srs_card_surah(surah);

CREATE INDEX idx_srs_lib_author
  ON core_srs_library_card (author_ref, status);

CREATE INDEX idx_srs_lib_lookup
  ON core_srs_library_card (status, module, resource_ref);

CREATE INDEX idx_srs_lib_status
  ON core_srs_library_card (status, created_at);

CREATE UNIQUE INDEX idx_srs_lib_unique
  ON core_srs_library_card (author_ref, resource_ref, front_text);

CREATE INDEX idx_study_session_node ON core_study_session (node_id, started_at);

CREATE INDEX idx_study_session_scope ON core_study_session (domain, scope_kind, scope_ref);

CREATE INDEX ix_bank_attempt_pack
  ON core_bank_attempt (pack_ref, started_at DESC);

CREATE INDEX ix_bank_attempt_progress
  ON core_bank_attempt (user_ref, unit_ref, passed_at);

CREATE INDEX ix_bank_attempt_room
  ON core_bank_attempt (room_code) WHERE room_code IS NOT NULL;

CREATE INDEX ix_bank_attempt_unit
  ON core_bank_attempt (unit_ref);

CREATE INDEX ix_bank_attempt_user
  ON core_bank_attempt (user_ref, started_at DESC);

CREATE INDEX ix_bank_import_pack
  ON core_bank_import (pack_ref);

CREATE INDEX ix_bank_item_addressed
  ON core_bank_item (addressed_to_ref) WHERE addressed_to_ref IS NOT NULL;

CREATE INDEX ix_bank_item_pack ON core_bank_item (pack_ref, status);

CREATE INDEX ix_bank_item_scope
  ON core_bank_item (module, surah, ayah_from, step_key);

CREATE INDEX ix_bank_pack_app ON core_bank_pack (app, status);

CREATE INDEX ix_bank_pack_owner ON core_bank_pack (owner_ref);

CREATE INDEX ix_bank_pack_owner_app
  ON core_bank_pack (owner_ref, app) WHERE owner_ref IS NOT NULL;

CREATE INDEX ix_bank_response_attempt
  ON core_bank_response (attempt_ref, seq);

CREATE INDEX ix_bank_response_item
  ON core_bank_response (item_ref);

CREATE INDEX ix_bank_response_rated
  ON core_bank_response (respondent_ref, asker_rating)
  WHERE asker_rating IS NOT NULL;

CREATE INDEX ix_bank_response_user
  ON core_bank_response (user_ref, answered_at DESC);

CREATE INDEX ix_bank_unit_item_item
  ON core_bank_unit_item (item_ref);

CREATE INDEX ix_bank_unit_item_seq ON core_bank_unit_item (unit_ref, seq);

CREATE INDEX ix_bank_unit_parent
  ON core_bank_unit (parent_ref);

CREATE INDEX ix_bank_unit_tree ON core_bank_unit (pack_ref, parent_ref, unit_index);

CREATE INDEX ix_card_library_ref ON core_srs_card(library_ref);

CREATE INDEX ix_card_surah ON core_srs_card_surah(surah);

CREATE INDEX ix_cscc_concept ON core_srs_card_concept(concept_ref);

CREATE INDEX ix_cscc_uid     ON core_srs_card_concept(concept_uid);

CREATE INDEX ix_quiz_answer_session ON core_quiz_answer (session_ref);

CREATE INDEX ix_quiz_answer_user    ON core_quiz_answer (user_ref, answered_at);

CREATE INDEX ix_quiz_question_concept ON core_quiz_question (concept_ref);

CREATE INDEX ix_quiz_question_module ON core_quiz_question (module, status);

CREATE INDEX ix_quiz_question_ref    ON core_quiz_question (resource_ref);

CREATE INDEX ix_quiz_question_scope
  ON core_quiz_question (module, surah, ayah_from, ayah_to);

CREATE INDEX ix_quiz_question_step
  ON core_quiz_question (step_key);

CREATE INDEX ix_quiz_question_topic   ON core_quiz_question (topic);

CREATE INDEX ix_srs_card_user_module_res
  ON core_srs_card (user_ref, module, resource_ref);

CREATE INDEX ix_talk_card_deck ON core_talk_card (deck_ref, depth, seq);

CREATE INDEX ix_talk_card_for ON core_talk_card (for_name, asked_at);

CREATE INDEX ix_talk_deck_owner ON core_talk_deck (owner_ref);

CREATE INDEX ix_talk_deck_workspace ON core_talk_deck (workspace_ref);

CREATE UNIQUE INDEX ux_bank_item_origin
  ON core_bank_item (origin_ref) WHERE origin_ref IS NOT NULL;

CREATE UNIQUE INDEX ux_bank_response_once
  ON core_bank_response (attempt_ref, item_ref);

CREATE UNIQUE INDEX ux_quiz_generated
  ON core_quiz_question (generated_from) WHERE generated_from IS NOT NULL;


-- ── Triggers (6) ─────────────────────────────────────────────────

CREATE TRIGGER trg_core_concept_del AFTER DELETE ON core_concept BEGIN
  INSERT INTO core_concept_outbox (op,concept_id,payload) VALUES ('delete', OLD.id, json_object('id',OLD.id));
END;

CREATE TRIGGER trg_core_concept_ins AFTER INSERT ON core_concept BEGIN
  INSERT INTO core_concept_outbox (op,concept_id,payload) VALUES ('insert', NEW.id,
    json_object('id',NEW.id,'uid',NEW.uid,'concept_key',NEW.concept_key,'label_en',NEW.label_en,'label_ar',NEW.label_ar,'domain',NEW.domain,'status',NEW.status));
END;

CREATE TRIGGER trg_core_concept_upd AFTER UPDATE ON core_concept BEGIN
  INSERT INTO core_concept_outbox (op,concept_id,payload) VALUES ('update', NEW.id,
    json_object('id',NEW.id,'uid',NEW.uid,'concept_key',NEW.concept_key,'label_en',NEW.label_en,'label_ar',NEW.label_ar,'domain',NEW.domain,'status',NEW.status,'old_id',OLD.id));
END;

CREATE TRIGGER trg_cyb_sensor_log_read
AFTER UPDATE OF last_read_at ON cyb_sensor
FOR EACH ROW
WHEN NEW.last_read_at IS NOT NULL
 AND (OLD.last_read_at IS NULL OR NEW.last_read_at <> OLD.last_read_at)
BEGIN
  INSERT INTO cyb_sensor_reading (id, sensor_id, reading, state, tick_id, at)
  VALUES (
    'SR:' || lower(hex(randomblob(12))),
    NEW.id,
    NEW.reading,
    NEW.state,
    NULLIF((SELECT value FROM cyb_config WHERE key='cyb.current_tick'),''),
    NEW.last_read_at
  );
END;

CREATE TRIGGER trg_srs_card_deck_owner_ins
BEFORE INSERT ON core_srs_card
FOR EACH ROW
WHEN (SELECT user_ref FROM core_srs_deck WHERE id = NEW.deck_id) IS NOT NULL
 AND (SELECT user_ref FROM core_srs_deck WHERE id = NEW.deck_id) <> NEW.user_ref
BEGIN
  SELECT RAISE(ABORT,
    'a card must go in its own owner''s deck — use deckForModule to find or create one');
END;

CREATE TRIGGER trg_srs_card_deck_owner_upd
BEFORE UPDATE OF deck_id, user_ref ON core_srs_card
FOR EACH ROW
WHEN (SELECT user_ref FROM core_srs_deck WHERE id = NEW.deck_id) IS NOT NULL
 AND (SELECT user_ref FROM core_srs_deck WHERE id = NEW.deck_id) <> NEW.user_ref
BEGIN
  SELECT RAISE(ABORT,
    'a card must stay in its own owner''s deck');
END;
