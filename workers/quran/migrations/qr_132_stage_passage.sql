-- The round's end says how far through the passage the learner is (core lesson: graduated · total) — owner 2026-10-15:
-- every drill of a passage goes round until right three times, then into review.
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, sort) VALUES
  ('stage', 'passage', '{graduated} of {total} drills of this passage are in review', '{graduated} مِنْ {total} مِنْ تَمَارِينِ هَذَا المَقْطَعِ فِي المُرَاجَعَة', 58);
