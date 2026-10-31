-- 0078_intake_summary_words.sql
--
-- The words the Workspace's "Intake queue" card shows (GET /ar/intake/summary). The apps render them as sent;
-- nothing here is written in Swift. The tiles reuse the intake_status labels, the pipelines the intake_domain
-- labels, "Next up" the existing intake/next_up row.
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('intake', 'summary',       'Intake queue', 'طَابُورُ الوَارِد', 'Sources found on the way to tafsīr: what is in the app, what waits, and what comes next', 'tray.full', NULL, NULL, NULL, 28),
 ('intake', 'summary_open',  'Open the intake', 'افْتَحِ الوَارِد', NULL, 'chevron.right', NULL, NULL, NULL, 29),
 ('intake', 'summary_empty', 'Nothing waiting on the path', 'لَا شَيْءَ يَنْتَظِرُ عَلَى المَسَار', NULL, 'checkmark.circle', NULL, NULL, NULL, 30);
