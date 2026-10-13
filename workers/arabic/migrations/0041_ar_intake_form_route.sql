-- 0041_ar_intake_form_route.sql
--
-- Two more tags on an intake item.
--   form  — what the recording is: the original text itself (recited or read straight through),
--           told (dubbed, dramatised or narrated), or explained (a lesson about a text).
--   route — which domain takes it on: Arabic learning (AR), worldview (WV), or both. A work that
--           holds a worldview — al-Ghazālī, Ibn Khaldūn, the jāhilī poets the Qurʾān answers — is
--           filed as a source in km_worldview; the intake row keeps only its typed ref
--           (wv_source_ref = 'WV:<wv_sources.id>'), never a copy.

ALTER TABLE ar_intake_item ADD COLUMN form TEXT NOT NULL DEFAULT 'explained';
ALTER TABLE ar_intake_item ADD COLUMN route TEXT NOT NULL DEFAULT 'ar';
ALTER TABLE ar_intake_item ADD COLUMN wv_source_ref TEXT;
CREATE INDEX IF NOT EXISTS idx_ar_intake_route ON ar_intake_item(route, form);

INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('intake_form', 'original',  'Original text', 'النَّصُّ نَفْسُه', 'The work itself, recited or read straight through',       'scroll',              '#D8B657', 1, NULL, 1),
 ('intake_form', 'told',      'Told',          'مَرْوِيّ',        'Dubbed, dramatised or narrated — content, not a lesson', 'theatermasks',        '#E07A5F', 2, NULL, 2),
 ('intake_form', 'explained', 'Explained',     'مَشْرُوح',        'A lesson or talk about a text',                          'person.wave.2',       '#8D99AE', 3, NULL, 3),
 ('intake_route', 'ar',   'Arabic',            'العَرَبِيَّة',         'Taken on for language learning',                       'character.book.closed.ar', '#5DA9E9', 1, NULL, 1),
 ('intake_route', 'wv',   'Worldview',         'الرُّؤْيَةُ الكَوْنِيَّة',  'Holds a worldview: filed as a worldview source',        'globe.europe.africa',      '#2A9D8F', 2, NULL, 2),
 ('intake_route', 'both', 'Arabic + worldview','العَرَبِيَّةُ وَالرُّؤْيَة', 'A language model and a worldview source',              'square.split.2x1',         '#B388EB', 3, NULL, 3),
 ('intake', 'form',  'Form',  'الشَّكْل', 'Original text, told, or explained', NULL, NULL, NULL, NULL, 20),
 ('intake', 'route', 'Route', 'الوِجْهَة', 'Arabic learning, worldview, or both', NULL, NULL, NULL, NULL, 21),
 ('intake', 'wv_source', 'Worldview source', 'مَصْدَرُ الرُّؤْيَة', NULL, 'globe.europe.africa', NULL, NULL, NULL, 22);

-- What is already logged: stories, cartoons and drama are told; lessons stay explained; the
-- audiobooks and straight readings are the original text. What a playlist holds takes its form.
UPDATE ar_intake_item SET form = 'told' WHERE parent_id IS NULL AND genre_ref = 'AG:qissa';
UPDATE ar_intake_item SET form = 'original' WHERE parent_id IS NULL AND (
     note LIKE '%audiobook%' OR note LIKE '%read aloud%' OR note LIKE '%audio reading%' OR note LIKE '%reading of%'
  OR title_ar LIKE '%كتاب مسموع%' OR title_ar LIKE '%مسموع%' OR id = 'IN:yt:PLJ3gpAj_2kuLvOuDSrnke-knGzaxBU0cd');
UPDATE ar_intake_item SET form = (SELECT p.form FROM ar_intake_item p WHERE p.id = ar_intake_item.parent_id)
 WHERE parent_id IS NOT NULL;
