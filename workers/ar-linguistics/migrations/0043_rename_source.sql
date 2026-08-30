ALTER TABLE "ar_ling_sources" RENAME TO "ar_ling_source";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_source'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_sources';

ALTER TABLE "ar_ling_source_editions" RENAME TO "ar_ling_source_edition";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_source_edition'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_source_editions';

ALTER TABLE "ar_ling_source_chunks" RENAME TO "ar_ling_source_chunk";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_source_chunk'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_source_chunks';

ALTER TABLE "ar_ling_source_entry_refs" RENAME TO "ar_ling_source_entry_ref";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_source_entry_ref'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_source_entry_refs';

ALTER TABLE "ar_ling_evidence_items" RENAME TO "ar_ling_source_evidence";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_source_evidence'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_evidence_items';

ALTER TABLE "ar_ling_citations" RENAME TO "ar_ling_source_citation";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_source_citation'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_citations';
