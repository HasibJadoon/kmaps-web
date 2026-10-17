-- More scene word drills (routes/scenes.ts sarfDrills): the three forms together, matching sets, the whole range of a
-- word's meanings, and fixed or derived. Plain English first, the Arabic term beside it.
INSERT INTO ar_practice_label (scope, key, label, label_ar, sort) VALUES
  ('ask', 'triad',        'Which set is right? Past · present · action noun', 'أَيُّ المَجْمُوعَاتِ صَحِيحَةٌ؟ المَاضِي · المُضَارِعُ · المَصْدَرُ', 9),
  ('ask', 'range',        'Pick every meaning this word can have',            'اِخْتَرْ كُلَّ مَعَانِي الكَلِمَةِ',                       10),
  ('ask', 'derivation',   'Is this noun fixed, or derived from a verb?',      'هَلِ الاِسْمُ جَامِدٌ أَمْ مُشْتَقٌّ؟',                     11),
  ('ask', 'opt_jamid',    'جامد · fixed, not made from a verb',               'جَامِد',  12),
  ('ask', 'opt_mushtaqq', 'مشتق · derived, made from a verb',                 'مُشْتَقّ', 13),
  ('ask', 'pairs_number', 'Match each singular with its plural',              'صِلْ كُلَّ مُفْرَدٍ بِجَمْعِهِ',                           14),
  ('ask', 'pairs_tense',  'Match each past form with its present form',       'صِلْ كُلَّ مَاضٍ بِمُضَارِعِهِ',                            15),
  ('ask', 'pairs_masdar', 'Match each verb with its action noun',             'صِلْ كُلَّ فِعْلٍ بِمَصْدَرِهِ',                             16)
ON CONFLICT (scope, key) DO UPDATE SET label = excluded.label, label_ar = excluded.label_ar, sort = excluded.sort;
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content';

-- a derived noun's source verb is looked up by its lemma (its forms may sit in another episode)
CREATE INDEX IF NOT EXISTS idx_ar_scene_word_lemma ON ar_scene_word (word_class, lemma_ar);
INSERT INTO ar_practice_label (scope, key, label, label_ar, sort) VALUES
  ('ask', 'triad_source', 'The verb this word comes from: which set is right? Past · present · action noun', 'الفِعْلُ الَّذِي اشْتُقَّتْ مِنْهُ الكَلِمَةُ: المَاضِي · المُضَارِعُ · المَصْدَرُ', 17),
  ('ask', 'range_source', 'The verb this word comes from: pick every meaning it can have', 'الفِعْلُ الَّذِي اشْتُقَّتْ مِنْهُ الكَلِمَةُ: اِخْتَرْ كُلَّ مَعَانِيهِ', 18)
ON CONFLICT (scope, key) DO UPDATE SET label = excluded.label, label_ar = excluded.label_ar, sort = excluded.sort;
UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content';
