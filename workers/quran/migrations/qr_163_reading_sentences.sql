-- qr_163 — Read & listen, sentence by sentence (owner, 2026-10-16).
-- The passage heard whole; every sentence built; then each sentence on its own node: its words named ism, fiʿl or ḥarf;
-- its parts named (the sentence and its clauses — nominal, verbal, conditional — and its phrases); its Arabic built from
-- its English, with two words that do not belong; its key terms' meanings (Sinai's Key Terms), each heard as recited.
-- Every option is a GT term's Arabic name. Drawn by skill 'reading' (practice-reading.ts).

-- the registry's particle, mirrored here as the drills read GT names from this database (AL 0120)
INSERT OR IGNORE INTO ar_ling_gram_term (id, category_key, term_key, qac_flag, parent_term_id, term_order, name_ar, name_en, name_ur,
  definition_ar, definition_en, definition_ur, badge_color, status, discipline, uid, qac_scope, name_bare, tier)
VALUES ('GT:pos:harf', 'pos', 'harf', NULL, NULL, 3, 'حَرْف', 'particle', 'حرف',
  'كَلِمَةٌ دَلَّتْ عَلَى مَعْنًى فِي غَيْرِهَا', 'a word whose meaning shows only with another word', 'وہ کلمہ جس کا معنی دوسرے کلمے کے ساتھ ظاہر ہو',
  '#9a7b3f', 'live', 'NH', lower(hex(randomblob(13))), 'pos', 'حرف', 'basic');

INSERT INTO qr_study_label (scope, key, label, label_ar, sort, extra_json) VALUES
  ('skill', 'reading', 'Each sentence', 'كُلُّ جُمْلَة', 990, '{"source":"reading"}'),
  ('kind', 'wordclass', 'Ism, fiʿl or ḥarf?', 'اسْمٌ أَمْ فِعْلٌ أَمْ حَرْف؟', 991, NULL),
  ('kind', 'sentpart', 'What is this part?', 'مَا هَذَا الجُزْء؟', 992, NULL),
  ('kind', 'transbuild', 'Build the Arabic of this meaning — two words do not belong', 'رَكِّبِ الجُمْلَةَ مِنْ مَعْنَاهَا', 993, NULL),
  ('kind', 'keyterm_meaning', 'What does this term mean here?', 'مَا مَعْنَى هَذَا المُصْطَلَح؟', 994, NULL),
  ('class_style', 'wordclass', 'Ism, fiʿl, ḥarf', 'اسْمٌ فِعْلٌ حَرْف', 11, NULL),
  ('class_style', 'sentpart', 'Sentence parts', 'أَجْزَاءُ الجُمْلَة', 12, NULL),
  ('class_style', 'transbuild', 'Build from the meaning', 'التَّرْكِيبُ مِنَ المَعْنَى', 13, NULL),
  ('class_style', 'keyterm:meaning', 'Key terms', 'المُصْطَلَحَات', 14, NULL),
  ('class_ui', 'sentence_node', 'Sentence {n}', 'الجُمْلَة {n}', 941, NULL)
ON CONFLICT (scope, key) DO UPDATE SET label = excluded.label, label_ar = excluded.label_ar, sort = excluded.sort, extra_json = excluded.extra_json;

-- the step: the build of every sentence stays on the passage ("whole"); the rest is split by sentence
UPDATE qr_study_label
   SET extra_json = '{"kind":"step","step":1,"skills":["ss","reading"],"only":{"ss":["ss_order"]},"split":"sentence","whole":["order"],"max":200,"sprint":12,"module":{"n":1,"title":"Reading","titleAr":"القِرَاءَة","study":"reading"}}'
 WHERE scope = 'class_node' AND key = 'read';
