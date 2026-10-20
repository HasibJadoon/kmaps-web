-- Scores: a fresh race every week (GET /core/scores/atlas → week). Points for what was done this week, weighted
-- here so the mix is data: a review 1, a passage studied 25, a quiz answer right 5, a course unit passed 20.
-- And the words of the friendly race: who is just ahead, the lead, last week to beat.

INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('score_week', 'week', NULL, 'This week', 'هذا الأسبوع',
 'A fresh race every Monday — anyone can win it. Points for reviews, passages studied, quiz answers right and units passed.',
 'flag.checkered', '#D8B657', '{"weights":{"reviews":1,"studied":25,"right":5,"units":20}}', 1);

INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('score', 'right',     NULL, 'quiz answers right', 'إجابات صحيحة', NULL, 'bolt.fill',      NULL, NULL, 19),
('score', 'week_pts',  NULL, 'points this week',   'نقاط هذا الأسبوع', NULL, 'flag.checkered', NULL, NULL, 20);

INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('score_ui', 'chase',     NULL, '{gap} to pass {name}',            '{gap} لتسبق {name}',      NULL, 'arrow.up.right', NULL, NULL, 9),
('score_ui', 'leading',   NULL, 'Ahead of {name} by {gap}',        'متقدّم على {name} بـ{gap}', NULL, 'crown.fill',     NULL, NULL, 10),
('score_ui', 'alone',     NULL, 'On your own so far — bring a friend in', 'وحدك حتى الآن — ادعُ صديقًا', NULL, 'person.badge.plus', NULL, NULL, 11),
('score_ui', 'resets',    NULL, 'New race in {t}',                 'سباق جديد بعد {t}',       NULL, 'clock',          NULL, NULL, 12),
('score_ui', 'last_week', NULL, 'Last week {n}',                   'الأسبوع الماضي {n}',      NULL, NULL,             NULL, NULL, 13),
('score_ui', 'beat_last', NULL, '{n} more to beat your last week', '{n} لتتجاوز أسبوعك الماضي', NULL, 'arrow.up',      NULL, NULL, 14),
('score_ui', 'beat_done', NULL, 'Past your last week — well done', 'تجاوزت أسبوعك الماضي — أحسنت', NULL, 'sparkles',   NULL, NULL, 15),
('score_ui', 'start_week',NULL, 'Not started this week — one review puts you on the board', 'لم تبدأ هذا الأسبوع — مراجعة واحدة تضعك على اللوحة', NULL, 'play.fill', NULL, NULL, 16),
('score_ui', 'boards',    NULL, 'All-time boards',                 'اللوحات الدائمة',         NULL, 'trophy',         NULL, NULL, 17),
('score_ui', 'days',      NULL, 'Days at it',                      'أيام العمل',              NULL, NULL,             NULL, NULL, 18),
('score_ui', 'how',       NULL, 'How points are made',             'كيف تُحسب النقاط',        NULL, 'info.circle',    NULL, NULL, 19);

UPDATE core_app_label SET label = 'On this device, for you' WHERE scope = 'score_ui' AND key = 'device';
