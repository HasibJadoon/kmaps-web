-- The Atlas carries single sources as well as arcs: a book, a dīwān, an
-- article or a lecture (kind 'source'), and a collection of them (kind
-- 'collection', its sources as its children). source_id names the wv_sources
-- row an item opens. Written by scripts/worldview/atlas.py.
ALTER TABLE wv_atlas ADD COLUMN source_id TEXT;
CREATE INDEX IF NOT EXISTS idx_wv_atlas_source ON wv_atlas (source_id);
