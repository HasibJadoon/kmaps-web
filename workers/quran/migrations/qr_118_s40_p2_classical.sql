-- Sūra 40, passage 2 (40:4–5), classical: every jarr phrase opens into its حرف جر and مجرور (GT:case:genitive); every
-- iḍāfa shows both sides (قبلَهم، بعدِهم، رسولِهم، عقابِ with its deleted ياء); a pronoun fāʿil or mafʿūl attached to a
-- verb is its own pillar (جادلوا، أخذتُ، ليأخذوه، ليدحضوا); a مفعول به sits beside the verb, not under it (يغررْكَ); the
-- معطوف الأحزاب moves under the فاعل it is joined to. No existing node or note is removed; new nodes add no restated
-- note. Each sentence gets its balāgha type, and the one emphasized خبر (40:4 قصر by ما…إلا) its degree, grounded.
-- Grammar rules cited from the books in km_arabic_linguistic: Ibn ʿAqīl, Sharḥ al-Alfiyya (كان 1/263, the خبر that has
-- صدر الكلام 1/243); Ibn Hishām, Mughnī (the fāʾ after a deleted clause ص820–821, عطف الجملة ص630); al-Jurjānī,
-- Dalāʾil al-Iʿjāz (ما…إلا for what the listener denies 1/332).

-- 40:4 s1 — مَا يُجَادِلُ فِي آيَاتِ اللَّهِ إِلَّا الَّذِينَ كَفَرُوا
INSERT OR IGNORE INTO qr_ss_tree_node
  (id, tree_id, parent_node_id, node_label, depth, node_order, term_key, label_ar, word_occurrence_id, is_virtual, gram_term_ref, created_at)
VALUES ('QR:SSN:40:4:s1:$.tree.children[2].harf', 'QR:TR:40:4:s1', 'QR:SSN:40:4:s1:$.tree.children[2]', 'فِي', 2, 4,
        'harf_jarr', NULL, '61fba516b74af8615e9d032680', 0, 'GT:pos:harf_jarr', datetime('now'));
UPDATE qr_ss_tree_node SET gram_term_ref = 'GT:case:genitive', term_key = 'majrur'
 WHERE id = 'QR:SSN:40:4:s1:$.tree.children[2].children[0]';

-- 40:4 s2 — فَلَا يَغْرُرْكَ تَقَلُّبُهُمْ فِي الْبِلَادِ
UPDATE qr_ss_tree_node SET gram_term_ref = 'GT:pos:fiil_mudari', term_key = 'fiil_mudari'
 WHERE id = 'QR:SSN:40:4:s2:$.tree.children[2]' AND gram_term_ref = 'GT:mahall:jazm';
UPDATE qr_ss_tree_node SET parent_node_id = 'QR:SSN:40:4:s2:$.tree', depth = 1, node_order = 5
 WHERE id = 'QR:SSN:40:4:s2:$.tree.children[2].children[0]';
UPDATE qr_ss_tree_node SET label_ar = label_ar || '. والنحاة يقدّرون قبل هذه الفاء جملة محذوفة دلّ عليها ما بعدها، وإن لم يسمّوها الفصيحة (ابن هشام، مغني اللبيب ص820–821)'
 WHERE id = 'QR:SSN:40:4:s2:$.tree.children[0]' AND label_ar NOT LIKE '%مغني اللبيب%';
INSERT OR IGNORE INTO qr_ss_tree_node
  (id, tree_id, parent_node_id, node_label, depth, node_order, term_key, label_ar, word_occurrence_id, is_virtual, gram_term_ref, created_at)
VALUES ('QR:SSN:40:4:s2:$.tree.children[4].harf', 'QR:TR:40:4:s2', 'QR:SSN:40:4:s2:$.tree.children[4]', 'فِي', 2, 8,
        'harf_jarr', NULL, 'bedcdd69e7950e09d50ad59cbc', 0, 'GT:pos:harf_jarr', datetime('now'));
UPDATE qr_ss_tree_node SET gram_term_ref = 'GT:case:genitive', term_key = 'majrur'
 WHERE id = 'QR:SSN:40:4:s2:$.tree.children[4].children[0]';

-- 40:5 s1 — كَذَّبَتْ قَبْلَهُمْ قَوْمُ نُوحٍ وَالْأَحْزَابُ مِنْ بَعْدِهِمْ
UPDATE qr_ss_tree_node SET gram_term_ref = 'GT:irab_role:zarf', term_key = 'zarf', word_occurrence_id = NULL
 WHERE id = 'QR:SSN:40:5:s1:$.tree.children[1]';
UPDATE qr_ss_tree_node SET node_label = 'قَوْمُ نُوحٍ وَالْأَحْزَابُ مِنْ بَعْدِهِمْ'
 WHERE id = 'QR:SSN:40:5:s1:$.tree.children[2]';
UPDATE qr_ss_tree_node SET parent_node_id = 'QR:SSN:40:5:s1:$.tree.children[2]', depth = 2, node_order = 6
 WHERE id = 'QR:SSN:40:5:s1:$.tree.children[3]';
UPDATE qr_ss_tree_node SET depth = 3 WHERE id = 'QR:SSN:40:5:s1:$.tree.children[3].children[0]';
UPDATE qr_ss_tree_node SET depth = 4, gram_term_ref = 'GT:case:genitive', term_key = 'majrur', word_occurrence_id = NULL
 WHERE id = 'QR:SSN:40:5:s1:$.tree.children[3].children[0].children[0]';
INSERT OR IGNORE INTO qr_ss_tree_node
  (id, tree_id, parent_node_id, node_label, depth, node_order, term_key, label_ar, word_occurrence_id, is_virtual, gram_term_ref, created_at)
VALUES
('QR:SSN:40:5:s1:$.tree.children[1].mudaf', 'QR:TR:40:5:s1', 'QR:SSN:40:5:s1:$.tree.children[1]', 'قَبْلَ', 2, 3,
 'mudaf', NULL, 'f43b739d0d42e4265c1254c981', 0, 'GT:irab_role:mudaf', datetime('now')),
('QR:SSN:40:5:s1:$.tree.children[1].children[0]', 'QR:TR:40:5:s1', 'QR:SSN:40:5:s1:$.tree.children[1]', 'هُمْ', 2, 4,
 'mudaf_ilayh', NULL, 'f43b739d0d42e4265c1254c981', 0, 'GT:irab_role:mudaf_ilayh', datetime('now')),
('QR:SSN:40:5:s1:$.tree.children[3].children[0].harf', 'QR:TR:40:5:s1', 'QR:SSN:40:5:s1:$.tree.children[3].children[0]', 'مِنْ', 4, 7,
 'harf_jarr', NULL, '7aff4d1ead2af65c03c39195db', 0, 'GT:pos:harf_jarr', datetime('now')),
('QR:SSN:40:5:s1:$.tree.children[3].children[0].children[0].mudaf', 'QR:TR:40:5:s1', 'QR:SSN:40:5:s1:$.tree.children[3].children[0].children[0]', 'بَعْدِ', 5, 8,
 'mudaf', NULL, 'cc3faa8ffa8f8940799a126f58', 0, 'GT:irab_role:mudaf', datetime('now')),
('QR:SSN:40:5:s1:$.tree.children[3].children[0].children[0].children[0]', 'QR:TR:40:5:s1', 'QR:SSN:40:5:s1:$.tree.children[3].children[0].children[0]', 'هِمْ', 5, 9,
 'mudaf_ilayh', NULL, 'cc3faa8ffa8f8940799a126f58', 0, 'GT:irab_role:mudaf_ilayh', datetime('now'));

-- 40:5 s2 — وَهَمَّتْ كُلُّ أُمَّةٍ بِرَسُولِهِمْ لِيَأْخُذُوهُ
UPDATE qr_ss_tree_node SET word_occurrence_id = NULL WHERE id IN ('QR:SSN:40:5:s2:$.tree.children[3]', 'QR:SSN:40:5:s2:$.tree.children[4]');
UPDATE qr_ss_tree_node SET node_order = 11 WHERE id = 'QR:SSN:40:5:s2:$.tree.children[4].children[0]';
UPDATE qr_ss_tree_node SET label_ar = label_ar || '. وعطف الجملة على الجملة (ابن هشام، مغني اللبيب ص630)'
 WHERE id = 'QR:SSN:40:5:s2:$.tree' AND label_ar NOT LIKE '%مغني اللبيب%';
INSERT OR IGNORE INTO qr_ss_tree_node
  (id, tree_id, parent_node_id, node_label, depth, node_order, term_key, label_ar, word_occurrence_id, is_virtual, gram_term_ref, created_at)
VALUES
('QR:SSN:40:5:s2:$.tree.children[3].harf', 'QR:TR:40:5:s2', 'QR:SSN:40:5:s2:$.tree.children[3]', 'بِ', 2, 6,
 'harf_jarr', NULL, 'df0ee301929004a1e06fbbe9b6', 0, 'GT:pos:harf_jarr', datetime('now')),
('QR:SSN:40:5:s2:$.tree.children[3].children[0]', 'QR:TR:40:5:s2', 'QR:SSN:40:5:s2:$.tree.children[3]', 'رَسُولِهِمْ', 2, 7,
 'majrur', NULL, NULL, 0, 'GT:case:genitive', datetime('now')),
('QR:SSN:40:5:s2:$.tree.children[3].children[0].mudaf', 'QR:TR:40:5:s2', 'QR:SSN:40:5:s2:$.tree.children[3].children[0]', 'رَسُولِ', 3, 7,
 'mudaf', NULL, 'df0ee301929004a1e06fbbe9b6', 0, 'GT:irab_role:mudaf', datetime('now')),
('QR:SSN:40:5:s2:$.tree.children[3].children[0].children[0]', 'QR:TR:40:5:s2', 'QR:SSN:40:5:s2:$.tree.children[3].children[0]', 'هِمْ', 3, 8,
 'mudaf_ilayh', NULL, 'df0ee301929004a1e06fbbe9b6', 0, 'GT:irab_role:mudaf_ilayh', datetime('now')),
('QR:SSN:40:5:s2:$.tree.children[4].harf', 'QR:TR:40:5:s2', 'QR:SSN:40:5:s2:$.tree.children[4]', 'لِ', 2, 8,
 'harf_jarr', NULL, 'a50beb731dd411c54698e912f3', 0, 'GT:pos:harf_jarr', datetime('now')),
('QR:SSN:40:5:s2:$.tree.children[4].fil', 'QR:TR:40:5:s2', 'QR:SSN:40:5:s2:$.tree.children[4]', 'يَأْخُذُو', 2, 9,
 'fiil_mudari', NULL, 'a50beb731dd411c54698e912f3', 0, 'GT:pos:fiil_mudari', datetime('now')),
('QR:SSN:40:5:s2:$.tree.children[4].fail', 'QR:TR:40:5:s2', 'QR:SSN:40:5:s2:$.tree.children[4]', 'وا', 2, 10,
 'fail', NULL, 'a50beb731dd411c54698e912f3', 0, 'GT:irab_role:fail', datetime('now'));

-- 40:5 s3 — وَجَادَلُوا بِالْبَاطِلِ لِيُدْحِضُوا بِهِ الْحَقَّ
UPDATE qr_ss_tree_node SET node_order = 5, word_occurrence_id = NULL WHERE id = 'QR:SSN:40:5:s3:$.tree.children[2]';
UPDATE qr_ss_tree_node SET gram_term_ref = 'GT:case:genitive', term_key = 'majrur'
 WHERE id = 'QR:SSN:40:5:s3:$.tree.children[2].children[0]';
UPDATE qr_ss_tree_node SET word_occurrence_id = NULL
 WHERE id IN ('QR:SSN:40:5:s3:$.tree.children[3]', 'QR:SSN:40:5:s3:$.tree.children[3].children[0]');
INSERT OR IGNORE INTO qr_ss_tree_node
  (id, tree_id, parent_node_id, node_label, depth, node_order, term_key, label_ar, word_occurrence_id, is_virtual, gram_term_ref, created_at)
VALUES
('QR:SSN:40:5:s3:$.tree.fail', 'QR:TR:40:5:s3', 'QR:SSN:40:5:s3:$.tree', 'وا', 1, 4,
 'fail', NULL, '60742f6c7da4ec7c652350fa48', 0, 'GT:irab_role:fail', datetime('now')),
('QR:SSN:40:5:s3:$.tree.children[2].harf', 'QR:TR:40:5:s3', 'QR:SSN:40:5:s3:$.tree.children[2]', 'بِ', 2, 4,
 'harf_jarr', NULL, '9c2d3f9f6ad606c1eba8161039', 0, 'GT:pos:harf_jarr', datetime('now')),
('QR:SSN:40:5:s3:$.tree.children[3].harf', 'QR:TR:40:5:s3', 'QR:SSN:40:5:s3:$.tree.children[3]', 'لِ', 2, 4,
 'harf_jarr', NULL, '5e3ddd82bbb58bdb641dfd324f', 0, 'GT:pos:harf_jarr', datetime('now')),
('QR:SSN:40:5:s3:$.tree.children[3].fil', 'QR:TR:40:5:s3', 'QR:SSN:40:5:s3:$.tree.children[3]', 'يُدْحِضُو', 2, 5,
 'fiil_mudari', NULL, '5e3ddd82bbb58bdb641dfd324f', 0, 'GT:pos:fiil_mudari', datetime('now')),
('QR:SSN:40:5:s3:$.tree.children[3].fail', 'QR:TR:40:5:s3', 'QR:SSN:40:5:s3:$.tree.children[3]', 'وا', 2, 6,
 'fail', NULL, '5e3ddd82bbb58bdb641dfd324f', 0, 'GT:irab_role:fail', datetime('now')),
('QR:SSN:40:5:s3:$.tree.children[3].children[0].harf', 'QR:TR:40:5:s3', 'QR:SSN:40:5:s3:$.tree.children[3].children[0]', 'بِ', 3, 7,
 'harf_jarr', NULL, '5b7e2bfad3b7982f296a3d2343', 0, 'GT:pos:harf_jarr', datetime('now')),
('QR:SSN:40:5:s3:$.tree.children[3].children[0].children[0]', 'QR:TR:40:5:s3', 'QR:SSN:40:5:s3:$.tree.children[3].children[0]', 'هِ', 3, 8,
 'majrur', NULL, '5b7e2bfad3b7982f296a3d2343', 0, 'GT:case:genitive', datetime('now'));

-- 40:5 s4 — فَأَخَذْتُهُمْ
UPDATE qr_ss_tree_node SET node_order = 5 WHERE id = 'QR:SSN:40:5:s4:$.tree.children[2]';
INSERT OR IGNORE INTO qr_ss_tree_node
  (id, tree_id, parent_node_id, node_label, depth, node_order, term_key, label_ar, word_occurrence_id, is_virtual, gram_term_ref, created_at)
VALUES ('QR:SSN:40:5:s4:$.tree.fail', 'QR:TR:40:5:s4', 'QR:SSN:40:5:s4:$.tree', 'تُ', 1, 4,
        'fail', NULL, 'f079713c001e3b6bffe1a08a8a', 0, 'GT:irab_role:fail', datetime('now'));

-- 40:5 s5 — فَكَيْفَ كَانَ عِقَابِ
UPDATE qr_ss_tree_node SET label_ar = label_ar || '. وتقدّم لأن له صدر الكلام (ابن عقيل، شرح الألفية ١/٢٤٣)'
 WHERE id = 'QR:SSN:40:5:s5:$.tree.children[1]' AND label_ar NOT LIKE '%ابن عقيل%';
UPDATE qr_ss_tree_node SET label_ar = label_ar || '، ترفع الاسم وتنصب الخبر (ابن عقيل، شرح الألفية ١/٢٦٣)'
 WHERE id = 'QR:SSN:40:5:s5:$.tree.children[2]' AND label_ar NOT LIKE '%ابن عقيل%';
UPDATE qr_ss_tree_node SET word_occurrence_id = NULL WHERE id = 'QR:SSN:40:5:s5:$.tree.children[3]';
INSERT OR IGNORE INTO qr_ss_tree_node
  (id, tree_id, parent_node_id, node_label, depth, node_order, term_key, label_ar, word_occurrence_id, is_virtual, gram_term_ref, created_at)
VALUES
('QR:SSN:40:5:s5:$.tree.children[3].mudaf', 'QR:TR:40:5:s5', 'QR:SSN:40:5:s5:$.tree.children[3]', 'عِقَابِ', 2, 5,
 'mudaf', NULL, '455ba0a3b8f35a0771ea6cbea7', 0, 'GT:irab_role:mudaf', datetime('now')),
('QR:SSN:40:5:s5:$.tree.children[3].children[0]', 'QR:TR:40:5:s5', 'QR:SSN:40:5:s5:$.tree.children[3]', '(ي)', 2, 6,
 'mudaf_ilayh', NULL, NULL, 1, 'GT:irab_role:mudaf_ilayh', datetime('now'));

-- Balāgha type of each sentence.
UPDATE qr_ss_occ_sentence SET gt_kalam_kind = 'GT:balagha_maani:khabar_inkari' WHERE id = 'QR:SS:40:4:s1';
UPDATE qr_ss_occ_sentence SET gt_kalam_kind = 'GT:balagha_maani:nahy' WHERE id = 'QR:SS:40:4:s2';
UPDATE qr_ss_occ_sentence SET gt_kalam_kind = 'GT:balagha_maani:khabar'
 WHERE id IN ('QR:SS:40:5:s1', 'QR:SS:40:5:s2', 'QR:SS:40:5:s3', 'QR:SS:40:5:s4');
UPDATE qr_ss_occ_sentence SET gt_kalam_kind = 'GT:balagha_maani:istifham_balaghi' WHERE id = 'QR:SS:40:5:s5';
INSERT OR IGNORE INTO qr_ss_scope_balagha_link (id, scope_type, scope_id, lx_balagha_ref, balagha_category, rhetorical_effect, note_md) VALUES
('QR:BLK:QR:SS:40:4:s1', 'sentence', 'QR:SS:40:4:s1', 'GT:balagha_maani:khabar_inkari', 'mani',
 'Restriction by “none … but” is the form used for what the listener denies: said of people who already deny, it brands them, rather than telling anything new.',
 'المؤكِّد: القصر بالنفي والاستثناء «ما … إلا». القاعدة: «وأما الخبر بالنفي والإثبات نحو ما هذا إلا كذا … فيكون للأمر ينكره المخاطب ويشك فيه» (الجرجاني، دلائل الإعجاز ١/٣٣٢). وحكم المفسرين: الخبر غير مستعمل في فائدة الخبر لأن كفرهم معلوم (ابن عاشور، التحرير والتنوير، غافر ٤)، بل «سجل على المجادلين في آيات الله بالكفر» (الزمخشري، الكشاف، غافر ٤). ولم يسمِّ أحدهم الدرجة: هي مأخوذة من الأداة ومن إنكار المخاطبين.'),
('QR:BLK:QR:SS:40:4:s2', 'sentence', 'QR:SS:40:4:s2', 'GT:balagha_maani:nahy', 'mani',
 'A prohibition: either to anyone their ease might fool, or to the Prophet as one who knows, spoken to as if he did not.',
 'إنشاء طلبي: نهي بلا الناهية. وهو على حقيقة بابه إن كان المخاطب غير معين، أو تمثيلي تنزيلا للعالم منزلة الجاهل إن كان المخاطب النبي ﷺ (ابن عاشور، التحرير والتنوير، غافر ٤).'),
('QR:BLK:QR:SS:40:5:s5', 'sentence', 'QR:SS:40:5:s5', 'GT:balagha_maani:istifham_balaghi', 'mani',
 'A question that is not a question: it marvels at the punishment and makes the listener admit it.',
 'استفهام مستعمل في التعجيب، وفيه معنى التقرير (ابن عاشور، التحرير والتنوير، غافر ٥)؛ «وهذا تقرير فيه معنى التعجيب» (الزمخشري، الكشاف، غافر ٥).');
