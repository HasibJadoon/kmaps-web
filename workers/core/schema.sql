-- Schema for km_core.
-- Generated from remote Cloudflare D1 sqlite_schema with data excluded, 2026-08-01.
-- Internal D1 bookkeeping tables and FTS5 shadow tables are omitted.
-- Regenerate with scripts/regen_schemas.py — do not hand-edit.

-- ── Tables (33) ──────────────────────────────────────────────────

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

CREATE TABLE core_srs_card (
  id             TEXT PRIMARY KEY,
  deck_id        TEXT NOT NULL REFERENCES core_srs_deck(id) ON DELETE CASCADE,
  user_ref       TEXT NOT NULL,

  
  
  module         TEXT NOT NULL CHECK (module IN ('AR','AL','QR','WV','other')),
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
  UNIQUE (deck_id, resource_ref, card_template)
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
);

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

CREATE TABLE cyb_source (
  code           TEXT PRIMARY KEY,
  discipline     TEXT NOT NULL,
  disciplines    TEXT,
  title_en       TEXT,
  author         TEXT,
  data_slug      TEXT NOT NULL,
  db             TEXT NOT NULL,
  db_id          TEXT NOT NULL,
  locator        TEXT NOT NULL,
  entry_locator  TEXT NOT NULL,
  authority_rank INTEGER NOT NULL DEFAULT 5,
  scope          TEXT NOT NULL DEFAULT 'root,lemma,word',
  feeds          TEXT,
  status         TEXT NOT NULL DEFAULT 'ingested',
  note           TEXT
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


-- ── Views (17) ───────────────────────────────────────────────────

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
SELECT n.id AS node_id, n.target_ref AS root, n.domain, n.piece_kind,
  CASE WHEN n.id LIKE 'CYB:ling:root:%' THEN 'canonical' ELSE 'passage' END AS scope,
  n.build_pct, n.study_pct, n.content_pct, n.retention_pct,
  n.build_state, n.study_state, n.content_state, n.priority,
  (SELECT COUNT(*) FROM cyb_sensor s WHERE s.node_id=n.id AND s.axis='build') AS sensors,
  (SELECT COUNT(*) FROM cyb_sensor s WHERE s.node_id=n.id AND s.axis='build' AND s.error_val<=0) AS green,
  (SELECT COUNT(*) FROM cyb_sensor s WHERE s.node_id=n.id AND s.axis='build' AND s.error_val>0) AS red,
  (SELECT COUNT(*) FROM cyb_job j WHERE j.node_id=n.id) AS jobs,
  (SELECT COUNT(*) FROM cyb_disturbance d WHERE d.node_id=n.id AND d.resolved=0) AS drifts,
  n.updated_at
FROM cyb_node n WHERE n.target_kind='root'
ORDER BY scope, n.build_pct DESC;

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


-- ── Indexes (36) ─────────────────────────────────────────────────

CREATE INDEX core_srs_card_deck ON core_srs_card(deck_id);

CREATE INDEX core_srs_card_due  ON core_srs_card(user_ref, next_review_at);

CREATE INDEX core_srs_card_res  ON core_srs_card(module, resource_ref);

CREATE INDEX core_srs_deck_user ON core_srs_deck(user_ref);

CREATE INDEX core_srs_review_card ON core_srs_review(card_id, reviewed_at);

CREATE INDEX core_srs_review_user ON core_srs_review(user_ref, reviewed_at);

CREATE INDEX cyb_layer_domain ON cyb_layer(domain, display_order);

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

CREATE INDEX idx_core_as_expires ON core_auth_sessions(expires_at);

CREATE INDEX idx_core_as_revoked ON core_auth_sessions(is_revoked);

CREATE INDEX idx_core_as_token   ON core_auth_sessions(session_token);

CREATE INDEX idx_core_as_user    ON core_auth_sessions(user_id);

CREATE INDEX idx_core_at_hash   ON core_auth_tokens(token_hash);

CREATE INDEX idx_core_at_type   ON core_auth_tokens(token_type);

CREATE INDEX idx_core_at_user   ON core_auth_tokens(user_id);

CREATE INDEX idx_core_ppl_visibility ON core_people(visibility);

CREATE INDEX idx_core_ppl_ws         ON core_people(workspace_id);

CREATE INDEX idx_core_usr_email   ON core_users(email);

CREATE INDEX idx_core_usr_role    ON core_users(platform_role);

CREATE INDEX idx_core_usr_status  ON core_users(account_status);

CREATE INDEX idx_core_wm_status ON core_workspace_members(status);

CREATE INDEX idx_core_wm_user   ON core_workspace_members(user_id);

CREATE INDEX idx_core_wm_ws     ON core_workspace_members(workspace_id);

CREATE INDEX idx_core_ws_owner  ON core_workspaces(owner_id);

CREATE INDEX idx_core_ws_status ON core_workspaces(status);

CREATE INDEX idx_core_ws_type   ON core_workspaces(workspace_type);

CREATE INDEX idx_cyb_skill_loop ON cyb_skill(loop_key);
