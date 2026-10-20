-- The bookcase's look (routes/bookcase.ts): each shelf's English and Arabic name, its SF Symbol and colour, as data
-- rather than a switch in the app. Keys: a Notion root by its Arabic name, the classical shelf ('turath'), each kind
-- of work ('shape:<shape>', in the order a reader climbs them — sort), and the reader's own shelves ('mine:<shelf>').
-- A shelf with no row still draws, in gold with a book.
INSERT INTO ar_practice_label (scope, key, label, label_ar, icon, color, sort) VALUES
  ('shelf', 'turath',                  'Classical',              'التراث',              'books.vertical',              '#C9A84C', 1),
  ('shelf', 'قصص مبسّطة للقراءة',       'Simple stories',         'قصص مبسّطة للقراءة',   'book.closed',                 '#B0943F', 2),
  ('shelf', 'وسائط متعددة',             'Video & audio',          'وسائط متعددة',         'play.rectangle',              '#8FB6E8', 3),
  ('shelf', 'كتب',                      'Books',                  'كتب',                  'books.vertical',              '#C9A84C', 4),
  ('shelf', 'شعر',                      'Poetry',                 'شعر',                  'text.quote',                  '#9E7C3C', 5),
  ('shelf', 'أناشيد وأغانٍ',             'Songs',                  'أناشيد وأغانٍ',         'music.note',                  '#9E7C3C', 6),
  ('shelf', 'أحاديث',                   'Talks',                  'أحاديث',               'quote.bubble',                '#C9A84C', 7),
  ('shelf', 'محادثة',                   'Conversation',           'محادثة',               'bubble.left.and.bubble.right','#8FB6E8', 8),
  ('shelf', 'يوميات',                   'Diaries',                'يوميات',               'calendar',                    '#5AAD88', 9),
  ('shelf', 'نُكت وطرائف',               'Jokes & anecdotes',      'نُكت وطرائف',           'face.smiling',                '#5AAD88', 10),
  ('shelf', 'تعابير واصطلاحات',          'Expressions',            'تعابير واصطلاحات',      'textformat.abc',              '#C9A84C', 11),
  ('shelf', 'مقالات',                   'Articles',               'مقالات',               'doc.text',                    '#C9A84C', 12),
  ('shelf', 'shape:prose',             'Stories',                'الحكايات',             'book.closed',                 '#8C6E2A', 20),
  ('shelf', 'shape:nights',            'The Nights',             'ألف ليلة وليلة',        'moon.stars',                  '#E8C96A', 21),
  ('shelf', 'shape:series',            'Series & podcasts',      'المسلسلات',            'waveform',                    '#8FB6E8', 22),
  ('shelf', 'shape:dialogue',          'Conversation',           'الحوار',               'bubble.left.and.bubble.right','#5AAD88', 23),
  ('shelf', 'shape:maqama',            'Maqāmāt',                'المقامات',             'theatermasks',                '#C9A84C', 24),
  ('shelf', 'shape:amthal',            'Proverbs',               'الأمثال',              'quote.bubble',                '#B0943F', 25),
  ('shelf', 'shape:diwan',             'Dīwāns',                 'الدواوين',             'text.quote',                  '#E8C96A', 26),
  ('shelf', 'shape:lyrics',            'Songs',                  'أناشيد وأغانٍ',         'music.note',                  '#9E7C3C', 27),
  ('shelf', 'mine:continue',           'Continue Reading',       'قيد القراءة',          'book',                        '#E8C96A', 40),
  ('shelf', 'mine:kept',               'Bookmarked',             'العلامات',             'bookmark',                    '#E8C96A', 41),
  ('shelf', 'mine:loved',              'My Shelf',               'مكتبتي',               'heart',                       '#E8C96A', 42),
  ('shelf', 'mine:finished',           'Finished',               'المقروءة',             'checkmark.seal',              '#5AAD88', 43)
ON CONFLICT (scope, key) DO UPDATE SET label = excluded.label, label_ar = excluded.label_ar, icon = excluded.icon,
                                       color = excluded.color, sort = excluded.sort;
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content';
