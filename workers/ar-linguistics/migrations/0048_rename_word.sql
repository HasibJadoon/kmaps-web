ALTER TABLE "ar_ling_orthography_rules" RENAME TO "ar_ling_root_lemma_word_khat";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_word_khat'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_orthography_rules';

ALTER TABLE "ar_ling_word_sums" RENAME TO "ar_ling_root_lemma_word_silsila";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_word_silsila'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_word_sums';

ALTER TABLE "ar_ling_quran_links" RENAME TO "ar_ling_root_lemma_word_quran_link";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lemma_word_quran_link'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_quran_links';
