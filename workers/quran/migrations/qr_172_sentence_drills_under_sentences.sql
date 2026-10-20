-- A sentence's own drills under Sentences (owner, 2026-10-20): each word described (wordclass), the sentence's parts
-- (sentpart) and its Arabic built from its meaning (transbuild) are asked in that sentence's node of the Sentences step,
-- beside its build, fill, tree, iʿrāb and grammar. Read & listen keeps the passage built whole and its key terms.
UPDATE qr_study_label
   SET extra_json = json_set(extra_json, '$.only.reading', json('["keyterm"]'), '$.rev', 6)
 WHERE scope = 'class_node' AND key = 'read';
UPDATE qr_study_label
   SET extra_json = json_set(extra_json, '$.skills', json('["ss","reading","irab","grammar","balagha"]'),
                             '$.only.reading', json('["wordclass","sentpart","transbuild"]'), '$.rev', 2)
 WHERE scope = 'class_node' AND key = 'sentences';
