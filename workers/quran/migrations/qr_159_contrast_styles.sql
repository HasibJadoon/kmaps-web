INSERT INTO qr_study_label (scope, key, label, label_ar, sort) VALUES
  ('class_style', 'tafsir_contrast:common', 'Common ground', 'مَا اتَّفَقُوا عَلَيْه', 700),
  ('class_style', 'tafsir_contrast:contrast', 'Where they part', 'مَا اخْتَلَفُوا فِيه', 701),
  ('class_style', 'tafsir_contrast:focus', 'Each one’s focus', 'عِنَايَةُ كُلِّ مُفَسِّر', 702),
  ('class_style', 'tafsir_contrast:theology', 'Theology', 'العَقِيدَة', 703)
ON CONFLICT (scope, key) DO UPDATE SET label = excluded.label, label_ar = excluded.label_ar;
