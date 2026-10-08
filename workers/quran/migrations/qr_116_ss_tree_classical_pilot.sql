-- Pilot of the classical tree (the shape every tree is to take, by the owner): the sentence, then its pillars in the
-- iʿrāb's own order — a nominal sentence مبتدأ then خبر, a verbal one فعل, فاعل, the مفاعيل, a conditional أداة الشرط,
-- فعل الشرط, جواب الشرط — and each pillar opening into its parts. 40:2: «مِنَ اللَّهِ» was named only جار ومجرور; it is
-- the sentence's خبر (شبه جملة — the خبر itself, or متعلق بمحذوف خبر), opening into مِنَ (حرف جرّ) and اللَّهِ (مجرور),
-- which carries the six attributes.
UPDATE qr_ss_tree_node SET gram_term_ref = 'GT:irab_role:khabar', term_key = 'khabar',
       label_ar = 'شبه جملة: هو الخبر نفسه (دعاس والدرويش) أو متعلقان بمحذوف خبر (الميسر والجدول)'
 WHERE id = 'QR:SSN:40:2:s1:$.tree.children[1]' AND gram_term_ref = 'GT:irab_role:jarr_majrur';
UPDATE qr_ss_tree_node SET gram_term_ref = 'GT:case:genitive', term_key = 'majrur'
 WHERE id = 'QR:SSN:40:2:s1:$.tree.children[1].children[0]' AND gram_term_ref = 'GT:irab_role:jarr_majrur';
INSERT OR IGNORE INTO qr_ss_tree_node
  (id, tree_id, parent_node_id, node_label, depth, node_order, term_key, label_ar, word_occurrence_id, is_virtual, gram_term_ref, created_at)
VALUES ('QR:SSN:40:2:s1:$.tree.children[1].harf', 'QR:TR:40:2:s1', 'QR:SSN:40:2:s1:$.tree.children[1]', 'مِنَ', 2, 4,
        'harf_jarr', NULL, '4c323f01bf9026b4cc1e4f422c', 0, 'GT:pos:harf_jarr', datetime('now'));
