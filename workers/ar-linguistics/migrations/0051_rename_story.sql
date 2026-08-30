ALTER TABLE "ar_ling_story_arc_stage" RENAME TO "ar_ling_root_story_arc";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_story_arc'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_story_arc_stage';

ALTER TABLE "ar_ling_story_craft" RENAME TO "ar_ling_root_story_craft";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_story_craft'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_story_craft';

ALTER TABLE "ar_ling_story_format" RENAME TO "ar_ling_root_story_format";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_story_format'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_story_format';

ALTER TABLE "ar_ling_story_icon" RENAME TO "ar_ling_root_story_icon";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_story_icon'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_story_icon';

ALTER TABLE "ar_ling_root_article" RENAME TO "ar_ling_root_story_article";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_story_article'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_article';

ALTER TABLE "ar_ling_root_article_block" RENAME TO "ar_ling_root_story_article_block";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_story_article_block'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_article_block';

ALTER TABLE "ar_ling_root_composition" RENAME TO "ar_ling_root_story_composition";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_story_composition'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_composition';

ALTER TABLE "ar_ling_root_beat" RENAME TO "ar_ling_root_story_movement_beat";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_story_movement_beat'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_beat';

ALTER TABLE "ar_ling_root_movement" RENAME TO "ar_ling_root_story_movement";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_story_movement'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_movement';

ALTER TABLE "ar_ling_root_illustration" RENAME TO "ar_ling_root_story_illustration";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_story_illustration'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_illustration';

ALTER TABLE "ar_ling_root_schedule" RENAME TO "ar_ling_root_story_schedule";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_story_schedule'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_schedule';
