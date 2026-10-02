-- qr_066_ss_named_from_data.sql
--
-- The sentence tab names nothing itself. A word's function, case and sign are shown as the
-- registry term they resolve to (its name_ar, its badge_color); every other word the tab
-- shows is a row here.
--
--   ar_ling_gram_term_alias  the registry's spellings of its terms, mirrored from
--                            km_arabic_linguistic like ar_ling_gram_term (written only by
--                            scripts/project-gram-terms.mjs). AL 0121 adds every spelling the
--                            scope tables use, so qr_ss_scope_morph_link resolves by lookup.
--   ss_slot      which registry categories a slot is resolved in, first to last
--                (extra_json.categories): function, position, sign — and prose, the
--                categories whose Latin spellings in English text are shown in Arabic
--   ss_lens      the sentence tab's lenses, in order
--   ss_layer     the strips under a tree node
--   ss_keynote   the kinds of key note (label_ar = the band; detail = the line under it)
--   ss_ui        the tab's own words: the Sources switch, the whole-sentence heading, more / less,
--                the header's axes, the empty states
--   ss_branch    the branches of balāgha a point is filed under
--   ss_owed      the division still owed under a kind the registry divides (key = the parent ref)
--   source_name  how the prose names a book or a scholar (label = English, label_ar = Arabic):
--                with Sources off, a parenthesis naming one, or a "Name:" before a claim, is
--                left out; with them on the prose is shown as written
--
-- Applied by hand when the ledger is out of step: d1 execute --file, then
--   INSERT OR IGNORE INTO d1_migrations (name) VALUES ('qr_066_ss_named_from_data.sql');

CREATE TABLE IF NOT EXISTS ar_ling_gram_term_alias (
  alias_bare   TEXT NOT NULL,
  term_id      TEXT NOT NULL,
  category_key TEXT NOT NULL,
  alias_raw    TEXT NOT NULL,
  alias_lang   TEXT NOT NULL DEFAULT 'ar',
  alias_kind   TEXT NOT NULL DEFAULT 'variant',
  source       TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (alias_bare, category_key)
);
CREATE INDEX IF NOT EXISTS idx_gram_alias_bare ON ar_ling_gram_term_alias (alias_bare);

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('ss_slot', 'function', 'Function', 'الموقع', NULL, NULL, NULL, NULL,
 '{"categories":["irab_role","nawasikh","harf_maani","pos","mahall","case","balagha_maani"]}', 1),
('ss_slot', 'position', 'Case', 'الإعراب', NULL, NULL, NULL, NULL,
 '{"categories":["mahall","case","mood","irab_sign"]}', 2),
('ss_slot', 'sign', 'Sign', 'العلامة', NULL, NULL, NULL, NULL,
 '{"categories":["irab_sign"]}', 3),
('ss_slot', 'prose', 'Terms in English prose', 'المصطلح في النص الإنجليزي', NULL, NULL, NULL, NULL,
 '{"categories":["irab_role","derivation_type","balagha_maani","balagha_bayan"]}', 4),

('ss_lens', 'keynotes', 'Key notes', 'النقاط', NULL, NULL, NULL, NULL, NULL, 1),
('ss_lens', 'document', 'Text', 'النص', NULL, NULL, NULL, NULL, NULL, 2),
('ss_lens', 'board', 'Board', 'المخطط', NULL, NULL, NULL, NULL, NULL, 3),
('ss_lens', 'ladder', 'Ladder', 'السلّم', NULL, NULL, NULL, NULL, NULL, 4),
('ss_lens', 'readings', 'Readings', 'الأقوال', NULL, NULL, NULL, NULL, NULL, 5),

('ss_layer', 'irab', 'Iʿrāb', 'الإعراب', NULL, NULL, NULL, NULL, NULL, 1),
('ss_layer', 'nahw', 'Grammar', 'النحو', NULL, NULL, NULL, NULL, NULL, 2),
('ss_layer', 'balagha', 'Balāgha', 'البلاغة', NULL, NULL, NULL, NULL, NULL, 3),
('ss_layer', 'hadhf', 'Ellipsis', 'الحذف', NULL, NULL, NULL, NULL, NULL, 4),

('ss_keynote', 'elided', 'Left unsaid', 'محذوف', 'لا تتمّ الجملة إلا بتقديره', NULL, NULL, NULL, NULL, 1),
('ss_keynote', 'divergence', 'Fluent and literal', 'بين الحرفي والفصيح', NULL, NULL, NULL, NULL, NULL, 2),
('ss_keynote', 'finding', 'The finding', 'الخلاصة', 'ما انتهت إليه الأقوال', NULL, NULL, NULL, NULL, 3),
('ss_keynote', 'contested', 'The books split', 'خلاف', NULL, NULL, NULL, 1, NULL, 4),
('ss_keynote', 'disputed', 'Disputed iʿrāb', 'إعراب مختلف فيه', NULL, NULL, NULL, 1, NULL, 5),
('ss_keynote', 'discussed', 'Most written about', 'أكثر ما قيل فيه', NULL, NULL, NULL, 1, NULL, 6),

('ss_ui', 'sources', 'Sources', 'المصادر', NULL, 'books.vertical', NULL, NULL, NULL, 1),
('ss_ui', 'whole_sentence', 'On the sentence', 'ما قيل في الجملة', NULL, NULL, NULL, NULL, NULL, 2),
('ss_ui', 'more', 'More', 'المزيد', NULL, NULL, NULL, NULL, NULL, 3),
('ss_ui', 'less', 'Less', 'أقل', NULL, NULL, NULL, NULL, NULL, 4),
('ss_ui', 'disputed', 'Disputed', 'مختلف فيه', NULL, NULL, NULL, NULL, NULL, 5),
('ss_ui', 'axis_class', 'Structure', 'البناء', NULL, NULL, NULL, NULL, NULL, 6),
('ss_ui', 'axis_kind', 'Kind', 'النوع', NULL, NULL, NULL, NULL, NULL, 7),
('ss_ui', 'axis_role', 'Position', 'الموقع', NULL, NULL, NULL, NULL, NULL, 8),
('ss_ui', 'skeleton', 'Built from', 'التركيب', NULL, NULL, NULL, NULL, NULL, 9),
('ss_ui', 'unspecified', 'Not set', 'غير محدد', NULL, NULL, NULL, NULL, NULL, 10),
('ss_ui', 'copied', 'Copied', 'نُسخ', NULL, 'doc.on.doc', NULL, NULL, NULL, 11),
('ss_ui', 'empty_step', 'No sentence structure for this passage.', 'لا تركيب لهذا المقطع بعد', NULL, NULL, NULL, NULL, NULL, 12),
('ss_ui', 'empty_tree', 'No tree for this sentence.', 'لا شجرة لهذه الجملة بعد', NULL, NULL, NULL, NULL, NULL, 13),
('ss_ui', 'empty_readings', 'No reading is recorded on this sentence.', 'لا أقوال مسجّلة على هذه الجملة', NULL, NULL, NULL, NULL, NULL, 14),
('ss_ui', 'empty_ladder', 'No rendering has been built yet.', 'لم تُبنَ ترجمة هذه الجملة بعد', NULL, NULL, NULL, NULL, NULL, 15),
('ss_ui', 'empty_keynotes', 'Nothing to note in this sentence yet.', 'لا نقاط في هذه الجملة بعد', NULL, NULL, NULL, NULL, NULL, 16),
('ss_ui', 'ladder_literal', 'grammar only', 'الحرفي', NULL, NULL, NULL, NULL, NULL, 17),
('ss_ui', 'ladder_fluent', 'grammar ⊕ balāgha', 'الفصيح', NULL, NULL, NULL, NULL, NULL, 18),
('ss_ui', 'ladder_whole', 'the rendering, whole', 'الفصيح كاملاً', NULL, NULL, NULL, NULL, NULL, 19),
('ss_ui', 'ladder_same', 'The fluent adds nothing to the literal here', 'الفصيح لا يزيد على الحرفي هنا', NULL, NULL, NULL, NULL, NULL, 20),
('ss_ui', 'ladder_nukta', 'what the balāgha adds', 'النكتة', NULL, NULL, NULL, NULL, NULL, 21),
('ss_ui', 'ladder_then', 'then the balāgha', 'ثم البلاغة', NULL, NULL, NULL, NULL, NULL, 22),
('ss_ui', 'readings_title', 'Iʿrāb readings', 'أوجه الإعراب', NULL, NULL, NULL, NULL, NULL, 23),
('ss_ui', 'held', 'held back', 'محجوبة', NULL, NULL, NULL, NULL, NULL, 24),
('ss_ui', 'board_hint', 'Tap a node to open what is under it · drag to go deeper', 'اضغط عقدة لتفتح ما تحتها · اسحب للعمق', NULL, NULL, NULL, NULL, NULL, 25),
('ss_ui', 'fit', 'Fit to screen', 'ملء الشاشة', NULL, NULL, NULL, NULL, NULL, 26),
('ss_ui', 'copy', 'Copy this view', 'انسخ هذا العرض', NULL, NULL, NULL, NULL, NULL, 27),
('ss_ui', 'sentence_n', 'Sentence', 'الجملة', NULL, NULL, NULL, NULL, NULL, 28),
('ss_ui', 'node_translation', 'this node in English', 'الترجمة', NULL, NULL, NULL, NULL, NULL, 29),
('ss_ui', 'node_ladder', 'literal → nuance → fluent', 'السلّم', NULL, NULL, NULL, NULL, NULL, 30),
('ss_ui', 'node_sentence', 'the sentence in English', 'ترجمة الجملة', NULL, NULL, NULL, NULL, NULL, 31),
('ss_ui', 'node_split', 'where the books split', 'الخلاف', NULL, NULL, NULL, NULL, NULL, 32),
('ss_ui', 'node_terms', 'the concepts it is filed under', 'المصطلحات', NULL, NULL, NULL, NULL, NULL, 33),
('ss_ui', 'node_notes', 'the notes on this node', 'الملحوظات', NULL, NULL, NULL, NULL, NULL, 34),
('ss_ui', 'node_empty', 'Nothing is recorded against this node yet.', 'لا شيء مسجّل على هذه العقدة بعد', NULL, NULL, NULL, NULL, NULL, 35),
('ss_ui', 'done', 'Done', 'تم', NULL, NULL, NULL, NULL, NULL, 36),
('ss_ui', 'claims', 'claims', 'أقوال', NULL, NULL, NULL, NULL, NULL, 37),
('ss_ui', 'readings', 'readings', 'أوجه', NULL, NULL, NULL, NULL, NULL, 38),
('ss_ui', 'driven_by', 'driven by', 'بسبب', NULL, NULL, NULL, NULL, NULL, 39),

('ss_owed', 'GT:kalam_kind:khabar', 'Kind of statement', 'الضرب', NULL, NULL, NULL, NULL, NULL, 1),
('ss_owed', 'GT:kalam_kind:insha', 'Kind of request', 'الطلب', NULL, NULL, NULL, NULL, NULL, 2),
('ss_owed', 'default', 'Division', 'القسم', NULL, NULL, NULL, NULL, NULL, 3),

('ss_branch', 'maani', 'Meanings', 'المعاني', NULL, NULL, NULL, NULL, NULL, 1),
('ss_branch', 'mani', 'Meanings', 'المعاني', NULL, NULL, NULL, NULL, NULL, 2),
('ss_branch', 'bayan', 'Imagery', 'البيان', NULL, NULL, NULL, NULL, NULL, 3),
('ss_branch', 'badi', 'Ornament', 'البديع', NULL, NULL, NULL, NULL, NULL, 4),

('source_name', 'jadwal', 'al-Jadwal', 'الجدول', NULL, NULL, NULL, NULL, NULL, 1),
('source_name', 'razi', 'al-Rāzī', 'الرازي', NULL, NULL, NULL, NULL, '{"also":["Razi","al-Razi","Rāzī"]}', 2),
('source_name', 'alusi', 'al-Ālūsī', 'الآلوسي', NULL, NULL, NULL, NULL, '{"also":["Alusi","al-Alusi","الألوسي","الالوسي"]}', 3),
('source_name', 'ibn_ashur', 'Ibn ʿĀshūr', 'ابن عاشور', NULL, NULL, NULL, NULL, '{"also":["Ibn Ashur"]}', 4),
('source_name', 'zamakhshari', 'al-Zamakhsharī', 'الزمخشري', NULL, NULL, NULL, NULL, '{"also":["Zamakhshari","al-Zamakhshari","الكشاف","Kashshaf"]}', 5),
('source_name', 'ukbari', 'al-ʿUkbarī', 'العكبري', NULL, NULL, NULL, NULL, '{"also":["Ukbari","al-Ukbari","التبيان"]}', 6),
('source_name', 'muyassar', 'al-Muyassar', 'الميسر', NULL, NULL, NULL, NULL, '{"also":["Muyassar"]}', 7),
('source_name', 'darwish', 'Darwīsh', 'درويش', NULL, NULL, NULL, NULL, '{"also":["Darwish","al-Darwish"]}', 8),
('source_name', 'daas', 'al-Daʿʿās', 'الدعاس', NULL, NULL, NULL, NULL, '{"also":["Daas","دعاس"]}', 9),
('source_name', 'abu_hayyan', 'Abū Ḥayyān', 'أبو حيان', NULL, NULL, NULL, NULL, '{"also":["Abu Hayyan","ابو حيان"]}', 10),
('source_name', 'ibn_atiyya', 'Ibn ʿAṭiyya', 'ابن عطية', NULL, NULL, NULL, NULL, '{"also":["Ibn Atiyya"]}', 11),
('source_name', 'tabari', 'al-Ṭabarī', 'الطبري', NULL, NULL, NULL, NULL, '{"also":["Tabari","al-Tabari"]}', 12),
('source_name', 'ibn_kathir', 'Ibn Kathīr', 'ابن كثير', NULL, NULL, NULL, NULL, '{"also":["Ibn Kathir"]}', 13),
('source_name', 'sibawayh', 'Sībawayh', 'سيبويه', NULL, NULL, NULL, NULL, '{"also":["Sibawayh"]}', 14),
('source_name', 'farra', 'al-Farrāʾ', 'الفراء', NULL, NULL, NULL, NULL, '{"also":["Farra","al-Farra"]}', 15),
('source_name', 'zajjaj', 'al-Zajjāj', 'الزجاج', NULL, NULL, NULL, NULL, '{"also":["Zajjaj","al-Zajjaj"]}', 16);

-- The drill stage's own words (the same rows as km_arabic 0038), sent with every QR round as `stage`.
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('stage', 'check', 'Check', 'تحقّق', NULL, NULL, NULL, NULL, NULL, 1),
('stage', 'done', 'Done', 'تمّ', NULL, NULL, NULL, NULL, NULL, 2),
('stage', 'said_it', 'I said it', 'قلتُها', NULL, NULL, NULL, NULL, NULL, 3),
('stage', 'the_line', 'The line', 'الجملة', NULL, NULL, NULL, NULL, NULL, 4),
('stage', 'the_order', 'The order', 'الترتيب', NULL, NULL, NULL, NULL, NULL, 5),
('stage', 'listen', 'Listen', 'استمع', NULL, NULL, NULL, NULL, NULL, 6),
('stage', 'play', 'Play', 'شغّل', NULL, NULL, NULL, NULL, NULL, 7),
('stage', 'play_word', 'Play the word', 'شغّل الكلمة', NULL, NULL, NULL, NULL, NULL, 8),
('stage', 'play_again', 'Play again', 'أعِد', NULL, NULL, NULL, NULL, NULL, 9),
('stage', 'slower', 'Slower', 'أبطأ', NULL, NULL, NULL, NULL, NULL, 10),
('stage', 'meaning', 'Meaning', 'المعنى', NULL, NULL, NULL, NULL, NULL, 11),
('stage', 'show_meaning', 'Show meaning', 'أظهر المعنى', NULL, NULL, NULL, NULL, NULL, 12),
('stage', 'always', 'Always', 'دائمًا', NULL, NULL, NULL, NULL, NULL, 13),
('stage', 'your_turn', 'Your turn — say it aloud, then:', 'دورك — قلها بصوت مسموع، ثم:', NULL, NULL, NULL, NULL, NULL, 14),
('stage', 'caught_all', 'Caught every word? Then Done.', 'التقطتَ كل كلمة؟ إذن: تمّ', NULL, NULL, NULL, NULL, NULL, 15),
('stage', 'marked', '{n} marked — they come back until you have them.', '{n} معلَّمة — تعود حتى تتقنها', NULL, NULL, NULL, NULL, NULL, 16),
('stage', 'pattern', 'Pattern', 'الوزن', NULL, NULL, NULL, NULL, NULL, 17),
('stage', 'i_choose', 'Choose', 'اختر', NULL, NULL, NULL, NULL, NULL, 18),
('stage', 'i_choose_all', 'Choose every one that holds', 'اختر كل ما يصحّ', NULL, NULL, NULL, NULL, NULL, 19),
('stage', 'i_odd_one_out', 'Which one does not belong?', 'أيّها لا ينتمي؟', NULL, NULL, NULL, NULL, NULL, 20),
('stage', 'i_translate_pick', 'Which English keeps the Arabic?', 'أيّ ترجمة تحفظ المعنى؟', NULL, NULL, NULL, NULL, NULL, 21),
('stage', 'i_tiles', 'Build it', 'ابنِها', NULL, NULL, NULL, NULL, NULL, 22),
('stage', 'i_listen_tiles', 'Listen, then build it', 'استمع ثم ابنِها', NULL, NULL, NULL, NULL, NULL, 23),
('stage', 'i_listen_mark', 'Listen — tap every word you did not catch', 'استمع — المس كل كلمة لم تلتقطها', NULL, NULL, NULL, NULL, NULL, 24),
('stage', 'i_pairs', 'Tap the matching pairs', 'المس الأزواج المتطابقة', NULL, NULL, NULL, NULL, NULL, 25),
('stage', 'i_order_units', 'Put them in order', 'رتّبها', NULL, NULL, NULL, NULL, NULL, 26),
('stage', 'i_shadow', 'Listen, then say it', 'استمع ثم قلها', NULL, NULL, NULL, NULL, NULL, 27);

-- Tap the matching pairs: a skill of its own, drawn from the scope's lemmas (qr_vocab_item),
-- each lemma beside its meaning, its root or its pattern.
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('skill', 'pairs', 'Match pairs', 'طَابِقِ الأَزْوَاج', 'Tap each word of the sūra, then its meaning, its root or its pattern', 'square.grid.2x2', '#7FB3D5', NULL, '{"source":"pairs"}', 40),
('kind', 'pairs', 'Tap the matching pairs', 'المس الأزواج المتطابقة', NULL, NULL, NULL, NULL, NULL, 200),
('kind', 'pairs_gloss', 'Each word and its meaning', 'كل كلمة ومعناها', NULL, NULL, NULL, NULL, NULL, 201),
('kind', 'pairs_root', 'Each word and its root', 'كل كلمة وجذرها', NULL, NULL, NULL, NULL, NULL, 202),
('kind', 'pairs_wazn', 'Each word and its pattern', 'كل كلمة ووزنها', NULL, NULL, NULL, NULL, NULL, 203);

-- The session around the stage: the grades, the answer panel, the results, the filing line.
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('stage', 'grade_again', 'Again', 'مجددًا', NULL, NULL, NULL, NULL, NULL, 40),
('stage', 'grade_hard', 'Hard', 'صعب', NULL, NULL, NULL, NULL, NULL, 41),
('stage', 'grade_good', 'Good', 'جيد', NULL, NULL, NULL, NULL, NULL, 42),
('stage', 'grade_easy', 'Easy', 'سهل', NULL, NULL, NULL, NULL, NULL, 43),
('stage', 'not_quite', 'Not quite', 'ليس تمامًا', NULL, NULL, NULL, NULL, NULL, 44),
('stage', 'result_flawless', 'Flawless.', 'بلا خطأ.', NULL, NULL, NULL, NULL, NULL, 45),
('stage', 'filed_both', '{new} new · {again} reviewed in your {deck} deck', '{new} جديدة · {again} رُوجعت في مجموعة {deck}', NULL, NULL, NULL, NULL, NULL, 46),
('stage', 'filed_new', '{new} added to your {deck} deck', 'أُضيفت {new} إلى مجموعة {deck}', NULL, NULL, NULL, NULL, NULL, 47),
('stage', 'filed_again', '{again} reviewed in your {deck} deck', 'رُوجعت {again} في مجموعة {deck}', NULL, NULL, NULL, NULL, NULL, 48),
('stage', 'signed_out', 'Sign in to keep these for review', 'سجّل الدخول لتحفظها للمراجعة', NULL, NULL, NULL, NULL, NULL, 49),
('stage', 'review_failed', 'Couldn’t reach review — try another round', 'تعذّر الوصول إلى المراجعة — جرّب جولة أخرى', NULL, NULL, NULL, NULL, NULL, 50),
('stage', 'another_round', 'Another round', 'جولة أخرى', NULL, NULL, NULL, NULL, NULL, 51),
('stage', 'from', 'From', 'من', NULL, NULL, NULL, NULL, NULL, 52),
('stage', 'praise', 'Well heard | Exactly | That’s it | Spot on | أَحْسَنْتَ', 'أحسنت | تمامًا | هو ذاك | مصيب | أَحْسَنْتَ', NULL, NULL, NULL, NULL, NULL, 53),
('stage', 'result_good', 'Well done.', 'أحسنت.', NULL, NULL, NULL, NULL, NULL, 54),
('stage', 'result_keep_at', 'Keep at it — what you missed comes back, spaced.', 'واصل — ما فاتك يعود متباعدًا.', NULL, NULL, NULL, NULL, NULL, 55),
('stage', 'review_badge', 'Review', 'مراجعة', NULL, NULL, NULL, NULL, NULL, 56);
