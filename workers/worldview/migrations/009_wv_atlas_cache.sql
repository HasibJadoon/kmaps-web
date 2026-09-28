-- 009_wv_atlas_cache.sql — the Atlas, built once per version of its data.
--
-- GET /atlas shapes the whole tree: links resolved, groups opened, each age
-- gathered from its shelves, arc cards and sources joined. That takes seconds,
-- so the worker keeps the result here, keyed by what it was built and the
-- version of the data it was built from (wv_atlas, wv_sources, wv_term). A new
-- `atlas.py --apply` changes the version; the next request builds afresh.

CREATE TABLE IF NOT EXISTS wv_atlas_cache (
  key       TEXT PRIMARY KEY,               -- atlas | centuries
  version   TEXT NOT NULL,
  body      TEXT NOT NULL,                  -- the built JSON
  built_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
