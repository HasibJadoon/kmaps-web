-- 0040_ar_intake_words.sql
-- The words the intake screens still lacked: the heading over what an item holds, closing it,
-- and the line under each strand that says how much of it is live and how much is newly logged.
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('intake', 'children',     'What it holds',                 'مَا يَضُمُّه',                 NULL, 'list.bullet', NULL, NULL, NULL, 17),
 ('intake', 'close',        'Close',                         'أَغْلِق',                     NULL, 'xmark',       NULL, NULL, NULL, 18),
 ('intake', 'strand_count', '{total} · {live} live · {logged} new', '{total} · {live} مُتَاح · {logged} جَدِيد', NULL, NULL, NULL, NULL, NULL, 19);
