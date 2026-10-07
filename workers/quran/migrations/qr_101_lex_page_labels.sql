-- The word screen is the word in its verse; its lemma and its root have their own pages in the lexicon, the same
-- from every verse. The words those three screens say.
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, sort) VALUES
  ('lex_page', 'word_here',  'In this verse',            'في هذه الآية',     'The word as it stands here: its case and what it means in this verse', 'text.bubble', 1),
  ('lex_page', 'lemma',      'Lemma',                    'اللفظة',            'What the word is, in every verse: its meaning, form, plurals and uses', 'character.book.closed', 2),
  ('lex_page', 'root',       'Root',                     'الجذر',             'What its letters hold: the root''s picture, its family and its words', 'circle.hexagongrid', 3),
  ('lex_page', 'lemmas',     'Its words in the Qurʾān',  'كلماته في القرآن',  'Most used first; each opens its own card', 'list.number', 4),
  ('lex_page', 'count',      '{n}× in the Qurʾān',       NULL,                NULL, NULL, 5),
  ('lex_page', 'lexicons',   'In the lexicons',          'في المعاجم',        'The root in every lexicon, and each book''s page', 'books.vertical', 6),
  ('lex_page', 'open',       'Open',                     NULL,                NULL, 'chevron.right', 7);
