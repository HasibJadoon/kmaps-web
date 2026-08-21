-- ar_ling_lemma_arc: Government, and the table decides it.
--
-- The question was whether a lemma-scope arc belongs with Government (20-GOV,
-- where it is bound) or with the sense arcs (17-ARC). Its own columns answer:
-- construction_ar ("كَشَفَ + مفعول"), harf, has_object, attest_count — and ids
-- of the form ARC:كشف:verb:direct. It is organised by how the verb governs its
-- complement, not by how a sense travels. The arc_ar/en/ur columns describe
-- that construction's reach; the construction is the axis.
--
-- So the binding was right and only the declaration was missing — which is the
-- gap that let 00-CORE act as a default home in the first place.
UPDATE ar_ling_reg_sub_layer
   SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_lemma_arc')
 WHERE sub_code = '20-GOV' AND tables_json NOT LIKE '%ar_ling_lemma_arc%';
UPDATE ar_ling_reg_sub_layer
   SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_lemma_arc_example')
 WHERE sub_code = '20-GOV' AND tables_json NOT LIKE '%ar_ling_lemma_arc_example%';
