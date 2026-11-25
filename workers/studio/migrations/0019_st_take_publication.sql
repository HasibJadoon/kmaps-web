-- One Studio, recording and publishing. A take is what the iPads' live room records between Start take and End take
-- (the flash/beep sync point, then one marker per scene shown). A publication is a part that went out (the long
-- episode, each Short) with its link and chapters (from scene numbers). The room writes takes; studio.py writes
-- publications (from the iCloud delivery folders and YouTube ids).

CREATE TABLE IF NOT EXISTS st_take (
  id            TEXT PRIMARY KEY,
  episode_ref   TEXT NOT NULL REFERENCES st_episode(id),
  take_no       INTEGER NOT NULL,
  mark_at       TEXT NOT NULL,
  cut_at        TEXT,
  devices_json  TEXT NOT NULL DEFAULT '[]',
  status        TEXT NOT NULL DEFAULT 'kept'     -- kept | discarded
);
CREATE INDEX IF NOT EXISTS idx_st_take_episode ON st_take(episode_ref, take_no);

CREATE TABLE IF NOT EXISTS st_take_marker (
  take_ref   TEXT NOT NULL REFERENCES st_take(id),
  seq        INTEGER NOT NULL,
  scene_ref  TEXT,                               -- the cm scene block id
  beat       INTEGER NOT NULL DEFAULT 0,
  start_tc   TEXT NOT NULL,
  end_tc     TEXT NOT NULL,
  PRIMARY KEY (take_ref, seq)
);

CREATE TABLE IF NOT EXISTS st_publication (
  id             TEXT PRIMARY KEY,
  episode_ref    TEXT NOT NULL REFERENCES st_episode(id),
  part_key       TEXT NOT NULL,                  -- long | short
  platform_key   TEXT NOT NULL DEFAULT 'youtube',
  url            TEXT,
  external_id    TEXT,
  published_at   TEXT,
  chapters_json  TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_st_publication_episode ON st_publication(episode_ref);
