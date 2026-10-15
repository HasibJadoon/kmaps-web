-- Each module of a class has two portions: its study (the passage study step it opens — reading, vocabulary,
-- sentence_structure, passage_structure, tafsir) and then its drills, focused on what that study covered (owner,
-- 2026-10-16). The inner path of a class starts with its module's study.
UPDATE qr_study_label SET extra_json = json_set(extra_json, '$.module.study', CASE
    WHEN json_extract(extra_json, '$.module.n') = 1 THEN 'reading'
    WHEN json_extract(extra_json, '$.module.n') = 2 THEN 'vocabulary'
    WHEN json_extract(extra_json, '$.module.n') = 3 THEN 'sentence_structure'
    WHEN json_extract(extra_json, '$.module.n') = 4 THEN 'passage_structure'
    WHEN json_extract(extra_json, '$.module.n') = 5 THEN 'tafsir' END)
 WHERE scope = 'class_node' AND json_extract(extra_json, '$.module.n') BETWEEN 1 AND 5;
INSERT INTO qr_study_label (scope, key, label, label_ar, sort) VALUES
  ('class_ui', 'study_first', 'Study', 'الدَّرْس', 920),
  ('class_ui', 'study_detail', 'The lesson, before its drills', 'الدَّرْسُ قَبْلَ تَمَارِينِه', 921),
  ('class_ui', 'back_to_class', 'Back to the class', 'العَوْدَةُ إِلَى الدَّرْس', 922)
ON CONFLICT (scope, key) DO UPDATE SET label = excluded.label, label_ar = excluded.label_ar;
