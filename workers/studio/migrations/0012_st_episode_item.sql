-- What an episode teaches, in the order it teaches it: its key terms and its concepts. One row per item, so a
-- class's roadmap ("the words we'll learn", the 4 / 13 rail) is read from data, not counted in the view.
-- Owner, 2026-10-28: the Burhan class opens on a roadmap of the passage's terms, then its big idea.
CREATE TABLE IF NOT EXISTS st_episode_item (
  id          TEXT PRIMARY KEY,                 -- EPI:{episode tag}:{seq}
  episode_ref TEXT NOT NULL REFERENCES st_episodes(id),
  seq         INTEGER NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('term', 'concept')),
  ref         TEXT NOT NULL,                    -- the km_content doc that tells it (keyterm story deck, concept deck)
  label_ar    TEXT NOT NULL,
  label_en    TEXT NOT NULL,
  ayah        INTEGER,                          -- where it stands in the passage
  span_ar     TEXT,                             -- its words as the āyah spells them
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (episode_ref, seq)
);
CREATE INDEX IF NOT EXISTS idx_st_episode_item_episode ON st_episode_item(episode_ref, seq);
