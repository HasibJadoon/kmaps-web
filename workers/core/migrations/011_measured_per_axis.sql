ALTER TABLE cyb_node ADD COLUMN build_measured     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cyb_node ADD COLUMN study_measured     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cyb_node ADD COLUMN content_measured   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE cyb_node ADD COLUMN retention_measured INTEGER NOT NULL DEFAULT 0;

ALTER TABLE cyb_node ADD COLUMN build_stale        INTEGER NOT NULL DEFAULT 0;

UPDATE cyb_node SET build_measured     = CASE WHEN build_state     IN ('none','unseen') OR build_state     IS NULL THEN 0 ELSE 1 END;
UPDATE cyb_node SET study_measured     = CASE WHEN study_state     IN ('none','unseen') OR study_state     IS NULL THEN 0 ELSE 1 END;
UPDATE cyb_node SET content_measured   = CASE WHEN content_state   IN ('none','unseen') OR content_state   IS NULL THEN 0 ELSE 1 END;
UPDATE cyb_node SET retention_measured = CASE WHEN retention_state IN ('none','unseen') OR retention_state IS NULL THEN 0 ELSE 1 END;
UPDATE cyb_node SET build_stale = 1 WHERE build_state = 'superseded';
