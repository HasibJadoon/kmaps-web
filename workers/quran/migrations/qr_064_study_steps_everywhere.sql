-- qr_064_study_steps_everywhere.sql
--
-- The six passage study steps for every passage, curated or derived (study.repo.ts resolves
-- /qr/study/surahs/:s/passages/:p where :p is a curated passage_no, an atlas position, or a
-- "from-to" key). A passage with no authored layer gets passage_structure and scholarship built
-- from the sources (study-derived.ts); the labels those steps show are rows here, not code:
--
--   passage_lens         the lenses of passage_structure that are not qr_passage_section rows:
--                        the ladder and questions (English-primary, Arabic as the gloss), and
--                        the source-built lenses (renderer and tone in extra_json)
--   passage_book         the books whose groupings the division lens lists, in order;
--                        min_value 1 = the four tafsīrs that set passage boundaries, 2 = the rest
--   passage_book_tier    the names of those two tiers
--   passage_translation  the translations the translations lens shows, in order
--   passage_basis        + curated_edge: a derived passage cut at a curated passage's edge
--   cue_marker           Ibn ʿĀshūr's own word where a passage opens or the discourse turns,
--                        English-primary with the term transliterated
--   tafsir_en            the English tafsīrs (qr_tafsir_en): a display name, the author, and
--                        extra_json.slug where the work is one of the Arabic tafsīrs abridged
--
-- And one fact: Ibn ʿĀshūr's death year (1393 AH) on his display row, where it was missing — the
-- year qr_scholar_passage_reading already carries for him, and qr_scholar_profile's 1973 CE.
--
-- Apply with `d1 execute --file` (see qr_046: do not `migrations apply` km_quran), then
--   INSERT OR IGNORE INTO d1_migrations (name) VALUES ('qr_064_study_steps_everywhere.sql');

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
  ('passage_lens', 'ladder',       'Ladder (al-sullam)',      'السُّلَّم',        'From word-for-word to fluent English, step by step', NULL, NULL, NULL, '{"tone":"gold"}', 1),
  ('passage_lens', 'questions',    'Questions (al-asʾila)',   'الأَسْئِلَة',      'The passage''s questions, each with its answer', NULL, NULL, NULL, '{"tone":"gold"}', 2),
  ('passage_lens', 'division',     'Division (taqsīm)',       'التَّقْسِيم',      'How the four boundary tafsīrs divide these āyāt', NULL, NULL, NULL, '{"tone":"purple","renderer":"conflict"}', 3),
  ('passage_lens', 'opening',      'Opening (maṭlaʿ)',        'المَطْلَع',        'Where the passage opens, and on whose authority', NULL, NULL, NULL, '{"tone":"gold","renderer":"discourse"}', 4),
  ('passage_lens', 'turns',        'Turns (intiqāl)',         'الانْتِقَال',      'Where Ibn ʿĀshūr says the discourse turns', NULL, NULL, NULL, '{"tone":"ember","renderer":"discourse"}', 5),
  ('passage_lens', 'maududi',      'Maududi (Tafhīm)',        'تَفْهِيمُ القُرْآن', 'Maududi''s introduction to the surah, where it names these āyāt', NULL, NULL, NULL, '{"tone":"sky","renderer":"purpose"}', 6),
  ('passage_lens', 'translations', 'Translations (tarjama)',  'التَّرَاجِم',      'The āyāt in four English translations', NULL, NULL, NULL, '{"tone":"moss","renderer":"discourse"}', 7),

  ('passage_book', 'zamakhshari',           'al-Zamakhsharī, al-Kashshāf',        NULL, NULL, NULL, NULL, 1, NULL, 1),
  ('passage_book', 'razi',                  'al-Rāzī, Mafātīḥ al-Ghayb',          NULL, NULL, NULL, NULL, 1, NULL, 2),
  ('passage_book', 'alusi',                 'al-Ālūsī, Rūḥ al-Maʿānī',            NULL, NULL, NULL, NULL, 1, NULL, 3),
  ('passage_book', 'ibn_ashur',             'Ibn ʿĀshūr, al-Taḥrīr wa-al-Tanwīr', NULL, NULL, NULL, NULL, 1, NULL, 4),
  ('passage_book', 'tabari',                'al-Ṭabarī, Jāmiʿ al-Bayān',          NULL, NULL, NULL, NULL, 2, NULL, 5),
  ('passage_book', 'ibn_atiyya',            'Ibn ʿAṭiyya, al-Muḥarrar al-Wajīz',  NULL, NULL, NULL, NULL, 2, NULL, 6),
  ('passage_book', 'abu_hayyan',            'Abū Ḥayyān, al-Baḥr al-Muḥīṭ',       NULL, NULL, NULL, NULL, 2, NULL, 7),
  ('passage_book', 'ibn_kathir',            'Ibn Kathīr, Tafsīr al-Qurʾān al-ʿAẓīm', NULL, NULL, NULL, NULL, 2, NULL, 8),
  ('passage_book', 'qul_jadwal_irab_quran', 'al-Jadwal fī iʿrāb al-Qurʾān',       NULL, NULL, NULL, NULL, 2, NULL, 9),
  ('passage_book', 'qul_irab_quran_daas',   'al-Daʿʿās, Iʿrāb al-Qurʾān',         NULL, NULL, NULL, NULL, 2, NULL, 10),
  ('passage_book', 'qul_irab_darwish',      'Darwīsh, Iʿrāb al-Qurʾān wa-bayānuh', NULL, NULL, NULL, NULL, 2, NULL, 11),

  ('passage_book_tier', '1', 'Boundary tafsīr', 'تَفْسِيرٌ يَحُدُّ المَقَاطِع', 'One of the four tafsīrs whose groupings set where passages begin', NULL, NULL, 1, NULL, 1),
  ('passage_book_tier', '2', 'Also groups',     'يُجَمِّعُ أَيْضًا',          'A tafsīr or iʿrāb book that corroborates or dissents', NULL, NULL, 2, NULL, 2),

  ('passage_translation', 'en-haleem',  'Abdel Haleem',          NULL, 'The Qur''an, Oxford World''s Classics', NULL, NULL, NULL, NULL, 1),
  ('passage_translation', 'en-sahih',   'Saheeh International',  NULL, 'The Qur''an, Saheeh International', NULL, NULL, NULL, NULL, 2),
  ('passage_translation', 'en-asad',    'Muhammad Asad',         NULL, 'The Message of the Qur''an', NULL, NULL, NULL, NULL, 3),
  ('passage_translation', 'en-maududi', 'Maududi (Tafhīm)',      NULL, 'Tafhim al-Qur''an (English)', NULL, NULL, NULL, NULL, 4),

  ('passage_basis', 'curated_edge', 'A curated passage''s edge', 'حَدُّ مَقْطَعٍ مُحَرَّر', 'The books run on here, but a curated passage begins or ends at this āyah, so the derived passage is cut at it', NULL, NULL, NULL, NULL, 6),

  ('cue_marker', 'انتقال',          'Transition (intiqāl)',                    'انتقال',          NULL, NULL, NULL, NULL, NULL, 1),
  ('cue_marker', 'استئناف ابتدائي', 'Fresh opening (istiʾnāf ibtidāʾī)',       'استئناف ابتدائي', NULL, NULL, NULL, NULL, NULL, 2),
  ('cue_marker', 'استئناف بياني',   'Explanatory resumption (istiʾnāf bayānī)', 'استئناف بياني',   NULL, NULL, NULL, NULL, NULL, 3),
  ('cue_marker', 'ابتداء',          'Beginning (ibtidāʾ)',                     'ابتداء',          NULL, NULL, NULL, NULL, NULL, 4),
  ('cue_marker', 'افتتاح',          'Opening (iftitāḥ)',                       'افتتاح',          NULL, NULL, NULL, NULL, NULL, 5),
  ('cue_marker', 'شروع',            'Setting out (shurūʿ)',                    'شروع',            NULL, NULL, NULL, NULL, NULL, 6),
  ('cue_marker', 'غرض',             'A new aim (gharaḍ)',                      'غرض',             NULL, NULL, NULL, NULL, NULL, 7),
  ('cue_marker', 'عود الي',         'Return to (ʿawd ilā)',                    'عود إلى',         NULL, NULL, NULL, NULL, NULL, 8),
  ('cue_marker', 'رجوع الي',        'Return to (rujūʿ ilā)',                   'رجوع إلى',        NULL, NULL, NULL, NULL, NULL, 9),
  ('cue_marker', 'عطف قصة',         'A story joined on (ʿaṭf qiṣṣa)',          'عطف قصة',         NULL, NULL, NULL, NULL, NULL, 10),
  ('cue_marker', 'تفريع',           'Consequence (tafrīʿ)',                    'تفريع',           NULL, NULL, NULL, NULL, NULL, 11),
  ('cue_marker', 'الفاء لتفريع',    'Consequence with fa (al-fāʾ li-l-tafrīʿ)', 'الفاء للتفريع',   NULL, NULL, NULL, NULL, NULL, 12),
  ('cue_marker', 'الفاء للتفريع',   'Consequence with fa (al-fāʾ li-l-tafrīʿ)', 'الفاء للتفريع',   NULL, NULL, NULL, NULL, NULL, 13),
  ('cue_marker', 'اعتراض',          'Parenthesis (iʿtirāḍ)',                   'اعتراض',          NULL, NULL, NULL, NULL, NULL, 14),
  ('cue_marker', 'جملة معترضة',     'Parenthetical clause (jumla muʿtariḍa)',  'جملة معترضة',     NULL, NULL, NULL, NULL, NULL, 15),
  ('cue_marker', 'تعليل',           'Giving the reason (taʿlīl)',              'تعليل',           NULL, NULL, NULL, NULL, NULL, 16),
  ('cue_marker', 'تكملة',           'Completion (takmila)',                    'تكملة',           NULL, NULL, NULL, NULL, NULL, 17),
  ('cue_marker', 'من تمام',         'Part of what precedes (min tamām)',       'من تمام',         NULL, NULL, NULL, NULL, NULL, 18),
  ('cue_marker', 'بيان ل',          'Explication of (bayān li-)',              'بيان لـ',         NULL, NULL, NULL, NULL, NULL, 19),
  ('cue_marker', 'بدل من',          'Apposition to (badal min)',               'بدل من',          NULL, NULL, NULL, NULL, NULL, 20),
  ('cue_marker', 'بدل اشتمال',      'Inclusive apposition (badal ishtimāl)',   'بدل اشتمال',      NULL, NULL, NULL, NULL, NULL, 21),
  ('cue_marker', 'حال من',          'Circumstantial to (ḥāl min)',             'حال من',          NULL, NULL, NULL, NULL, NULL, 22),
  ('cue_marker', 'جواب عن',         'An answer to (jawāb ʿan)',                'جواب عن',         NULL, NULL, NULL, NULL, NULL, 23),

  ('tafsir_en', 'ibn-kathir-abridged', 'Ibn Kathīr (abridged)', 'تفسير ابن كثير (مختصر)', 'Ibn Kathīr', NULL, NULL, NULL, '{"slug":"ibn_kathir"}', 1),
  ('tafsir_en', 'maarif',              'Maʿārif al-Qurʾān',     'معارف القرآن',           'Muftī Muḥammad Shafīʿ', NULL, NULL, NULL, NULL, 2),
  ('tafsir_en', 'tazkir',              'Tazkīr al-Qurʾān',      'تذكير القرآن',           'Wahiduddin Khan', NULL, NULL, NULL, NULL, 3);

UPDATE qr_tafsir_book_display_source SET death_year_hijri = 1393, updated_at = datetime('now')
 WHERE source_slug = 'ibn_ashur' AND death_year_hijri IS NULL;
