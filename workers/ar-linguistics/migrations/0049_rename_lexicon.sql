-- 0049 — Rename batch: LEXICON family (naming convention v2, phase 4).
--
-- 9 table(s), 302,313 rows.
--
-- VERIFIED BEHAVIOUR (see dryrun/rename_test_d1mode.py, run under D1's actual
-- pragmas legacy_alter_table=0 / foreign_keys=1): ALTER TABLE RENAME rewrites
-- FK REFERENCES clauses, view bodies and trigger bodies automatically. Earlier
-- drafts of this refactor planned to rebuild them by hand; that is unnecessary
-- and would have been the riskier path.
--
-- What RENAME does NOT carry, and is therefore done explicitly below:
--   • ar_ling_reg_table_map.table_name  (the registry row, rule N21)
--   • layer_code string literals stored in data
--   • index names, which keep the old table's token

-- ar_ling_lexicon_root_entry_sources → ar_ling_lexicon_entry_source  (59,483 rows)
--   why: Same, plus plural
ALTER TABLE "ar_ling_lexicon_root_entry_sources" RENAME TO "ar_ling_lexicon_entry_source";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_lexicon_entry_source'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lexicon_root_entry_sources';

-- ar_ling_lexicon_block_links → ar_ling_lexicon_block_link  (68,819 rows)
--   why: Plural
ALTER TABLE "ar_ling_lexicon_block_links" RENAME TO "ar_ling_lexicon_block_link";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_lexicon_block_link'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lexicon_block_links';

-- ar_ling_lexicon_block_tags → ar_ling_lexicon_block_tag  (85,783 rows)
--   why: Plural
ALTER TABLE "ar_ling_lexicon_block_tags" RENAME TO "ar_ling_lexicon_block_tag";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_lexicon_block_tag'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lexicon_block_tags';

-- ar_ling_lexicon_block_annotations → ar_ling_lexicon_block_annotation  (5 rows)
--   why: Plural
ALTER TABLE "ar_ling_lexicon_block_annotations" RENAME TO "ar_ling_lexicon_block_annotation";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_lexicon_block_annotation'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lexicon_block_annotations';

-- ar_ling_lexicon_entry_embeddings → ar_ling_lexicon_entry_embedding  (80,759 rows)
--   why: Plural
ALTER TABLE "ar_ling_lexicon_entry_embeddings" RENAME TO "ar_ling_lexicon_entry_embedding";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_lexicon_entry_embedding'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lexicon_entry_embeddings';

-- ar_ling_lexicon_quran_refs → ar_ling_lexicon_quran_ref  (7,464 rows)
--   why: Plural
ALTER TABLE "ar_ling_lexicon_quran_refs" RENAME TO "ar_ling_lexicon_quran_ref";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_lexicon_quran_ref'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lexicon_quran_refs';

-- ar_ling_lane_patch_log → ar_ling_lexicon_lane_patch_log  (0 rows)
--   why: 'lane' = Lane's Lexicon - it is a lexicon, not a family of its own
ALTER TABLE "ar_ling_lane_patch_log" RENAME TO "ar_ling_lexicon_lane_patch_log";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_lexicon_lane_patch_log'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lane_patch_log';

-- ar_ling_lane_quality_index → ar_ling_lexicon_lane_quality  (0 rows)
--   why: Same
ALTER TABLE "ar_ling_lane_quality_index" RENAME TO "ar_ling_lexicon_lane_quality";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_lexicon_lane_quality'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lane_quality_index';

-- ar_ling_lane_source_pages → ar_ling_lexicon_lane_page  (0 rows)
--   why: Same, plus plural
ALTER TABLE "ar_ling_lane_source_pages" RENAME TO "ar_ling_lexicon_lane_page";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_lexicon_lane_page'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lane_source_pages';

