-- 064 — the review queue reads an index, not every card.
--
-- The queue (/core/srs/review) and the due counts asked of every card the learner has
-- `json_valid(extra_json) AND json_extract(extra_json,'$.drill') IS NOT NULL` (a review item replays its drill), and
-- compared `datetime(next_review_at)`, which no index can serve. Now:
--   is_drill  a stored fact of the card (generated from extra_json, so every writer keeps it right)
--   idx_core_srs_card_queue  the cards review deals, by learner and due time: the queue is a range read of it
-- next_review_at is one format everywhere (ISO, ms, Z — toISOString), so it is compared as stored.
ALTER TABLE core_srs_card ADD COLUMN is_drill INTEGER
  GENERATED ALWAYS AS (CASE WHEN json_valid(extra_json) AND json_extract(extra_json, '$.drill') IS NOT NULL THEN 1 ELSE 0 END) VIRTUAL;
CREATE INDEX IF NOT EXISTS idx_core_srs_card_queue ON core_srs_card (user_ref, next_review_at)
  WHERE suspended = 0 AND leech = 0 AND card_state <> 'new' AND is_drill = 1;
-- today's reviews are read through core_srs_review_day (user_ref, reviewed_at), now compared as stored too
