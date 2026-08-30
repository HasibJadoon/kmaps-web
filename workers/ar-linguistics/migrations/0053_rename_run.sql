ALTER TABLE "ar_ling_kroot_run" RENAME TO "ar_ling_run";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_run'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_kroot_run';

ALTER TABLE "ar_ling_kroot_run_stage" RENAME TO "ar_ling_run_step";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_run_step'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_kroot_run_stage';

ALTER TABLE "ar_ling_root_build_status" RENAME TO "ar_ling_run_root_status";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_run_root_status'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_build_status';
