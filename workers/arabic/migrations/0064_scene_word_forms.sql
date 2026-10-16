-- The questions of a scene's word drills (routes/scenes.ts sarfDrills): what a verb or noun means in its line, and its
-- forms. Plain English first, the Arabic term after. The forms themselves sit in ar_scene_word.sarf_json.
INSERT INTO ar_practice_label (scope, key, label, label_ar, sort) VALUES
  ('ask', 'verb_meaning', 'What does the marked verb mean here?',            'مَا مَعْنَى الفِعْلِ هُنَا؟', 1),
  ('ask', 'madi',         'Its past form — "he did" (māḍī)',                  'مَا المَاضِي؟',            2),
  ('ask', 'mudari',       'Its present form — "he does" (muḍāriʿ)',           'مَا المُضَارِعُ؟',          3),
  ('ask', 'masdar',       'Its action noun — "the doing" (maṣdar)',           'مَا المَصْدَرُ؟',           4),
  ('ask', 'noun_meaning', 'What does the marked word mean here?',             'مَا مَعْنَى الكَلِمَةِ هُنَا؟', 5),
  ('ask', 'plural',       'Its plural — more than two (jamʿ)',                'مَا الجَمْعُ؟',             6),
  ('ask', 'singular',     'Its singular — just one (mufrad)',                 'مَا المُفْرَدُ؟',            7),
  ('ask', 'from_verb',    'Which verb does this word come from?',             'مِنْ أَيِّ فِعْلٍ هِيَ؟',      8)
ON CONFLICT (scope, key) DO UPDATE SET label = excluded.label, label_ar = excluded.label_ar, sort = excluded.sort;

UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content';

-- a scene's round holds every word's forms as well as its lines: room for them
UPDATE ar_practice_label SET extra_json = json_set(extra_json, '$.max', 140) WHERE scope = 'class_node' AND key = 'scenes';
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content';

-- an action noun's plural, where the plural is in common use (أَمْر → أُمُور, عَمَل → أَعْمال)
INSERT INTO ar_practice_label (scope, key, label, label_ar, sort) VALUES
  ('ask', 'masdar_plural', 'The plural of this action noun (jamʿ al-maṣdar)', 'مَا جَمْعُ هٰذَا المَصْدَرِ؟', 5)
ON CONFLICT (scope, key) DO UPDATE SET label = excluded.label, label_ar = excluded.label_ar, sort = excluded.sort;
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content';
