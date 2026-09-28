-- 008_wv_atlas.sql — the Worldview Atlas: how the home is laid out.
--
-- One tree: rooms (Faiths, Civilisations, Ages, Isms, Disciplines, People &
-- Library, Instruments) → shelves → items. An item is a live arc, a planned
-- arc (a place kept for what will be read), a field of Global Terms, or one of
-- the app's instruments. Ages chain their items with next_id into one
-- continuous road. The tree is data, not schema: scripts/worldview/atlas.py
-- rewrites it; this file only makes the table.

CREATE TABLE IF NOT EXISTS wv_atlas (
  id          TEXT PRIMARY KEY,               -- AT:{room}[.{shelf}[.{item}]]
  parent_id   TEXT REFERENCES wv_atlas(id),
  kind        TEXT NOT NULL,                  -- room | shelf | arc | planned | domain | way
  title       TEXT NOT NULL,
  title_ar    TEXT,
  tagline     TEXT,
  color       TEXT,
  icon        TEXT,
  layout      TEXT,                           -- rooms: shelves | rail | tiles
  sort_order  INTEGER NOT NULL DEFAULT 0,
  arc_id      TEXT,                           -- kind arc: wv_sources.id (source_type 'arc')
  domain_slug TEXT,                           -- kind domain: wv_domains.slug, opens its Global Terms
  way         TEXT,                           -- kind way: the app screen (library, timeline, maps, …)
  era_from    INTEGER,                        -- years; negative = BC
  era_to      INTEGER,
  span        TEXT,                           -- the years as said
  next_id     TEXT,                           -- the next station on a continuous road
  status      TEXT NOT NULL DEFAULT 'live',   -- live | planned
  meta_json   TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wv_atlas_parent ON wv_atlas(parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_wv_atlas_arc ON wv_atlas(arc_id);
