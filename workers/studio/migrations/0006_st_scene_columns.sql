ALTER TABLE st_episodes ADD COLUMN ecosystem   TEXT;
ALTER TABLE st_episodes ADD COLUMN series_ref  TEXT;
ALTER TABLE st_episodes ADD COLUMN session_no  INTEGER;
ALTER TABLE st_episodes ADD COLUMN output_kind TEXT;
ALTER TABLE st_episodes ADD COLUMN source_ref  TEXT;

ALTER TABLE st_sections ADD COLUMN overlay_kind TEXT;
ALTER TABLE st_sections ADD COLUMN d1_query     TEXT;

ALTER TABLE st_talking_points ADD COLUMN overlay_json TEXT;

CREATE INDEX IF NOT EXISTS idx_st_episodes_series ON st_episodes (series_ref, session_no);

CREATE INDEX IF NOT EXISTS idx_st_episodes_source ON st_episodes (source_ref);
