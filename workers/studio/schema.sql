-- Schema for km_studio.
-- Generated from remote Cloudflare D1 sqlite_schema with data excluded, 2026-07-25.
-- Internal D1 bookkeeping tables and FTS5 shadow tables are omitted.
-- Regenerate with scripts/regen_schemas.py — do not hand-edit.

-- ── Tables (6) ────────────────────────────────────────────────────

CREATE TABLE st_episodes (
  id              TEXT PRIMARY KEY,
  core_user_ref   TEXT NOT NULL,
  core_ws_ref     TEXT,
  title           TEXT NOT NULL,
  format          TEXT NOT NULL DEFAULT 'podcast',
  template_ref    TEXT,
  status          TEXT NOT NULL DEFAULT 'draft',
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE st_participants (
  id            TEXT PRIMARY KEY,
  episode_ref   TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT '#c9a84c',
  role          TEXT NOT NULL DEFAULT 'speaker',
  seq           INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')), core_user_ref TEXT,
  FOREIGN KEY (episode_ref) REFERENCES st_episodes(id)
);

CREATE TABLE st_sections (
  id            TEXT PRIMARY KEY,
  episode_ref   TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'custom',
  heading       TEXT NOT NULL,
  seq           INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (episode_ref) REFERENCES st_episodes(id)
);

CREATE TABLE st_sessions (
  id            TEXT PRIMARY KEY,
  episode_ref   TEXT NOT NULL,
  core_user_ref TEXT NOT NULL,
  room_code     TEXT NOT NULL UNIQUE,
  status        TEXT NOT NULL DEFAULT 'live',
  started_at    TEXT,
  ended_at      TEXT,
  snapshot_json TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (episode_ref) REFERENCES st_episodes(id)
);

CREATE TABLE st_talking_points (
  id            TEXT PRIMARY KEY,
  section_ref   TEXT NOT NULL,
  episode_ref   TEXT NOT NULL,
  text          TEXT NOT NULL DEFAULT '',
  speaker_ref   TEXT,
  est_seconds   INTEGER,
  seq           INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')), bridge TEXT,
  FOREIGN KEY (section_ref) REFERENCES st_sections(id),
  FOREIGN KEY (episode_ref) REFERENCES st_episodes(id)
);

CREATE TABLE st_templates (
  id              TEXT PRIMARY KEY,
  core_user_ref   TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  format          TEXT NOT NULL DEFAULT 'podcast',
  is_builtin      INTEGER NOT NULL DEFAULT 0,
  structure_json  TEXT NOT NULL DEFAULT '{}',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Indexes (9) ───────────────────────────────────────────────────

CREATE INDEX idx_st_episodes_owner ON st_episodes(core_user_ref, created_at);

CREATE INDEX idx_st_participants_episode ON st_participants(episode_ref, seq);

CREATE INDEX idx_st_participants_user ON st_participants(core_user_ref);

CREATE INDEX idx_st_points_episode ON st_talking_points(episode_ref);

CREATE INDEX idx_st_points_section ON st_talking_points(section_ref, seq);

CREATE INDEX idx_st_sections_episode ON st_sections(episode_ref, seq);

CREATE INDEX idx_st_sessions_code ON st_sessions(room_code);

CREATE INDEX idx_st_sessions_episode ON st_sessions(episode_ref, status);

CREATE INDEX idx_st_templates_owner ON st_templates(core_user_ref);
