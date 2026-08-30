ALTER TABLE "ar_ling_root_build_jobs" RENAME TO "ar_ling_infra_job";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_infra_job'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_build_jobs';

ALTER TABLE "ar_ling_import_runs" RENAME TO "ar_ling_infra_import";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_infra_import'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_import_runs';

ALTER TABLE "ar_ling_embedding_jobs" RENAME TO "ar_ling_infra_embedding_job";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_infra_embedding_job'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_embedding_jobs';

ALTER TABLE "ar_ling_vector_records" RENAME TO "ar_ling_infra_vector";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_infra_vector'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_vector_records';
