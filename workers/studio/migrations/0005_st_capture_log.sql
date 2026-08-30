CREATE TABLE IF NOT EXISTS st_capture_sessions (
  id             TEXT PRIMARY KEY,
  episode_ref    TEXT NOT NULL,
  core_user_ref  TEXT NOT NULL,
  concept        TEXT NOT NULL DEFAULT 'talking_head',
  started_at     TEXT,
  ended_at       TEXT,
  sync_marker_tc TEXT,
  device_json    TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (episode_ref) REFERENCES st_episodes(id)
);
CREATE INDEX IF NOT EXISTS idx_st_capture_sessions_episode ON st_capture_sessions(episode_ref);

CREATE TABLE IF NOT EXISTS st_capture_markers (
  id           TEXT PRIMARY KEY,
  session_ref  TEXT NOT NULL,
  point_ref    TEXT NOT NULL,
  section_ref  TEXT,
  take_number  INTEGER NOT NULL DEFAULT 1,
  start_tc     TEXT,
  end_tc       TEXT,
  status       TEXT NOT NULL DEFAULT 'good',
  note         TEXT,
  clip_ref     TEXT,
  seq          INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_ref) REFERENCES st_capture_sessions(id),
  FOREIGN KEY (point_ref) REFERENCES st_talking_points(id)
);
CREATE INDEX IF NOT EXISTS idx_st_capture_markers_session ON st_capture_markers(session_ref, seq);
