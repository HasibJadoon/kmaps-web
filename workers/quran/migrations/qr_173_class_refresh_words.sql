-- The class screen's refresh button (owner, 2026-10-20): what it says when the latest is in, and when it is not.
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, sort) VALUES
  ('class_ui', 'refreshed',      'Up to date — the latest drills are in', 'مُحَدَّث — وَصَلَتْ أَحْدَثُ التَّمَارِين', 40),
  ('class_ui', 'refresh_failed', 'Could not get the latest — try again',  'تَعَذَّرَ التَّحْدِيث — حَاوِلْ ثَانِيَةً',  41);
