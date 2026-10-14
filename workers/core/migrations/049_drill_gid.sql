-- Every drill has one GLOBAL id (owner, 2026-10-14): DRL:<stream>:<its stable id> — the same drill is the same id for every
-- learner, session and surface. A learner's review item keeps it (drill_gid); Phase 1's cyb_drill is keyed by it.
ALTER TABLE core_srs_card ADD COLUMN drill_gid TEXT;
UPDATE core_srs_card SET drill_gid = COALESCE(json_extract(extra_json, '$.drill.gid'),
                                              'DRL:' || module || ':' || json_extract(extra_json, '$.drill.id'))
 WHERE drill_gid IS NULL AND json_valid(extra_json) AND json_extract(extra_json, '$.drill.id') IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_srs_card_gid ON core_srs_card (user_ref, drill_gid);
