-- qr_055_lexicon_skill.sql
--
-- The lexicon drills: what each classical lexicon itself says of a root — Lane's labelled senses
-- and apparatus, the Tāj and the Qāmūs's model words and «ج:», Ibn Fāris's uṣūl and their branches,
-- al-Khalīl's glosses, the dalāla formulae, Mir's idioms, Sinai's key terms, and each lexicon's own
-- style (AL /al/drill/lexicon, from ar_ling_lexicon_fact and ar_ling_lexicon_profile). Every drill
-- stands in a sentence: the āyah where the root is (recited) or the lexicon's own example.
--
--   L1 the root and its words   core (Ibn Fāris's aṣl) · sense (Lane) · digest (ʿAyn) · dalāla ·
--                               plural · synonym · idiom (Mir) · family (which word of the root fills the āyah)
--   L2 structure, and who says  which lexicon says it · contrary · bāb · maṣdar · broken-plural pattern ·
--                               verb form · not of the root · Sinai's key terms · the idiom's particle
--   L3 the argument             which aṣl a derivative returns to · proper or tropical (‡ / †) ·
--                               Lane's senses in order · the sense Lane cites an āyah under ·
--                               which lexicon writes this way · lexicons disagreeing · Mir and Sinai
--
-- Apply with `d1 execute --file` (see qr_046: do not `migrations apply` km_quran).
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('skill', 'lexicon', 'Lexicons', 'المَعَاجِم', 'What each classical lexicon says of the root — Lane, the Tāj, Ibn Fāris, al-Khalīl and the rest, each by its own marks', 'books.vertical', '#5DA9E9', NULL,
 '{"source":"lexicon","levels":{"basic":{"band":"basic","types":["core","sense","digest","dalala","plural","synonym","idiom","family"]},"middle":{"band":"middle","types":["which_lexicon","antonym","bab","masdar","plural_pattern","form","odd","keyterm","particle"]},"advanced":{"band":"advanced","types":["asl","tropical","order","quran_sense","style","disagree","scholars"]}}}', 30),

('kind', 'lex_core', 'What does the root point to, in Ibn Fāris''s words?', 'عَلَامَ يَدُلُّ الجَذْر؟', NULL, NULL, NULL, NULL, NULL, 40),
('kind', 'lex_sense', 'Which meaning does Lane give it?', 'مَا المَعْنَى عِنْدَ لِين؟', NULL, NULL, NULL, NULL, NULL, 41),
('kind', 'lex_digest', 'How does al-Khalīl gloss it?', 'كَيْفَ فَسَّرَهُ الخَلِيل؟', NULL, NULL, NULL, NULL, NULL, 42),
('kind', 'lex_dalala', 'What does it signify, in the lexicon''s own words?', 'عَلَامَ يَدُلّ؟', NULL, NULL, NULL, NULL, NULL, 43),
('kind', 'lex_plural', 'Which plural does the lexicon give?', 'مَا جَمْعُه؟', NULL, NULL, NULL, NULL, NULL, 44),
('kind', 'lex_synonym', 'Which word is its synonym?', 'مَا مُرَادِفُه؟', NULL, NULL, NULL, NULL, NULL, 45),
('kind', 'lex_idiom', 'Listen — what do the verb and its particle mean here?', 'اِسْمَعْ — مَا مَعْنَى التَّعْبِير؟', NULL, NULL, NULL, NULL, NULL, 46),
('kind', 'lex_family', 'Listen — which word of the root is the marked one?', 'أَيُّ كَلِمَاتِ الجَذْرِ هٰذِه؟', NULL, NULL, NULL, NULL, NULL, 47),
('kind', 'lex_which_lexicon', 'Which lexicon says this?', 'أَيُّ مُعْجَمٍ يَقُولُ هٰذَا؟', NULL, NULL, NULL, NULL, NULL, 48),
('kind', 'lex_antonym', 'What is its contrary?', 'مَا ضِدُّه؟', NULL, NULL, NULL, NULL, NULL, 49),
('kind', 'lex_bab', 'Which bāb — which model verb does it follow?', 'مِنْ أَيِّ بَاب؟', NULL, NULL, NULL, NULL, NULL, 50),
('kind', 'lex_masdar', 'Which verbal noun (maṣdar) does Lane give?', 'مَا مَصْدَرُه؟', NULL, NULL, NULL, NULL, NULL, 51),
('kind', 'lex_plural_pattern', 'On which pattern is the plural?', 'عَلَى أَيِّ وَزْنٍ جَمْعُه؟', NULL, NULL, NULL, NULL, NULL, 52),
('kind', 'lex_form', 'Listen — which form is the marked verb?', 'اِسْمَعْ — مِنْ أَيِّ وَزْنٍ الفِعْل؟', NULL, NULL, NULL, NULL, NULL, 53),
('kind', 'lex_odd', 'Which word is NOT of this root?', 'أَيُّ الكَلِمَاتِ لَيْسَ مِنَ الجَذْر؟', NULL, NULL, NULL, NULL, NULL, 54),
('kind', 'lex_keyterm', 'How does Sinai gloss this key term?', 'كَيْفَ شَرَحَهُ سِينَاي؟', NULL, NULL, NULL, NULL, NULL, 55),
('kind', 'lex_particle', 'Listen — which particle does the verb take here?', 'اِسْمَعْ — بِأَيِّ حَرْفٍ يَتَعَدَّى؟', NULL, NULL, NULL, NULL, NULL, 56),
('kind', 'lex_asl', 'To which of Ibn Fāris''s uṣūl does the word return?', 'إِلَى أَيِّ أَصْلٍ يَرْجِع؟', NULL, NULL, NULL, NULL, NULL, 57),
('kind', 'lex_tropical', 'Proper or tropical, in Lane?', 'حَقِيقَةٌ أَمْ مَجَاز؟', NULL, NULL, NULL, NULL, NULL, 58),
('kind', 'lex_order', 'Put Lane''s senses in his order', 'رَتِّبْ مَعَانِيَ لِين', NULL, NULL, NULL, NULL, NULL, 59),
('kind', 'lex_quran_sense', 'Listen — under which of his senses does Lane cite this āyah?', 'اِسْمَعْ — تَحْتَ أَيِّ مَعْنًى أَوْرَدَهَا لِين؟', NULL, NULL, NULL, NULL, NULL, 60),
('kind', 'lex_style', 'Which lexicon writes this way?', 'أَيُّ مُعْجَمٍ يَكْتُبُ هٰكَذَا؟', NULL, NULL, NULL, NULL, NULL, 61),
('kind', 'lex_disagree', 'The lexicons disagree — which one gives this?', 'اِخْتَلَفَتِ المَعَاجِم — أَيُّهَا يَقُولُ هٰذَا؟', NULL, NULL, NULL, NULL, NULL, 62),
('kind', 'lex_scholars', 'Listen — Mir''s reading and Sinai''s: which is Sinai''s?', 'اِسْمَعْ — أَيُّ القِرَاءَتَيْنِ لِسِينَاي؟', NULL, NULL, NULL, NULL, NULL, 63);
