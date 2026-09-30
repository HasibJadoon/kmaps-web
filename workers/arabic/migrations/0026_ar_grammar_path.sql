-- The grammar path: the Arabic path's shape (levels → units → preview / drill / check / review)
-- over the grammar lessons. A track is a discipline at a level — Basic and Advanced Naḥw, Basic
-- and Advanced Ṣarf, Balāgha; its units are the lessons of a teaching book (al-Ghalāyīnī's Jāmiʿ
-- al-durūs; for balāgha, which al-Ghalāyīnī does not teach, the balāgha spine), each with the GT
-- terms it teaches (ar_lesson_term). Per unit: a preview of its terms (definition, three
-- shawāhid, where the classical books treat it — ar_lesson_reading), a drill on its terms (AL's
-- grammar drills, and the scene questions about the same terms), a check across its neighbours,
-- and review (the cards the drills filed). Every rule and every label is data, here; the
-- progress is the learner's own (ar_learner_unit, unit_id = the lesson, band = the track).
--
-- ar_scene_feature_term binds the scene questions (ar_scene_vocab.features_json, keyed by a
-- free-text term_ar) to registry terms, by name and alias; kmaps-web/scripts/map-scene-terms.py
-- fills it (re-run it when scenes are added or the registry grows).
CREATE TABLE IF NOT EXISTS ar_scene_feature_term (
  unit_id     TEXT NOT NULL,             -- ar_scene_vocab.unit_id
  scene_no    INTEGER NOT NULL,
  feature_idx INTEGER NOT NULL,          -- its place in features_json
  term_ar     TEXT NOT NULL,             -- the name the scene gave it
  term_id     TEXT NOT NULL,             -- GT:…
  match_kind  TEXT NOT NULL,             -- exact | head | pattern
  PRIMARY KEY (unit_id, scene_no, feature_idx, term_id)
);
CREATE INDEX IF NOT EXISTS idx_ar_scene_feature_term ON ar_scene_feature_term(term_id);

INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
-- the tracks: a discipline at a level, and the chapters of the book its units are read from
('grammar_track', 'nahw-basic', 'Basic Naḥw', 'النَّحْوُ الأَسَاسِيّ', 'The word, the noun, iʿrāb and the nominatives — al-Ghalāyīnī', 'text.book.closed', '#D8B657', NULL,
 '{"discipline":"NH","level":"basic","spine":"ghalayini_jami_durus","chapters":["LSN:gh:229325","LSN:gh:157276","LSN:gh:13371","LSN:gh:229326"]}', 0),
('grammar_track', 'nahw-advanced', 'Advanced Naḥw', 'النَّحْوُ المُتَقَدِّم', 'The accusatives, the genitives, the followers, the particles', 'text.book.closed', '#E9C46A', NULL,
 '{"discipline":"NH","level":"advanced","after":"nahw-basic","spine":"ghalayini_jami_durus","chapters":["LSN:gh:13372","LSN:gh:13373","LSN:gh:13374","LSN:gh:85007","LSN:gh:157278"]}', 1),
('grammar_track', 'sarf-basic', 'Basic Ṣarf', 'الصَّرْفُ الأَسَاسِيّ', 'The verb, its kinds and how it inflects — al-Ghalāyīnī', 'square.grid.3x3', '#81B29A', NULL,
 '{"discipline":"SF","level":"basic","spine":"ghalayini_jami_durus","chapters":["LSN:gh:85004","LSN:gh:157277"]}', 2),
('grammar_track', 'sarf-advanced', 'Advanced Ṣarf', 'الصَّرْفُ المُتَقَدِّم', 'The noun''s morphology, the shared rules, the verb''s iʿrāb', 'square.grid.3x3', '#4FB3A9', NULL,
 '{"discipline":"SF","level":"advanced","after":"sarf-basic","spine":"ghalayini_jami_durus","chapters":["LSN:gh:85005","LSN:gh:85006","LSN:gh:13370"]}', 3),
('grammar_track', 'balagha', 'Balāgha', 'البَلَاغَة', 'Meaning, clarity and ornament — the three sciences', 'wand.and.stars', '#B388EB', NULL,
 '{"discipline":"BL","level":"basic","spine":"البلاغة","chapters":["LSN:dream.bl.maani","LSN:dream.bl.bayan","LSN:dream.bl.badi"]}', 4),

-- the path's own words
('grammar_path', 'card', 'Grammar path', 'طَرِيقُ النَّحْو', 'Lesson by lesson: meet its terms, drill them, pass the check — and the next opens', 'map', '#D8B657', NULL, NULL, 0),
('grammar_path', 'preview', 'Preview', 'تَمْهِيد', 'Its terms: what each is, three shawāhid, where the books treat it', 'eye', '#5DA9E9', NULL, NULL, 1),
('grammar_path', 'drill', 'Drill', 'تَمَرَّن', 'The lesson''s terms — definitions, shawāhid, the books, the scenes', 'target', '#81B29A', NULL, NULL, 2),
('grammar_path', 'check', 'Lesson check', 'اِخْتِبَار', 'Mixed with the terms beside them — pass it to open the next', 'checkmark.seal', '#B388EB', NULL, NULL, 3),
('grammar_path', 'review', 'Review', 'مُرَاجَعَة', 'What you drilled, back just before you forget it', 'arrow.triangle.2.circlepath', '#F2CC8F', NULL, NULL, 4),
('grammar_path', 'locked', 'Locked', 'مُقْفَل', 'Finish the lesson before it', 'lock.fill', '#8D99AE', NULL, NULL, 5),
('grammar_path', 'track_locked', 'This track opens later', 'لَمْ يُفْتَحْ بَعْد', 'Finish {n}% of {after} first — {done} of {need} lessons so far', 'lock.fill', '#8D99AE', NULL, NULL, 6),
('grammar_path', 'signin', 'Sign in to keep your place', 'سَجِّلِ الدُّخُولَ لِحِفْظِ تَقَدُّمِك', 'Your progress and your review cards are kept when you are signed in', 'person.crop.circle', '#8D99AE', NULL, NULL, 7),
('grammar_path', 'terms', 'Its terms', 'مُصْطَلَحَاتُه', NULL, NULL, NULL, NULL, NULL, 8),
('grammar_path', 'shawahid', 'Shawāhid', 'الشَّوَاهِد', 'From the Qurʾān', NULL, NULL, NULL, NULL, 9),
('grammar_path', 'treated_in', 'Treated in', 'يُنْظَرُ فِي', 'The classical books', NULL, NULL, NULL, NULL, 10),
('grammar_path', 'irab_shahid', 'As the iʿrāb books parse it', 'كَمَا أَعْرَبَتْهُ كُتُبُ الإِعْرَاب', NULL, NULL, NULL, NULL, NULL, 11),
('grammar_path', 'srs_deck', 'Arabic — grammar', 'العَرَبِيَّة — النَّحْو', 'Terms, shawāhid and rules met on the grammar path', NULL, NULL, NULL, NULL, 12),

-- what a drill and a check are made of, per track level: AL's sources and asks (the three
-- levels of each), and the scene questions on the same terms
('grammar_drill', 'drill', 'Drill', NULL, NULL, NULL, NULL, NULL,
 '{"basic":[{"source":"define","ask":"gt_define_term"},{"source":"shahid","ask":"gt_shahid"},{"source":"tree","ask":"gt_category"},{"source":"book","ask":"gt_book"},{"source":"contrast","ask":"gt_pair"},{"source":"wazn","ask":"gt_wazn_term"},{"source":"khilaf","ask":"gt_khilaf_whose"},{"source":"adima","ask":"adima_pattern"},{"source":"scene"}],"advanced":[{"source":"define","ask":"gt_define_def"},{"source":"shahid","ask":"gt_shahid"},{"source":"tree","ask":"gt_parent"},{"source":"book","ask":"gt_bab"},{"source":"contrast","ask":"gt_pair_which"},{"source":"wazn","ask":"gt_wazn_pattern"},{"source":"khilaf","ask":"gt_khilaf_basra"},{"source":"adima","ask":"adima_meaning"},{"source":"adima","ask":"adima_term"},{"source":"scene"}]}', 0),
('grammar_drill', 'check', 'Check', NULL, NULL, NULL, NULL, NULL,
 '{"basic":[{"source":"define","ask":"gt_define_def"},{"source":"shahid","ask":"gt_shahid"},{"source":"tree","ask":"gt_parent"},{"source":"book","ask":"gt_bab"},{"source":"contrast","ask":"gt_pair_which"},{"source":"adima","ask":"adima_heading"},{"source":"scene"}],"advanced":[{"source":"define","ask":"gt_define_ar"},{"source":"shahid","ask":"gt_shahid_pick"},{"source":"tree","ask":"gt_sibling"},{"source":"book","ask":"gt_page"},{"source":"contrast","ask":"gt_contested"},{"source":"wazn","ask":"gt_wazn_rule"},{"source":"khilaf","ask":"gt_khilaf_which"},{"source":"adima","ask":"adima_note"},{"source":"scene"}]}', 1),

('setting', 'grammar_pass_score', 'A grammar lesson is done when its check scores at least this (percent)', NULL, NULL, NULL, NULL, 80, NULL, 10),
('setting', 'grammar_unlock_share', 'An advanced track opens when this share of its basic track is done (percent)', NULL, NULL, NULL, NULL, 80, NULL, 11),
('setting', 'grammar_preview_shawahid', 'Shawāhid shown per term in a lesson preview', NULL, NULL, NULL, NULL, 3, NULL, 12),
('setting', 'grammar_drill_size', 'Drills in a lesson''s drill round', NULL, NULL, NULL, NULL, 10, NULL, 13),
('setting', 'grammar_check_size', 'Drills in a lesson check', NULL, NULL, NULL, NULL, 12, NULL, 14),
('setting', 'grammar_scene_share', 'At most this many scene questions in a round', NULL, NULL, NULL, NULL, 3, NULL, 15),

-- each ask's instruction (the drill's kind label, keyed by the ask)
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
