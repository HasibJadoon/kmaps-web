-- The Everyday atlas as ONE recursive node model (owner, 2026-10-31: "nested nodes — a node's type can be stop or artifact").
--
--   stop      has its own picture (or a plan drawn from its rooms) and children: it opens as a map. Worlds (parent_id NULL,
--             also an ar_map row with the same id), districts, places, a sport's leisure/professional sides and rooms are
--             all stops, nested as deep as needed: city → sports district → swimming → professional → competition pool.
--   artifact  a leaf that opens content: `kind` picks the reader (reading | dialogue | passage | sentences | vocab_hub |
--             story | drill | …) and `ref` is the typed content reference (ARDR:<reading slug>, ARDD:…, ARDP:…, …).
--   portal    a link to another stop elsewhere in the tree (`ref` = the target node id), never a copy: the road from the
--             Village to the Modern City, Makka ↔ Madina along the Hijra route.
--
-- x, y (and w, h for an area) place a node on its parent's picture, as 0–1 fractions. `settings` is JSON: a stop's
-- `inline` (drawn as a labelled area on its parent's canvas, its children standing inside it as fractions of the
-- area), `reveal` (the zoom at which an inline area's markers appear), `default` (the room that takes artifacts with no
-- room), `zoom` {min,max}, `sound`; an artifact's reader options. A place stop's `domain` is the ar_curriculum_domain
-- whose day-sets, readings and dialogues it shows. status 'soon' (or no content under it) shows "Coming soon".
-- Rows are written by kmaps-resources/scripts/maps/load_maps.py from kmaps-resources/data/maps/*.json. Idempotent.
CREATE TABLE IF NOT EXISTS ar_map_node (
  id            TEXT PRIMARY KEY,                    -- a world: its ar_map id ('MAP:modern-city'); otherwise '<world>:<stop>:<stop>…', an artifact '<stop id>~<kind>~<ref>'
  parent_id     TEXT REFERENCES ar_map_node(id),     -- NULL for a world
  type          TEXT NOT NULL CHECK (type IN ('stop', 'artifact', 'portal')),
  kind          TEXT,                                -- stop: world | district | place | side | room · artifact: the reader
  ref           TEXT,                                -- artifact: the content · portal: the target node id
  title_ar      TEXT,
  title_en      TEXT,
  icon          TEXT,                                -- an SF Symbol
  color         TEXT,                                -- a tint (#RRGGBB)
  picture_key   TEXT,
  picture_brief TEXT,                                -- what the picture should show (local Z-Image, one at a time)
  x             REAL, y REAL, w REAL, h REAL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'soon', 'hidden')),
  unlock        TEXT NOT NULL DEFAULT 'content',     -- 'content': locked until content sits under it · 'always': open
  settings      TEXT NOT NULL DEFAULT '{}',
  domain        TEXT,                                -- a place: its ar_curriculum_domain slug
  map_id        TEXT NOT NULL                        -- the world it belongs to
);
CREATE INDEX IF NOT EXISTS ar_map_node_parent ON ar_map_node (parent_id, sort_order);
CREATE INDEX IF NOT EXISTS ar_map_node_map ON ar_map_node (map_id, type);
CREATE INDEX IF NOT EXISTS ar_map_node_domain ON ar_map_node (domain);
