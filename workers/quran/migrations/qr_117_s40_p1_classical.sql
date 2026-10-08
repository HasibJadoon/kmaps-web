-- Sūra 40, passage 1 (40:1–3), classical: each sentence's balāgha type, grounded; the treebank's خبر لا named.
-- 40:2 is a خبر ابتدائي by design: Ibn ʿĀshūr (al-Taḥrīr wa-l-Tanwīr, Ghāfir 2) says it is addressed to the deniers
-- yet bare of emphasis — «فتجريد الخبر عن المؤكد إخراج له على خلاف مقتضى الظاهر بجعل المنكر كغير المنكر»; the rule
-- (an addressee empty of the judgement needs no emphasis) is al-Qazwīnī, al-Īḍāḥ (qazwini_idah) ج1 ص69. 40:3's two
-- sentences: no source states a degree, so they stay الخبر; what the books do say is recorded.
UPDATE qr_ss_occ_sentence SET gt_kalam_kind = 'GT:balagha_maani:khabar_ibtidai' WHERE id = 'QR:SS:40:2:s1';
UPDATE qr_ss_occ_sentence SET gt_kalam_kind = 'GT:balagha_maani:khabar' WHERE id IN ('QR:SS:40:1:s1', 'QR:SS:40:3:s1', 'QR:SS:40:3:s2');
INSERT OR IGNORE INTO qr_ss_scope_balagha_link (id, scope_type, scope_id, lx_balagha_ref, balagha_category, rhetorical_effect, note_md) VALUES
('QR:BLK:QR:SS:40:2:s1', 'sentence', 'QR:SS:40:2:s1', 'GT:balagha_maani:khabar_ibtidai', 'mani',
 'A plain statement to deniers, as if they did not deny: the proofs around them should have stopped their denial.',
 'خبر ابتدائي خالٍ من المؤكدات مع أنه موجه إلى المشركين المنكرين: إخراج على خلاف مقتضى الظاهر بجعل المنكر كغير المنكر لما يحف به من الأدلة (ابن عاشور، التحرير والتنوير، غافر ٢). القاعدة: خالي الذهن يُستغنى معه عن المؤكدات (القزويني، الإيضاح ١/٦٩)'),
('QR:BLK:QR:SS:40:3:s1', 'sentence', 'QR:SS:40:3:s1', 'GT:balagha_maani:qasr_nafy_istithna', 'mani',
 'Restriction by negation and exception: no god but He.',
 'قصر بالنفي والاستثناء؛ والجملة في موضع الصفة (ابن عاشور، التحرير والتنوير، غافر ٣)'),
('QR:BLK:QR:SS:40:3:s2', 'sentence', 'QR:SS:40:3:s2', 'GT:balagha_maani:ihtimam_khabar', 'mani',
 'The phrase “to Him” comes first for weight and for the verse-end rhyme; a warning of the raising and the reckoning.',
 'تقديم المجرور «إليه» للاهتمام وللرعاية على الفاصلة، والجملة إنذار بالبعث والجزاء (ابن عاشور، التحرير والتنوير، غافر ٣)');
UPDATE qr_ss_tree_node SET gram_term_ref = 'GT:irab_role:khabar_la', term_key = 'khabar_la'
 WHERE tree_id = (SELECT id FROM qr_ss_tree WHERE sentence_id = 'QR:SS:40:3:s1')
   AND node_label = '(مَوْجُودٌ)' AND gram_term_ref = 'GT:irab_role:khabar';
