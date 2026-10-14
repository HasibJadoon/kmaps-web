-- 0043_ar_intake_path.sql
--
-- The intake as a learning PATH, not only a queue. Each queued item sits in a lane and has a rank;
-- the lanes are taken in turn, so every stretch of the path mixes listening, grammar, classical
-- prose, poetry and tafsīr, climbing from the middle level to the super-advanced a little each day.
-- The path is written by kmaps-resources scripts/intake-pipeline/path_rank.py (re-runnable); the
-- driver, the queue file and the screens' "Next up" all follow path_rank, then priority and level.

ALTER TABLE ar_intake_item ADD COLUMN path_lane TEXT;      -- ar_practice_label scope 'intake_lane'
ALTER TABLE ar_intake_item ADD COLUMN path_rank INTEGER;   -- 1 = first; NULL = not on the path yet
CREATE INDEX IF NOT EXISTS idx_ar_intake_path ON ar_intake_item(path_rank);

INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('intake_lane', 'listen',  'Listening',       'الاسْتِمَاع',      'Drama and stories in fuṣḥā, middle to advanced',                 'headphones',           '#E07A5F', 1, '{"weight":2}', 1),
 ('intake_lane', 'grammar', 'Grammar',         'النَّحْوُ وَالصَّرْف',  'From al-Ājurrūmiyya to the Alfiyya, and balāgha',                'textformat.abc',       '#5DA9E9', 2, '{"weight":1}', 2),
 ('intake_lane', 'prose',   'Classical prose', 'النَّثْرُ التُّرَاثِيّ',  'The books themselves, read aloud: short and clear first',          'book',                 '#D8B657', 3, '{"weight":2}', 3),
 ('intake_lane', 'poetry',  'Poetry',          'الشِّعْر',          'Recited poems: the short and famous first, the Muʿallaqāt later', 'text.quote',           '#B388EB', 4, '{"weight":1}', 4),
 ('intake_lane', 'tafsir',  'Tafsīr',          'التَّفْسِير',        'Tafsīr and the Qurʾānic sciences',                                'book.closed',          '#2A9D8F', 5, '{"weight":1}', 5),
 ('intake_lane', 'volume',  'Easy listening',  'اسْتِمَاعٌ سَهْل',    'Slow, clear fuṣḥā for extra hours — after the path',             'ear',                  '#81B29A', 6, '{"weight":0}', 6),
 ('intake', 'path',      'Path',      'المَسَار',   'Taken lane by lane, a little of each every day', 'point.topleft.down.to.point.bottomright.curvepath', NULL, NULL, NULL, 26),
 ('intake', 'path_rank', 'Step {n}',  'الخُطْوَة {n}', NULL, NULL, NULL, NULL, NULL, 27);
