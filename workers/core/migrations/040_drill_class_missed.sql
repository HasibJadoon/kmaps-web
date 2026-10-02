-- The words a learner did not catch (drill-engine plan §3 step 1 and 7): a listen_mark drill, or
-- a line of the tafsīr heard in the listen gate, reports the words tapped as missed. They are
-- kept with the item — every word ever missed on it, so the line comes back with them — and
-- written into the card it files (extra.drill.missed), so review replays the line with those
-- words shown.
ALTER TABLE core_drill_class_item ADD COLUMN missed_json TEXT;   -- [word indices], ascending
