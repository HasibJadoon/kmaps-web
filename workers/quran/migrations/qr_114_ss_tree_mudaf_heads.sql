-- The treebank's iḍāfa, both sides. Where a tree is built right (sūra 12; 39:1; 44:4, 7, 8) the head of an iḍāfa is its
-- own node tagged مضاف beside its مضاف إليه (آيَاتُ = مضاف, الْكِتَابِ = مضاف إليه). Eleven newer trees gave the phrase only
-- its role (تَنْزِيلُ الْكِتَابِ = مبتدأ) and its مضاف إليه, never the head. Each head is added as the word before its
-- مضاف إليه (or, for an attached pronoun, the word itself less it — تَقَلُّبُ of تَقَلُّبُهُمْ), ordered before it.
-- Left as they are (a node holds one term): a ظرف before a clause (44:10, 44:16), and heads already present under
-- another term (44:15 كَاشِفُو, 44:20 رَبِّ, 44:23 عِبَادِ).
INSERT OR IGNORE INTO qr_ss_tree_node
  (id, tree_id, parent_node_id, node_label, scope_type, depth, node_order, term_key, label_ar, word_occurrence_id, is_virtual, gram_term_ref, created_at)
VALUES
  ('QR:TN:39:6:s1:11.mudaf', 'QR:TR:39:6:s1', 'QR:TN:39:6:s1:11', 'ثَمَانِيَةَ', 'word', 3, 0, 'mudaf', 'مضاف', '8af48c66d76293a9e0dea53a77', 0, 'GT:irab_role:mudaf', datetime('now')),
  ('QR:SSN:40:2:s1:$.tree.children[0].mudaf', 'QR:TR:40:2:s1', 'QR:SSN:40:2:s1:$.tree.children[0]', 'تَنْزِيلُ', NULL, 2, 2, 'mudaf', 'مضاف', '10ec04c8031e52f60281255a0a', 0, 'GT:irab_role:mudaf', datetime('now')),
  ('QR:SSN:40:2:s1:$.tree.children[1].children[0].children[2].mudaf', 'QR:TR:40:2:s1', 'QR:SSN:40:2:s1:$.tree.children[1].children[0].children[2]', 'غَافِرِ', NULL, 4, 8, 'mudaf', 'مضاف', '5f3f51bd144998bc6514ee500e', 0, 'GT:irab_role:mudaf', datetime('now')),
  ('QR:SSN:40:2:s1:$.tree.children[1].children[0].children[3].mudaf', 'QR:TR:40:2:s1', 'QR:SSN:40:2:s1:$.tree.children[1].children[0].children[3]', 'وَقَابِلِ', NULL, 4, 10, 'mudaf', 'مضاف', '1df78258ced6f7ad38bac2cdf0', 0, 'GT:irab_role:mudaf', datetime('now')),
  ('QR:SSN:40:2:s1:$.tree.children[1].children[0].children[4].mudaf', 'QR:TR:40:2:s1', 'QR:SSN:40:2:s1:$.tree.children[1].children[0].children[4]', 'شَدِيدِ', NULL, 4, 12, 'mudaf', 'مضاف', '72f2a2a295115d052eb4947454', 0, 'GT:irab_role:mudaf', datetime('now')),
  ('QR:SSN:40:2:s1:$.tree.children[1].children[0].children[5].mudaf', 'QR:TR:40:2:s1', 'QR:SSN:40:2:s1:$.tree.children[1].children[0].children[5]', 'ذِي', NULL, 4, 14, 'mudaf', 'مضاف', 'd4b78ba0e3b9e863a06178da73', 0, 'GT:irab_role:mudaf', datetime('now')),
  ('QR:SSN:40:4:s1:$.tree.children[2].children[0].mudaf', 'QR:TR:40:4:s1', 'QR:SSN:40:4:s1:$.tree.children[2].children[0]', 'آيَاتِ', NULL, 3, 5, 'mudaf', 'مضاف', '0633f687e8c687052dc5660c7f', 0, 'GT:irab_role:mudaf', datetime('now')),
  ('QR:SSN:40:4:s2:$.tree.children[3].mudaf', 'QR:TR:40:4:s2', 'QR:SSN:40:4:s2:$.tree.children[3]', 'تَقَلُّبُ', NULL, 2, 6, 'mudaf', 'مضاف', 'e9774616f986a94f2a01240f67', 0, 'GT:irab_role:mudaf', datetime('now')),
  ('QR:SSN:40:5:s1:$.tree.children[2].mudaf', 'QR:TR:40:5:s1', 'QR:SSN:40:5:s1:$.tree.children[2]', 'قَوْمُ', NULL, 2, 4, 'mudaf', 'مضاف', '8ea95872a1a00704a5fe4151ba', 0, 'GT:irab_role:mudaf', datetime('now')),
  ('QR:SSN:40:5:s2:$.tree.children[2].mudaf', 'QR:TR:40:5:s2', 'QR:SSN:40:5:s2:$.tree.children[2]', 'كُلُّ', NULL, 2, 4, 'mudaf', 'مضاف', '929ac0dbdb51d262878f2897ec', 0, 'GT:irab_role:mudaf', datetime('now')),
  ('QR:SSN:43:4:s1:$.tree.children[1].mudaf', 'QR:TR:43:4:s1', 'QR:SSN:43:4:s1:$.tree.children[1]', 'أُمِّ', NULL, 2, 3, 'mudaf', 'مضاف', 'ff35a91d3ee3be74ff13da62ab', 0, 'GT:irab_role:mudaf', datetime('now'));
