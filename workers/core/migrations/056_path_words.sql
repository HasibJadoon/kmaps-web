-- The card paths and the courses drawn as unit paths (drill-engine plan §2.3a): the Path
-- screens of CORE's own data — a learn track's units, a course's stops — now draw through the
-- one ClassPathView, so their words are rows here, as the Atlas landing's are (041).
--
--   scope 'path'  the words a unit path shows: its bubble, its locks, its banner's lines,
--                 and what it says when it has nothing to draw.
--
-- {n}, {done}, {m} are filled by the device from the path's own counts.

INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('path', 'start',     NULL, 'Start',                                           'ابدأ',                                  NULL, 'play.fill',                NULL, NULL, 1),
('path', 'continue',  NULL, 'Continue',                                        'تابع',                                  NULL, 'play.circle.fill',         NULL, NULL, 2),
('path', 'locked',    NULL, 'Finish what comes before this to open it',        'أتمّ ما قبله ليُفتح',                   NULL, 'lock.fill',                NULL, NULL, 3),
('path', 'complete',  NULL, '{done} of {n} complete',                          'اكتمل {done} من {n}',                   NULL, 'checkmark.circle',         NULL, NULL, 4),
('path', 'due',       NULL, '{n} due along the way',                           '{n} مستحقّ على الطريق',                 NULL, 'arrow.triangle.2.circlepath', NULL, NULL, 5),
('path', 'stops',     NULL, '{n} stops · {m} questions',                       '{n} محطّات · {m} أسئلة',                NULL, 'flag.fill',                NULL, NULL, 6),
('path', 'known_of',  NULL, '{known}/{n}',                                     '{known}/{n}',                           NULL, NULL,                       NULL, NULL, 7),
('path', 'questions', NULL, '{n} questions',                                   '{n} أسئلة',                             NULL, NULL,                       NULL, NULL, 8),
('path', 'nothing_yet', NULL, 'Nothing here yet',                              'لا شيء هنا بعد',                        NULL, 'tray',                     NULL, NULL, 9),
('path', 'empty',     NULL, 'This path could not be loaded. Pull to try again.', 'تعذّر تحميل المسار. اسحب للمحاولة مجددًا.', NULL, 'point.topleft.down.to.point.bottomright.curvepath', NULL, NULL, 10),
('path', 'no_units',  NULL, 'This course has no units yet',                    'لا وحدات في هذه الدورة بعد',            NULL, 'books.vertical',           NULL, NULL, 11),
('path', 'not_yet',   NULL, 'Not yet',                                         'ليس بعد',                               NULL, 'hourglass',                NULL, NULL, 12);
