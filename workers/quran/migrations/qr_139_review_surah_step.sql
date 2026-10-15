-- Phase 4.2 of the drill-engine plan: a sūra's review is a filter of the one review queue (the drills due from that sūra,
-- dealt spread like every round). Its door on the sūra page is a step row, like the door into its classes.
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('step', 'review_surah', 'Review this sūra', 'رَاجِعْ هَذِهِ السُّورَة', 'What is due from this sūra, mixed', 'arrow.triangle.2.circlepath', '#F2CC8F', NULL, NULL, 8);
