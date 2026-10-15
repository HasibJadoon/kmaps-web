-- The lesson slides' words (DrillKit ClassLessonView); rows already there are kept.
INSERT INTO qr_study_label (scope, key, label, label_ar, sort) VALUES
  ('class_ui', 'lesson_drills', '{n} drills rest on this slide', 'تَمَارِينُ هَذِهِ الشَّرِيحَة', 930),
  ('class_ui', 'example', 'Example', 'مِثَال', 931),
  ('class_ui', 'start_drills', 'Start the drills', 'ابْدَأِ التَّمَارِين', 932),
  ('class_ui', 'back_to_drill', 'Back to the drill', 'العَوْدَةُ إِلَى التَّمْرِين', 933),
  ('class_ui', 'lesson', 'Lesson', 'الدَّرْس', 934),
  ('class_ui', 'next', 'Next', 'التَّالِي', 935),
  ('class_ui', 'previous', 'Previous', 'السَّابِق', 936),
  ('class_ui', 'close', 'Close', 'إِغْلَاق', 937),
  ('class_ui', 'play', 'Play', 'اسْتَمِعْ', 938)
ON CONFLICT (scope, key) DO NOTHING;
