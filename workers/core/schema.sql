-- Schema for km_core.
-- Generated from remote Cloudflare D1 sqlite_schema with data excluded, 2026-08-15.
-- Internal D1 bookkeeping tables and FTS5 shadow tables are omitted.
-- Regenerate with scripts/regen_schemas.py — do not hand-edit.

-- ── Tables (65) ──────────────────────────────────────────────────

CREATE TABLE bkp_srs_card_20260815(
  id TEXT,
  deck_id TEXT,
  user_ref TEXT,
  module TEXT,
  resource_type TEXT,
  resource_ref TEXT,
  card_template TEXT,
  front_text TEXT,
  back_text TEXT,
  extra_json TEXT,
  tags TEXT,
  suspended INT,
  stability REAL,
  difficulty REAL,
  card_state TEXT,
  learning_step INT,
  reps INT,
  lapses INT,
  elapsed_days INT,
  scheduled_days INT,
  last_review_at TEXT,
  next_review_at TEXT,
  created_at TEXT,
  updated_at TEXT,
  card_kind TEXT,
  concept_domain TEXT,
  note_id TEXT,
  intro_surah INT,
  intro_ayah INT,
  corpus TEXT,
  source_db TEXT,
  library_ref TEXT,
  note_type_id TEXT,
  fields_json TEXT,
  discipline TEXT,
  root_norm TEXT,
  concept_topic TEXT
);

CREATE TABLE bkp_srs_card_concept_20260815(
  card_id TEXT,
  concept_ref TEXT,
  concept_uid TEXT,
  sense_ref TEXT,
  sense_uid TEXT,
  source_db TEXT,
  role TEXT,
  note TEXT,
  created_at TEXT
);

CREATE TABLE bkp_srs_card_surah_20260815(
  card_id TEXT,
  surah INT,
  n_occur INT,
  is_intro INT
);

CREATE TABLE bkp_srs_review_20260815(
  id TEXT,
  card_id TEXT,
  user_ref TEXT,
  rating INT,
  state_before TEXT,
  stability_after REAL,
  difficulty_after REAL,
  elapsed_days INT,
  scheduled_days_after INT,
  state_after TEXT,
  review_duration_secs INT,
  reviewed_at TEXT
);

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

CREATE TABLE core_root_surah_map (root_uid TEXT PRIMARY KEY, spread TEXT, n_surahs INTEGER, total_occur INTEGER);

CREATE TABLE core_root_uid_map (root_ar TEXT PRIMARY KEY, root_uid TEXT NOT NULL, synced_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')));

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
, retention_state TEXT NOT NULL DEFAULT 'none', retention_pct INTEGER NOT NULL DEFAULT 0);

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
);

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
  weight REAL NOT NULL DEFAULT 1.0, status TEXT NOT NULL DEFAULT 'live', synced_at TEXT);

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


-- ── Views (30) ───────────────────────────────────────────────────

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

CREATE VIEW cyb_due AS
  SELECT c.id AS card_id, c.node_id, c.card_kind, c.interval_days, c.due_at, c.last_grade,
         n.domain, n.lane, n.layer
  FROM cyb_card c JOIN cyb_node n ON n.id = c.node_id
  WHERE c.due_at IS NOT NULL AND c.due_at <= strftime('%Y-%m-%dT%H:%M:%SZ','now')
  ORDER BY c.due_at;

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
 b.band_code, b.name_en band, b.band_ord, b.discipline, b.prereq_json, b.build_authority,
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
JOIN cyb_sensor_def d ON d.applies_to='root' AND d.axis='build' AND d.band_code=b.band_code
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

CREATE VIEW cyb_root_retention AS
SELECT n.id node_id, n.target_ref root, b.band_code, b.name_en band,
 b.retention_target_days target_days, b.mastery_pct, COUNT(c.id) cards,
 ROUND(AVG(c.interval_days),1) avg_interval,
 SUM(CASE WHEN c.interval_days>=b.retention_target_days THEN 1 ELSE 0 END) at_target,
 ROUND(AVG(CASE WHEN r.grade IS NOT NULL THEN r.grade*1.0/5 END)*100,1) score_pct,
 CASE WHEN COUNT(c.id)=0 THEN 'none'
      WHEN AVG(c.interval_days)>=b.retention_target_days
       AND AVG(CASE WHEN r.grade IS NOT NULL THEN r.grade*1.0/5 END)*100>=b.mastery_pct
      THEN 'retained' ELSE 'holding' END retention_state,
 ROUND(1.0 - MIN(1.0, COALESCE(AVG(c.interval_days),0)*1.0/b.retention_target_days),3) retention_error
FROM cyb_node n
JOIN cyb_root_band b ON b.study_owner=1 AND b.status='live'
LEFT JOIN cyb_card c ON c.node_id=n.id AND c.card_kind=b.card_kind
LEFT JOIN cyb_review r ON r.card_id=c.id
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

CREATE VIEW cyb_root_study AS
SELECT n.id node_id, n.target_ref root, b.band_code, b.name_en band, b.card_kind, b.card_prompt_en,
 COUNT(DISTINCT c.id) cards,
 SUM(CASE WHEN c.due_at<=strftime('%Y-%m-%dT%H:%M:%SZ','now') THEN 1 ELSE 0 END) due_now,
 ROUND(AVG(c.ease),2) avg_ease, ROUND(AVG(c.interval_days),1) avg_interval,
 ROUND(AVG(CASE WHEN r.grade IS NOT NULL THEN r.grade*1.0/5 END),3) gauge_score,
 SUM(CASE WHEN r.grade<=2 THEN 1 ELSE 0 END) lapses,
 CASE WHEN COUNT(c.id)=0 THEN 'unseen'
      WHEN AVG(CASE WHEN r.grade IS NOT NULL THEN r.grade*1.0/5 END)>=0.95 THEN 'mastered'
      WHEN SUM(CASE WHEN r.grade<=2 THEN 1 ELSE 0 END)>0 THEN 'lapsing'
      ELSE 'learning' END study_state
FROM cyb_node n
JOIN cyb_root_band b ON b.study_owner=1 AND b.status='live'
LEFT JOIN cyb_card c ON c.node_id=n.id AND c.card_kind=b.card_kind
LEFT JOIN cyb_review r ON r.card_id=c.id
WHERE n.target_kind='root'
GROUP BY n.id, b.band_code;

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

CREATE VIEW cyb_source_board AS
SELECT code, discipline, disciplines, author, data_slug, db, locator, entry_locator, authority_rank AS rank, scope, feeds, status
FROM cyb_source ORDER BY discipline, authority_rank;

CREATE VIEW cyb_source_coverage AS
SELECT discipline, COUNT(*) AS sources,
  SUM(status='ingested') AS ingested, SUM(status='authored') AS authored, SUM(status='authority') AS authority
FROM cyb_source GROUP BY discipline ORDER BY sources DESC;

CREATE VIEW cyb_source_fetch AS
SELECT code, discipline, data_slug, db, db_id, locator, entry_locator, authority_rank, scope, feeds
FROM cyb_source ORDER BY discipline, authority_rank;

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

CREATE VIEW cyb_ss_retention AS
SELECT n.id node_id, n.target_ref ayah, b.band_code, b.name_en band,
 b.retention_target_days target_days, b.mastery_pct, COUNT(c.id) cards,
 ROUND(AVG(c.interval_days),1) avg_interval,
 SUM(CASE WHEN c.interval_days>=b.retention_target_days THEN 1 ELSE 0 END) at_target,
 ROUND(AVG(CASE WHEN r.grade IS NOT NULL THEN r.grade*1.0/5 END)*100,1) score_pct,
 CASE WHEN COUNT(c.id)=0 THEN 'none'
      WHEN AVG(c.interval_days)>=b.retention_target_days
       AND AVG(CASE WHEN r.grade IS NOT NULL THEN r.grade*1.0/5 END)*100>=b.mastery_pct
      THEN 'retained' ELSE 'holding' END retention_state,
 ROUND(1.0 - MIN(1.0, COALESCE(AVG(c.interval_days),0)*1.0/b.retention_target_days),3) retention_error
FROM cyb_node n
JOIN cyb_ss_band b ON b.study_owner=1 AND b.status='live'
LEFT JOIN cyb_card c ON c.node_id=n.id AND c.card_kind=b.card_kind
LEFT JOIN cyb_review r ON r.card_id=c.id
WHERE n.layer='ss'
GROUP BY n.id, b.band_code;

CREATE VIEW cyb_ss_study AS
SELECT n.id node_id, n.target_ref ayah, b.band_code, b.name_en band, b.card_kind, b.card_prompt_en,
 COUNT(DISTINCT c.id) cards,
 SUM(CASE WHEN c.due_at<=strftime('%Y-%m-%dT%H:%M:%SZ','now') THEN 1 ELSE 0 END) due_now,
 ROUND(AVG(c.ease),2) avg_ease, ROUND(AVG(c.interval_days),1) avg_interval,
 ROUND(AVG(CASE WHEN r.grade IS NOT NULL THEN r.grade*1.0/5 END),3) gauge_score,
 SUM(CASE WHEN r.grade<=2 THEN 1 ELSE 0 END) lapses,
 CASE WHEN COUNT(c.id)=0 THEN 'unseen'
      WHEN AVG(CASE WHEN r.grade IS NOT NULL THEN r.grade*1.0/5 END)>=0.95 THEN 'mastered'
      WHEN SUM(CASE WHEN r.grade<=2 THEN 1 ELSE 0 END)>0 THEN 'lapsing'
      ELSE 'learning' END study_state
FROM cyb_node n
JOIN cyb_ss_band b ON b.study_owner=1 AND b.status='live'
LEFT JOIN cyb_card c ON c.node_id=n.id AND c.card_kind=b.card_kind
LEFT JOIN cyb_review r ON r.card_id=c.id
WHERE n.layer='ss'
GROUP BY n.id, b.band_code;

CREATE VIEW cyb_ss_surah_review AS
SELECT CAST(substr(n.target_ref,7,instr(substr(n.target_ref,7),':')-1) AS INTEGER) surah,
       b.band_code, b.name_en band, b.card_kind, b.card_prompt_en,
       COUNT(DISTINCT n.id) nodes,
       COUNT(DISTINCT c.id) cards,
       COUNT(DISTINCT n.id) - COUNT(DISTINCT c.node_id) unseeded,
       SUM(CASE WHEN c.due_at<=strftime('%Y-%m-%dT%H:%M:%SZ','now') THEN 1 ELSE 0 END) due_now,
       ROUND(AVG(c.interval_days),1) avg_interval,
       b.retention_target_days target_days,
       SUM(CASE WHEN c.interval_days>=b.retention_target_days THEN 1 ELSE 0 END) at_target,
       SUM(CASE WHEN r.grade<=2 THEN 1 ELSE 0 END) lapses,
       ROUND(AVG(CASE WHEN r.grade IS NOT NULL THEN r.grade*1.0/5 END)*100,1) score_pct,
       b.mastery_pct,
       CASE WHEN COUNT(DISTINCT c.id)=0 THEN 'unseeded'
            WHEN COUNT(DISTINCT n.id) > COUNT(DISTINCT c.node_id) THEN 'partial'
            WHEN AVG(c.interval_days)>=b.retention_target_days
             AND AVG(CASE WHEN r.grade IS NOT NULL THEN r.grade*1.0/5 END)*100>=b.mastery_pct
            THEN 'retained' ELSE 'holding' END review_state
FROM cyb_node n
JOIN cyb_ss_band b ON b.study_owner=1 AND b.status='live'
LEFT JOIN cyb_card c ON c.node_id=n.id AND c.card_kind=b.card_kind
LEFT JOIN cyb_review r ON r.card_id=c.id
WHERE n.layer='ss' AND n.target_ref LIKE 'QR:SS:%'
GROUP BY surah, b.band_code;

CREATE VIEW cyb_stage_study AS
  SELECT n.id AS node_id, n.domain, n.lane, n.layer, n.scale,
         n.build_pct, n.study_pct, n.study_state, n.content_state,
         COALESCE(MAX(c.interval_days),0) AS max_retention_days,
         CASE WHEN n.study_pct >= CAST((SELECT value FROM cyb_config WHERE key='mastery_threshold') AS INT)
                   AND COALESCE(MAX(c.interval_days),0) >= CAST((SELECT value FROM cyb_config WHERE key='retention_days') AS INT)
              THEN 'mastered' ELSE 'not_yet' END AS mastery_verdict
  FROM cyb_node n
  LEFT JOIN cyb_card c ON c.node_id = n.id
  WHERE n.layer IS NOT NULL
  GROUP BY n.id;

CREATE VIEW cyb_tick_log AS
SELECT id, ran_at, sensed, drifts, actuated, corrected, summary
FROM cyb_tick ORDER BY ran_at DESC LIMIT 50;


-- ── Indexes (62) ─────────────────────────────────────────────────

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

CREATE INDEX idx_core_al_action   ON core_audit_log(action);

CREATE INDEX idx_core_al_actor    ON core_audit_log(actor_user_ref);

CREATE INDEX idx_core_al_at       ON core_audit_log(created_at);

CREATE INDEX idx_core_al_resource ON core_audit_log(resource_ref);

CREATE INDEX idx_core_al_ws       ON core_audit_log(workspace_id);

CREATE INDEX idx_core_er_legacy ON core_external_refs(legacy_source, legacy_id);

CREATE INDEX idx_core_er_module ON core_external_refs(new_module);

CREATE INDEX idx_core_er_ref    ON core_external_refs(new_typed_ref);

CREATE INDEX idx_core_notif_unread ON core_notifications(user_ref, is_read);

CREATE INDEX idx_core_notif_user   ON core_notifications(user_ref);

CREATE INDEX idx_core_notif_ws     ON core_notifications(workspace_id);

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

CREATE INDEX idx_cyb_skill_loop ON cyb_skill(loop_key);

CREATE INDEX idx_srs_card_kind ON core_srs_card (user_ref, module, card_kind, concept_domain);

CREATE INDEX idx_srs_lib_author
  ON core_srs_library_card (author_ref, status);

CREATE INDEX idx_srs_lib_lookup
  ON core_srs_library_card (status, module, resource_ref);

CREATE INDEX idx_srs_lib_status
  ON core_srs_library_card (status, created_at);

CREATE UNIQUE INDEX idx_srs_lib_unique
  ON core_srs_library_card (author_ref, resource_ref, front_text);

CREATE INDEX ix_card_library_ref ON core_srs_card(library_ref);

CREATE INDEX ix_card_surah ON core_srs_card_surah(surah);

CREATE INDEX ix_cscc_concept ON core_srs_card_concept(concept_ref);

CREATE INDEX ix_cscc_uid     ON core_srs_card_concept(concept_uid);
