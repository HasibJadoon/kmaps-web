-- tree_slots (drill-engine plan Phase 0.2): a built sentence's parts placed in their roles on its tree. The Sentences step
-- asks it beside its other sentence-structure asks, and its instruction is a label row like every ask's.
UPDATE qr_study_label SET extra_json = json_set(extra_json, '$.only.ss', json('["ss_kind","ss_mahall","ss_role","ss_ellipsis","ss_buildup","ss_why","ss_tree"]'))
 WHERE scope = 'class_node' AND key = 'sentences';
INSERT OR REPLACE INTO qr_study_label (scope, key, label, label_ar, detail, icon, sort) VALUES
  ('kind', 'ss_tree', 'Place each part of the sentence in its role', 'ضَعْ كُلَّ جُزْءٍ مِنَ الجُمْلَةِ فِي مَوْقِعِهِ', 'The sentence''s pillars, in the iʿrāb''s order, each to its role', 'square.grid.3x1.below.line.grid.1x2', 90);
