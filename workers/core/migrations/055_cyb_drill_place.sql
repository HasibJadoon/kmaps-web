-- A drill met in more than one lesson (owner, 2026-10-15: a root studied in two passages appears in both): its other
-- places, beside its own (work_ref / intro_ayah). GET /core/cyb/drills matches a lesson by any of them; a drill the
-- learner already holds comes back through review, never again as new.
CREATE TABLE IF NOT EXISTS cyb_drill_place (
  gid         TEXT NOT NULL,
  work_ref    TEXT NOT NULL,
  intro_surah INTEGER,
  intro_ayah  INTEGER,
  PRIMARY KEY (gid, work_ref, intro_ayah)
);
CREATE INDEX IF NOT EXISTS idx_cyb_drill_place_work ON cyb_drill_place (work_ref, intro_ayah);
