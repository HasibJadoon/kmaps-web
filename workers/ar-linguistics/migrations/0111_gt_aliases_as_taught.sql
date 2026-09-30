-- km_arabic_linguistic · 0111 · the names the lessons call the terms by
--
-- The scene exercises (km_arabic ar_scene_vocab.features_json) name the feature a question is
-- about in the words a teacher uses — «المبني للمجهول», «لا الناهية», «النفي بلم», «الشرط بلو» —
-- not in the registry's headword. These are those names, as variants of the terms they are, so
-- a lookup by name (the scene → term mapping, a search) lands on the term. Only names that
-- mean one term are here; a name that could be several («الإضافة», «النفي بلا») is left out.
INSERT OR IGNORE INTO ar_ling_gram_term_alias (alias_bare, term_id, category_key, alias_raw, alias_lang, alias_kind, source) VALUES
('المبني للمجهول',      'GT:voice:passive',                  'voice',          'المبنيّ للمجهول', 'ar', 'variant', 'as_taught'),
('الفعل المبني للمجهول', 'GT:voice:passive',                  'voice',          'الفعل المبنيّ للمجهول', 'ar', 'variant', 'as_taught'),
('المبني للمعلوم',      'GT:voice:active',                   'voice',          'المبنيّ للمعلوم', 'ar', 'variant', 'as_taught'),
('لا الناهية',          'GT:harf_maani:nahiya',              'harf_maani',     'لا الناهية', 'ar', 'variant', 'as_taught'),
('النهي بلا',           'GT:harf_maani:nahiya',              'harf_maani',     'النهي بلا', 'ar', 'variant', 'as_taught'),
('النفي بلم',           'GT:harf_maani:lam_jazim',           'harf_maani',     'النفي بلم', 'ar', 'variant', 'as_taught'),
('لم + المضارع',        'GT:harf_maani:lam_jazim',           'harf_maani',     'لم + المضارع', 'ar', 'variant', 'as_taught'),
('الشرط',               'GT:sentence_class:shartiyya',       'sentence_class', 'الشرط', 'ar', 'variant', 'as_taught'),
('الشرط بلو',           'GT:shart_tool:law',                 'shart_tool',     'الشرط بلو', 'ar', 'variant', 'as_taught'),
('الشرط بإذا',          'GT:shart_tool:idha',                'shart_tool',     'الشرط بإذا', 'ar', 'variant', 'as_taught'),
('الشرط بإن',           'GT:shart_tool:in',                  'shart_tool',     'الشرط بإن', 'ar', 'variant', 'as_taught'),
('التقديم',             'GT:balagha_maani:taqdim_takhir',    'balagha_maani',  'التقديم', 'ar', 'variant', 'as_taught'),
('التقديم والتأخير',    'GT:balagha_maani:taqdim_takhir',    'balagha_maani',  'التقديم والتأخير', 'ar', 'variant', 'as_taught'),
('تقديم المفعول',       'GT:balagha_maani:taqdim_maful',     'balagha_maani',  'تقديم المفعول', 'ar', 'variant', 'as_taught'),
('التكرار',             'GT:balagha_maani:itnab_takrar',     'balagha_maani',  'التكرار', 'ar', 'variant', 'as_taught'),
('حرف الإضراب',         'GT:harf_maani:idrab',               'harf_maani',     'حرف الإضراب', 'ar', 'variant', 'as_taught'),
('الإضراب',             'GT:harf_maani:idrab',               'harf_maani',     'الإضراب', 'ar', 'variant', 'as_taught'),
('الباء الزائدة',       'GT:harf_maani:zaida',               'harf_maani',     'الباء الزائدة', 'ar', 'variant', 'as_taught'),
('الحرف الزائد',        'GT:harf_maani:zaida',               'harf_maani',     'الحرف الزائد', 'ar', 'variant', 'as_taught'),
('اللام الموطئة للقسم', 'GT:pos:lam_qasam',                  'pos',            'اللام الموطّئة للقسم', 'ar', 'variant', 'as_taught'),
('همزة الاستفهام',      'GT:kalam_kind:istifham',            'kalam_kind',     'همزة الاستفهام', 'ar', 'variant', 'as_taught'),
('أداة الاستفهام',      'GT:kalam_kind:istifham',            'kalam_kind',     'أداة الاستفهام', 'ar', 'variant', 'as_taught'),
('الدعاء',              'GT:balagha_maani:amr_dua',          'balagha_maani',  'الدعاء', 'ar', 'variant', 'as_taught'),
('حرف النفي',           'GT:pos:nafy_harf',                  'pos',            'حرف النفي', 'ar', 'variant', 'as_taught'),
('أداة الشرط',          'GT:sentence_class:adat_shart',      'sentence_class', 'أداة الشرط', 'ar', 'variant', 'as_taught'),
('جواب الشرط',          'GT:sentence_class:jawab_shart',     'sentence_class', 'جواب الشرط', 'ar', 'variant', 'as_taught'),
('جواب القسم',          'GT:irab_role:jawab_qasam',          'irab_role',      'جواب القسم', 'ar', 'variant', 'as_taught'),
('القسم',               'GT:kalam_kind:qasam',               'kalam_kind',     'القسم', 'ar', 'variant', 'as_taught'),
('لو الامتناعية',       'GT:shart_tool:law',                 'shart_tool',     'لو الامتناعية', 'ar', 'variant', 'as_taught'),
('التعريف بالإضافة',    'GT:balagha_maani:tarif_bil_idafa',  'balagha_maani',  'التعريف بالإضافة', 'ar', 'variant', 'as_taught');
