-- qr_090: QR's copy of the GT registry follows AL 0159 — «متعدٍّ بحرف» → «لَازِمٌ يَتَعَدَّى بِحَرْف» (a verb that
-- reaches its object only through a particle is لازم), so the verb table and the word screen agree.
UPDATE ar_ling_gram_term
   SET name_ar = 'لَازِمٌ يَتَعَدَّى بِحَرْف', name_en = 'intransitive; reaches its object through a particle'
 WHERE id = 'GT:taddiya_route:biharf';
