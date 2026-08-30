ALTER TABLE "ar_ling_lexicon_root_entry_sources" RENAME TO "ar_ling_lexicon_entry_source";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_lexicon_entry_source'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lexicon_root_entry_sources';

ALTER TABLE "ar_ling_lexicon_block_links" RENAME TO "ar_ling_lexicon_block_link";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_lexicon_block_link'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lexicon_block_links';

ALTER TABLE "ar_ling_lexicon_block_tags" RENAME TO "ar_ling_lexicon_block_tag";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_lexicon_block_tag'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lexicon_block_tags';

ALTER TABLE "ar_ling_lexicon_block_annotations" RENAME TO "ar_ling_lexicon_block_annotation";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_lexicon_block_annotation'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lexicon_block_annotations';

ALTER TABLE "ar_ling_lexicon_entry_embeddings" RENAME TO "ar_ling_lexicon_entry_embedding";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_lexicon_entry_embedding'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lexicon_entry_embeddings';

ALTER TABLE "ar_ling_lexicon_quran_refs" RENAME TO "ar_ling_lexicon_quran_ref";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_lexicon_quran_ref'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lexicon_quran_refs';

ALTER TABLE "ar_ling_lane_patch_log" RENAME TO "ar_ling_lexicon_lane_patch_log";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_lexicon_lane_patch_log'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lane_patch_log';

ALTER TABLE "ar_ling_lane_quality_index" RENAME TO "ar_ling_lexicon_lane_quality";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_lexicon_lane_quality'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lane_quality_index';

ALTER TABLE "ar_ling_lane_source_pages" RENAME TO "ar_ling_lexicon_lane_page";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_lexicon_lane_page'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lane_source_pages';
