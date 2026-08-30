ALTER TABLE "ar_ling_root_stage" RENAME TO "ar_ling_stg_claim";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_stg_claim'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_stage';
