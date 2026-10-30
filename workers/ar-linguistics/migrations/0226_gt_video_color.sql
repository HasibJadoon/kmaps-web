-- A colour map for video (owner, 2026-10-29: "add youtube color map"). Vivid, high-contrast colours tuned for a
-- dark frame and a phone screen, grouped by job: the sentence's two pillars (topic cyan, predicate amber), the
-- describers (violet), the iḍāfa pair (first term coral, second peach; true annexation teal, in form only rose),
-- particles red (as the ḥarf word colour). Studio's scenes take video_color first, then badge_color_dark.
ALTER TABLE ar_ling_gram_term ADD COLUMN video_color TEXT;
UPDATE ar_ling_gram_term SET video_color = '#F5C451' WHERE id IN ('GT:sentence_class:ismiyya', 'GT:harf_maani:muqattaa');
UPDATE ar_ling_gram_term SET video_color = '#4DD0E1' WHERE id IN ('GT:irab_role:mubtada', 'GT:irab_role:mubtada_muakhkhar', 'GT:irab_role:ism_la');
UPDATE ar_ling_gram_term SET video_color = '#FFB74D' WHERE id IN ('GT:irab_role:khabar', 'GT:sentence_role:khabar', 'GT:irab_role:khabar_muqaddam', 'GT:irab_role:khabar_la');
UPDATE ar_ling_gram_term SET video_color = '#B39DFF' WHERE id IN ('GT:irab_role:naat');
UPDATE ar_ling_gram_term SET video_color = '#E1A6F0' WHERE id IN ('GT:irab_role:maatuf');
UPDATE ar_ling_gram_term SET video_color = '#69E0A0' WHERE id IN ('GT:irab_role:badal');
UPDATE ar_ling_gram_term SET video_color = '#FF8A65' WHERE id IN ('GT:irab_role:mudaf');
UPDATE ar_ling_gram_term SET video_color = '#FFD3A1' WHERE id IN ('GT:irab_role:mudaf_ilayh', 'GT:sentence_role:mudaf_ilayh');
UPDATE ar_ling_gram_term SET video_color = '#4DD8C0' WHERE id IN ('GT:idafa_kind:manawiya');
UPDATE ar_ling_gram_term SET video_color = '#FF6FA3' WHERE id IN ('GT:idafa_kind:lafziya', 'GT:harf_maani:hasr');
UPDATE ar_ling_gram_term SET video_color = '#FF6B6B' WHERE id IN ('GT:pos:harf_jarr', 'GT:nawasikh:la_nafiya_lil_jins');
UPDATE ar_ling_gram_term SET video_color = '#8EC9FF' WHERE id IN ('GT:case:genitive');
