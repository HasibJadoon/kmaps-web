-- Fixing any drill: every drill carries a universal id (its module and its id — QR:questions:QR:Q:40:1:03),
-- shown on the drill's flag sheet and on each report, and a reviewer finds any drill by that id or by
-- its words, corrects the rows it is built from (/qr|ar/drill/source), refreshes the copies already
-- filed to review and to classes, or removes it for everyone.
--
--   scope 'drill_fix'    the words of finding and fixing a drill
--   scope 'drill_field'  what each editable column is called, keyed <table>.<column>

UPDATE core_app_label SET detail = 'Drills reported, and any drill found by its id or its words — fixed or removed'
 WHERE scope = 'room' AND key = 'flagged';

INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('drill_fix', 'id',          NULL, 'Drill ID',                 'رقم التمرين',          NULL, 'number', NULL, NULL, 1),
('drill_fix', 'copy',        NULL, 'Copy',                     'انسخ',                 NULL, 'doc.on.doc', NULL, NULL, 2),
('drill_fix', 'copied',      NULL, 'Copied',                   'نُسخ',                 NULL, 'checkmark', NULL, NULL, 3),
('drill_fix', 'fix',         NULL, 'Fix this drill',           'أصلح هذا التمرين',     NULL, 'wrench.and.screwdriver.fill', '#81B29A', NULL, 4),
('drill_fix', 'search',      NULL, 'Find a drill — its ID or its words', 'ابحث عن تمرين — برقمه أو بكلماته', NULL, 'magnifyingglass', NULL, NULL, 5),
('drill_fix', 'no_results',  NULL, 'No drill found',           'لم يوجد تمرين',        NULL, 'questionmark.circle', NULL, NULL, 6),
('drill_fix', 'source',      NULL, 'What it is built from',    'ممّ بُني',             NULL, 'tablecells', NULL, NULL, 7),
('drill_fix', 'derived',     NULL, 'Built when dealt — fix it in {tables}', 'يُبنى عند العرض — أصلحه في {tables}', NULL, 'arrow.triangle.branch', NULL, NULL, 8),
('drill_fix', 'preview',     NULL, 'As it is dealt now',       'كما يُعرض الآن',       NULL, 'eye', NULL, NULL, 9),
('drill_fix', 'save',        NULL, 'Save',                     'احفظ',                 NULL, 'checkmark.circle.fill', '#81B29A', NULL, 10),
('drill_fix', 'saved',       NULL, 'Saved — dealt corrected from now on', 'حُفظ — يُعرض مصحّحًا من الآن', NULL, 'checkmark.seal.fill', '#81B29A', NULL, 11),
('drill_fix', 'refreshed',   NULL, '{n} copies already filed were corrected too', 'وصُحّحت {n} نسخ محفوظة', NULL, 'arrow.triangle.2.circlepath', NULL, NULL, 12),
('drill_fix', 'kept',        NULL, 'Copies already filed to review keep the old text', 'النسخ المحفوظة في المراجعة تبقى كما كانت', NULL, 'info.circle', NULL, NULL, 13),
('drill_fix', 'remove',      NULL, 'Remove for everyone',      'احذفه للجميع',          NULL, 'trash.fill', '#E07A5F', NULL, 14),
('drill_fix', 'removed',     NULL, 'Removed for everyone',     'محذوف للجميع',          NULL, 'trash', '#E07A5F', NULL, 15),
('drill_fix', 'restore',     NULL, 'Restore',                  'أعده',                  NULL, 'arrow.uturn.backward.circle.fill', '#5DA9E9', NULL, 16),
('drill_fix', 'json',        NULL, 'JSON',                     'JSON',                  'Must stay valid JSON', 'curlybraces', NULL, NULL, 17),
('drill_fix', 'failed',      NULL, 'Could not save — {why}',   'تعذّر الحفظ — {why}',   NULL, 'exclamationmark.triangle.fill', '#E07A5F', NULL, 18),
('drill_fix', 'not_found',   NULL, 'No drill has this ID',     'لا تمرين بهذا الرقم',    NULL, 'questionmark.circle', NULL, NULL, 19),
('drill_fix', 'reviewers',   NULL, 'Only a reviewer can fix drills', 'إصلاح التمارين للمراجِع فقط', NULL, 'lock.fill', NULL, NULL, 20);

INSERT OR REPLACE INTO core_app_label (scope, key, parent, label, label_ar, detail, icon, color, extra_json, sort) VALUES
('drill_field', 'qr_study_question.options_json',   NULL, 'Question, options and answer', 'السؤال والخيارات والجواب', '{ask_en, interaction, options[], correct[], explain_en}', NULL, NULL, NULL, 1),
('drill_field', 'qr_study_question.status',         NULL, 'Status',                 'الحالة',          'live — dealt · draft — not dealt', NULL, NULL, NULL, 2),
('drill_field', 'qr_tafsir_question.question_en',   NULL, 'Question',               'السؤال',          NULL, NULL, NULL, NULL, 3),
('drill_field', 'qr_tafsir_question.options_json',  NULL, 'Options',                'الخيارات',        'A list of the options', NULL, NULL, NULL, 4),
('drill_field', 'qr_tafsir_question.correct_json',  NULL, 'Right options',          'الخيارات الصحيحة', 'Their places in the list, from 0', NULL, NULL, NULL, 5),
('drill_field', 'qr_tafsir_question.explain_en',    NULL, 'Explanation',            'الشرح',           NULL, NULL, NULL, NULL, 6),
('drill_field', 'qr_tafsir_question.status',        NULL, 'Status',                 'الحالة',          'live — dealt · draft — not dealt', NULL, NULL, NULL, 7),
('drill_field', 'qr_tafsir_drill_item.text',        NULL, 'Text',                   'النصّ',           NULL, NULL, NULL, NULL, 8),
('drill_field', 'qr_tafsir_drill_item.answer',      NULL, 'Answer',                 'الجواب',          NULL, NULL, NULL, NULL, 9),
('drill_field', 'qr_tafsir_drill_item.context',     NULL, 'Context',                'السياق',          NULL, NULL, NULL, NULL, 10),
('drill_field', 'qr_tafsir_drill_item.others_json', NULL, 'Wrong answers',          'الأجوبة الخاطئة', 'A list', NULL, NULL, NULL, 11),
('drill_field', 'qr_tafsir_audio_segment.text_ar',  NULL, 'Line (Arabic)',          'السطر',           'Word for word as recorded', NULL, NULL, NULL, 12),
('drill_field', 'qr_tafsir_segment_en.text_en',     NULL, 'Line (English)',         'ترجمة السطر',     NULL, NULL, NULL, NULL, 13),
('drill_field', 'qr_tafsir_segment_en.terms_json',  NULL, 'Registry terms',         'المصطلحات',       '[{ar, ref: GT:…}]', NULL, NULL, NULL, 14),
('drill_field', 'qr_irab_drill_item.role_gt',       NULL, 'Role (GT term)',         'الموقع',          'GT:<category>:<term>', NULL, NULL, NULL, 15),
('drill_field', 'qr_irab_drill_item.irab_ar',       NULL, 'Iʿrāb',                  'الإعراب',         NULL, NULL, NULL, NULL, 16),
('drill_field', 'qr_irab_book_word.parse_ar',       NULL, 'Parse',                  'الإعراب',         NULL, NULL, NULL, NULL, 17),
('drill_field', 'qr_irab_book_word.alt_ar',         NULL, 'Other parse',            'وجه آخر',         NULL, NULL, NULL, NULL, 18),
('drill_field', 'qr_irab_book_word.role_gt',        NULL, 'Role (GT term)',         'الموقع',          'GT:<category>:<term>', NULL, NULL, NULL, 19),
('drill_field', 'ar_exercises.prompt_ar',           NULL, 'Prompt (Arabic)',        'السؤال',          NULL, NULL, NULL, NULL, 20),
('drill_field', 'ar_exercises.prompt_en',           NULL, 'Prompt (English)',       'السؤال بالإنجليزية', NULL, NULL, NULL, NULL, 21),
('drill_field', 'ar_exercises.options_json',        NULL, 'Options',                'الخيارات',        NULL, NULL, NULL, NULL, 22),
('drill_field', 'ar_exercises.answer_json',         NULL, 'Answer',                 'الجواب',          '{correct}', NULL, NULL, NULL, 23),
('drill_field', 'ar_exercises.explanation_md',      NULL, 'Explanation',            'الشرح',           NULL, NULL, NULL, NULL, 24),
('drill_field', 'ar_grammar_sentence.text_ar',      NULL, 'Sentence',               'الجملة',          NULL, NULL, NULL, NULL, 25),
('drill_field', 'ar_grammar_sentence.term_id',      NULL, 'Term it shows (GT)',     'المصطلح',         'GT:<category>:<term>', NULL, NULL, NULL, 26),
('drill_field', 'ar_practice_pool.text_ar',         NULL, 'Line (Arabic)',          'السطر',           'Word for word as recorded', NULL, NULL, NULL, 27),
('drill_field', 'ar_practice_pool.text_en',         NULL, 'Line (English)',         'الترجمة',         NULL, NULL, NULL, NULL, 28),
('drill_field', 'ar_practice_pool.gloss_json',      NULL, 'Word meanings',          'معاني الكلمات',   'One per word of the line', NULL, NULL, NULL, 29),
('drill_field', 'ar_practice_pool.blanks_json',     NULL, 'Blanks',                 'الفراغات',        '[{i, a, o[3], p}]', NULL, NULL, NULL, 30),
('drill_field', 'ar_read_pool.text_ar',             NULL, 'Line (Arabic)',          'السطر',           NULL, NULL, NULL, NULL, 31),
('drill_field', 'ar_read_pool.blanks_json',         NULL, 'Blanks',                 'الفراغات',        '[{i, a, o[3], p}]', NULL, NULL, NULL, 32),
('drill_field', 'ar_daily_word.singular_ar',        NULL, 'Word',                   'الكلمة',          NULL, NULL, NULL, NULL, 33),
('drill_field', 'ar_daily_word.plural_ar',          NULL, 'Plural',                 'الجمع',           NULL, NULL, NULL, NULL, 34),
('drill_field', 'ar_daily_word.gloss_en',           NULL, 'Meaning',                'المعنى',          NULL, NULL, NULL, NULL, 35),
('drill_field', 'ar_daily_word.plural_kind',        NULL, 'Kind of plural',         'نوع الجمع',       NULL, NULL, NULL, NULL, 36),
('drill_field', 'ar_acq_item.text_ar',              NULL, 'Word',                   'الكلمة',          NULL, NULL, NULL, NULL, 37),
('drill_field', 'ar_acq_item.vocalised_ar',         NULL, 'Voweled',                'بالتشكيل',        NULL, NULL, NULL, NULL, 38),
('drill_field', 'ar_acq_item.gloss_en',             NULL, 'Meaning',                'المعنى',          NULL, NULL, NULL, NULL, 39);
