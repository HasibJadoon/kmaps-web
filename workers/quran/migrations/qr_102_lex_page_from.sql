-- A derived word's lemma page names the verb it is made from: its family (باب or form), its line, what it means.
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, sort) VALUES
  ('lex_page', 'from', 'Comes from', 'مُشْتَقٌّ مِن', 'The verb it is made from, and that verb''s family', 'arrow.triangle.branch', 8);
