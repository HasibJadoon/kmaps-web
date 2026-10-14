-- The SRS contract (drill engine plan, Phase 0): idempotent grades, a lesson scope on every drill, leeches.
--   op_id    one per answer from the device: a repeated send changes nothing (unique where set)
--   work_ref the lesson a drill belongs to (extra.group.workId: QR:SURAH:n, ACQ:…, WV:…), so its lesson deals its bank
--   leech    lapsed 8 times: dealt again in its lesson, its schedule kept
ALTER TABLE core_srs_review ADD COLUMN op_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_core_srs_review_op ON core_srs_review (op_id) WHERE op_id IS NOT NULL;
ALTER TABLE core_srs_card ADD COLUMN work_ref TEXT;
ALTER TABLE core_srs_card ADD COLUMN leech INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_core_srs_card_work ON core_srs_card (user_ref, work_ref);
UPDATE core_srs_card SET work_ref = json_extract(extra_json, '$.group.workId') WHERE work_ref IS NULL AND json_valid(extra_json);
