# Cluster Rename — Code-Change Checklist

> The rename (`0025_cluster_rename_reg_morph.sql`) must ship **with** these code
> edits — compat views keep SELECTs alive but writes to old names fail. Update each
> **25 distinct files** touch the renamed tables.

> file's table strings from the OLD name to the NEW name, deploy the workers, then
> apply 0025, then a later migration drops the compat views.
> Generated from `rg` over `workers/**/*.ts`, 2026-07-10.

## reg_*

- `ar_ling_gram_categories` → `ar_ling_reg_category`  (no code refs ✅)
- `ar_ling_gram_terms` → `ar_ling_reg_term`  (no code refs ✅)
- `ar_ling_gram_term_relations` → `ar_ling_reg_term_relation`  (no code refs ✅)
- `ar_ling_gram_term_examples` → `ar_ling_reg_term_example`  (no code refs ✅)
- `ar_ling_gram_term_sources` → `ar_ling_reg_term_source`  (no code refs ✅)
- `ar_ling_inflection_rules` → `ar_ling_reg_inflection_rule`  (1 file)
    - workers/ar-linguistics/src/schemas/morphology.schema.ts
- `ar_ling_semantic_fields` → `ar_ling_reg_semantic_field`  (1 file)
    - workers/ar-linguistics/src/schemas/lexicon.schema.ts
- `ar_ling_sentence_types` → `ar_ling_reg_sentence_type`  (1 file)
    - workers/ar-linguistics/src/schemas/nahw.schema.ts
- `ar_ling_clause_types` → `ar_ling_reg_clause_type`  (1 file)
    - workers/ar-linguistics/src/schemas/nahw.schema.ts
- `ar_ling_phrase_types` → `ar_ling_reg_phrase_type`  (1 file)
    - workers/ar-linguistics/src/schemas/nahw.schema.ts

## morph_*

- `ar_ling_roots` → `ar_ling_morph_root`  (12 files)
    - workers/ar-linguistics/src/routes/lexicon_lane.ts
    - workers/ar-linguistics/src/routes/lexicon_mufradat.ts
    - workers/ar-linguistics/src/routes/lexicon_five_lens.ts
    - workers/ar-linguistics/src/routes/lexicon_v2.ts
    - workers/ar-linguistics/src/routes/lexicon_lisan.ts
    - workers/ar-linguistics/src/routes/lexicon.ts
    - workers/ar-linguistics/src/repositories/lemma.repo.ts
    - workers/ar-linguistics/src/repositories/root.repo.ts
    - workers/ar-linguistics/src/repositories/word_view.repo.ts
    - workers/ar-linguistics/src/repositories/word_analysis.repo 2.ts
    - workers/ar-linguistics/src/repositories/word_analysis.repo.ts
    - workers/ar-linguistics/src/schemas/lemma.schema.ts
- `ar_ling_root_relations` → `ar_ling_morph_root_relation`  (no code refs ✅)
- `ar_ling_root_semantic_fields` → `ar_ling_morph_root_field`  (no code refs ✅)
- `ar_ling_root_variants` → `ar_ling_morph_root_variant`  (no code refs ✅)
- `ar_ling_root_antonyms` → `ar_ling_morph_root_antonym`  (3 files)
    - workers/ar-linguistics/src/repositories/word_view.repo.ts
    - workers/ar-linguistics/src/repositories/word_analysis.repo 2.ts
    - workers/ar-linguistics/src/repositories/word_analysis.repo.ts
- `ar_ling_root_scholarship` → `ar_ling_morph_root_scholarship`  (2 files)
    - workers/ar-linguistics/src/routes/scholarship.ts
    - workers/ar-linguistics/src/routes/lexicon.ts
- `ar_ling_root_sense_axes` → `ar_ling_morph_root_sense_axis`  (no code refs ✅)
- `ar_ling_root_development_stages` → `ar_ling_morph_root_dev_stage`  (no code refs ✅)
- `ar_ling_root_vocab` → `ar_ling_morph_root_vocab`  (2 files)
    - workers/ar-linguistics/src/repositories/word_analysis.repo 2.ts
    - workers/ar-linguistics/src/repositories/word_analysis.repo.ts
- `ar_ling_lemmas` → `ar_ling_morph_lemma`  (10 files)
    - workers/ar-linguistics/src/routes/lexicon_five_lens.ts
    - workers/ar-linguistics/src/routes/lexicon.ts
    - workers/arabic/src/repositories/vocabulary.repo.ts
    - workers/arabic/src/schemas/vocabulary.schema.ts
    - workers/ar-linguistics/src/repositories/lemma.repo.ts
    - workers/ar-linguistics/src/repositories/word_view.repo.ts
    - workers/ar-linguistics/src/repositories/word_analysis.repo.ts
    - workers/ar-linguistics/src/schemas/expression.schema.ts
    - workers/ar-linguistics/src/schemas/morphology.schema.ts
    - workers/ar-linguistics/src/schemas/lexicon.schema.ts
- `ar_ling_lemma_root_links` → `ar_ling_morph_lemma_root_link`  (1 file)
    - workers/ar-linguistics/src/routes/lexicon.ts
- `ar_ling_lemma_morphology` → `ar_ling_morph_lemma_bundle`  (1 file)
    - workers/ar-linguistics/src/schemas/morphology.schema.ts
- `ar_ling_lemma_variants` → `ar_ling_morph_lemma_variant`  (no code refs ✅)
- `ar_ling_lemma_registers` → `ar_ling_morph_lemma_register`  (no code refs ✅)
- `ar_ling_lemma_difficulty` → `ar_ling_morph_lemma_difficulty`  (no code refs ✅)
- `ar_ling_morphology` → `ar_ling_morph_bundle`  (3 files)
    - workers/ar-linguistics/src/repositories/morphology.repo.ts
    - workers/ar-linguistics/src/schemas/morphology.schema.ts
    - workers/ar-linguistics/src/schemas/lexicon.schema.ts
- `ar_ling_tokens` → `ar_ling_morph_token`  (1 file)
    - workers/ar-linguistics/src/repositories/al-source.repo.ts
- `ar_ling_token_lexicon_link` → `ar_ling_morph_token_lex_link`  (1 file)
    - workers/ar-linguistics/src/repositories/al-source.repo.ts
- `ar_ling_form_paradigms` → `ar_ling_morph_wazn_paradigm`  (2 files)
    - workers/ar-linguistics/src/repositories/morphology.repo.ts
    - workers/ar-linguistics/src/schemas/morphology.schema.ts
- `ar_ling_conjugation_templates` → `ar_ling_morph_conjugation`  (1 file)
    - workers/ar-linguistics/src/schemas/morphology.schema.ts
- `ar_ling_verb_government` → `ar_ling_morph_verb_gov`  (1 file)
    - workers/ar-linguistics/src/repositories/word_view.repo.ts
- `ar_ling_word_sums` → `ar_ling_morph_word_sum`  (no code refs ✅)

## syn_*

- `ar_ling_near_synonym_sets` → `ar_ling_syn_set`  (2 files)
    - workers/ar-linguistics/src/repositories/near_synonym.repo.ts
    - workers/ar-linguistics/src/schemas/lexicon.schema.ts
- `ar_ling_near_synonym_members` → `ar_ling_syn_member`  (2 files)
    - workers/ar-linguistics/src/repositories/near_synonym.repo.ts
    - workers/ar-linguistics/src/schemas/lexicon.schema.ts
- `ar_ling_near_synonym_evidence` → `ar_ling_syn_evidence`  (1 file)
    - workers/ar-linguistics/src/repositories/near_synonym.repo.ts
- `ar_ling_near_synonym_set_sources` → `ar_ling_syn_set_source`  (no code refs ✅)
- `ar_ling_near_synonym_member_sources` → `ar_ling_syn_member_source`  (no code refs ✅)
- `ar_ling_near_synonym_review_queue` → `ar_ling_syn_review_queue`  (no code refs ✅)

## expr_*

- `ar_ling_expressions` → `ar_ling_expr_idiom`  (5 files)
    - workers/ar-linguistics/src/routes/expressions.ts
    - workers/ar-linguistics/src/schemas/expression.schema.ts
    - workers/ar-linguistics/src/repositories/word_view.repo.ts
    - workers/ar-linguistics/src/repositories/expression.repo.ts
    - workers/quran/src/repositories/study.repo.ts
- `ar_ling_expression_tokens` → `ar_ling_expr_token`  (2 files)
    - workers/ar-linguistics/src/schemas/expression.schema.ts
    - workers/ar-linguistics/src/repositories/expression.repo.ts
- `ar_ling_expression_types` → `ar_ling_expr_type`  (2 files)
    - workers/ar-linguistics/src/repositories/expression.repo.ts
    - workers/ar-linguistics/src/schemas/expression.schema.ts
- `ar_ling_collocations` → `ar_ling_expr_collocation`  (2 files)
    - workers/ar-linguistics/src/repositories/expression.repo.ts
    - workers/ar-linguistics/src/schemas/expression.schema.ts

## learn_*

- `ar_ling_memlet_kinds` → `ar_ling_learn_memlet_kind`  (no code refs ✅)
- `ar_ling_memlets` → `ar_ling_learn_memlet`  (no code refs ✅)
- `ar_ling_memlet_media` → `ar_ling_learn_memlet_media`  (no code refs ✅)
- `ar_ling_memlet_mastery` → `ar_ling_learn_mastery`  (no code refs ✅)
- `ar_ling_question_kinds` → `ar_ling_learn_question_kind`  (no code refs ✅)
- `ar_ling_question_items` → `ar_ling_learn_question_item`  (no code refs ✅)
- `ar_ling_question_distractors` → `ar_ling_learn_distractor`  (no code refs ✅)
- `ar_ling_context_passages` → `ar_ling_learn_context_passage`  (no code refs ✅)
- `ar_ling_exposure_log` → `ar_ling_learn_exposure`  (no code refs ✅)
- `ar_ling_vocab_memory_hooks` → `ar_ling_learn_hook`  (no code refs ✅)
