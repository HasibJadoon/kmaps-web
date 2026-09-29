-- A learner's way through the units: one episode is one unit — preview its key words, watch
-- it scene by scene, drill each scene, pass its check. Units open one after another within a
-- series; a level opens when enough of the level before it is done. The rules are data
-- (ar_practice_label scope 'setting'); the progress is the learner's own.
CREATE TABLE IF NOT EXISTS ar_learner_unit (
  user_id     TEXT NOT NULL,
  unit_id     TEXT NOT NULL,
  band        TEXT NOT NULL,                 -- basic | middle | advanced
  stage       TEXT NOT NULL DEFAULT 'preview',  -- preview | watch | drill | check | done
  scenes_json TEXT NOT NULL DEFAULT '[]',    -- scene numbers drilled
  best_score  INTEGER,                       -- the unit check, in percent
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, unit_id)
);
CREATE INDEX IF NOT EXISTS idx_ar_learner_unit_user ON ar_learner_unit(user_id, band);
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, sort) VALUES
 ('setting', 'unit_pass_score', 'A unit is done when its check scores at least this (percent)', NULL, NULL, NULL, NULL, 80, 2),
 ('setting', 'level_unlock_share', 'The next level opens when this share of a level''s units is done (percent)', NULL, NULL, NULL, NULL, 80, 3),
 ('setting', 'unit_preview_size', 'Key items shown before watching a unit', NULL, NULL, NULL, NULL, 8, 4),
 ('setting', 'unit_check_size', 'Drills in a unit check', NULL, NULL, NULL, NULL, 12, 5),
 ('path', 'card', 'Your path', 'طَرِيقُك', 'Unit by unit: preview, watch, drill, pass — and the next opens', 'map', '#D8B657', NULL, 0),
 ('path', 'preview', 'Preview', 'تَمْهِيد', 'Meet its key words before you hear them', 'eye', '#5DA9E9', NULL, 1),
 ('path', 'watch', 'Watch', 'شَاهِد', 'The episode, scene by scene, English hidden until you ask', 'play.rectangle', '#E07A5F', NULL, 2),
 ('path', 'drill', 'Drill', 'تَمَرَّن', 'Each scene: its words, idioms, dialogue — and dictation', 'target', '#81B29A', NULL, 3),
 ('path', 'check', 'Unit check', 'اِخْتِبَار', 'A mixed test of the whole unit — pass it to open the next', 'checkmark.seal', '#B388EB', NULL, 4),
 ('path', 'review', 'Review', 'مُرَاجَعَة', 'What you met, back just before you forget it', 'arrow.triangle.2.circlepath', '#F2CC8F', NULL, 5),
 ('path', 'locked', 'Locked', 'مُقْفَل', 'Finish the unit before it', 'lock.fill', '#8D99AE', NULL, 6),
 ('path', 'level_locked', 'This level opens later', 'لَمْ يُفْتَحْ بَعْد', 'Finish {n}% of the level before it — {done} of {need} units so far', 'lock.fill', '#8D99AE', NULL, 7),
 ('path', 'srs_deck', 'Arabic — scenes', 'العَرَبِيَّة — المَشَاهِد', 'Words, idioms and terms met in the scenes', NULL, NULL, NULL, 8);
