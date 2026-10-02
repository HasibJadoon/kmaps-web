-- The Class: a passage studied as one lesson, its path of graded sprints (drill-engine plan
-- §2.3–2.3a). What the path is lives here, as label rows; what the learner did lives in CORE
-- (core_drill_class). Nothing about the path is written in code:
--
--   class_node   the path, in `sort` order. kind step: a study step and the skills whose drills
--                make it (all of them, over the passage); practice: the class's to-perfect set;
--                review: a mix of the steps passed; check: the graded sprint over the whole
--                passage, which marks it studied. A step none of whose skills has a drill for
--                the passage is left off its path.
--   class_band   star bands on first-try accuracy (min_value = percent).
--   class_ui     the path screen's words.
--
-- And the skill `mark` (step 1: hear the āyah, tap every word not caught), a lines skill
-- that names its interaction.

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('skill', 'mark', 'Listen & mark', 'اِسْمَعْ وَعَلِّمْ', 'Hear the āyah, then tap every word you did not catch', 'hand.tap', '#5DA9E9', NULL,
 '{"source":"lines","timed":true,"interaction":"listen_mark"}', 0);

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('class_node', 'read', 'Read & listen', 'القِرَاءَةُ وَالاسْتِمَاع', 'Hear each āyah, mark what you missed, build it, say it', 'headphones', '#5DA9E9', NULL,
 '{"kind":"step","step":1,"skills":["mark","fill","hear","order","shadow"],"max":30,"sprint":12}', 10),
('class_node', 'words', 'Words', 'المُفْرَدَات', 'Each word: its root, its family, its sense here', 'character.book.closed', '#D8B657', NULL,
 '{"kind":"step","step":2,"skills":["vocab","pairs","meaning_arc","lexicon","nearsyn","keyterm"],"max":30,"sprint":12}', 20),
('class_node', 'expressions', 'Expressions', 'التَّعَابِير', 'What each expression means, in plain English', 'quote.bubble', '#E9A15D', NULL,
 '{"kind":"step","step":3,"skills":["expression","idiom"],"max":30,"sprint":12}', 30),
('class_node', 'sentences', 'Sentences', 'الجُمَل', 'Every sentence: its build, and the English that keeps it', 'text.alignright', '#81B29A', NULL,
 '{"kind":"step","step":4,"skills":["translation","ss","irab","grammar","balagha"],"max":30,"sprint":12}', 40),
('class_node', 'practice', 'Practice', 'تَمَرَّنْ', 'What is still to perfect', 'dumbbell.fill', '#E07A5F', NULL,
 '{"kind":"practice","sprint":12}', 45),
('class_node', 'structure', 'The passage''s structure', 'بِنَاءُ المَقْطَع', 'Its movements, its rings, how its parts relate', 'point.3.connected.trianglepath.dotted', '#9C89B8', NULL,
 '{"kind":"step","step":5,"skills":[],"max":30,"sprint":12}', 50),
('class_node', 'questions', 'Questions', 'الأَسْئِلَة', 'What the passage says', 'questionmark.bubble', '#F2CC8F', NULL,
 '{"kind":"step","step":6,"skills":[],"max":30,"sprint":12}', 60),
('class_node', 'tafsir', 'Tafsīr', 'التَّفْسِير', 'Hear the passage explained, then what it means', 'books.vertical', '#4FB3A9', NULL,
 '{"kind":"step","step":7,"skills":[],"max":30,"sprint":12}', 70),
('class_node', 'review', 'Review', 'رَاجِعْ', 'The steps passed, mixed', 'arrow.triangle.2.circlepath', '#F2CC8F', NULL,
 '{"kind":"review","sprint":12}', 75),
('class_node', 'check', 'Passage check', 'اخْتِبَارُ المَقْطَع', 'One graded sprint over the whole passage', 'trophy.fill', '#D8B657', NULL,
 '{"kind":"check","step":8,"sprint":15,"pass":80}', 80);

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('class_band', 'three', '★★★', '★★★', NULL, NULL, NULL, 90, '{"stars":3}', 1),
('class_band', 'two', '★★', '★★', NULL, NULL, NULL, 75, '{"stars":2}', 2);

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('class_ui', 'start', 'Start', 'ابدأ', NULL, 'play.fill', NULL, NULL, NULL, 1),
('class_ui', 'continue', 'Continue', 'تابع', NULL, 'play.fill', NULL, NULL, NULL, 2),
('class_ui', 'replay', 'Replay for stars', 'أعد لتزيد النجوم', NULL, 'arrow.clockwise', NULL, NULL, NULL, 3),
('class_ui', 'locked', 'Finish what comes before to open this', 'أتمّ ما قبله ليُفتح', NULL, 'lock.fill', NULL, NULL, NULL, 4),
('class_ui', 'passage_locked', 'Study the passage before to open this one', 'ادرس المقطع السابق ليُفتح هذا', NULL, 'lock.fill', NULL, NULL, NULL, 5),
('class_ui', 'studied', 'Studied', 'دُرِس', NULL, 'checkmark.seal.fill', NULL, NULL, NULL, 6),
('class_ui', 'in_progress', 'In progress', 'قيد الدراسة', NULL, NULL, NULL, NULL, NULL, 7),
('class_ui', 'days', '{n} days', '{n} أيام', NULL, 'calendar', NULL, NULL, NULL, 8),
('class_ui', 'day', '1 day', 'يوم واحد', NULL, 'calendar', NULL, NULL, NULL, 9),
('class_ui', 'sprint_of', 'Sprint {i} of {n}', 'الجولة {i} من {n}', NULL, NULL, NULL, NULL, NULL, 10),
('class_ui', 'to_perfect', '{n} to perfect', '{n} للإتقان', NULL, 'dumbbell.fill', NULL, NULL, NULL, 11),
('class_ui', 'nothing_open', 'Nothing left to perfect', 'لا شيء للإتقان', NULL, 'checkmark', NULL, NULL, NULL, 12),
('class_ui', 'clear_first', 'Perfect what is left before the check', 'أتقن ما بقي قبل الاختبار', NULL, 'dumbbell.fill', NULL, NULL, NULL, 13),
('class_ui', 'guidebook', 'Study the passage', 'ادرس المقطع', NULL, 'book.pages', NULL, NULL, NULL, 14),
('class_ui', 'sprint_done', 'Sprint done', 'تمّت الجولة', NULL, NULL, NULL, NULL, NULL, 15),
('class_ui', 'first_try', 'First try', 'من أول مرة', NULL, 'target', NULL, NULL, NULL, 16),
('class_ui', 'time', 'Time', 'الوقت', NULL, 'clock', NULL, NULL, NULL, 17),
('class_ui', 'next', 'Next', 'التالي', NULL, 'arrow.right', NULL, NULL, NULL, 18),
('class_ui', 'back_to_path', 'Back to the path', 'عودة إلى المسار', NULL, 'map', NULL, NULL, NULL, 19),
('class_ui', 'check_failed', 'Not yet — {pct}% first try; the check asks {pass}%', 'ليس بعد — {pct}٪ من أول مرة، والاختبار يطلب {pass}٪', NULL, NULL, NULL, NULL, NULL, 20),
('class_ui', 'class_done', 'Passage studied', 'دُرِس المقطع', NULL, 'checkmark.seal.fill', NULL, NULL, NULL, 21),
('class_ui', 'filed', '{n} drills now in your review', '{n} تمرينًا في مراجعتك الآن', NULL, 'rectangle.stack', NULL, NULL, NULL, 22),
('class_ui', 'signed_out', 'Sign in to keep your place in the class', 'سجّل الدخول لتحفظ مكانك في الدرس', NULL, 'person.crop.circle', NULL, NULL, NULL, 23),
('class_ui', 'empty', 'This passage has no drills yet', 'لا تمارين لهذا المقطع بعد', NULL, NULL, NULL, NULL, NULL, 24),
('class_ui', 'unit', 'Passage {n}', 'المقطع {n}', NULL, NULL, NULL, NULL, NULL, 25),
('class_ui', 'start_unit', 'Start the class', 'ابدأ الدرس', NULL, 'flag.fill', NULL, NULL, NULL, 26),
('class_ui', 'units', '{done} of {n} passages studied', 'دُرِس {done} من {n} مقاطع', NULL, NULL, NULL, NULL, NULL, 27);
