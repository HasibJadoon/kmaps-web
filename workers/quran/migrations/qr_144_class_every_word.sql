-- Forms & words drills every noun and verb of the passage (owner, 2026-10-15: "should have drills for all nouns and
-- verbs" · "All"): the class step asks for every word (extra.every — common words and the non-focus ones too, which
-- open practice still leaves out), each word every way it can be asked. vocab_rung stays out (a place on an arc,
-- not a fact of the text).
UPDATE qr_study_label
   SET extra_json = json_set(extra_json, '$.every', json('true'), '$.max', 400,
         '$.only.vocab', json('["vocab_meaning","vocab_root","vocab_lemma","vocab_family","vocab_form","vocab_kin","vocab_range","vocab_same"]'))
 WHERE scope = 'class_node' AND key = 'words';
