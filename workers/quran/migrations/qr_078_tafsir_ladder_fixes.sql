-- The commentary ladder, first pass checked against the dealt drills:
-- قُلْتُ is the answer marker only where it stands as the author writes it (قلت:), not inside فإن قلت;
-- the Commentary questions step keeps its meaning questions — hearing single lines now has its own
-- rung (Hear it alone), so the old listen lines leave it.
UPDATE qr_tafsir_gloss SET needle = 'قلت:' WHERE key = 'p_qultu';
UPDATE qr_study_label SET extra_json = json_set(extra_json, '$.skills', json('["tafsir_meaning"]'))
 WHERE scope = 'class_node' AND key = 'tafsir';
