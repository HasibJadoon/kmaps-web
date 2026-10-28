-- Each item names its whole chain: the essay doc it was written in (doc_ref), the story deck its slides come from
-- (ref), and the scene of the episode that tells it (section_ref). Owner, 2026-10-28: every term and expression has
-- one doc, one story deck, and then its scene.
ALTER TABLE st_episode_item ADD COLUMN doc_ref TEXT;
ALTER TABLE st_episode_item ADD COLUMN section_ref TEXT;
