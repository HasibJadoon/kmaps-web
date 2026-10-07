-- A root's page lists every word's meaning arc in full, most used first.
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, sort) VALUES
  ('lex_page', 'arcs', 'Every word''s arc', 'أقواس المعنى',
   'How each word''s meaning runs from the root''s picture, step by step', 'arrow.triangle.turn.up.right.diamond', 15);
