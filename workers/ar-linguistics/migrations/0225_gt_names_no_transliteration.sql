-- GT English names shown on the Burhan sentence scenes, without transliteration (owner, 2026-10-28:
-- "No transliteration use Arabic Name … GT"). Arabic words stay in Arabic script inside the English.
-- The part before " — " is the short label; the rest stays as the name's explanation. Re-runnable.
UPDATE ar_ling_gram_term SET name_en = 'adjective' WHERE id = 'GT:irab_role:naat';
UPDATE ar_ling_gram_term SET name_en = 'restriction — confines the ruling to one term (إلا, إنما)' WHERE id = 'GT:harf_maani:hasr';
UPDATE ar_ling_gram_term SET name_en = 'disjoined letters — the letters that open certain sūras' WHERE id = 'GT:harf_maani:muqattaa';
UPDATE ar_ling_gram_term SET name_en = 'لا of absolute negation' WHERE id = 'GT:nawasikh:la_nafiya_lil_jins';
UPDATE ar_ling_gram_term SET name_en = 'noun of لا — the noun of لا of absolute negation' WHERE id = 'GT:irab_role:ism_la';
UPDATE ar_ling_gram_term SET name_en = 'predicate of لا — the predicate of لا of absolute negation' WHERE id = 'GT:irab_role:khabar_la';
UPDATE ar_ling_gram_term SET name_en = 'topic — the subject of a nominal sentence' WHERE id = 'GT:irab_role:mubtada';
-- The iḍāfa parts and kinds in the words the iḍāfa deck uses (CM:DOC:nahw:idafa:deck).
UPDATE ar_ling_gram_term SET name_en = 'first noun — the first of two joined nouns' WHERE id = 'GT:irab_role:mudaf';
UPDATE ar_ling_gram_term SET name_en = 'second noun — the second of two joined nouns, always genitive' WHERE id IN ('GT:irab_role:mudaf_ilayh', 'GT:sentence_role:mudaf_ilayh');
UPDATE ar_ling_gram_term SET name_en = 'join of meaning — makes the first noun definite, or narrows it' WHERE id = 'GT:idafa_kind:manawiya';
UPDATE ar_ling_gram_term SET name_en = 'join of wording — only makes the phrase lighter to say' WHERE id = 'GT:idafa_kind:lafziya';
