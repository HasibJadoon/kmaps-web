CREATE TABLE IF NOT EXISTS st_sessions (
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
CREATE INDEX IF NOT EXISTS idx_st_sessions_code ON st_sessions(room_code);
CREATE INDEX IF NOT EXISTS idx_st_sessions_episode ON st_sessions(episode_ref, status);
