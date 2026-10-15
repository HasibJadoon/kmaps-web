-- The module card's line on the class path: classes done of the module's classes.
INSERT INTO qr_study_label (scope, key, label, label_ar, sort) VALUES
  ('class_ui', 'classes_done', '{done} of {of} classes done', '{done} مِنْ {of}', 900)
ON CONFLICT (scope, key) DO UPDATE SET label = excluded.label, label_ar = excluded.label_ar;
