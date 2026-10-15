-- Terms Ghāfir 40:7 sentence 1 uses: «حذف القول» as its own sub-term of ellipsis (never collapsed into the parent), and each term bound to its book.
INSERT OR IGNORE INTO ar_ling_gram_term (id, category_key, term_key, parent_term_id, term_order, name_ar, name_en, name_ur, definition_ar, definition_en, definition_ur, badge_color, version, status, discipline, is_default_when_absent, uid, name_bare, band_key, badge_color_dark, badge_color_light, tier) VALUES
('GT:balagha_maani:hadhf_qawl', 'balagha_maani', 'hadhf_qawl', 'GT:balagha_maani:hadhf', 99, 'حذف القول', 'omission of the verb of speaking', 'قول کا حذف', 'حذف فعل القول استغناءً بالمقول، وهو كثير', 'Dropping the verb of saying, the speech itself standing for it — very common', 'فعلِ قول کو حذف کر کے مقول پر اکتفا کرنا — بہت عام', '#ae86c3', 1, 'live', 'BL', 0, 'a4c07e19d2b65f38e1c9a07d44', 'حذف القول', 'maani', '#ae86c3', '#65347c', 'expert');
INSERT OR REPLACE INTO ar_ling_gram_term_source (term_id, source_slug, page_ref) VALUES
('GT:irab_role:maatuf', 'ibn_hisham_qatr', 'ص283'),
('GT:irab_role:maatuf', 'ghalayini_jami_durus', '3/244'),
('GT:balagha_maani:hadhf_qawl', 'ibn_hisham_mughni', 'ص827');
