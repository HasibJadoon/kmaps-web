-- A root's page, deeper: its aṣl by every book, its core, the layers its meaning grows in, the stages it went through.
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, sort) VALUES
  ('lex_page', 'asl',    'Its first meaning',        'الأصل',         'The meaning most books share — then each book in its own words, oldest first', 'leaf', 9),
  ('lex_page', 'books',  'Every book',               'في كل كتاب',     NULL, 'books.vertical', 10),
  ('lex_page', 'core',   'Its core',                 'اللُّبّ',          NULL, 'circle.dotted.circle', 11),
  ('lex_page', 'layers', 'How its meaning grows',    'طبقات المعنى',   'From the first picture outward, step by step', 'square.3.layers.3d', 12),
  ('lex_page', 'stages', 'How it developed',         'تطوّر المعنى',    NULL, 'clock.arrow.circlepath', 13);
