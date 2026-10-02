-- Scores as an Atlas: one board per app that scores, each measured per person from that person's
-- own record (GET /core/scores/atlas). What a board is called, its colour, which figures it shows
-- and which one leads are rows here; how each figure is counted is the route's.
--
--   scope 'score_board'  a board, in sort order. extra_json: { "metrics": [...], "headline": "<metric>",
--                        "source": "server" | "device" } — a device board's figures are kept on the
--                        learner's device (practice points and streak), so it has no standings.
--   scope 'score'        a figure's words (key = the metric), shared by every board that shows it
--   scope 'score_ui'     the screen's own words
--
-- Table is not here: it is talk, unscored by design.

INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('score_board', 'study',    'path',     'Study',    'الدِّرَاسَة', 'Passages studied as classes: stars, first-try accuracy, days', 'graduationcap.fill', '#81B29A',
 '{"metrics":["studied","stars","score","days","under_way"],"headline":"studied","source":"server"}', 1),
('score_board', 'review',   'review',   'Review',   'المُرَاجَعَة', 'What you hold for good: cards mastered, reviews done', 'arrow.triangle.2.circlepath', '#F2CC8F',
 '{"metrics":["mastered","cards","reviews","due"],"headline":"mastered","source":"server"}', 2),
('score_board', 'practice', 'practice', 'Practice', 'التَّمْرِين', 'Points from free practice, and the days in a row', 'target', '#E07A5F',
 '{"metrics":["xp","today","streak"],"headline":"xp","source":"device"}', 3),
('score_board', 'quiz',     'quiz',     'Quiz',     'المُسَابَقَة', 'Live rounds: points for right and fast', 'bolt.fill', '#9C89B8',
 '{"metrics":["points","correct","answered","rounds"],"headline":"points","source":"server"}', 4),
('score_board', 'courses',  'path',     'Courses',  'الدُّرُوس', 'Graded packs: points, rounds, units passed', 'books.vertical.fill', '#5DA9E9',
 '{"metrics":["points","rounds","units","accuracy"],"headline":"points","source":"server"}', 5);

INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('score', 'studied',   NULL, 'passages studied', 'مقاطع دُرست',  NULL, 'checkmark.seal.fill', NULL, NULL, 1),
('score', 'stars',     NULL, 'stars',            'نجوم',         NULL, 'star.fill',           NULL, NULL, 2),
('score', 'score',     NULL, '% first try',      '٪ من أول مرة', NULL, 'target',              NULL, NULL, 3),
('score', 'days',      NULL, 'days of study',    'أيام دراسة',   NULL, 'calendar',            NULL, NULL, 4),
('score', 'under_way', NULL, 'under way',        'قيد الدراسة',  NULL, 'hourglass',           NULL, NULL, 5),
('score', 'mastered',  NULL, 'cards mastered',   'بطاقات مُتقنة', NULL, 'crown.fill',          NULL, NULL, 6),
('score', 'cards',     NULL, 'cards',            'بطاقات',       NULL, 'rectangle.stack',     NULL, NULL, 7),
('score', 'reviews',   NULL, 'reviews',          'مراجعات',      NULL, 'arrow.triangle.2.circlepath', NULL, NULL, 8),
('score', 'due',       NULL, 'due now',          'مستحقّ الآن',  NULL, 'clock',               NULL, NULL, 9),
('score', 'xp',        NULL, 'points',           'نقاط',         NULL, 'sparkles',            NULL, NULL, 10),
('score', 'today',     NULL, 'today',            'اليوم',        NULL, 'sun.max',             NULL, NULL, 11),
('score', 'streak',    NULL, 'day streak',       'أيام متتالية', NULL, 'flame.fill',          NULL, NULL, 12),
('score', 'points',    NULL, 'points',           'نقاط',         NULL, 'sparkles',            NULL, NULL, 13),
('score', 'correct',   NULL, 'right',            'صحيحة',        NULL, 'checkmark',           NULL, NULL, 14),
('score', 'answered',  NULL, 'answered',         'أُجيب',         NULL, 'text.bubble',         NULL, NULL, 15),
('score', 'rounds',    NULL, 'rounds',           'جولات',        NULL, 'flag.checkered',      NULL, NULL, 16),
('score', 'units',     NULL, 'units passed',     'وحدات اجتيزت', NULL, 'checkmark.circle',    NULL, NULL, 17),
('score', 'accuracy',  NULL, '% right',          '٪ صحيح',       NULL, 'scope',               NULL, NULL, 18);

INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('score_ui', 'title',      NULL, 'Scores',                      'النَّتَائِج', 'Each person measured from their own record', 'trophy.fill', '#D8B657', NULL, 1),
('score_ui', 'rank',       NULL, '#{n} of {of}',                '{n} من {of}',  NULL, NULL, NULL, NULL, 2),
('score_ui', 'unranked',   NULL, 'Not yet on the board',        'لم تدخل اللوحة بعد', NULL, NULL, NULL, NULL, 3),
('score_ui', 'yours',      NULL, 'Yours',                       'لك',           NULL, 'person.crop.circle.fill', NULL, NULL, 4),
('score_ui', 'standings',  NULL, 'Standings',                   'الترتيب',      NULL, 'list.number', NULL, NULL, 5),
('score_ui', 'you',        NULL, 'You',                         'أنت',          NULL, NULL, NULL, NULL, 6),
('score_ui', 'device',     NULL, 'Kept on this device, for you alone', 'محفوظ على هذا الجهاز لك وحدك', NULL, 'iphone', NULL, NULL, 7),
('score_ui', 'empty',      NULL, 'Nobody is on this board yet', 'لا أحد على هذه اللوحة بعد', NULL, NULL, NULL, NULL, 8);
