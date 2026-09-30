-- qr_050_drill_levels.sql
--
-- Every Qurʾān drill at three levels, as data: each skill's `extra_json.levels` says what
-- belongs to Level 1, 2 and 3 (the worker reads it; nothing is hard-coded). Adds the
-- verbal-idiom and sense-arc skills.
--
--   irab   L1 core roles · L2 the rest · L3 words the book parses more than one way («ويجوز…»)
--   idiom  by how often the sense recurs in the Qurʾān (Mir): L1 5+ · L2 2–4 · L3 once
--   arc    L1 which rung the root starts from · L2 order the rungs · L3 the long arcs (4+ rungs)
--
-- Apply with `d1 execute --file` (see qr_046: do not `migrations apply` km_quran).
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('level', 'basic',    'Level 1', 'المُسْتَوَى الأَوَّل', 'Foundation — the commonest and the core', 'circle', '#81B29A', NULL, NULL, 0),
('level', 'middle',   'Level 2', 'المُسْتَوَى الثَّانِي', 'Structure — the wider range', 'circle.lefthalf.filled', '#E9C46A', NULL, NULL, 1),
('level', 'advanced', 'Level 3', 'المُسْتَوَى الثَّالِث', 'Depth — the rare, the contested, the whole arc', 'circle.fill', '#E07A5F', NULL, NULL, 2),

('skill', 'irab', 'Iʿrāb', 'الإِعْرَاب', 'Hear the āyah — what is the role of the marked word?', 'point.3.connected.trianglepath.dotted', '#81B29A', NULL,
 '{"source":"irab","levels":{"basic":{"roles":["mubtada","khabar","fail","maful_bih","mudaf_ilayh","naat"]},"middle":{"roles":["hal","tamyiz","badal","maful_mutlaq","naib_fail","munada","zarf","maful_liajlih","tawkid","mustathna","maful_fih","maful_maah"]},"advanced":{"alternative":true}}}', 0),
('skill', 'idiom', 'Verbal idioms', 'التَّعَابِيرُ الفِعْلِيَّة', 'A verb and its particle — what do they mean together, here?', 'link', '#F28482', NULL,
 '{"source":"idiom","levels":{"basic":{"minFreq":5},"middle":{"minFreq":2,"maxFreq":4},"advanced":{"maxFreq":1}}}', 1),
('skill', 'arc', 'Sense arcs', 'مَسَارُ المَعْنَى', 'How a root''s meaning travels — from its first image to its Qurʾānic sense', 'arrow.triangle.branch', '#B388EB', NULL,
 '{"source":"arc","levels":{"basic":{"minSteps":2,"maxSteps":9,"ask":"origin"},"middle":{"minSteps":3,"maxSteps":3,"ask":"order"},"advanced":{"minSteps":4,"maxSteps":20,"ask":"order"}}}', 2),

('kind', 'idiom', 'Listen — what does the marked idiom mean here?', 'اِسْتَمِعْ — مَا مَعْنَى التَّعْبِيرِ هُنَا؟', NULL, NULL, NULL, NULL, NULL, 1),
('kind', 'arc_origin', 'Where does the root''s meaning start?', 'مِنْ أَيْنَ يَبْدَأُ مَعْنَى الجَذْر؟', NULL, NULL, NULL, NULL, NULL, 2),
('kind', 'arc_order', 'Put the arc in order — from the first image to the last sense', 'رَتِّبْ مَسَارَ المَعْنَى', NULL, NULL, NULL, NULL, NULL, 3),

('context', 'meanings', 'Its range of meanings, in the Qurʾān', 'مَعَانِيهِ فِي القُرْآن', NULL, NULL, NULL, NULL, NULL, 0),
('context', 'lane', 'Lane’s Lexicon', 'مُعْجَمُ لِين', NULL, NULL, NULL, NULL, NULL, 1);
