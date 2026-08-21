-- A1 — make unmeasured representable, per axis.
--
-- The four percent columns are NOT NULL DEFAULT 0, so a node the plane never
-- read reports the same four zeros as one measured at zero. Across all 1,982
-- nodes, NULL appears on no axis, ever — which is why the app could never say
-- "—". The honest signal was in the *_state columns all along:
--   none / unseen  → unmeasured
--   anything else  → measured ("empty" is a measured zero — the whole point)
ALTER TABLE cyb_node ADD COLUMN build_measured     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cyb_node ADD COLUMN study_measured     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cyb_node ADD COLUMN content_measured   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cyb_node ADD COLUMN retention_measured INTEGER NOT NULL DEFAULT 0;
-- 26 superseded nodes hold a build percent no live sensor stands behind.
-- Stale is measured-but-not-current — a third state, not a zero.
ALTER TABLE cyb_node ADD COLUMN build_stale        INTEGER NOT NULL DEFAULT 0;

UPDATE cyb_node SET build_measured     = CASE WHEN build_state     IN ('none','unseen') OR build_state     IS NULL THEN 0 ELSE 1 END;
UPDATE cyb_node SET study_measured     = CASE WHEN study_state     IN ('none','unseen') OR study_state     IS NULL THEN 0 ELSE 1 END;
UPDATE cyb_node SET content_measured   = CASE WHEN content_state   IN ('none','unseen') OR content_state   IS NULL THEN 0 ELSE 1 END;
UPDATE cyb_node SET retention_measured = CASE WHEN retention_state IN ('none','unseen') OR retention_state IS NULL THEN 0 ELSE 1 END;
UPDATE cyb_node SET build_stale = 1 WHERE build_state = 'superseded';
