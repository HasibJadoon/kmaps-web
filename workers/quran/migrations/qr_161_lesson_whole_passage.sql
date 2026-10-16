-- The Reading lesson opens on the passage heard whole, from its first āyah (practice-class.ts passageSlide); the
-- lesson's example is played as a drill plays its line, with Slower beside it (DrillKit StageAudio).
INSERT INTO qr_study_label (scope, key, label, label_ar, sort) VALUES
  ('class_ui', 'whole_passage', 'The whole passage', 'المَقْطَعُ كَامِلًا', 939),
  ('class_ui', 'slower', 'Slower', 'أَبْطَأ', 940)
ON CONFLICT (scope, key) DO NOTHING;

-- The Reading class runs: the whole passage heard first (its own node, the lesson's style 'whole'), then Listen & fill,
-- then the rest (owner, 2026-10-16).
UPDATE qr_study_label SET sort = 5 WHERE scope = 'class_style' AND key = 'fill';
UPDATE qr_study_label SET sort = 8 WHERE scope = 'class_style' AND key = 'mark';
