-- Forms & words also drills every key term (Sinai, Key Terms) and every theological expression of the passage
-- (owner, 2026-10-15: "if any term — key term, theology — must be included"): the keyterm and expression skills,
-- every live ask of each.
UPDATE qr_study_label
   SET extra_json = json_set(extra_json,
         '$.skills', json('["sarf","vocab","keyterm","expression"]'),
         '$.only.keyterm', json('["kt_gloss","kt_form","kt_word","kt_point"]'),
         '$.only.expression', json('["ex_meaning","ex_range","ex_note","ex_particle","ex_verb","ex_where"]'))
 WHERE scope = 'class_node' AND key = 'words';
