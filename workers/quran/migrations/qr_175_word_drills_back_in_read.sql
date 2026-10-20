-- qr_172 undone (owner, 2026-10-20): "under sentences" meant Read & listen's own sentence nodes. Each sentence of Read &
-- listen holds again its words described as the corpus (QAC) describes them, its parts and its build-from-meaning, with
-- its key terms; the Sentences step holds its structure drills alone, as before.
UPDATE qr_study_label
   SET extra_json = json_set(json_remove(extra_json, '$.only.reading'), '$.rev', 7)
 WHERE scope = 'class_node' AND key = 'read';
UPDATE qr_study_label
   SET extra_json = json_set(json_remove(extra_json, '$.only.reading'), '$.skills', json('["ss","irab","grammar","balagha"]'), '$.rev', 3)
 WHERE scope = 'class_node' AND key = 'sentences';
