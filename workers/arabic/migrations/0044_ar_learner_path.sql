-- 0044_ar_learner_path.sql
--
-- The learner's own way along the intake's learning path (0043). Each step is an intake item on the
-- path; the learner starts it, and closes it — by marking it when nothing on it is graded, or by
-- scoring the pass mark on every unit check it holds when it is graded. A lane's next step opens
-- when the one before it is closed. The pass mark is 90%: units, grammar lessons and placement.

CREATE TABLE IF NOT EXISTS ar_learner_path (
  user_id    TEXT NOT NULL,
  intake_id  TEXT NOT NULL,                  -- ar_intake_item.id (a step of the path)
  state      TEXT NOT NULL DEFAULT 'started', -- started | done
  note       TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  done_at    TEXT,
  PRIMARY KEY (user_id, intake_id)
);

UPDATE ar_practice_label SET min_value = 90 WHERE scope = 'setting' AND key IN ('unit_pass_score', 'grammar_pass_score');

INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('learn_state', 'locked',  'Locked',   'مُقْفَل',     'Close the step before it in this lane', 'lock.fill',        '#8D99AE', 1, NULL, 1),
 ('learn_state', 'open',    'Open',     'مَفْتُوح',    'Ready when you are',                    'circle',           '#5DA9E9', 2, NULL, 2),
 ('learn_state', 'started', 'Started',  'بَدَأْتُه',    'Under way',                             'circle.lefthalf.filled', '#F2CC8F', 3, NULL, 3),
 ('learn_state', 'done',    'Closed',   'أَتْمَمْتُه',   'Done — the lane moves on',              'checkmark.circle.fill', '#2A9D8F', 4, NULL, 4),
 ('learn', 'title',     'Your way to the goal', 'طَرِيقُكَ إِلَى الغَايَة', 'Reading classical tafsīr with ease — one step of each lane at a time', 'flag.checkered', '#D8B657', NULL, NULL, 1),
 ('learn', 'today',     'Today',                'اليَوْم',     'One step from each lane: a little of everything, every day', 'sun.max', NULL, NULL, NULL, 2),
 ('learn', 'progress',  '{done} of {total} steps closed', '{done} مِنْ {total} خُطْوَة', NULL, NULL, NULL, NULL, NULL, 3),
 ('learn', 'start',     'Start',                'اِبْدَأ',      NULL, 'play.circle', NULL, NULL, NULL, 4),
 ('learn', 'close',     'Mark as done',         'أَتْمَمْتُه',   'You have finished it', 'checkmark.circle', NULL, NULL, NULL, 5),
 ('learn', 'reopen',    'Reopen',               'أَعِدْ فَتْحَه', NULL, 'arrow.uturn.backward.circle', NULL, NULL, NULL, 6),
 ('learn', 'graded',    'Graded: pass every unit check at {pass}%', 'مُقَيَّم: اجْتَزْ كُلَّ اخْتِبَارٍ بِـ {pass}٪', 'This step closes itself when its checks are passed', 'checkmark.seal', NULL, NULL, NULL, 7),
 ('learn', 'graded_progress', '{passed} of {units} units passed', '{passed} مِنْ {units} وَحْدَة', NULL, NULL, NULL, NULL, NULL, 8),
 ('learn', 'not_yet',   'Not yet: {passed} of {units} units passed at {pass}%', 'لَيْسَ بَعْد: {passed} مِنْ {units} بِـ {pass}٪', NULL, NULL, NULL, NULL, NULL, 9),
 ('learn', 'locked_why','Close “{prev}” first', 'أَتْمِمْ «{prev}» أَوَّلًا', NULL, NULL, NULL, NULL, NULL, 10),
 ('learn', 'practice',  'Practise this step',   'تَمَرَّنْ عَلَى هَذِه', 'Drills drawn from what this step holds', 'target', NULL, NULL, NULL, 11),
 ('stage', 'held', '{n} not yet in review — they come back until you get them right', '{n} لَمْ تَدْخُلِ المُرَاجَعَة — تَعُودُ حَتَّى تُتْقِنَهَا', NULL, NULL, NULL, NULL, NULL, 57);
