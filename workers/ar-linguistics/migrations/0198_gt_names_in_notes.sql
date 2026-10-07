-- Grammar terms in display notes by their GT name (ar_ling_gram_term.name_ar), never transliterated or paraphrased:
-- "verbal noun" → مَصْدَر (GT:derivation_type:masdar), "adverb of place" → ظَرْف مَكَان (GT:harf_maani:zarf_makan),
-- "a preposition" → حرف جرّ (GT:pos:harf_jarr), "the iḍāfa" → the مضاف إليه (GT:irab_role:mudaf_ilayh).
UPDATE ar_ling_lemma_arc SET boundary_note_en = replace(replace(boundary_note_en, 'The verbal noun', 'The مَصْدَر'), 'verbal noun', 'مَصْدَر') WHERE boundary_note_en LIKE '%verbal noun%';
UPDATE ar_ling_lemma_arc SET boundary_note_en = replace(replace(boundary_note_en, 'an adverb of place, not a preposition', 'a ظَرْف مَكَان, not a حرف جرّ'), 'adverb of place', 'ظَرْف مَكَان') WHERE boundary_note_en LIKE '%adverb of place%';
UPDATE ar_ling_lemma_arc SET arc_en = replace(arc_en, 'the iḍāfa names', 'the مضاف إليه names') WHERE id = 'ARC:شدد:shadid:idafa' AND arc_en LIKE '%the iḍāfa names%';
