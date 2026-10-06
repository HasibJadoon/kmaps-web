-- 0134: مشتق / جامد is a LEMMA fact (the same in every verse), so it lives beside the lemma's pattern
-- and derivation in ar_ling_root_lemma_wazn, as its own GT column. Every derivation type (participles,
-- ṣifa mushabbaha, mubālagha, maṣdar, maṣdar mīmī …) is مشتق, as QAC tags them; ذَنْب is جامد (0132).
ALTER TABLE ar_ling_root_lemma_wazn ADD COLUMN jumud_ref TEXT REFERENCES ar_ling_gram_term(id);
UPDATE ar_ling_root_lemma_wazn SET jumud_ref = 'GT:jumud:mushtaqq' WHERE gram_term_ref LIKE 'GT:derivation_type:%';
UPDATE ar_ling_root_lemma_wazn SET jumud_ref = 'GT:jumud:jamid' WHERE gram_term_ref = 'GT:jumud:jamid';
