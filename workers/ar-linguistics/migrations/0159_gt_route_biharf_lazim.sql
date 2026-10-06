-- 0159: the verb table showed «متعدٍّ بحرف» for تَابَ while the word screen said لَازِم. Both meant the same thing: a verb
-- that cannot take an object by itself and reaches it only through a particle (تَابَ إِلَى، تَابَ عَلَى). In the grammar
-- books such a verb IS لازم; the particle is how it reaches (يَتَعَدَّى بِحَرْف). The route term now says so, so the two
-- labels agree.
UPDATE ar_ling_gram_term
   SET name_ar = 'لَازِمٌ يَتَعَدَّى بِحَرْف', name_en = 'intransitive; reaches its object through a particle'
 WHERE id = 'GT:taddiya_route:biharf';
