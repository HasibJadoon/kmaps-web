-- Structure drills (practice-structure.ts): the skill, the instruction each ask is worded by,
-- and the class's step 5 (class_node 'structure') now made of them. The relations, shapes and
-- ring sides they offer are registry terms (AL 0122), projected into this database's mirror by
-- scripts/project-gram-terms.mjs.

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('skill', 'structure', 'Structure', 'بِنَاءُ السُّورَة', 'How each passage stands to the others, its ring partner, its movement', 'point.3.connected.trianglepath.dotted', '#9C89B8', NULL,
 '{"source":"structure"}', 12);

INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
('kind', 'st_relation', 'How does this passage stand to the other?', 'ما صلة هذا المقطع بذاك؟', NULL, NULL, NULL, NULL, NULL, 210),
('kind', 'st_ring', 'Which passage does it answer across the sūra?', 'أيّ مقطع يقابله في حلقة السورة؟', NULL, NULL, NULL, NULL, NULL, 211),
('kind', 'st_ring_side', 'Where does it stand in the sūra''s ring?', 'أين موضعه من حلقة السورة؟', NULL, NULL, NULL, NULL, NULL, 212),
('kind', 'st_arc', 'Which movement of the sūra is it part of?', 'من أيّ مسار في السورة هو؟', NULL, NULL, NULL, NULL, NULL, 213),
('kind', 'st_arc_shape', 'What shape does this movement take?', 'ما نسق هذا المسار؟', NULL, NULL, NULL, NULL, NULL, 214),
('kind', 'st_arc_order', 'Put the movement''s passages in order', 'رتّب مقاطع المسار', NULL, NULL, NULL, NULL, NULL, 215),
('kind', 'st_place', 'Put the passage among its neighbours', 'ضع المقطع بين جاريه', NULL, NULL, NULL, NULL, NULL, 216);

UPDATE qr_study_label
   SET extra_json = '{"kind":"step","step":5,"skills":["structure"],"max":30,"sprint":12}'
 WHERE scope = 'class_node' AND key = 'structure';
