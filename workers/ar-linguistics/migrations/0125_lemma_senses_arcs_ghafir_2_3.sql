-- 0125: the lemmas of Ghāfir 40:2–3 — each lemma's Qurʾānic senses (its range) and its arc,
-- at lemma scope, keyed by the AL lemma id. AL is the language authority: these rows are what
-- every surface shows (QR's sarf sheet, the morphology grid) via /al/lemmas/resolve.
-- Which sense a given Qurʾānic word uses is NOT here — QR binds it (qr_word_sense_link).
--
-- Arcs run from the root's picture (Ibn Fāris, Maqāyīs) through al-Rāghib (al-Mufradāt) to the
-- lemma's Qurʾānic sense; each arc carries its Maqāyīs line as an attestation.
-- Already in AL and reused: كِتَاب's senses, إِلَٰه's senses and arc (ARC:اله:worship>deity).

-- ── senses (lemma scope) ────────────────────────────────────────────────────
INSERT OR IGNORE INTO ar_ling_root_sense
  (id, root_id, root_norm, scope_level, scope_key, sense_key, gloss_ar, gloss_en, label_ar, label_en, is_core, sort_order,
   provenance_json, generated_by, source_slug, status) VALUES
('SNS:نزل:tanzil_revelation', '0d5ddad8b8e57c6cbe29034c20', 'نزل', 'lemma', '1bc35f366d52a6776e838f0c4d', 'tanzil_revelation', 'الوحي المنزَّل من الله', 'the Revelation sent down from God — the Qurʾān', 'التنزيل', 'the Revelation', 1, 1, '["raghib_mufradat","ibn_ashur","tabari"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:نزل:tanzil_stages',     '0d5ddad8b8e57c6cbe29034c20', 'نزل', 'lemma', '1bc35f366d52a6776e838f0c4d', 'tanzil_stages',     'التنزيل منجَّمًا', 'sent down part by part, in stages', 'منجَّمًا', 'in stages', 0, 2, '["raghib_mufradat","ibn_ashur"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:نزل:tanzil_angels',     '0d5ddad8b8e57c6cbe29034c20', 'نزل', 'lemma', '1bc35f366d52a6776e838f0c4d', 'tanzil_angels',     'تنزيل الملائكة يوم القيامة', 'the angels sent down, on the Day', 'تنزيل الملائكة', 'the angels sent down', 0, 3, '["tabari"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:كتب:deeds_record',      'cb303790920fa750c588a8f5fd', 'كتب', 'lemma', '26ec9894256ccd2fcb77820470', 'deeds_record',      'صحيفة الأعمال', 'the record of a person''s deeds', 'كتاب الأعمال', 'record of deeds', 0, 6, '["raghib_mufradat"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:عزز:aziz_almighty',     '83c2254dbae68a1e8db2ca9a8e', 'عزز', 'lemma', '3d42f257c274c5d8463f1b8371', 'aziz_almighty',     'الغالب الذي لا يُغلب', 'Almighty — of God: never overcome', 'العزيز', 'the Almighty', 1, 1, '["maqayis_lugha","tabari"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:عزز:aziz_hard_on',      '83c2254dbae68a1e8db2ca9a8e', 'عزز', 'lemma', '3d42f257c274c5d8463f1b8371', 'aziz_hard_on',      'شاقّ عليه', 'hard on someone, painful to them (عَزِيزٌ عَلَى)', 'عزيز عليه', 'hard on', 0, 2, '["raghib_mufradat"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:عزز:aziz_hard',         '83c2254dbae68a1e8db2ca9a8e', 'عزز', 'lemma', '3d42f257c274c5d8463f1b8371', 'aziz_hard',         'صعب', 'hard to do (“not hard for God”)', 'صعب', 'hard to do', 0, 3, '["raghib_mufradat"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:عزز:aziz_title',        '83c2254dbae68a1e8db2ca9a8e', 'عزز', 'lemma', '3d42f257c274c5d8463f1b8371', 'aziz_title',        'لقب الملك', 'a ruler''s title — the ʿAzīz of Egypt', 'العزيز', 'a title', 0, 4, '["tabari"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:عزز:aziz_unassailable', '83c2254dbae68a1e8db2ca9a8e', 'عزز', 'lemma', '3d42f257c274c5d8463f1b8371', 'aziz_unassailable', 'منيع', 'beyond attack — of the Book', 'منيع', 'beyond attack', 0, 5, '["ibn_ashur"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:علم:alim_god',          '41fedee8306a60391d0bc09327', 'علم', 'lemma', '9ba7ce572be40ce777e0d44853', 'alim_god',          'العالم بكل شيء', 'All-Knowing — of God', 'العليم', 'the All-Knowing', 1, 1, '["tabari"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:علم:alim_skilled',      '41fedee8306a60391d0bc09327', 'علم', 'lemma', '9ba7ce572be40ce777e0d44853', 'alim_skilled',      'الحاذق العالم', 'knowledgeable, skilled — of people', 'عليم', 'skilled', 0, 2, '["raghib_mufradat"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:علم:alim_learned',      '41fedee8306a60391d0bc09327', 'علم', 'lemma', '9ba7ce572be40ce777e0d44853', 'alim_learned',      'كثير العلم', 'a boy who will grow learned', 'عليم', 'learned', 0, 3, '["raghib_mufradat"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:غفر:ghafir',            '765f5439c429ab304615af0af0', 'غفر', 'lemma', 'ea923679f32861b46d50eade95', 'ghafir',            'ساتر الذنب العافي عنه', 'Forgiver of sin — of God', 'غافر', 'Forgiver', 1, 1, '["maqayis_lugha","raghib_mufradat","tabari"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:ذنب:dhanb_sin',         'bb1adcecbd2d93a98cdfeb2d84', 'ذنب', 'lemma', '2e7a23ca384799c20b92778cf7', 'dhanb_sin',         'الإثم', 'a sin before God', 'الذنب', 'sin', 1, 1, '["maqayis_lugha","raghib_mufradat"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:ذنب:dhanb_wrong',       'bb1adcecbd2d93a98cdfeb2d84', 'ذنب', 'lemma', '2e7a23ca384799c20b92778cf7', 'dhanb_wrong',       'الجناية', 'a wrong done to people — a charge against someone', 'الجناية', 'a wrong', 0, 2, '["maqayis_lugha"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:قبل:qabil',             'af777a646fae4d26b0500117d9', 'قبل', 'lemma', '89060f9f3668b069e4ca2ada7a', 'qabil',             'الذي يقبل التوبة', 'Accepter — of repentance', 'قابل', 'Accepter', 1, 1, '["maqayis_lugha","ibn_ashur"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:توب:tawb',              'bdf8d03c381a14509c63b50ca4', 'توب', 'lemma', 'a8886e1216f97189f836165615', 'tawb',              'التوبة والرجوع إلى الله', 'repentance — turning back to God', 'التَّوْب', 'repentance', 1, 1, '["maqayis_lugha","ibn_ashur"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:شدد:shadid_severe',     'df871a1ccc5785c36261aa83b2', 'شدد', 'lemma', 'd598d16f55259b05ab7239513e', 'shadid_severe',     'شديد في العقوبة', 'severe — of punishment', 'شديد', 'severe', 1, 1, '["tabari"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:شدد:shadid_strong',     'df871a1ccc5785c36261aa83b2', 'شدد', 'lemma', 'd598d16f55259b05ab7239513e', 'shadid_strong',     'القوي', 'strong, mighty in power', 'شديد', 'strong', 0, 2, '["maqayis_lugha"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:شدد:shadid_firm',       'df871a1ccc5785c36261aa83b2', 'شدد', 'lemma', 'd598d16f55259b05ab7239513e', 'shadid_firm',       'الغليظ على', 'firm against (أَشِدَّاءُ عَلَى)', 'أشدّاء', 'firm against', 0, 3, '["raghib_mufradat"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:شدد:shadid_intense',    'df871a1ccc5785c36261aa83b2', 'شدد', 'lemma', 'd598d16f55259b05ab7239513e', 'shadid_intense',    'شديد الحب', 'intense — of love for wealth', 'شديد', 'intense', 0, 4, '["maqayis_lugha"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:عقب:iqab',              '2cb4f93058ff7723ce0d8cd500', 'عقب', 'lemma', 'ef9ac712524e50d06a2a1f98de', 'iqab',              'العقوبة تعقب الذنب', 'punishment — what comes after wrongdoing', 'العقاب', 'punishment', 1, 1, '["maqayis_lugha","raghib_mufradat"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:طول:tawl_bounty',       '5395bad70c2f92f932c597d57a', 'طول', 'lemma', '9e553feca8a3dea46195b29917', 'tawl_bounty',       'الفضل والسعة', 'bounty, wide favour — of God', 'الطَّوْل', 'bounty', 1, 1, '["raghib_mufradat","tabari"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:طول:tawl_means',        '5395bad70c2f92f932c597d57a', 'طول', 'lemma', '9e553feca8a3dea46195b29917', 'tawl_means',        'الغنى والقدرة', 'means, wealth — of people', 'الطَّوْل', 'means', 0, 2, '["raghib_mufradat"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:صير:masir_return',      '5344a78846ddfed3b0d7b5a5b3', 'صير', 'lemma', 'a6a5a940211be758e1edae8a66', 'masir_return',      'المرجع إلى الله', 'the final return — to God', 'المصير', 'the return', 1, 1, '["maqayis_lugha","tabari"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live'),
('SNS:صير:masir_evil',        '5344a78846ddfed3b0d7b5a5b3', 'صير', 'lemma', 'a6a5a940211be758e1edae8a66', 'masir_evil',        'سوء المآل', 'an evil end — the Fire', 'بئس المصير', 'an evil end', 0, 2, '["ibn_ashur"]', 'kmaps_quran_range', 'kmaps_sense_map', 'live');

-- ── arcs (lemma scope) ──────────────────────────────────────────────────────
INSERT OR IGNORE INTO ar_ling_sense_arc
  (id, scope_level, scope_key, root_norm, arc_key, terminal_sense_id, arc_en, is_primary, is_synthesis, confidence, status) VALUES
('ARC:نزل:tanzil',   'lemma', '1bc35f366d52a6776e838f0c4d', 'نزل', 'descent>stages>revelation',      'SNS:نزل:tanzil_revelation', 'coming down → sent down in stages → the Revelation', 1, 1, 0.9, 'live'),
('ARC:كتب:book',     'lemma', '26ec9894256ccd2fcb77820470', 'كتب', 'joining>writing>book',            'SNS:كتب:scripture',         'joining together → writing → a book, a decree',      1, 1, 0.9, 'live'),
('ARC:عزز:aziz',     'lemma', '3d42f257c274c5d8463f1b8371', 'عزز', 'strength>unconquered>mighty',     'SNS:عزز:aziz_almighty',     'strength → never overcome → mighty, rare and dear',  1, 1, 0.9, 'live'),
('ARC:علم:alim',     'lemma', '9ba7ce572be40ce777e0d44853', 'علم', 'mark>knowing>all_knowing',        'SNS:علم:alim_god',          'a mark → knowing → all-knowing',                     1, 1, 0.9, 'live'),
('ARC:غفر:ghafir',   'lemma', 'ea923679f32861b46d50eade95', 'غفر', 'covering>shielding>forgiving',    'SNS:غفر:ghafir',            'covering → shielding → forgiving',                   1, 1, 0.9, 'live'),
('ARC:ذنب:dhanb',    'lemma', '2e7a23ca384799c20b92778cf7', 'ذنب', 'tail>trailing>sin',               'SNS:ذنب:dhanb_sin',         'a tail → what trails after → sin',                   1, 1, 0.9, 'live'),
('ARC:قبل:qabil',    'lemma', '89060f9f3668b069e4ca2ada7a', 'قبل', 'facing>receiving>accepting',      'SNS:قبل:qabil',             'facing → receiving → accepting',                     1, 1, 0.9, 'live'),
('ARC:توب:tawb',     'lemma', 'a8886e1216f97189f836165615', 'توب', 'returning>turning_to_god',        'SNS:توب:tawb',              'returning → turning back to God',                    1, 1, 0.9, 'live'),
('ARC:شدد:shadid',   'lemma', 'd598d16f55259b05ab7239513e', 'شدد', 'tying>strength>severe',           'SNS:شدد:shadid_severe',     'tying tight → strength → severe',                    1, 1, 0.9, 'live'),
('ARC:عقب:iqab',     'lemma', 'ef9ac712524e50d06a2a1f98de', 'عقب', 'coming_after>sequel>punishment',  'SNS:عقب:iqab',              'coming after → what follows a deed → punishment',    1, 1, 0.9, 'live'),
('ARC:طول:tawl',     'lemma', '9e553feca8a3dea46195b29917', 'طول', 'stretching>surplus>bounty',       'SNS:طول:tawl_bounty',       'stretching far → more than enough → bounty',         1, 1, 0.9, 'live'),
('ARC:صير:masir',    'lemma', 'a6a5a940211be758e1edae8a66', 'صير', 'becoming>ending_up>return',       'SNS:صير:masir_return',      'becoming → ending up → the place of return',         1, 1, 0.9, 'live');

-- ── what each arc stands on (Ibn Fāris's picture; al-Rāghib where he links the steps) ──
INSERT OR IGNORE INTO ar_ling_sense_attestation (id, target_type, target_id, source_slug, quote_ar, locator) VALUES
('ATT:ARC:نزل:tanzil:maqayis',  'arc', 'ARC:نزل:tanzil',  'maqayis_lugha',   'كلمةٌ صحيحة تدلُّ على هُبوط شيء ووُقوعه', 'نزل'),
('ATT:ARC:نزل:tanzil:mufradat', 'arc', 'ARC:نزل:tanzil',  'raghib_mufradat', 'التَّنْزِيل يختصّ بالموضع الذي يُشِيرُ إليه إنزالُهُ مفرَّقاً، ومرَّةً بعد أُخْرَى', 'نزل'),
('ATT:ARC:كتب:book:maqayis',    'arc', 'ARC:كتب:book',    'maqayis_lugha',   'يدلُّ على جمع شيء إلى شيءٍ. من ذلك الكِتابُ والكتابة', 'كتب'),
('ATT:ARC:عزز:aziz:maqayis',    'arc', 'ARC:عزز:aziz',    'maqayis_lugha',   'يدلُّ على شدّةٍ وقوَّةٍ وما ضاهاهما، من غلبةٍ وقهر', 'عز'),
('ATT:ARC:علم:alim:maqayis',    'arc', 'ARC:علم:alim',    'maqayis_lugha',   'يدلُّ على أثَرٍ بالشئ يتميَّزُ به عن غيره', 'علم'),
('ATT:ARC:غفر:ghafir:maqayis',  'arc', 'ARC:غفر:ghafir',  'maqayis_lugha',   'عُظْمُ بابِه السَّتْر', 'غفر'),
('ATT:ARC:غفر:ghafir:mufradat', 'arc', 'ARC:غفر:ghafir',  'raghib_mufradat', 'الغَفْرُ: إلباس ما يصونه عن الدّنس', 'غفر'),
('ATT:ARC:ذنب:dhanb:mufradat',  'arc', 'ARC:ذنب:dhanb',   'raghib_mufradat', 'ويستعمل في كلّ فعل يستوخم عقباه اعتبارا بذنب الشيء', 'ذنب'),
('ATT:ARC:قبل:qabil:maqayis',   'arc', 'ARC:قبل:qabil',   'maqayis_lugha',   'تدلُّ كلمهُ كلُّها على مواجهةِ الشَّيء للشَّيء', 'قبل'),
('ATT:ARC:توب:tawb:maqayis',    'arc', 'ARC:توب:tawb',    'maqayis_lugha',   'كلمةٌ واحدةٌ تدلُّ على الرُّجوع', 'توب'),
('ATT:ARC:شدد:shadid:maqayis',  'arc', 'ARC:شدد:shadid',  'maqayis_lugha',   'يدلُّ على قوةٍ فى الشئِ… من ذلك شَدَدْتُ العقد شَدًّا', 'شد'),
('ATT:ARC:عقب:iqab:maqayis',    'arc', 'ARC:عقب:iqab',    'maqayis_lugha',   'يدلُّ على تأخير شئ وإتيانِه بعد غيره', 'عقب'),
('ATT:ARC:عقب:iqab:mufradat',   'arc', 'ARC:عقب:iqab',    'raghib_mufradat', 'والعُقُوبَةُ والمعاقبة والعِقَاب يختصّ بالعذاب', 'عقب'),
('ATT:ARC:طول:tawl:maqayis',    'arc', 'ARC:طول:tawl',    'maqayis_lugha',   'يدلُّ على فضْلٍ وامتداد فى الشئ', 'طول'),
('ATT:ARC:طول:tawl:mufradat',   'arc', 'ARC:طول:tawl',    'raghib_mufradat', 'وَالطَّوْلُ خُصَّ به الفضلُ والمنُّ', 'طول'),
('ATT:ARC:صير:masir:maqayis',   'arc', 'ARC:صير:masir',   'maqayis_lugha',   'وهو المآلُ والمرجِع', 'صير');
