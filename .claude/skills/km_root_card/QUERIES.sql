
-- ─── 10 · TERM REGISTRY (GT namespace) ───────────────────────────────
SELECT prefix, target_db, target_table, target_key
FROM ar_ling_reg_ref_namespace WHERE prefix = 'GT';

-- available terms by category
SELECT category_key, COUNT(*) n, GROUP_CONCAT(term_key) keys
FROM ar_ling_gram_term WHERE status = 'live'
  AND category_key IN ('form_family','transitivity','taddiya_route',
                       'derivation_type','root_type','pos','form_tier')
GROUP BY category_key;

-- resolve a set of refs (id + uid + names)
SELECT id, category_key, term_key, name_ar, name_en, uid
FROM ar_ling_gram_term WHERE status = 'live' AND id IN (:refs);

-- CONFORMANCE: every GT: ref on the card must resolve. MUST return zero rows.
SELECT DISTINCT value AS unresolved_ref FROM json_tree(:card_fields_json)
WHERE value LIKE 'GT:%'
  AND value NOT IN (SELECT id FROM ar_ling_gram_term WHERE status = 'live');
