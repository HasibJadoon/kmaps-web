-- 0051 — Rename batch: STORY family (naming convention v2, phase 4).
--
-- 11 table(s), 133 rows.
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

-- ar_ling_story_arc_stage → ar_ling_root_story_arc  (9 rows)
--   why: No root prefix; 'stage' reserved (rule N9)
ALTER TABLE "ar_ling_story_arc_stage" RENAME TO "ar_ling_root_story_arc";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_story_arc'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_story_arc_stage';

-- ar_ling_story_craft → ar_ling_root_story_craft  (23 rows)
--   why: No root prefix
ALTER TABLE "ar_ling_story_craft" RENAME TO "ar_ling_root_story_craft";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_story_craft'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_story_craft';

-- ar_ling_story_format → ar_ling_root_story_format  (5 rows)
--   why: No root prefix
ALTER TABLE "ar_ling_story_format" RENAME TO "ar_ling_root_story_format";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_story_format'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_story_format';

-- ar_ling_story_icon → ar_ling_root_story_icon  (15 rows)
--   why: No root prefix
ALTER TABLE "ar_ling_story_icon" RENAME TO "ar_ling_root_story_icon";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_story_icon'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_story_icon';

-- ar_ling_root_article → ar_ling_root_story_article  (1 rows)
--   why: Belongs to the story family
ALTER TABLE "ar_ling_root_article" RENAME TO "ar_ling_root_story_article";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_story_article'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_article';

-- ar_ling_root_article_block → ar_ling_root_story_article_block  (38 rows)
--   why: Belongs to the story family
ALTER TABLE "ar_ling_root_article_block" RENAME TO "ar_ling_root_story_article_block";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_story_article_block'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_article_block';

-- ar_ling_root_composition → ar_ling_root_story_composition  (1 rows)
--   why: Belongs to the story family
ALTER TABLE "ar_ling_root_composition" RENAME TO "ar_ling_root_story_composition";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_story_composition'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_composition';

-- ar_ling_root_beat → ar_ling_root_story_movement_beat  (15 rows)
--   why: Collided with root_story_beat - two different beats
ALTER TABLE "ar_ling_root_beat" RENAME TO "ar_ling_root_story_movement_beat";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_story_movement_beat'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_beat';

-- ar_ling_root_movement → ar_ling_root_story_movement  (8 rows)
--   why: Belongs to the story family
ALTER TABLE "ar_ling_root_movement" RENAME TO "ar_ling_root_story_movement";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_story_movement'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_movement';

-- ar_ling_root_illustration → ar_ling_root_story_illustration  (7 rows)
--   why: Belongs to the story family
ALTER TABLE "ar_ling_root_illustration" RENAME TO "ar_ling_root_story_illustration";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_story_illustration'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_illustration';

-- ar_ling_root_schedule → ar_ling_root_story_schedule  (11 rows)
--   why: Belongs to the story family
ALTER TABLE "ar_ling_root_schedule" RENAME TO "ar_ling_root_story_schedule";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_root_story_schedule'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_schedule';

