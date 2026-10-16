-- GT:pos:harf — the particle, the third part of speech beside ism and fiʿl. The registry held each kind of ḥarf
-- (harf_jarr, harf_atf, harf_masdari …) but not the class itself, which the Qurʾān class's word-class drills ask
-- ("ism, fiʿl or ḥarf?"). Created before it is used, as the registry's rule asks.
INSERT OR IGNORE INTO ar_ling_gram_term (id, category_key, term_key, qac_flag, parent_term_id, term_order, name_ar, name_en, name_ur,
  definition_ar, definition_en, definition_ur, badge_color, status, discipline, uid, qac_scope, name_bare, band_key, badge_color_dark, badge_color_light, tier)
VALUES ('GT:pos:harf', 'pos', 'harf', NULL, NULL, 3, 'حَرْف', 'particle', 'حرف',
  'كَلِمَةٌ دَلَّتْ عَلَى مَعْنًى فِي غَيْرِهَا', 'a word whose meaning shows only with another word', 'وہ کلمہ جس کا معنی دوسرے کلمے کے ساتھ ظاہر ہو',
  '#9a7b3f', 'live', 'NH', lower(hex(randomblob(13))), 'pos', 'حرف', 'harf', '#9a7b3f', '#5c4520', 'basic');
