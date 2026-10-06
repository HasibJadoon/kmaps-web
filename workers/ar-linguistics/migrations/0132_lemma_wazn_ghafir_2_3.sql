-- 0132: a lemma's pattern (وزن) and derivation are LEMMA facts and live in AL (ar_ling_root_lemma_wazn),
-- not on one Qurʾān occurrence. Six of the twelve Ghāfir 40:2–3 noun lemmas had rows; the other seven
-- are added here, each from the lexicon that states it (block id + page for the backlink).
-- إِلَٰه is «فِعال بمعنى مفعول … لأنه مألوه أي معبود» (al-Ṣiḥāḥ), like إمام — a noun in the sense of the
-- object, not a maṣdar — so it gets its own GT term instead of masdar_bi_mana_al_maful.

INSERT OR IGNORE INTO ar_ling_gram_term (id, category_key, term_key, parent_term_id, term_order, name_ar, name_en, name_ur, short_ar, short_en, short_ur,
  badge_color, version, status, discipline, is_default_when_absent, uid, name_bare, band_key, badge_color_dark, badge_color_light) VALUES
('GT:derivation_type:ism_bi_mana_al_maful', 'derivation_type', 'ism_bi_mana_al_maful', NULL, 11, 'اسم بمعنى المفعول', 'noun used in the sense of the passive participle',
 'اسم بمعنی اسمِ مفعول', 'بمعنى المفعول', 'noun for mafʿūl', 'بمعنی مفعول', '#f5b27a', 1, 'live', 'SF', 0, '653d6ce8c0e91ad0a5d2a8339a', 'اسم بمعنى المفعول', 'sarf_noun', '#f5b27a', '#a65e0b');

INSERT OR IGNORE INTO ar_ling_sarf_wazn (id, wazn_key, wazn_ar, tier, applies_to, name_en, name_ur, wazn_order, note_md, status) VALUES
('WZ:fial',   'fial',   'فِعَال',   'thulathi_mujarrad', 'ism', 'fiʿāl',   'فِعال',   121, 'Vowelled فِعَال (كِتَاب، إِلَٰه); WZ:fial_or_fuaal is the unvowelled skeleton.', 'live'),
('WZ:fal',    'fal',    'فَعْل',    'thulathi_mujarrad', 'ism', 'faʿl',    'فَعْل',    5,   'The commonest maṣdar of a transitive bare verb; also plain nouns (ذَنْب).', 'live'),
('WZ:mafil',  'mafil',  'مَفْعِل',  'thulathi_mujarrad', 'ism', 'mafʿil',  'مَفْعِل',  130, 'Maṣdar mīmī or noun of place/time from a present in i (يَصِيرُ → مَصِير).', 'live'),
('WZ:tafiyl', 'tafiyl', 'تَفْعِيل', 'thulathi_mazid',    'ism', 'tafʿīl',  'تَفْعِیل', 200, 'The fixed maṣdar of Form II فَعَّلَ.', 'live');

INSERT OR IGNORE INTO ar_ling_root_lemma_wazn (id, lemma_id, wazn_id, gram_term_ref, rule_id, base_verb, base_bab, transitivity, basis, confidence, is_disputed, dispute_note, source_slug, source_ref, quote_ar, status) VALUES
('LW:tanzil:masdar', '1bc35f366d52a6776e838f0c4d', 'WZ:tafiyl', 'GT:derivation_type:masdar', NULL, 'نَزَّلَ يُنَزِّلُ', 'form_ii', 'mutaaddi', 'derived', 'high', 1,
 'Al-Rāzī reads تَنزِيل at 40:2 as the act of sending down; Ibn ʿĀshūr as the thing sent down (maṣdar in the sense of the object).', 'kmaps_synth', 'PAR:نزل:II (maṣdar تَنْزِيلًا); PAR:template:II:sound', NULL, 'live'),
('LW:kitab:masdar_maful', '26ec9894256ccd2fcb77820470', 'WZ:fial', 'GT:derivation_type:masdar_bi_mana_al_maful', NULL, 'كَتَبَ يَكْتُبُ', 'bab_nasara', 'mutaaddi', 'source_attested', 'high', 0, NULL,
 'raghib_mufradat', 'blk_mfr_fe6b662aaa750697 p.699; Lisān blk_lsn_ktb_13b p.698 (al-Azharī: «الكتاب اسم لما كتب مجموعا؛ والكتاب مصدر»)', 'والكتاب في الأصل مصدر، ثم سمي المكتوب فيه كتابا', 'live'),
('LW:ilah:ism_maful', 'c88f937fab2a9108ab54922b75', 'WZ:fial', 'GT:derivation_type:ism_bi_mana_al_maful', NULL, 'أَلَهَ يَأْلَهُ', 'bab_fataha', 'lazim', 'source_attested', 'high', 0, NULL,
 'jawhari_sihah', 'blk_sih_38ac8579a4f0ee03 p.4405; Lisān blk_lsn_231d91c039be121a p.7028; Tāj blk_taj_43356ba869ded72f p.321', 'وأصله إلاه على فِعال، بمعنى مفعول، لأنه مألوه أي معبود', 'live'),
('LW:dhanb:ism', '2e7a23ca384799c20b92778cf7', 'WZ:fal', 'GT:jumud:jamid', NULL, 'أَذْنَبَ يُذْنِبُ', NULL, 'lazim', 'source_attested', 'high', 0, NULL,
 'maqayis_lugha', 'blk_mqy_9845779470f44027 p.26', 'يقال أذنب يذنب. والاسم الذنب', 'live'),
('LW:tawb:masdar', 'a8886e1216f97189f836165615', 'WZ:fal', 'GT:derivation_type:masdar', NULL, 'تَابَ يَتُوبُ', 'bab_nasara', 'lazim', 'source_attested', 'high', 0, NULL,
 'qamus_muhit', 're_qms_5f5f444688e05cff (filed under تاب = توب, AL 0126); PAR:توب:I', 'تابَ إلى اللَّه تَوْباً', 'live'),
('LW:tawl:masdar', '9e553feca8a3dea46195b29917', 'WZ:fal', 'GT:derivation_type:masdar', NULL, 'طَالَ عَلَيْهِ', 'bab_nasara', 'lazim', 'source_attested', 'high', 0, NULL,
 'jawhari_sihah', 'blk_sih_09ef44243219937a p.3472', 'والطَّول بالفتح: المنّ. يقال منه: طال عليه وتطوّل عليه، إذا امتنّ عليه', 'live'),
('LW:masir:masdar_mimi', 'a6a5a940211be758e1edae8a66', 'WZ:mafil', 'GT:derivation_type:masdar_mimi', NULL, 'صَارَ يَصِيرُ', 'bab_daraba', 'lazim', 'source_attested', 'high', 0, NULL,
 'qamus_muhit', 're_qms_fcc87c942996c746 (filed under صار = صير, AL 0126); PAR:صير:I', 'صارَ الأمرُ إلى كذا صَيْراً ومَصِيراً', 'live');
