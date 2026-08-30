ALTER TABLE "ar_ling_letters" RENAME TO "ar_ling_root_letter";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_letter'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_letters';

ALTER TABLE "ar_ling_syn_root" RENAME TO "ar_ling_root_asl";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_asl'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_syn_root';

ALTER TABLE "ar_ling_syn_sense" RENAME TO "ar_ling_root_sense_src";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_sense_src'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_syn_sense';

ALTER TABLE "ar_ling_syn_backlink" RENAME TO "ar_ling_root_backlink";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_backlink'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_syn_backlink';

ALTER TABLE "ar_ling_root_variants" RENAME TO "ar_ling_root_lugha";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_lugha'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_variants';

ALTER TABLE "ar_ling_root_senses" RENAME TO "ar_ling_root_sense";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_sense'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_senses';

ALTER TABLE "ar_ling_root_sense_axes" RENAME TO "ar_ling_root_sense_axis";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_sense_axis'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_sense_axes';

ALTER TABLE "ar_ling_root_development_stages" RENAME TO "ar_ling_root_tatawwur";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_tatawwur'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_development_stages';

ALTER TABLE "ar_ling_root_antonyms" RENAME TO "ar_ling_root_didd";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_didd'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_antonyms';

ALTER TABLE "ar_ling_root_semantic_fields" RENAME TO "ar_ling_root_haql";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_haql'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_semantic_fields';

ALTER TABLE "ar_ling_root_relations" RENAME TO "ar_ling_root_relation";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_relation'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_relations';
