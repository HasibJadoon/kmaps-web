-- 067 — the home-screen widgets' words (GET /core/widgets, iOS WidgetKit). Each widget's name, its icon and colour,
-- and the lines it says; the device keeps the last copy so a widget reads right before its first refresh.
INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('widget', 'quran',       NULL, 'Qurʾān',          'القُرْآن',       'The passage you are on, and its path',     'book.closed.fill',        '#D8B657', NULL, 1),
('widget', 'arabic',      NULL, 'Arabic',          'العَرَبِيَّة',    'The study you are on, and its path',       'character.book.closed.fill','#5FB3A1', NULL, 2),
('widget', 'worldview',   NULL, 'Worldview',       'الرُّؤْيَة',       'Its path is being built',                  'globe.europe.africa.fill', '#8E7CC3', NULL, 3),
('widget', 'reviews',     NULL, 'Review',          'رَاجِعْ',          'Due today',                                'arrow.triangle.2.circlepath', '#E0A458', NULL, 4),
('widget', 'progress',    NULL, 'Progress',        'التَّقَدُّم',      'Everyone''s study',                         'trophy.fill',             '#D8B657', NULL, 5),
('widget', 'coming_soon', NULL, 'Coming soon',     'قَرِيبًا',         NULL,                                       'hourglass',               NULL,      NULL, 6),
('widget', 'next',        NULL, 'Next',            'التَّالِي',        NULL,                                       'play.fill',               NULL,      NULL, 7),
('widget', 'nodes',       NULL, '{n} of {of} steps','{n} من {of}',     NULL,                                       NULL,                      NULL,      NULL, 8),
('widget', 'drills',      NULL, '{n}/{of} drills', '{n}/{of} تمرين',   NULL,                                       NULL,                      NULL,      NULL, 9),
('widget', 'passage',     NULL, 'Passage {n}',     'المقطع {n}',       NULL,                                       NULL,                      NULL,      NULL, 10),
('widget', 'due_none',    NULL, 'All caught up',   'لا شيء مستحق',     NULL,                                       'checkmark.seal.fill',     NULL,      NULL, 11),
('widget', 'reviewed',    NULL, '{n} reviewed today','{n} اليوم',      NULL,                                       NULL,                      NULL,      NULL, 12),
('widget', 'studied',     NULL, '{n} studied',     '{n} مدروس',        NULL,                                       NULL,                      NULL,      NULL, 13),
('widget', 'empty',       NULL, 'Open K-Maps to begin', 'افتح التطبيق', NULL,                                      NULL,                      NULL,      NULL, 14),
('widget', 'signed_out',  NULL, 'Sign in to K-Maps', 'سجّل الدخول',    NULL,                                       NULL,                      NULL,      NULL, 15);

INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('widget', 'episode', NULL, 'Episode {n}', 'الحلقة {n}', NULL, NULL, NULL, NULL, 16);
