-- The passage commentary's four views, shown for whichever commentary is chosen, and the words its screens say.
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, sort) VALUES
  ('tafsir_view', 'passage',    'Passage',       'النص',          'The Arabic read through, its English underneath',                  'text.justify.leading', 1),
  ('tafsir_view', 'lines',      'Line by line',  'سطرًا سطرًا',   'Each line with its English under it',                               'list.bullet.indent',   2),
  ('tafsir_view', 'understand', 'Understanding', 'الفهم',         'Tap a sentence you don''t follow: what it is about, what it means', 'lightbulb',            3),
  ('tafsir_view', 'drills',     'Drills',        'التدريب',       'The sentences you marked come first',                               'checkmark.seal',       4),
  ('tafsir_ui', 'arabic',         'Arabic',                                      'النص',      NULL, NULL, 1),
  ('tafsir_ui', 'english',        'English',                                     'الترجمة',   NULL, NULL, 2),
  ('tafsir_ui', 'concept',        'What it is about',                            'الفكرة',    NULL, 'tag', 3),
  ('tafsir_ui', 'gist',           'In short',                                    'الخلاصة',   NULL, 'text.quote', 4),
  ('tafsir_ui', 'meaning',        'What it means',                               'المعنى',    NULL, 'lightbulb', 5),
  ('tafsir_ui', 'mark',           'I don''t understand this',                    NULL,        'Keep it in your drills', 'questionmark.circle', 6),
  ('tafsir_ui', 'marked',         'In your drills',                              NULL,        'It comes first when you drill', 'checkmark.circle.fill', 7),
  ('tafsir_ui', 'keep_failed',    'Sign in to keep it in your drills',           NULL,        'It is kept on this phone till then', 'person.crop.circle.badge.exclamationmark', 8),
  ('tafsir_ui', 'play',           'Hear it',                                     NULL,        NULL, 'play.fill', 9),
  ('tafsir_ui', 'understand_none','Notes for this commentary are not written yet', NULL,      NULL, 'hourglass', 10),
  ('tafsir_ui', 'drills_marked',  'sentences you marked come first',             NULL,        NULL, 'bookmark.fill', 11),
  ('tafsir_ui', 'drills_none',    'Mark a sentence in Understanding and it is drilled first', NULL, NULL, 'lightbulb', 12),
  ('tafsir_ui', 'drills_open',    'Drill the commentary',                        'تَدَرَّبْ', 'Its language, reading it through, hearing it alone', 'text.book.closed', 13);
