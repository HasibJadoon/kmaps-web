-- Schema for km_core.
-- Generated from remote Cloudflare D1 sqlite_schema with data excluded, 2026-07-25.
-- Internal D1 bookkeeping tables and FTS5 shadow tables are omitted.
-- Regenerate with scripts/regen_schemas.py — do not hand-edit.

-- ── Tables (41) ────────────────────────────────────────────────────

CREATE TABLE core_activity_events (
  id              TEXT PRIMARY KEY,               
  workspace_id    TEXT,
  actor_user_ref  TEXT NOT NULL,                  
  event_type      TEXT NOT NULL,
    
    
  resource_ref    TEXT,                           
  resource_type   TEXT,
  payload_json    TEXT,                           
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES core_workspaces(id)
);

CREATE TABLE core_audit_log (
  id              TEXT PRIMARY KEY,
  workspace_id    TEXT,
  actor_user_ref  TEXT NOT NULL,
  action          TEXT NOT NULL,
    
    
    
  resource_ref    TEXT,
  before_json     TEXT,                           
  after_json      TEXT,                           
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE core_auth_sessions (
  id              TEXT PRIMARY KEY,               
  user_id         TEXT NOT NULL,
  session_token   TEXT NOT NULL UNIQUE,
  session_type    TEXT NOT NULL DEFAULT 'web',
    
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
  token_hash      TEXT NOT NULL UNIQUE,           
  token_type      TEXT NOT NULL DEFAULT 'api_key',
    
  name            TEXT,
  scopes_json     TEXT,                           
  workspace_id    TEXT,                           
  expires_at      TEXT,
  used_at         TEXT,
  revoked_at      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES core_users(id)
);

CREATE TABLE core_external_refs (
  id              TEXT PRIMARY KEY,
  legacy_source   TEXT NOT NULL,                  
  legacy_id       TEXT NOT NULL,
  legacy_type     TEXT,                           
  new_module      TEXT NOT NULL,                  
  new_typed_ref   TEXT NOT NULL,                  
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
  rollout_percent INTEGER NOT NULL DEFAULT 0,     
  enabled_for     TEXT,                           
  description     TEXT,
  updated_by_ref  TEXT,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE core_notifications (
  id              TEXT PRIMARY KEY,               
  user_ref        TEXT NOT NULL,                  
  workspace_id    TEXT,
  notif_type      TEXT NOT NULL,
    
    
  title           TEXT NOT NULL,
  body_md         TEXT,
  resource_ref    TEXT,
  is_read         INTEGER NOT NULL DEFAULT 0,
  read_at         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE core_people (
  id              TEXT PRIMARY KEY,               
  workspace_id    TEXT NOT NULL,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  email           TEXT,
  relationship    TEXT,                           
  linked_user_id  TEXT,                           
  visibility      TEXT NOT NULL DEFAULT 'private',
    
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
    
  description     TEXT,
  updated_by_ref  TEXT,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE core_podcast_participants (
  id           TEXT PRIMARY KEY,
  podcast_id   TEXT NOT NULL,
  person_id    TEXT,                              
  user_ref     TEXT,                              
  role         TEXT NOT NULL DEFAULT 'guest',     
  display_name TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (podcast_id) REFERENCES core_podcasts(id),
  FOREIGN KEY (person_id)  REFERENCES core_people(id)
);

CREATE TABLE core_podcasts (
  id              TEXT PRIMARY KEY,               
  workspace_id    TEXT NOT NULL,
  title           TEXT NOT NULL,
  description_md  TEXT,
  podcast_type    TEXT NOT NULL DEFAULT 'discussion',
    
  status          TEXT NOT NULL DEFAULT 'planned',
    
  recorded_at     TEXT,
  duration_secs   INTEGER,
  media_ref       TEXT,                           
  host_user_ref   TEXT,                           
  visibility      TEXT NOT NULL DEFAULT 'workspace',
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES core_workspaces(id)
);

CREATE TABLE core_resource_grants (
  id              TEXT PRIMARY KEY,
  resource_ref    TEXT NOT NULL,                  
  subject_ref     TEXT NOT NULL,                  
  subject_type    TEXT NOT NULL DEFAULT 'user',   
  access_role     TEXT NOT NULL DEFAULT 'viewer',
    
  granted_by_ref  TEXT NOT NULL,                  
  granted_at      TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at      TEXT,
  is_inheritance_break INTEGER NOT NULL DEFAULT 0,
  revoked_at      TEXT,
  note            TEXT,
  UNIQUE (resource_ref, subject_ref, access_role)
);

CREATE TABLE core_resource_policies (
  id                 TEXT PRIMARY KEY,
  resource_ref       TEXT NOT NULL UNIQUE,        
  resource_type      TEXT NOT NULL,
    
  owner_user_ref     TEXT NOT NULL,               
  workspace_ref      TEXT,                        
  visibility_scope   TEXT NOT NULL DEFAULT 'workspace',
    
  publication_state  TEXT NOT NULL DEFAULT 'draft',
    
  is_discoverable    INTEGER NOT NULL DEFAULT 1,
  allow_comments     TEXT NOT NULL DEFAULT 'workspace',
    
  allow_downloads    INTEGER NOT NULL DEFAULT 0,
  inherits_from_ref  TEXT,                        
  override_flag      INTEGER NOT NULL DEFAULT 0,  
  meta_json          TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE core_review_queue (
  id              TEXT PRIMARY KEY,               
  workspace_id    TEXT NOT NULL,
  reviewer_ref    TEXT,                           
  source_module   TEXT NOT NULL,                  
  suggestion_ref  TEXT NOT NULL,                  
  entity_type     TEXT NOT NULL,
    
  title           TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
    
  priority        INTEGER NOT NULL DEFAULT 3,     
  due_at          TEXT,
  resolved_at     TEXT,
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES core_workspaces(id)
);

CREATE TABLE core_srs_registry (
  id              TEXT PRIMARY KEY,               
  user_ref        TEXT NOT NULL,                  
  workspace_id    TEXT,
  resource_ref    TEXT NOT NULL,                  
  resource_type   TEXT NOT NULL,
    
  module          TEXT NOT NULL,                  
  card_ref        TEXT,                           
  enqueued_at     TEXT NOT NULL DEFAULT (datetime('now')),
  last_review_at  TEXT,
  next_review_at  TEXT,
  total_reviews   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_ref, resource_ref)
);

CREATE TABLE core_talking_points (
  id             TEXT PRIMARY KEY,
  podcast_id     TEXT NOT NULL,
  speaker_ref    TEXT,                            
  timestamp_secs INTEGER,
  content        TEXT NOT NULL,
  topic_ref      TEXT,                            
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (podcast_id) REFERENCES core_podcasts(id)
);

CREATE TABLE core_users (
  id                TEXT PRIMARY KEY,             
  email             TEXT NOT NULL UNIQUE,
  display_name      TEXT NOT NULL,
  username          TEXT UNIQUE,
  avatar_url        TEXT,
  bio_md            TEXT,
  user_type         TEXT NOT NULL DEFAULT 'human',
    
  platform_role     TEXT NOT NULL DEFAULT 'member',
    
  account_status    TEXT NOT NULL DEFAULT 'active',
    
  email_verified    INTEGER NOT NULL DEFAULT 0,
  last_active_at    TEXT,
  timezone          TEXT,
  locale            TEXT NOT NULL DEFAULT 'en',
  preferences_json  TEXT NOT NULL DEFAULT '{}',   
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
  role         TEXT NOT NULL DEFAULT 'member',   
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
  id              TEXT PRIMARY KEY,               
  workspace_id    TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  membership_role TEXT NOT NULL DEFAULT 'member',
    
  status          TEXT NOT NULL DEFAULT 'active',
    
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
  pl_plan_ref     TEXT NOT NULL UNIQUE,           
  title           TEXT NOT NULL,
  plan_type       TEXT NOT NULL DEFAULT 'study',
    
  owner_user_ref  TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',
    
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
    
  allow_public_publish     INTEGER NOT NULL DEFAULT 0,
  allow_link_share         INTEGER NOT NULL DEFAULT 1,
  allow_guest_access       INTEGER NOT NULL DEFAULT 0,
  guest_max_visibility     TEXT NOT NULL DEFAULT 'workspace',
  default_discovery        TEXT NOT NULL DEFAULT 'workspace_searchable',
    
  allow_member_invitations INTEGER NOT NULL DEFAULT 1,
  review_required_for_publish INTEGER NOT NULL DEFAULT 0,
  comment_policy           TEXT NOT NULL DEFAULT 'members',
    
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
  permissions_json TEXT NOT NULL DEFAULT '{}',   
  is_system_role  INTEGER NOT NULL DEFAULT 0,     
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id) REFERENCES core_workspaces(id),
  UNIQUE (workspace_id, role_key)
);

CREATE TABLE core_workspaces (
  id              TEXT PRIMARY KEY,               
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  description_md  TEXT,
  workspace_type  TEXT NOT NULL DEFAULT 'personal',
    
  owner_id        TEXT NOT NULL,                  
  status          TEXT NOT NULL DEFAULT 'active',
    
  allow_guests    INTEGER NOT NULL DEFAULT 0,
  allow_public_publish INTEGER NOT NULL DEFAULT 0,
  default_visibility TEXT NOT NULL DEFAULT 'workspace',
    
  settings_json   TEXT NOT NULL DEFAULT '{}',
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (owner_id) REFERENCES core_users(id)
);

CREATE TABLE cyb_card (
  id            TEXT PRIMARY KEY,
  node_id       TEXT NOT NULL REFERENCES cyb_node(id) ON DELETE CASCADE,
  card_kind     TEXT NOT NULL,
  ease          REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  reps          INTEGER NOT NULL DEFAULT 0,
  due_at        TEXT,
  last_grade    INTEGER
);

CREATE TABLE cyb_config (key TEXT PRIMARY KEY, value TEXT NOT NULL, note TEXT);

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

CREATE TABLE cyb_review (
  id         TEXT PRIMARY KEY,
  card_id    TEXT NOT NULL REFERENCES cyb_card(id) ON DELETE CASCADE,
  grade      INTEGER NOT NULL,
  reviewed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

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
  meta_json      TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(meta_json)),
  UNIQUE(loop_key, source_slug)
);

CREATE TABLE cyb_tick (
  id         TEXT PRIMARY KEY,
  ran_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  sensed     INTEGER, drifts INTEGER, actuated INTEGER, corrected INTEGER,
  summary    TEXT
);

-- ── Views (7) ─────────────────────────────────────────────────────

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

CREATE VIEW cyb_due AS
  SELECT c.id AS card_id, c.node_id, c.card_kind, c.interval_days, c.due_at, c.last_grade,
         n.domain, n.lane, n.layer
  FROM cyb_card c JOIN cyb_node n ON n.id = c.node_id
  WHERE c.due_at IS NOT NULL AND c.due_at <= strftime('%Y-%m-%dT%H:%M:%SZ','now')
  ORDER BY c.due_at;

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

CREATE VIEW cyb_source_for_loop AS
  SELECT loop_key, source_slug, source_kind, authority_rank, binding, locator, entry_locator, coverage_state
  FROM cyb_source_registry ORDER BY loop_key, authority_rank;

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

-- ── Indexes (69) ───────────────────────────────────────────────────

CREATE INDEX cyb_node_layer  ON cyb_node(domain, layer);

CREATE INDEX cyb_node_parent ON cyb_node(parent_id);

CREATE INDEX cyb_sensor_bad  ON cyb_sensor(health);

CREATE INDEX cyb_sensor_node ON cyb_sensor(node_id, axis);

CREATE INDEX cyb_sensor_reading_s ON cyb_sensor_reading(sensor_id, at);

CREATE INDEX idx_core_ae_actor    ON core_activity_events(actor_user_ref);

CREATE INDEX idx_core_ae_at       ON core_activity_events(created_at);

CREATE INDEX idx_core_ae_resource ON core_activity_events(resource_ref);

CREATE INDEX idx_core_ae_type     ON core_activity_events(event_type);

CREATE INDEX idx_core_ae_ws       ON core_activity_events(workspace_id);

CREATE INDEX idx_core_al_action   ON core_audit_log(action);

CREATE INDEX idx_core_al_actor    ON core_audit_log(actor_user_ref);

CREATE INDEX idx_core_al_at       ON core_audit_log(created_at);

CREATE INDEX idx_core_al_resource ON core_audit_log(resource_ref);

CREATE INDEX idx_core_al_ws       ON core_audit_log(workspace_id);

CREATE INDEX idx_core_as_expires ON core_auth_sessions(expires_at);

CREATE INDEX idx_core_as_revoked ON core_auth_sessions(is_revoked);

CREATE INDEX idx_core_as_token   ON core_auth_sessions(session_token);

CREATE INDEX idx_core_as_user    ON core_auth_sessions(user_id);

CREATE INDEX idx_core_at_hash   ON core_auth_tokens(token_hash);

CREATE INDEX idx_core_at_type   ON core_auth_tokens(token_type);

CREATE INDEX idx_core_at_user   ON core_auth_tokens(user_id);

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

CREATE INDEX idx_core_rq_module   ON core_review_queue(source_module);

CREATE INDEX idx_core_rq_priority ON core_review_queue(priority);

CREATE INDEX idx_core_rq_reviewer ON core_review_queue(reviewer_ref);

CREATE INDEX idx_core_rq_status   ON core_review_queue(status);

CREATE INDEX idx_core_rq_ws       ON core_review_queue(workspace_id);

CREATE INDEX idx_core_srs_module   ON core_srs_registry(module);

CREATE INDEX idx_core_srs_next     ON core_srs_registry(next_review_at);

CREATE INDEX idx_core_srs_user     ON core_srs_registry(user_ref);

CREATE INDEX idx_core_tp_podcast ON core_talking_points(podcast_id);

CREATE INDEX idx_core_usr_email   ON core_users(email);

CREATE INDEX idx_core_usr_role    ON core_users(platform_role);

CREATE INDEX idx_core_usr_status  ON core_users(account_status);

CREATE INDEX idx_core_wg_ws ON core_workspace_groups(workspace_id);

CREATE INDEX idx_core_wgm_group ON core_workspace_group_members(group_id);

CREATE INDEX idx_core_wgm_user  ON core_workspace_group_members(user_id);

CREATE INDEX idx_core_wm_status ON core_workspace_members(status);

CREATE INDEX idx_core_wm_user   ON core_workspace_members(user_id);

CREATE INDEX idx_core_wm_ws     ON core_workspace_members(workspace_id);

CREATE INDEX idx_core_wmr_member ON core_workspace_member_roles(member_id);

CREATE INDEX idx_core_wmr_role   ON core_workspace_member_roles(role_id);

CREATE INDEX idx_core_wpl_owner  ON core_workspace_plans(owner_user_ref);

CREATE INDEX idx_core_wpl_status ON core_workspace_plans(status);

CREATE INDEX idx_core_wpl_ws     ON core_workspace_plans(workspace_id);

CREATE INDEX idx_core_wpo_ws ON core_workspace_policies(workspace_id);

CREATE INDEX idx_core_wr_ws ON core_workspace_roles(workspace_id);

CREATE INDEX idx_core_ws_owner  ON core_workspaces(owner_id);

CREATE INDEX idx_core_ws_status ON core_workspaces(status);

CREATE INDEX idx_core_ws_type   ON core_workspaces(workspace_type);
