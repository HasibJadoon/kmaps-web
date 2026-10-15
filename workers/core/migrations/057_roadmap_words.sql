-- The roadmap's words (drill-engine plan §2.3b): what the Atlas and Today say about the learner's
-- own progress — passages studied of a sūra, the stars and days, the streak, the last four weeks.
-- Sent with GET /core/drill/roadmap; the device fills {n}, {done}, {m} from the roadmap's counts.

INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('roadmap', 'studied_of',  NULL, '{done} of {n} passages studied', 'دُرِس {done} من {n}',         NULL, 'checkmark.seal.fill',        '#D8B657', NULL, 1),
('roadmap', 'studied_n',   NULL, '{n} studied',                    'دُرِس {n}',                    NULL, 'checkmark.seal.fill',        '#D8B657', NULL, 2),
('roadmap', 'under_way',   NULL, '{n} under way',                  '{n} قيد الدراسة',              NULL, 'circle.lefthalf.filled',     '#81B29A', NULL, 3),
('roadmap', 'studied',     NULL, 'Studied',                        'دُرِس',                        NULL, 'checkmark.seal.fill',        '#D8B657', NULL, 4),
('roadmap', 'in_progress', NULL, 'In progress',                    'قيد الدراسة',                  NULL, 'circle.lefthalf.filled',     '#81B29A', NULL, 5),
('roadmap', 'to_perfect',  NULL, '{n} to perfect',                 '{n} للإتقان',                  NULL, 'dumbbell.fill',              '#E07A5F', NULL, 6),
('roadmap', 'days',        NULL, '{n} days',                       '{n} أيام',                     NULL, 'calendar',                   NULL,      NULL, 7),
('roadmap', 'day',         NULL, '1 day',                          'يوم واحد',                     NULL, 'calendar',                   NULL,      NULL, 8),
('roadmap', 'streak',      NULL, '{n}-day streak',                 'سلسلة {n} أيام',               NULL, 'flame.fill',                 '#E9A15D', NULL, 9),
('roadmap', 'streak_keep', NULL, 'Study today to keep it',         'ادرس اليوم لتحافظ عليها',      NULL, 'flame',                      '#E9A15D', NULL, 10),
('roadmap', 'streak_none', NULL, 'Study today to start a streak',  'ادرس اليوم لتبدأ سلسلة',       NULL, 'flame',                      NULL,      NULL, 11),
('roadmap', 'best',        NULL, 'Best {n} days',                  'الأفضل {n} أيام',              NULL, 'trophy',                     NULL,      NULL, 12),
('roadmap', 'weeks',       NULL, 'The last four weeks',            'الأسابيع الأربعة الأخيرة',     NULL, 'calendar',                   NULL,      NULL, 13);
