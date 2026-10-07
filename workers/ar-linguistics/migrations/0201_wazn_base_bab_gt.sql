-- 19 lemma-form rows named their base verb's باب rule-style (bab_faila, bab_faula, bab_faala, bab_qatala), which the
-- family chip and the base-verb match cannot read. Each gets its GT باب from its base verb's present vowel; three
-- base verbs are put in the "past present" shape the readers expect.
UPDATE ar_ling_root_lemma_wazn SET base_bab = 'bab_samia'  WHERE status = 'live' AND base_bab = 'bab_faila';
UPDATE ar_ling_root_lemma_wazn SET base_bab = 'bab_karuma' WHERE status = 'live' AND base_bab = 'bab_faula';
UPDATE ar_ling_root_lemma_wazn SET base_bab = 'bab_daraba' WHERE status = 'live' AND base_bab = 'bab_faala' AND base_verb = 'غَفَرَ يَغْفِرُ';
UPDATE ar_ling_root_lemma_wazn SET base_bab = 'bab_fataha' WHERE status = 'live' AND base_bab = 'bab_faala' AND base_verb = 'جَمَعَ يَجْمَعُ';
UPDATE ar_ling_root_lemma_wazn SET base_bab = 'bab_nasara' WHERE status = 'live' AND base_bab = 'bab_qatala';
UPDATE ar_ling_root_lemma_wazn SET base_verb = 'شَهِدَ يَشْهَدُ' WHERE status = 'live' AND base_verb = 'شَهِدَ شُهُودًا';
UPDATE ar_ling_root_lemma_wazn SET base_verb = 'بَصُرَ يَبْصُرُ' WHERE status = 'live' AND base_verb = 'بَصُرَ بَصَارَةً';
UPDATE ar_ling_root_lemma_wazn SET base_verb = 'كَبُرَ يَكْبُرُ' WHERE status = 'live' AND base_verb = 'كَبُرَ / كَبِرَ';
