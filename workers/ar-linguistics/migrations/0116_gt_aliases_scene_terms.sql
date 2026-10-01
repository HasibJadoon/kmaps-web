-- km_arabic_linguistic · 0116 · more of the names the scenes call the terms by
--
-- Continues 0111. The scene questions (km_arabic ar_scene_vocab.features_json) name what they ask
-- about as a teacher would — «السين للاستقبال», «واو الحال», «اللام المزحلقة», «همزة الوصل» — and
-- a thousand of them matched no registry name. These are the names among them that mean one term
-- (the particle-meaning, mood, process or form the registry already holds), as variants of it, so
-- a lookup by name lands on the term. alias_bare is alias_raw without its vowels, as in 0111.
-- Where a name is the same thing seen from naḥw and from balāgha («اللام المزحلقة», «إنّما للحصر»,
-- «ليت للتمني»), it is a variant of both, and the reader's discipline picks. A tool that only
-- belongs to a term's bāb (ليس → kāna's sisters, عسى → kāda's) is not a name of it and is not
-- here — kmaps-web/scripts/map-scene-terms.py binds those questions itself (SCENE_NAMES).
--
-- Applied by hand (the ledger is out of step): d1 execute --file, then
--   INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0116_gt_aliases_scene_terms.sql');
INSERT OR IGNORE INTO ar_ling_gram_term_alias (alias_bare, term_id, category_key, alias_raw, alias_lang, alias_kind, source) VALUES
('السين للاستقبال',     'GT:harf_maani:istiqbal',             'harf_maani',     'السين للاستقبال', 'ar', 'variant', 'scene_terms'),
('السين للمستقبل',      'GT:harf_maani:istiqbal',             'harf_maani',     'السين للمستقبل', 'ar', 'variant', 'scene_terms'),
('سوف للاستقبال',       'GT:harf_maani:istiqbal',             'harf_maani',     'سوف للاستقبال', 'ar', 'variant', 'scene_terms'),
('سوف للمستقبل',        'GT:harf_maani:istiqbal',             'harf_maani',     'سوف للمستقبل', 'ar', 'variant', 'scene_terms'),
('اللام المزحلقة',      'GT:harf_maani:tawkid',               'harf_maani',     'اللام المزحلقة', 'ar', 'variant', 'scene_terms'),
('اللام المزحلقة',      'GT:balagha_maani:tawkid_inna_lam',   'balagha_maani',  'اللام المزحلقة', 'ar', 'variant', 'scene_terms'),
('لام الابتداء',        'GT:harf_maani:tawkid',               'harf_maani',     'لام الابتداء', 'ar', 'variant', 'scene_terms'),
('نون التوكيد',         'GT:harf_maani:tawkid',               'harf_maani',     'نون التوكيد', 'ar', 'variant', 'scene_terms'),
('واو الحال',           'GT:harf_maani:haliyya',              'harf_maani',     'واو الحال', 'ar', 'variant', 'scene_terms'),
('واو المعية',          'GT:harf_maani:maiyya',               'harf_maani',     'واو المعية', 'ar', 'variant', 'scene_terms'),
('حتى الابتدائية',      'GT:harf_maani:ibtida',               'harf_maani',     'حتى الابتدائية', 'ar', 'variant', 'scene_terms'),
('ألا الاستفتاحية',     'GT:harf_maani:ibtida',               'harf_maani',     'ألا الاستفتاحية', 'ar', 'variant', 'scene_terms'),
('حتى التعليلية',       'GT:harf_maani:taliliyya',            'harf_maani',     'حتى التعليلية', 'ar', 'variant', 'scene_terms'),
('إذ التعليلية',        'GT:harf_maani:taliliyya',            'harf_maani',     'إذ التعليلية', 'ar', 'variant', 'scene_terms'),
('هلا للتحضيض',         'GT:harf_maani:tahdid',               'harf_maani',     'هلّا للتحضيض', 'ar', 'variant', 'scene_terms'),
('قد التحقيقية',        'GT:harf_maani:tahqiq',               'harf_maani',     'قد التحقيقية', 'ar', 'variant', 'scene_terms'),
('بل الإضرابية',        'GT:harf_maani:idrab',                'harf_maani',     'بل الإضرابية', 'ar', 'variant', 'scene_terms'),
('بل للإضراب',          'GT:harf_maani:idrab',                'harf_maani',     'بل للإضراب', 'ar', 'variant', 'scene_terms'),
('النفي بلن',           'GT:harf_maani:nafiya',               'harf_maani',     'النفي بلن', 'ar', 'variant', 'scene_terms'),
('النفي بلن',           'GT:pos:nafy_harf',                   'pos',            'النفي بلن', 'ar', 'variant', 'scene_terms'),
('النفي بما',           'GT:harf_maani:nafiya',               'harf_maani',     'النفي بما', 'ar', 'variant', 'scene_terms'),
('النفي بما',           'GT:pos:nafy_harf',                   'pos',            'النفي بما', 'ar', 'variant', 'scene_terms'),
('إنما للحصر',          'GT:harf_maani:hasr',                 'harf_maani',     'إنّما للحصر', 'ar', 'variant', 'scene_terms'),
('إنما للحصر',          'GT:balagha_maani:qasr_innama',       'balagha_maani',  'إنّما للحصر', 'ar', 'variant', 'scene_terms'),
('النفي والاستثناء',    'GT:harf_maani:hasr',                 'harf_maani',     'النفي والاستثناء', 'ar', 'variant', 'scene_terms'),
('النفي والاستثناء',    'GT:balagha_maani:qasr_nafy_istithna','balagha_maani',  'النفي والاستثناء', 'ar', 'variant', 'scene_terms'),
('ليت للتمني',          'GT:kalam_kind:tamanni',              'kalam_kind',     'ليت للتمني', 'ar', 'variant', 'scene_terms'),
('ليت للتمني',          'GT:balagha_maani:tamanni',           'balagha_maani',  'ليت للتمني', 'ar', 'variant', 'scene_terms'),
('لعل للترجي',          'GT:balagha_maani:tarajji',           'balagha_maani',  'لعلّ للترجّي', 'ar', 'variant', 'scene_terms'),
('كم الاستفهامية',      'GT:kalam_kind:istifham',             'kalam_kind',     'كم الاستفهامية', 'ar', 'variant', 'scene_terms'),
('أي الاستفهامية',      'GT:kalam_kind:istifham',             'kalam_kind',     'أيّ الاستفهامية', 'ar', 'variant', 'scene_terms'),
('تاء القسم',           'GT:kalam_kind:qasam',                'kalam_kind',     'تاء القسم', 'ar', 'variant', 'scene_terms'),
('أسلوب المدح',         'GT:kalam_kind:madh_dhamm',           'kalam_kind',     'أسلوب المدح', 'ar', 'variant', 'scene_terms'),
('أسلوب الذم',          'GT:kalam_kind:madh_dhamm',           'kalam_kind',     'أسلوب الذمّ', 'ar', 'variant', 'scene_terms'),
('صيغة التعجب',         'GT:kalam_kind:taajjub',              'kalam_kind',     'صيغة التعجب', 'ar', 'variant', 'scene_terms'),
('همزة الوصل',          'GT:phonotactic:ibtida',              'phonotactic',    'همزة الوصل', 'ar', 'variant', 'scene_terms'),
('تسهيل الهمزة',        'GT:phonotactic:takhfif_hamza',       'phonotactic',    'تسهيل الهمزة', 'ar', 'variant', 'scene_terms'),
('جموع التكسير',        'GT:noun_process:jam_taksir',         'noun_process',   'جموع التكسير', 'ar', 'variant', 'scene_terms'),
('الإضافة غير الحقيقية','GT:idafa_kind:lafziya',              'idafa_kind',     'الإضافة غير الحقيقية', 'ar', 'variant', 'scene_terms'),
('الإضافة غير المحضة',  'GT:idafa_kind:lafziya',              'idafa_kind',     'الإضافة غير المحضة', 'ar', 'variant', 'scene_terms'),
('الوزن الصرفي',        'GT:form_tier:mizan_sarfi',           'form_tier',      'الوزن الصرفي', 'ar', 'variant', 'scene_terms'),
('الجزم',               'GT:mood:jussive',                    'mood',           'الجزم', 'ar', 'variant', 'scene_terms'),
('جزم المضارع',         'GT:mood:jussive',                    'mood',           'جزم المضارع', 'ar', 'variant', 'scene_terms'),
('نصب المضارع',         'GT:mood:subjunctive',                'mood',           'نصب المضارع', 'ar', 'variant', 'scene_terms'),
('همزة السلب',          'GT:sigha_maani:salb',                'sigha_maani',    'همزة السلب', 'ar', 'variant', 'scene_terms'),
('التأنيث',             'GT:gender:feminine',                 'gender',         'التأنيث', 'ar', 'variant', 'scene_terms'),
('الأعداد',             'GT:pos:adad',                        'pos',            'الأعداد', 'ar', 'variant', 'scene_terms'),
('حروف الجر',           'GT:pos:harf_jarr',                   'pos',            'حروف الجر', 'ar', 'variant', 'scene_terms');
