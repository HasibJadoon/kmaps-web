ALTER TABLE "ar_ling_gram_terms" RENAME TO "ar_ling_gram_term";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_gram_term'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_gram_terms';

ALTER TABLE "ar_ling_gram_categories" RENAME TO "ar_ling_gram_category";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_gram_category'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_gram_categories';

ALTER TABLE "ar_ling_gram_chunks" RENAME TO "ar_ling_gram_chunk";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_gram_chunk'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_gram_chunks';

ALTER TABLE "ar_ling_gram_term_examples" RENAME TO "ar_ling_gram_term_example";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_gram_term_example'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_gram_term_examples';

ALTER TABLE "ar_ling_gram_term_relations" RENAME TO "ar_ling_gram_term_relation";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_gram_term_relation'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_gram_term_relations';

ALTER TABLE "ar_ling_gram_term_sources" RENAME TO "ar_ling_gram_term_source";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_gram_term_source'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_gram_term_sources';
