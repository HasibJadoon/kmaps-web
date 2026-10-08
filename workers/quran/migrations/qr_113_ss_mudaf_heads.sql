-- Every iḍāfa has two sides, but the sentence structure tagged only one: 58 words carry GT:irab_role:mudaf_ilayh and
-- not one carries GT:irab_role:mudaf, so «تَنْزِيلُ الْكِتَابِ» showed الكتاب as مضاف إليه and تنزيل as nothing of the
-- kind. The مضاف is the word directly before its مضاف إليه (an attached pronoun is inside the same word), so each head
-- is derived from the link already there and says which it came from. Re-runnable: a head already tagged is left.
-- Five مضاف إليه tags are wrong (no noun before them to be مضاف) and are left out until they are corrected:
-- 39:12 وَأُمِرْتُ (a verb), 39:17 فَبَشِّرْ عِبَادِ (مفعول به), 39:67 قَدْرِهِ وَالْأَرْضُ (a new clause), 39:71 إِلَى
-- جَهَنَّمَ (after a preposition), 39:72 فِيهَا فَبِئْسَ (a verb).
INSERT OR IGNORE INTO qr_ss_scope_morph_link
  (id, scope_type, scope_id, lx_morph_ref, irab_position, irab_sign, syntactic_function, is_disputed, note_md, gram_term_ref)
SELECT 'QR:SMLM:' || p.surah || ':' || p.ayah || ':' || p.word_index, 'word', p.id, 'GT:irab_role:mudaf', NULL, NULL, 'mudaf', 0,
       json_object('derived_from', m.id, 'rule', 'the noun before a مضاف إليه is its مضاف'), 'GT:irab_role:mudaf'
  FROM qr_ss_scope_morph_link m
  JOIN qr_word_occurrence o ON m.scope_type = 'word' AND m.scope_id = o.id
  JOIN qr_word_occurrence p ON p.surah = o.surah AND p.ayah = o.ayah AND p.word_index = o.word_index - 1
 WHERE m.lx_morph_ref = 'GT:irab_role:mudaf_ilayh'
   AND (o.surah || ':' || o.ayah || ':' || o.word_index) NOT IN ('39:12:1', '39:17:12', '39:67:6', '39:71:5', '39:72:7')
   AND NOT EXISTS (SELECT 1 FROM qr_ss_scope_morph_link x
                    WHERE x.scope_type = 'word' AND x.scope_id = p.id AND x.lx_morph_ref = 'GT:irab_role:mudaf');
