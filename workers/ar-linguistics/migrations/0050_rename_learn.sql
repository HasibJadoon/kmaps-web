-- 0050 — Rename batch: LEARN family (naming convention v2, phase 4).
--
-- 11 table(s), 9,795 rows.
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

-- ar_ling_root_vocab → ar_ling_learn_vocab  (56 rows)
--   why: Pedagogy, not a root linguistic layer
ALTER TABLE "ar_ling_root_vocab" RENAME TO "ar_ling_learn_vocab";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_learn_vocab'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_vocab';

-- ar_ling_memlets → ar_ling_learn_memlet  (25 rows)
--   why: No family prefix; plural
ALTER TABLE "ar_ling_memlets" RENAME TO "ar_ling_learn_memlet";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_learn_memlet'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_memlets';

-- ar_ling_memlet_kinds → ar_ling_learn_memlet_kind  (16 rows)
--   why: No family prefix; plural
ALTER TABLE "ar_ling_memlet_kinds" RENAME TO "ar_ling_learn_memlet_kind";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_learn_memlet_kind'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_memlet_kinds';

-- ar_ling_memlet_media → ar_ling_learn_memlet_media  (9 rows)
--   why: No family prefix
ALTER TABLE "ar_ling_memlet_media" RENAME TO "ar_ling_learn_memlet_media";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_learn_memlet_media'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_memlet_media';

-- ar_ling_vocab_memory_hooks → ar_ling_learn_memory_hook  (7 rows)
--   why: No family prefix; plural
ALTER TABLE "ar_ling_vocab_memory_hooks" RENAME TO "ar_ling_learn_memory_hook";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_learn_memory_hook'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_vocab_memory_hooks';

-- ar_ling_context_passages → ar_ling_learn_example  (3 rows)
--   why: 'context_passages' collides with km_quran passage tables
ALTER TABLE "ar_ling_context_passages" RENAME TO "ar_ling_learn_example";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_learn_example'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_context_passages';

-- ar_ling_question_items → ar_ling_learn_question  (5 rows)
--   why: No family prefix; '_items' is filler
ALTER TABLE "ar_ling_question_items" RENAME TO "ar_ling_learn_question";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_learn_question'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_question_items';

-- ar_ling_question_kinds → ar_ling_learn_question_kind  (11 rows)
--   why: No family prefix; plural
ALTER TABLE "ar_ling_question_kinds" RENAME TO "ar_ling_learn_question_kind";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_learn_question_kind'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_question_kinds';

-- ar_ling_question_distractors → ar_ling_learn_question_distractor  (20 rows)
--   why: No family prefix; plural
ALTER TABLE "ar_ling_question_distractors" RENAME TO "ar_ling_learn_question_distractor";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_learn_question_distractor'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_question_distractors';

-- ar_ling_lemma_difficulty → ar_ling_learn_lemma_difficulty  (4,817 rows)
--   why: Pedagogy - moves out of the lemma family
ALTER TABLE "ar_ling_lemma_difficulty" RENAME TO "ar_ling_learn_lemma_difficulty";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_learn_lemma_difficulty'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lemma_difficulty';

-- ar_ling_lemma_registers → ar_ling_learn_lemma_register  (4,826 rows)
--   why: Pedagogy; plural. Verify not duplicate of difficulty first
ALTER TABLE "ar_ling_lemma_registers" RENAME TO "ar_ling_learn_lemma_register";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_learn_lemma_register'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lemma_registers';

