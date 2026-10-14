-- 0048_ar_expert_reference.sql — the words of the expert reference (/ar/expert-terms): expert terms only.
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('expert', 'title', 'Expert reference', 'مَرْجِعُ المُتَخَصِّص', 'The fine balāgha, naḥw and ṣarf the commentators argue over — met in the scenes, kept to read, not drilled', 'books.vertical', '#B388EB', NULL, NULL, 1),
 ('expert', 'met',   'Met {n} times in the scenes', 'وَرَدَ {n} مَرَّةً فِي المَشَاهِد', NULL, NULL, NULL, NULL, NULL, 2),
 ('expert', 'not_yet', 'Not met yet', 'لَمْ يَرِدْ بَعْد', 'It will appear here when a scene uses it', NULL, NULL, NULL, NULL, 3),
 ('expert_discipline', 'BL', 'Balāgha', 'البَلَاغَة', NULL, NULL, '#B388EB', NULL, NULL, 1),
 ('expert_discipline', 'NH', 'Naḥw',    'النَّحْو',   NULL, NULL, '#5DA9E9', NULL, NULL, 2),
 ('expert_discipline', 'SF', 'Ṣarf',    'الصَّرْف',   NULL, NULL, '#81B29A', NULL, NULL, 3),
 ('expert_discipline', 'DL', 'The lexicographers', 'أُصُولُ المُعْجَم', NULL, NULL, '#D8B657', NULL, NULL, 4);
