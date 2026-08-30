ALTER TABLE "ar_ling_root_vocab" RENAME TO "ar_ling_learn_vocab";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_learn_vocab'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_root_vocab';

ALTER TABLE "ar_ling_memlets" RENAME TO "ar_ling_learn_memlet";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_learn_memlet'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_memlets';

ALTER TABLE "ar_ling_memlet_kinds" RENAME TO "ar_ling_learn_memlet_kind";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_learn_memlet_kind'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_memlet_kinds';

ALTER TABLE "ar_ling_memlet_media" RENAME TO "ar_ling_learn_memlet_media";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_learn_memlet_media'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_memlet_media';

ALTER TABLE "ar_ling_vocab_memory_hooks" RENAME TO "ar_ling_learn_memory_hook";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_learn_memory_hook'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_vocab_memory_hooks';

ALTER TABLE "ar_ling_context_passages" RENAME TO "ar_ling_learn_example";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_learn_example'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_context_passages';

ALTER TABLE "ar_ling_question_items" RENAME TO "ar_ling_learn_question";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_learn_question'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_question_items';

ALTER TABLE "ar_ling_question_kinds" RENAME TO "ar_ling_learn_question_kind";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_learn_question_kind'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_question_kinds';

ALTER TABLE "ar_ling_question_distractors" RENAME TO "ar_ling_learn_question_distractor";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_learn_question_distractor'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_question_distractors';

ALTER TABLE "ar_ling_lemma_difficulty" RENAME TO "ar_ling_learn_lemma_difficulty";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_learn_lemma_difficulty'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lemma_difficulty';

ALTER TABLE "ar_ling_lemma_registers" RENAME TO "ar_ling_learn_lemma_register";
UPDATE ar_ling_reg_table_map SET table_name = 'ar_ling_learn_lemma_register'
 WHERE db = 'km_arabic_linguistic' AND table_name = 'ar_ling_lemma_registers';
