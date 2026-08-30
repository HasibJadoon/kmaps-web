ALTER TABLE "ar_ling_form_families" RENAME TO "ar_ling_root_form_family";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_form_family'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_form_families';

ALTER TABLE "ar_ling_form_tiers" RENAME TO "ar_ling_root_form_tier";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_form_tier'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_form_tiers';

ALTER TABLE "ar_ling_form_paradigms" RENAME TO "ar_ling_root_form_paradigm";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_form_paradigm'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_form_paradigms';

ALTER TABLE "ar_ling_form_semantics" RENAME TO "ar_ling_root_form_binya";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_form_binya'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_form_semantics';

ALTER TABLE "ar_ling_conjugation_templates" RENAME TO "ar_ling_root_form_template";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_form_template'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_conjugation_templates';

ALTER TABLE "ar_ling_root_form_attested" RENAME TO "ar_ling_root_form_masmu";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_form_masmu'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_form_attested';
