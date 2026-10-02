-- Rung 2 of reading the commentaries: their language. The stock phrases that carry an argument
-- (فإن قلت … قلت، واعلم، والمراد، وقيل، فنقول …) and the terms the commentators use, each in plain
-- English with what it does. Generic, not tied to a passage: when a drill is dealt, the example is
-- the passage's own commentary line that uses the phrase (matched by its bare form) or names the
-- term (its GT ref in the line's terms). Learnt before reading alone (rung 3), so a reader meets
-- these turns already knowing them.

CREATE TABLE IF NOT EXISTS qr_tafsir_gloss (
  key        TEXT PRIMARY KEY,
  kind       TEXT NOT NULL,             -- phrase · term
  ar         TEXT NOT NULL,             -- as shown
  needle     TEXT,                      -- a phrase's bare form, found in a line by consonant skeleton
  gt_ref     TEXT,                      -- a term's GT ref, found in a line's terms
  en         TEXT NOT NULL,             -- what it says, in plain English
  use_en     TEXT,                      -- what it does in the argument
  sort       INTEGER NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'live'
);

INSERT OR REPLACE INTO qr_tafsir_gloss (key, kind, ar, needle, gt_ref, en, use_en, sort) VALUES
('p_idha_arafta', 'phrase', 'إِذَا عَرَفْتَ هَذَا فَنَقُولُ', 'اذا عرفت هذا فنقول', NULL, 'Once you know this, we say:', 'The groundwork is done; the author now makes his own point', 1),
('p_fa_in_qulta', 'phrase', 'فَإِنْ قُلْتَ … قُلْتُ', 'فان قلت', NULL, 'If you ask … I answer', 'The author raises a question a reader would ask, then answers it', 2),
('p_qultu',       'phrase', 'قُلْتُ', 'قلت', NULL, 'I answer', 'The answer to the question just raised', 3),
('p_qila',        'phrase', 'وَقِيلَ', 'وقيل', NULL, 'It has also been said', 'Another view, usually not the author’s own and often the weaker', 4),
('p_ilam',        'phrase', 'وَاعْلَمْ أَنَّ', 'واعلم ان', NULL, 'Know that', 'Opens a point the author wants you to hold on to', 5),
('p_murad',       'phrase', 'الْمُرَادُ', 'المراد', NULL, 'What is meant (is)', 'Gives the intended sense, beyond the plain wording', 6),
('p_yajuz',       'phrase', 'وَيَجُوزُ أَنْ', 'ويجوز ان', NULL, 'It may also be that', 'A reading that is possible, offered beside the main one', 7),
('p_la_yajuz',    'phrase', 'وَلَا يَجُوزُ أَنْ', 'ولا يجوز ان', NULL, 'It cannot be that', 'A reading the author rules out', 8),
('p_ahaduhuma',   'phrase', 'أَحَدُهُمَا … وَالثَّانِي', 'احدهما', NULL, 'The first of the two … the second', 'Lays out two views, one after the other', 9),
('p_thani',       'phrase', 'وَالثَّانِي', 'والثاني', NULL, 'The second (view)', 'Moves to the next view in a list', 10),
('p_tafsiran',    'phrase', 'لَهُ تَفْسِيرَانِ', 'تفسيران', NULL, 'It has two interpretations', 'Announces a list of meanings to follow', 11),
('p_mana',        'phrase', 'وَالْمَعْنَى', 'والمعني', NULL, 'The meaning is', 'A plain restatement follows', 12),
('p_qawluhu',     'phrase', 'قَوْلُهُ', 'قوله', NULL, 'His words — the words of the verse', 'Quotes the part of the verse about to be explained', 13),
('p_kaannahu',    'phrase', 'كَأَنَّهُ قَالَ', 'كانه قال', NULL, 'As if He said', 'Puts the verse’s point in other words', 14),
('p_yuqal',       'phrase', 'يُقَالُ', 'يقال', NULL, 'One says (in Arabic)', 'Cites how the Arabs use a word, as evidence', 15),
('p_juwwiza',     'phrase', 'وَجُوِّزَ أَنْ', 'وجوز ان', NULL, 'It has also been allowed that', 'A reading some scholars permit', 16),
('p_matlub',      'phrase', 'وَهُوَ الْمَطْلُوبُ', 'وهو المطلوب', NULL, 'And that is what was to be proved', 'Closes an argument: the claim is now shown', 17),

('t_mubtada',   'term', 'المُبْتَدَأ', NULL, 'GT:irab_role:mubtada', 'The subject a sentence is about', NULL, 30),
('t_khabar',    'term', 'الخَبَر', NULL, 'GT:irab_role:khabar', 'What is said about the subject', NULL, 31),
('t_naat',      'term', 'النَّعْت', NULL, 'GT:irab_role:naat', 'A describing word that follows its noun', NULL, 32),
('t_badal',     'term', 'البَدَل', NULL, 'GT:irab_role:badal', 'A word that says again, more clearly, the one before it', NULL, 33),
('t_marifa',    'term', 'المَعْرِفَة', NULL, 'GT:definiteness:definite', 'A definite word — “the …”', NULL, 34),
('t_nakira',    'term', 'النَّكِرَة', NULL, 'GT:definiteness:indefinite', 'An indefinite word — “a …”', NULL, 35),
('t_manawiya',  'term', 'الإضافة المعنوية', NULL, 'GT:idafa_kind:manawiya', 'A true “of” pair: the first word becomes definite', NULL, 36),
('t_lafziya',   'term', 'الإضافة اللفظية', NULL, 'GT:idafa_kind:lafziya', 'An “of” pair in form only: the first word stays indefinite', NULL, 37),
('t_masdar',    'term', 'المَصْدَر', NULL, 'GT:derivation_type:masdar', 'The verb’s noun — the act itself', NULL, 38),
('t_sifa',      'term', 'الصفة المشبّهة', NULL, 'GT:derivation_type:sifa_mushabbaha', 'A describing word for a lasting quality', NULL, 39),
('t_taqdir',    'term', 'التَّقْدِير', NULL, 'GT:irab_role:taqdir', 'The words understood but not said', NULL, 40),
('t_idmar',     'term', 'إضمار العامل', NULL, 'GT:irab_role:idmar_al_amil', 'An unsaid word that still sets the case', NULL, 41),
('t_man_sarf',  'term', 'مَنْعُ الصَّرْف', NULL, 'GT:noun_process:man_al_sarf', 'A noun that never takes the double ending (ـٌ ـٍ) or kasra', NULL, 42),
('t_tarid',     'term', 'التَّعْرِيض', NULL, 'GT:balagha_bayan:tarid', 'Hinting at someone without naming them', NULL, 43),
('t_munasaba',  'term', 'المُنَاسَبَة', NULL, 'GT:balagha_maani:munasaba', 'How a passage connects to what comes before it', NULL, 44),
('t_baraa',     'term', 'بَرَاعَةُ الاسْتِهْلَال', NULL, 'GT:balagha_badi:baraat_istihlal', 'An opening that hints at what the chapter is about', NULL, 45),
('t_taqdim',    'term', 'التَّقْدِيمُ وَالتَّأْخِير', NULL, 'GT:balagha_maani:taqdim_takhir', 'Putting a word first, to stress it or limit it', NULL, 46),
('t_atf',       'term', 'وَاوُ العَطْف', NULL, 'GT:harf_maani:atf', '“And” joining words of equal standing', NULL, 47),
('t_fasila',    'term', 'رِعَايَةُ الفَاصِلَة', NULL, 'GT:balagha_badi:riayat_fasila', 'A word order chosen so the verse ending keeps its rhyme', NULL, 48),
('t_tankir',    'term', 'التَّنْكِير', NULL, 'GT:balagha_maani:tankir', 'Leaving a word indefinite, to make it vast or open', NULL, 49),
('t_muqattaa',  'term', 'الحُرُوفُ المُقَطَّعَة', NULL, 'GT:harf_maani:muqattaa', 'The separate letters that open some chapters', NULL, 50),
('t_imala',     'term', 'الإِمَالَة', NULL, 'GT:phonotactic:imala', 'Reading a long ā leaning toward ī', NULL, 51),
('t_saknayn',   'term', 'التِقَاءُ السَّاكِنَيْن', NULL, 'GT:phonotactic:iltiqa_sakinayn', 'Two silent letters meeting — which Arabic avoids', NULL, 52),
('t_waqf',      'term', 'الوَقْف', NULL, 'GT:phonotactic:waqf', 'Stopping at the end of a word', NULL, 53),
('t_munkir',    'term', 'تنزيل المنكر منزلة غير المنكر', NULL, 'GT:balagha_maani:tanzil_al_munkir_manzilat_ghayr_al_munkir', 'Speaking to a denier as if he did not deny — the proof is so plain', NULL, 54),
('t_mukhalafa', 'term', 'مخالفة مقتضى الظاهر', NULL, 'GT:balagha_maani:mukhalafat_muqtada_zahir', 'Breaking the expected way of speaking, on purpose, for an effect', NULL, 55),
('t_fasl',      'term', 'الفَصْل', NULL, 'GT:balagha_maani:fasl', 'Leaving out “and” between two sentences', NULL, 56),
('t_tasjil',    'term', 'التَّسْجِيل', NULL, 'GT:balagha_maani:tasjil', 'Putting it on record against someone', NULL, 57),
('t_kinaya',    'term', 'الكناية الرمزية', NULL, 'GT:balagha_bayan:kinaya_ramziyya', 'A hint whose meaning is reached through a hidden link', NULL, 58);

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('skill', 'tafsir_lang', 'The commentators’ language', 'لُغَةُ المُفَسِّرِين',
 'The phrases that carry an argument and the terms the commentators use, each in plain English',
 'character.bubble', '#4FB3A9', NULL, '{"source":"tafsir_lang","works":["zamakhshari","ibn_ashur","razi","alusi"]}', 16),
('skill', 'tafsir_hear', 'Hear the commentary', 'اسْمَعِ التَّفْسِير',
 'A sentence heard, nothing on the screen: choose what it says',
 'ear', '#4FB3A9', NULL, '{"source":"tafsir_hear","works":["zamakhshari","ibn_ashur","razi","alusi"]}', 17);

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('kind', 'tq_phrase', 'What does the marked phrase do here?', 'ماذا تفعل هذه العبارة هنا؟', NULL, NULL, NULL, NULL, NULL, 231),
('kind', 'tq_term',   'What does the commentator mean by this term?', 'ما معنى هذا المصطلح عند المفسّر؟', NULL, NULL, NULL, NULL, NULL, 232),
('kind', 'tq_hear',   'Listen — which English says what you heard?', 'اسمع — أيّ ترجمة تقول ما سمعت؟', NULL, NULL, NULL, NULL, NULL, 233);

-- the ladder on the path: hear the works → their language → read them through → hear them alone →
-- the questions on the verses' meaning → the check
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('class_node', 'tafsir_lang', 'The commentators’ language', 'لُغَةُ المُفَسِّرِين',
 'Their stock phrases and terms, in plain English, met in this passage’s commentary', 'character.bubble', '#4FB3A9', NULL,
 '{"kind":"step","step":7,"skills":["tafsir_lang"],"max":80,"sprint":10}', 66),
('class_node', 'hear_tafsir', 'Hear it alone', 'اسْمَعْهُ وَحْدَه',
 'Each sentence heard with nothing on the screen, until you follow by ear', 'ear', '#4FB3A9', NULL,
 '{"kind":"step","step":9,"skills":["tafsir_hear"],"max":400,"sprint":10}', 68);
UPDATE qr_study_label SET extra_json = json_set(extra_json, '$.step', 8) WHERE scope = 'class_node' AND key = 'read_tafsir';
UPDATE qr_study_label SET extra_json = json_set(extra_json, '$.step', 10) WHERE scope = 'class_node' AND key = 'tafsir';
UPDATE qr_study_label SET extra_json = json_set(extra_json, '$.step', 11) WHERE scope = 'class_node' AND key = 'check';
