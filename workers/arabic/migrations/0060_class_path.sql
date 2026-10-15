-- 0060 · The Arabic class (drill-engine plan 4.3): an episode of the path studied as one lesson.
-- The same class as the Qurʾān's (QR qr_067): its path is the class_node rows in sort order; its star
-- bands are class_band; its words are class_ui. Read by /ar/practice/class/{path,node}.
-- The step run per scene ("per":"scene") is one node per scene of the episode.

INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('class_node', 'scenes',   'Scenes',        'المَشَاهِد',        'Each scene’s hard words, idioms and lines, heard where they were said', 'film', '#E07A5F', NULL,
  '{"kind":"step","step":1,"per":"scene","max":40,"sprint":10}', 10),
 ('class_node', 'practice', 'Practice',      'تَمَرَّنْ',          'What is still to perfect', 'dumbbell.fill', '#E07A5F', NULL, '{"kind":"practice","sprint":12}', 45),
 ('class_node', 'review',   'Review',        'رَاجِعْ',            'The scenes passed, mixed', 'arrow.triangle.2.circlepath', '#F2CC8F', NULL, '{"kind":"review","sprint":12}', 75),
 ('class_node', 'check',    'Episode check', 'اخْتِبَارُ الحَلْقَة', 'One graded sprint over the whole episode', 'trophy.fill', '#D8B657', NULL,
  '{"kind":"check","step":2,"sprint":15,"pass":90}', 80),

 ('class_band', 'three', '★★★', '★★★', NULL, NULL, NULL, 90, '{"stars":3}', 1),
 ('class_band', 'two',   '★★',  '★★',  NULL, NULL, NULL, 75, '{"stars":2}', 2),

 ('class_ui', 'start',        'Start',                                   'ابدأ',                       NULL, 'play.fill', NULL, NULL, NULL, 1),
 ('class_ui', 'continue',     'Continue',                                'تابع',                       NULL, 'play.fill', NULL, NULL, NULL, 2),
 ('class_ui', 'replay',       'Replay for stars',                        'أعد لتزيد النجوم',           NULL, 'arrow.clockwise', NULL, NULL, NULL, 3),
 ('class_ui', 'locked',       'Finish what comes before to open this',   'أتمّ ما قبله ليُفتح',         NULL, 'lock.fill', NULL, NULL, NULL, 4),
 ('class_ui', 'studied',      'Studied',                                 'دُرِس',                      NULL, 'checkmark.seal.fill', NULL, NULL, NULL, 6),
 ('class_ui', 'in_progress',  'In progress',                             'قيد الدراسة',                NULL, NULL, NULL, NULL, NULL, 7),
 ('class_ui', 'days',         '{n} days',                                '{n} أيام',                   NULL, 'calendar', NULL, NULL, NULL, 8),
 ('class_ui', 'day',          '1 day',                                   'يوم واحد',                   NULL, 'calendar', NULL, NULL, NULL, 9),
 ('class_ui', 'sprint_of',    'Sprint {i} of {n}',                       'الجولة {i} من {n}',          NULL, NULL, NULL, NULL, NULL, 10),
 ('class_ui', 'to_perfect',   '{n} to perfect',                          '{n} للإتقان',                NULL, 'dumbbell.fill', NULL, NULL, NULL, 11),
 ('class_ui', 'nothing_open', 'Nothing left to perfect',                 'لا شيء للإتقان',             NULL, 'checkmark', NULL, NULL, NULL, 12),
 ('class_ui', 'clear_first',  'Perfect what is left before the check',   'أتقن ما بقي قبل الاختبار',   NULL, 'dumbbell.fill', NULL, NULL, NULL, 13),
 ('class_ui', 'guidebook',    'Watch the episode',                       'شاهد الحلقة',                NULL, 'play.rectangle', NULL, NULL, NULL, 14),
 ('class_ui', 'sprint_done',  'Sprint done',                             'تمّت الجولة',                NULL, NULL, NULL, NULL, NULL, 15),
 ('class_ui', 'first_try',    'First try',                               'من أول مرة',                 NULL, 'target', NULL, NULL, NULL, 16),
 ('class_ui', 'time',         'Time',                                    'الوقت',                      NULL, 'clock', NULL, NULL, NULL, 17),
 ('class_ui', 'next',         'Next',                                    'التالي',                     NULL, 'arrow.right', NULL, NULL, NULL, 18),
 ('class_ui', 'back_to_path', 'Back to the path',                        'عودة إلى المسار',            NULL, 'map', NULL, NULL, NULL, 19),
 ('class_ui', 'check_failed', 'Not yet — {pct}% first try; the check asks {pass}%', 'ليس بعد — {pct}٪ من أول مرة، والاختبار يطلب {pass}٪', NULL, NULL, NULL, NULL, NULL, 20),
 ('class_ui', 'class_done',   'Episode studied',                         'دُرِست الحلقة',              NULL, 'checkmark.seal.fill', NULL, NULL, NULL, 21),
 ('class_ui', 'filed',        '{n} drills now in your review',           '{n} تمرينًا في مراجعتك الآن', NULL, 'rectangle.stack', NULL, NULL, NULL, 22),
 ('class_ui', 'signed_out',   'Sign in to keep your place in the class', 'سجّل الدخول لتحفظ مكانك في الدرس', NULL, 'person.crop.circle', NULL, NULL, NULL, 23),
 ('class_ui', 'empty',        'This episode has no drills yet',          'لا تمارين لهذه الحلقة بعد',  NULL, NULL, NULL, NULL, NULL, 24),
 ('class_ui', 'unit',         'Episode {n}',                             'الحلقة {n}',                 NULL, NULL, NULL, NULL, NULL, 25),
 ('class_ui', 'scene_n',      'Scene {n}',                               'المَشْهَد {n}',               NULL, 'film', NULL, NULL, NULL, 74);
