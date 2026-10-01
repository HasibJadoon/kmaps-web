-- غ ل ل, second pass (user, 2026-10-01: «not verbatim from the book — clean understanding, clean
-- presentation»): the combined arc re-ordered as the meaning grows (core image → things driven in →
-- the collar → hidden taking → rancour → thirst → the rest), each rung a short plain-English line and
-- its key word vocalised in head_ar; the drills show these, the book's words stay in label_ar/quote_ar.
UPDATE ar_ling_arc_rung SET seq = seq + 100 WHERE root_norm = 'غلل' AND source_slug = 'combined';
UPDATE ar_ling_arc_rung SET seq = 1, label_en = 'Something slips into another thing and stays fixed there.', head_ar = 'تَخَلُّلُ الشَّيءِ وثَباتُه' WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 101;
UPDATE ar_ling_arc_rung SET seq = 2, label_en = 'To fix one thing firmly inside another.', head_ar = 'غَلَلْتُ الشَّيءَ في الشَّيءِ' WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 104;
UPDATE ar_ling_arc_rung SET seq = 3, label_en = 'To work oil deep into the hair.', head_ar = 'غَلَّ الدُّهْنَ في رَأْسِه' WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 106;
UPDATE ar_ling_arc_rung SET seq = 4, label_en = 'A garment worn next to the skin, under the clothes.', head_ar = 'الغِلالَة' WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 111;
UPDATE ar_ling_arc_rung SET seq = 5, label_en = 'To go deep into the desert.', head_ar = 'غَلَّ المَفاوِزَ' WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 113;
UPDATE ar_ling_arc_rung SET seq = 6, label_en = 'Hidden valleys that swallow the traveller.', head_ar = 'الغُلّان' WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 115;
UPDATE ar_ling_arc_rung SET seq = 7, label_en = 'The iron collar: neck and hands locked inside it.', head_ar = 'الغُلّ' WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 114;
UPDATE ar_ling_arc_rung SET seq = 8, label_en = 'Slipping spoils secretly into one''s own keeping: betrayal.', head_ar = 'الغُلول' WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 107;
UPDATE ar_ling_arc_rung SET seq = 9, label_en = 'To betray a trust in secret.', head_ar = 'غَلَّ يَغُلُّ' WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 103;
UPDATE ar_ling_arc_rung SET seq = 10, label_en = 'Rancour that slips into the heart and stays.', head_ar = 'الغِلّ' WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 110;
UPDATE ar_ling_arc_rung SET seq = 11, label_en = 'A heart holding deceit and hatred.', head_ar = 'غَلَّ صَدْرُه' WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 109;
UPDATE ar_ling_arc_rung SET seq = 12, label_en = 'Burning thirst deep inside.', head_ar = 'الغُلَّة' WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 102;
UPDATE ar_ling_arc_rung SET seq = 13, label_en = 'Being wrapped in something, held in its midst.', head_ar = 'تَدَرُّعُ الشَّيءِ' WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 105;
UPDATE ar_ling_arc_rung SET seq = 14, label_en = 'Ghulūl is wrapping oneself in betrayal; ghill is enmity.', head_ar = 'الغُلول، الغِلّ' WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 119;
UPDATE ar_ling_arc_rung SET seq = 15, label_en = 'To betray; to accuse someone of betrayal.', head_ar = 'أَغْلَلْتُه' WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 120;
UPDATE ar_ling_arc_rung SET seq = 16, label_en = 'An estate''s yield, while the land itself remains.', head_ar = 'الغَلَّة' WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 112;
UPDATE ar_ling_arc_rung SET seq = 17, label_en = 'Date-stones mixed into camel fodder.', head_ar = 'الغَليل' WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 118;
UPDATE ar_ling_arc_rung SET seq = 18, label_en = 'A cloth stopper over the mouth of a jug.', head_ar = 'الغُلَّة' WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 117;
UPDATE ar_ling_arc_rung SET seq = 19, label_en = 'A bad-tempered woman: ‘a lice-ridden collar’.', head_ar = 'غُلٌّ قَمِلٌ' WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 116;
UPDATE ar_ling_arc_rung SET seq = 20, label_en = 'Of a ram: mating without lifting its tail.', head_ar = 'يُغِلّ' WHERE root_norm = 'غلل' AND source_slug = 'combined' AND seq = 108;
UPDATE ar_ling_arc_rung SET label_en = 'Something slips into another thing and stays fixed there.', head_ar = 'تَخَلُّلُ الشَّيءِ وثَباتُه' WHERE id = 'ARC:غلل:maqayis_lugha:1';
UPDATE ar_ling_arc_rung SET label_en = 'To fix one thing firmly inside another.', head_ar = 'غَلَلْتُ الشَّيءَ في الشَّيءِ' WHERE id = 'ARC:غلل:maqayis_lugha:2';
UPDATE ar_ling_arc_rung SET label_en = 'Slipping spoils secretly into one''s own keeping: betrayal.', head_ar = 'الغُلول' WHERE id = 'ARC:غلل:maqayis_lugha:3';
UPDATE ar_ling_arc_rung SET label_en = 'Rancour that slips into the heart and stays.', head_ar = 'الغِلّ' WHERE id = 'ARC:غلل:maqayis_lugha:4';
UPDATE ar_ling_arc_rung SET label_en = 'Hidden valleys that swallow the traveller.', head_ar = 'الغُلّان' WHERE id = 'ARC:غلل:maqayis_lugha:5';
UPDATE ar_ling_arc_rung SET label_en = 'A cloth stopper over the mouth of a jug.', head_ar = 'الغُلَّة' WHERE id = 'ARC:غلل:maqayis_lugha:6';
UPDATE ar_ling_arc_rung SET label_en = 'Date-stones mixed into camel fodder.', head_ar = 'الغَليل' WHERE id = 'ARC:غلل:maqayis_lugha:7';
