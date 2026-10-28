-- The kind of each iḍāfa, on the tree node that heads it (the muḍāf). A pair can be الإضافة المعنوية (it makes the
-- first word definite) or الإضافة اللفظية (lightness only; the word stays indefinite). The tree said "muḍāf" and
-- nothing more, so a class could not show which pairs are which. Owner, 2026-10-28: the Burhan class teaches
-- iḍāfa lafẓiyya as the passage's big idea.
ALTER TABLE qr_ss_tree_node ADD COLUMN idafa_kind_ref TEXT;

-- Ghāfir 40:2–3. Verdicts from CM:DOC:nahw:40:3:shadid-al-iqab (its table of the six naʿts): غافر and قابل are
-- محضة (a settled attribute annexed to its object), ذي is a noun annexed to a definite, شديد is a صفة مشبهة annexed
-- to its own subject, so لفظية. تنزيل is a maṣdar, not a descriptive word, and only a descriptive muḍāf makes a
-- lafẓiyya pair (CM:DOC:nahw:idafa:deck, slide 12).
UPDATE qr_ss_tree_node SET idafa_kind_ref = 'GT:idafa_kind:manawiya' WHERE id IN (
  'QR:SSN:40:2:s1:$.tree.children[0].mudaf',
  'QR:SSN:40:2:s1:$.tree.children[1].children[0].children[2].mudaf',
  'QR:SSN:40:2:s1:$.tree.children[1].children[0].children[3].mudaf',
  'QR:SSN:40:2:s1:$.tree.children[1].children[0].children[5].mudaf');
UPDATE qr_ss_tree_node SET idafa_kind_ref = 'GT:idafa_kind:lafziya' WHERE id =
  'QR:SSN:40:2:s1:$.tree.children[1].children[0].children[4].mudaf';
