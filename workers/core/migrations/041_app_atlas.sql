-- The Apps as one Atlas (drill-engine plan §2.3c): one landing with a Today strip, then rooms,
-- each opening through its doors. Every word the landing shows is a row here; the app draws them
-- and maps each door's key to the screen it opens, nothing more.
--
--   scope 'room'   a room of the landing, in sort order: its name, Arabic name, line, icon, colour
--   scope 'door'   a way into a room (parent = the room's key). A room of one door opens it at once.
--                  extra_json.module names the drill module a door is scoped to (QR · AR), where it is.
--   scope 'today'  the Today strip's words
--
-- One door per thing: each engine and scope appears once. Review is the drill SRS (what is due,
-- mixed), alone or together; Path is study — the Qurʾān's sūras opening into their classes, the
-- Arabic levels, the courses; Practice is free skill rounds at any scope; Quiz, Table and Scores
-- are as they were.

CREATE TABLE IF NOT EXISTS core_app_label (
  scope       TEXT NOT NULL,                 -- room · door · today
  key         TEXT NOT NULL,
  parent      TEXT,                          -- a door's room
  label       TEXT NOT NULL,
  label_ar    TEXT,
  detail      TEXT,
  icon        TEXT,
  color       TEXT,
  extra_json  TEXT,
  sort        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (scope, key)
);

INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('room', 'review',   NULL, 'Review',   'رَاجِعْ',   'What is due comes back as its drill, mixed across all you have studied', 'arrow.triangle.2.circlepath', '#F2CC8F', NULL, 1),
('room', 'path',     NULL, 'Path',     'المَسَار',  'Study in order: a passage is a class, a level is a road',                 'map.fill',                    '#81B29A', NULL, 2),
('room', 'practice', NULL, 'Practice', 'تَمَرَّنْ', 'Any skill, any scope, as often as you like',                               'target',                      '#E07A5F', NULL, 3),
('room', 'quiz',     NULL, 'Quiz',     'مُسَابَقَة', 'A live round with others: right and fast',                                'bolt.fill',                   '#9C89B8', NULL, 4),
('room', 'table',    NULL, 'Table',    'المَجْلِس', 'Cards to talk over together — nothing scored',                             'person.3.fill',               '#5DA9E9', NULL, 5),
('room', 'scores',   NULL, 'Scores',   'النَّتَائِج', 'Where you stand: classes studied, retention, points',                   'trophy.fill',                 '#D8B657', NULL, 6);

INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('door', 'review.quran',    'review',   'Qurʾān',     'القُرْآن',      'What is due from the passages you have studied',       'book.closed.fill',   '#D8B657', '{"module":"QR"}', 1),
('door', 'review.arabic',   'review',   'Arabic',     'العَرَبِيَّة',   'What is due from your Arabic',                          'character.book.closed.fill', '#5DA9E9', '{"module":"AR"}', 2),
('door', 'review.all',      'review',   'Everything', 'الكُلّ',        'All that is due, mixed',                                 'square.stack.3d.up.fill', '#F2CC8F', NULL, 3),
('door', 'review.together', 'review',   'Together',   'مَعًا',         'Review with your group: one asks, one answers',          'person.2.fill',      '#E9A15D', NULL, 4),
('door', 'path.quran',      'path',     'Qurʾān',     'القُرْآن',      'The Atlas: choose a sūra, study its passages in order',  'book.closed.fill',   '#D8B657', '{"module":"QR"}', 1),
('door', 'path.arabic',     'path',     'Arabic',     'العَرَبِيَّة',   'Levels A1 to C2, unit by unit',                          'character.book.closed.fill', '#5DA9E9', '{"module":"AR"}', 2),
('door', 'path.courses',    'path',     'Courses',    'الدُّرُوس',      'Packs of graded questions, unit by unit',                'books.vertical.fill', '#81B29A', NULL, 3),
('door', 'practice.quran',  'practice', 'Qurʾān',     'القُرْآن',      'Every skill, at the whole Qurʾān, a sūra or a passage',  'book.closed.fill',   '#D8B657', '{"module":"QR"}', 1),
('door', 'practice.arabic', 'practice', 'Arabic',     'العَرَبِيَّة',   'Every Arabic skill, mixed, at your level',               'character.book.closed.fill', '#5DA9E9', '{"module":"AR"}', 2),
('door', 'quiz.live',       'quiz',     'Quiz',       'مُسَابَقَة',     'Host a round or join one with a code',                   'bolt.fill',          '#9C89B8', NULL, 1),
('door', 'table.cards',     'table',    'Table',      'المَجْلِس',     'One card at a time, in English, Arabic or Urdu',         'person.3.fill',      '#5DA9E9', NULL, 1),
('door', 'scores.board',    'scores',   'Scores',     'النَّتَائِج',    'Boards for review, quiz and table',                      'trophy.fill',        '#D8B657', NULL, 1);

INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('today', 'title',       NULL, 'Today',                                  'اليَوْم',                  NULL, 'sun.max.fill',                 NULL, NULL, 1),
('today', 'due',         NULL, '{n} due',                                '{n} مستحقّ',               NULL, 'arrow.triangle.2.circlepath', NULL, NULL, 2),
('today', 'review_now',  NULL, 'Review now',                             'راجع الآن',                NULL, 'play.fill',                    NULL, NULL, 3),
('today', 'nothing_due', NULL, 'Nothing due — study a passage to fill your review', 'لا شيء مستحقّ — ادرس مقطعًا لتملأ مراجعتك', NULL, 'checkmark.circle', NULL, NULL, 4),
('today', 'continue',    NULL, 'Continue',                               'تابع',                     NULL, 'play.circle.fill',             NULL, NULL, 5),
('today', 'class',       NULL, 'Passage {range}',                        'المقطع {range}',           NULL, 'graduationcap.fill',           NULL, NULL, 6),
('today', 'signed_out',  NULL, 'Sign in to see what is due and where you left off', 'سجّل الدخول لترى ما استحقّ وأين توقّفت', NULL, 'person.crop.circle', NULL, NULL, 7),
('today', 'apps',        NULL, 'Apps',                                   'التَّطْبِيقَات',            'Review, study, practise, play — one engine', 'square.grid.2x2.fill', '#D8B657', NULL, 8);
