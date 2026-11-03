-- Schema for km_studio.
-- Generated from remote Cloudflare D1 sqlite_schema with data excluded, 2026-10-02.
-- Internal D1 bookkeeping tables and FTS5 shadow tables are omitted.
-- Regenerate with scripts/regen_schemas.py — do not hand-edit.

-- ── Tables (9) ───────────────────────────────────────────────────

CREATE TABLE st_capture_markers ( id TEXT PRIMARY KEY, session_ref TEXT NOT NULL, point_ref TEXT NOT NULL, section_ref TEXT, take_number INTEGER NOT NULL DEFAULT 1, start_tc TEXT, end_tc TEXT, status TEXT NOT NULL DEFAULT 'good', note TEXT, clip_ref TEXT, seq INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (session_ref) REFERENCES st_capture_sessions(id), FOREIGN KEY (point_ref) REFERENCES st_talking_points(id) );

CREATE TABLE st_capture_sessions ( id TEXT PRIMARY KEY, episode_ref TEXT NOT NULL, core_user_ref TEXT NOT NULL, concept TEXT NOT NULL DEFAULT 'talking_head', started_at TEXT, ended_at TEXT, sync_marker_tc TEXT, device_json TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (episode_ref) REFERENCES st_episodes(id) );

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
, ecosystem TEXT, series_ref TEXT, session_no INTEGER, output_kind TEXT, source_ref TEXT, last_opened_at TEXT);

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

CREATE TABLE st_phase (
  id            TEXT PRIMARY KEY,
  episode_ref   TEXT NOT NULL,
  phase         TEXT NOT NULL,
  seq           INTEGER NOT NULL DEFAULT 0,
  state         TEXT NOT NULL DEFAULT 'pending',
  notes_md      TEXT,
  started_at    TEXT,
  completed_at  TEXT,
  completed_by  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (episode_ref, phase),
  FOREIGN KEY (episode_ref) REFERENCES st_episodes(id)
);

CREATE TABLE st_sections (
  id            TEXT PRIMARY KEY,
  episode_ref   TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'custom',
  heading       TEXT NOT NULL,
  seq           INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')), overlay_kind TEXT, d1_query TEXT, group_key TEXT, group_label TEXT,
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
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')), bridge TEXT, overlay_json TEXT, subs_json TEXT,
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


-- ── Indexes (13) ─────────────────────────────────────────────────

CREATE TABLE st_pipeline_stages (
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

CREATE TABLE st_streams (
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

CREATE INDEX idx_st_capture_markers_session ON st_capture_markers(session_ref, seq);

CREATE INDEX idx_st_capture_sessions_episode ON st_capture_sessions(episode_ref);

CREATE INDEX idx_st_episodes_owner ON st_episodes(core_user_ref, created_at);

CREATE INDEX idx_st_episodes_series ON st_episodes (series_ref, session_no);

CREATE INDEX idx_st_episodes_source ON st_episodes (source_ref);

CREATE INDEX idx_st_participants_episode ON st_participants(episode_ref, seq);

CREATE INDEX idx_st_participants_user ON st_participants(core_user_ref);

CREATE INDEX idx_st_points_episode ON st_talking_points(episode_ref);

CREATE INDEX idx_st_points_section ON st_talking_points(section_ref, seq);

CREATE INDEX idx_st_sections_episode ON st_sections(episode_ref, seq);

CREATE INDEX idx_st_sessions_code ON st_sessions(room_code);

CREATE INDEX idx_st_sessions_episode ON st_sessions(episode_ref, status);

CREATE INDEX idx_st_templates_owner ON st_templates(core_user_ref);
-- Story films as production projects (owner, 2026-11-03: "all images can go to R2, we can download locally, so all scenes and
-- the project keep working once fully completed, and we can use them for new ones"; "flag any with issues").
-- One row per story, one per shot (a spoken line and the picture/clip made for it). The script, the exact picture prompt and
-- seed, who is drawn, the review's status and issues are data here; the bytes (pictures, later clips) live in R2
-- km-studio-overlay keyed story/<sha256>, the same content-addressed way as the overlay renderer. Written by
-- kmaps-resources scripts/series/publish_story_project.py; the app reads it and adds flags.
CREATE TABLE IF NOT EXISTS st_story (
  id          TEXT PRIMARY KEY,                -- the story id in kmaps-resources data (park-by-the-lake)
  title_en    TEXT NOT NULL,
  title_ar    TEXT,
  synopsis    TEXT,
  style       TEXT,                            -- the picture style line every prompt starts with
  notes_json  TEXT NOT NULL DEFAULT '{}',      -- {"script": [...], "voice": [...], "animation": [...]} review notes
  reviewed_at TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS st_story_shot (
  story_id     TEXT NOT NULL REFERENCES st_story(id),
  stem         TEXT NOT NULL,                  -- p<page> or p<page>l<line>: the picture's name
  page_no      INTEGER NOT NULL,
  line_no      INTEGER NOT NULL,
  scene_en     TEXT,
  speaker      TEXT NOT NULL,
  text_ar      TEXT NOT NULL,
  text_en      TEXT NOT NULL,
  prompt       TEXT,                           -- exactly what the picture was drawn from
  seed         INTEGER,
  people_json  TEXT NOT NULL DEFAULT '[]',     -- the cast ids drawn
  image_sha    TEXT,                           -- R2 story/<sha256> (png)
  clip_sha     TEXT,                           -- R2 story/<sha256> (mp4), once animated
  status       TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'redrawing', 'fix')),
  issues_json  TEXT NOT NULL DEFAULT '[]',     -- [{"text": "...", "by": "review" | <user ref>, "at": "..."}]
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (story_id, stem)
);

CREATE INDEX IF NOT EXISTS idx_st_story_shot_order ON st_story_shot (story_id, page_no, line_no);
