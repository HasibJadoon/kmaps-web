-- The sūra's class list: Continue into the open passage, and the next sūra on the study path.
INSERT INTO qr_study_label (scope, key, label, label_ar, sort) VALUES
  ('class_ui', 'continue_passage', 'Continue: {surah} passage {n}', 'تابِعْ: {surah} المَقْطَع {n}', 910),
  ('class_ui', 'next_surah', 'Next sūra', 'السُّورَةُ التَّالِيَة', 911),
  ('class_ui', 'next_opens', 'Opens when all {n} passages of {surah} are graded', 'تُفْتَحُ بَعْدَ اجْتِيَازِ مَقَاطِعِ {surah} كُلِّهَا', 912),
  ('class_ui', 'next_open', 'Open — start its first passage', 'مَفْتُوحَة', 913),
  ('class_ui', 'being_prepared', 'Being prepared — its passages are not cut yet', 'قَيْدَ الإِعْدَاد', 914)
ON CONFLICT (scope, key) DO UPDATE SET label = excluded.label, label_ar = excluded.label_ar;
