-- qr_053_gramterm_skills.sql
--
-- The grammar-term registry drilled on the Qurʾān side (source 'gramterm', handler
-- routes/practice-grammar.ts): each skill names the AL drill source it draws
-- (/al/drill/grammar/<drill>) and, per level, the ask — or asks, mixed — that level is.
-- Every ask has its instruction here (scope 'kind', keyed by the ask); the two schools of the
-- Inṣāf are named here too (scope 'school'). Every drill files a QR review card.
--
--   gt_tree      L1 which branch (category) · L2 which heading (parent) · L3 what sits beside it
--   gt_define    L1 the definition names which term · L2 which is its definition · L3 the Arabic definition
--   gt_shahid    L1 a shāhid of a top-level term · L2 of a sub-term · L3 which phrase is a shāhid of it
--                (terms the registry has no shāhid for are drilled from their iʿrāb instances)
--   gt_book      L1 which book has a bāb on it · L2 which term has a bāb in this book · L3 a page of Ghalāyīnī: which term
--                (exact or confirmed links only)
--   gt_khilaf    L1 Kūfan or Baṣran? · L2 which is the Baṣrans' / the Kūfans' position · L3 which masʾala
--   gt_wazn      L1 the rule forms which noun · L2 on which wazn · L3 which rule, and how regular
--   gt_contrast  L1 its counterpart · L2 which of the two fits the description · L3 which two readings contend
--   gt_adima     ʿUḍayma's Dirāsāt: L1 the word's pattern (ṣarf) or the heading it is cited under (naḥw) ·
--                L2 the meaning the pattern carries, or the term the heading names · L3 his own notes
--
-- Apply with `d1 execute --file` and record it in d1_migrations (see qr_046: never `migrations apply` km_quran).
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('skill', 'gt_tree', 'Term tree', 'شَجَرَةُ المُصْطَلَحَات', 'Where a grammar term sits — its branch, its heading, its neighbours', 'list.bullet.indent', '#81B29A', NULL,
 '{"source":"gramterm","drill":"tree","levels":{"basic":{"ask":"gt_category"},"middle":{"ask":"gt_parent"},"advanced":{"ask":"gt_sibling"}}}', 20),
('skill', 'gt_define', 'Definitions', 'الحُدُود', 'A term and its definition — as the registry states it', 'text.quote', '#5DA9E9', NULL,
 '{"source":"gramterm","drill":"define","levels":{"basic":{"ask":"gt_define_term"},"middle":{"ask":"gt_define_def"},"advanced":{"ask":"gt_define_ar"}}}', 21),
('skill', 'gt_shahid', 'Shawāhid', 'الشَّوَاهِد', 'Hear the āyah — which term does it witness?', 'quote.bubble', '#D8B657', NULL,
 '{"source":"gramterm","drill":"shahid","levels":{"basic":{"ask":"gt_shahid","maxDepth":0},"middle":{"ask":"gt_shahid","minDepth":1},"advanced":{"ask":"gt_shahid_pick"}}}', 22),
('skill', 'gt_book', 'The books', 'الكُتُب وَالأَبْوَاب', 'Which book, which bāb, treats the term', 'books.vertical', '#B388EB', NULL,
 '{"source":"gramterm","drill":"book","levels":{"basic":{"ask":"gt_book"},"middle":{"ask":"gt_bab"},"advanced":{"ask":"gt_page"}}}', 23),
('skill', 'gt_khilaf', 'Baṣra and Kūfa', 'البَصْرَةُ وَالكُوفَة', 'Ibn al-Anbārī''s Inṣāf — whose position is this?', 'arrow.left.arrow.right', '#E07A5F', NULL,
 '{"source":"gramterm","drill":"khilaf","levels":{"basic":{"ask":"gt_khilaf_whose"},"middle":{"asks":["gt_khilaf_basra","gt_khilaf_kufa"]},"advanced":{"ask":"gt_khilaf_which"}}}', 24),
('skill', 'gt_wazn', 'Ṣarf rules', 'قَوَاعِدُ الأَوْزَان', 'A wazn and the rule that gives it — as the books quote it', 'function', '#4FB3A9', NULL,
 '{"source":"gramterm","drill":"wazn","levels":{"basic":{"ask":"gt_wazn_term"},"middle":{"ask":"gt_wazn_pattern"},"advanced":{"ask":"gt_wazn_rule"}}}', 25),
('skill', 'gt_contrast', 'Confusable pairs', 'المُتَقَابِلَات', 'إنْ or إذا, badal or naʿt — telling the pair apart', 'arrow.triangle.swap', '#F28482', NULL,
 '{"source":"gramterm","drill":"contrast","levels":{"basic":{"ask":"gt_pair"},"middle":{"ask":"gt_pair_which"},"advanced":{"ask":"gt_contested"}}}', 26),
('skill', 'gt_adima', 'ʿUḍayma''s Dirāsāt', 'دِرَاسَاتُ عُضَيْمَة', 'Every Qurʾānic word under its heading — its pattern, its meaning, his notes', 'book.pages', '#F2CC8F', NULL,
 '{"source":"gramterm","drill":"adima","levels":{"basic":{"asks":["adima_pattern","adima_heading"]},"middle":{"asks":["adima_meaning","adima_term"]},"advanced":{"ask":"adima_note"}}}', 27),

('kind', 'gt_category', 'Which branch of the science does this term belong to?', 'إِلَى أَيِّ بَابٍ مِنَ العِلْمِ يَنْتَمِي؟', NULL, NULL, NULL, NULL, NULL, 20),
('kind', 'gt_parent', 'Which heading does this term sit under?', 'تَحْتَ أَيِّ عُنْوَانٍ يَقَعُ؟', NULL, NULL, NULL, NULL, NULL, 21),
('kind', 'gt_sibling', 'Which of these sits beside it, under the same heading?', 'أَيُّهَا يَقَعُ مَعَهُ تَحْتَ العُنْوَانِ نَفْسِه؟', NULL, NULL, NULL, NULL, NULL, 22),
('kind', 'gt_define_term', 'Which term does this definition describe?', 'مَا المُصْطَلَحُ الَّذِي يَحُدُّهُ هَذَا التَّعْرِيف؟', NULL, NULL, NULL, NULL, NULL, 23),
('kind', 'gt_define_def', 'Which is its definition?', 'مَا حَدُّه؟', NULL, NULL, NULL, NULL, NULL, 24),
('kind', 'gt_define_ar', 'Read the Arabic definition — which term is it?', 'اِقْرَأِ الحَدَّ — مَا المُصْطَلَح؟', NULL, NULL, NULL, NULL, NULL, 25),
('kind', 'gt_shahid', 'Listen — which term do the marked words witness?', 'اِسْمَعْ — عَلَى أَيِّ مُصْطَلَحٍ يَشْهَدُ؟', NULL, NULL, NULL, NULL, NULL, 26),
('kind', 'gt_shahid_pick', 'Which of these is a shāhid of the term?', 'أَيُّهَا شَاهِدٌ عَلَيْه؟', NULL, NULL, NULL, NULL, NULL, 27),
('kind', 'gt_book', 'Which book has a bāb on this term?', 'أَيُّ كِتَابٍ عَقَدَ لَهُ بَابًا؟', NULL, NULL, NULL, NULL, NULL, 28),
('kind', 'gt_bab', 'This book — which of these terms has a bāb of its own in it?', 'هَذَا الكِتَاب — أَيُّهَا عَقَدَ لَهُ بَابًا؟', NULL, NULL, NULL, NULL, NULL, 29),
('kind', 'gt_page', 'A page of the book, its term hidden — which term does it treat?', 'صَفْحَةٌ مِنَ الكِتَاب — عَنْ أَيِّ مُصْطَلَحٍ تَتَحَدَّث؟', NULL, NULL, NULL, NULL, NULL, 30),
('kind', 'gt_khilaf_whose', 'Whose position is this — the Kūfans'' or the Baṣrans''?', 'مَذْهَبُ مَنْ هَذَا — الكُوفِيِّينَ أَمِ البَصْرِيِّين؟', NULL, NULL, NULL, NULL, NULL, 31),
('kind', 'gt_khilaf_basra', 'On this question — which is the Baṣrans'' position?', 'فِي هَذِهِ المَسْأَلَة — مَا مَذْهَبُ البَصْرِيِّين؟', NULL, NULL, NULL, NULL, NULL, 32),
('kind', 'gt_khilaf_kufa', 'On this question — which is the Kūfans'' position?', 'فِي هَذِهِ المَسْأَلَة — مَا مَذْهَبُ الكُوفِيِّين؟', NULL, NULL, NULL, NULL, NULL, 33),
('kind', 'gt_khilaf_which', 'A position, its question unnamed — which masʾala is it from?', 'مَذْهَبٌ — فِي أَيِّ مَسْأَلَة؟', NULL, NULL, NULL, NULL, NULL, 34),
('kind', 'gt_wazn_term', 'This rule — which derived noun does it form?', 'هَذِهِ القَاعِدَة — أَيَّ اسْمٍ تَصُوغ؟', NULL, NULL, NULL, NULL, NULL, 35),
('kind', 'gt_wazn_pattern', 'The rule, its wazn hidden — on which wazn?', 'عَلَى أَيِّ وَزْن؟', NULL, NULL, NULL, NULL, NULL, 36),
('kind', 'gt_wazn_rule', 'This wazn in this sense — under which rule?', 'بِأَيِّ قَاعِدَة؟', NULL, NULL, NULL, NULL, NULL, 37),
('kind', 'gt_pair', 'Which term is it paired against?', 'مَا الَّذِي يُقَابِلُه؟', NULL, NULL, NULL, NULL, NULL, 38),
('kind', 'gt_pair_which', 'Of the pair — which one fits this?', 'أَيُّ الاثْنَيْنِ يُنَاسِبُ الوَصْف؟', NULL, NULL, NULL, NULL, NULL, 39),
('kind', 'gt_contested', 'Which two readings contend over this position?', 'أَيُّ وَجْهَيْنِ يَتَنَازَعَانِ المَوْضِع؟', NULL, NULL, NULL, NULL, NULL, 40),
('kind', 'adima_pattern', 'Listen — which pattern is the marked word?', 'اِسْمَعْ — عَلَى أَيِّ صِيغَةٍ جَاءَتِ الكَلِمَة؟', NULL, NULL, NULL, NULL, NULL, 41),
('kind', 'adima_heading', 'Listen — under which heading does ʿUḍayma cite this āyah?', 'اِسْمَعْ — تَحْتَ أَيِّ عُنْوَانٍ ذَكَرَهَا عُضَيْمَة؟', NULL, NULL, NULL, NULL, NULL, 42),
('kind', 'adima_meaning', 'Listen — which meaning does the pattern carry here?', 'اِسْمَعْ — مَا مَعْنَى الصِّيغَةِ هُنَا؟', NULL, NULL, NULL, NULL, NULL, 43),
('kind', 'adima_term', 'Listen — which term names the construction here?', 'اِسْمَعْ — مَا المُصْطَلَحُ هُنَا؟', NULL, NULL, NULL, NULL, NULL, 44),
('kind', 'adima_note', 'Which is ʿUḍayma''s own note on it?', 'مَا مُلَاحَظَةُ عُضَيْمَةَ عَلَيْه؟', NULL, NULL, NULL, NULL, NULL, 45),

('school', 'kufa', 'Kūfan', 'الكُوفِيُّون', 'The grammarians of Kūfa', NULL, '#E07A5F', NULL, NULL, 0),
('school', 'basra', 'Baṣran', 'البَصْرِيُّون', 'The grammarians of Baṣra', NULL, '#5DA9E9', NULL, NULL, 1);
