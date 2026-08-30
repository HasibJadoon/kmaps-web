ALTER TABLE "ar_ling_semantic_fields" RENAME TO "ar_ling_reg_semantic_field";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_reg_semantic_field'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_semantic_fields';
