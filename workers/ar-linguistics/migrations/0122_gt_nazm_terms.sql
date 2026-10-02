-- The naẓm of a sūra as registry terms, so its structure drills carry GT like every other drill
-- (Rule 1 of the drill-engine plan): how a passage stands to another (nazm_relation), the
-- shape of a movement of passages (nazm_arc), and where a passage stands in the sūra's ring
-- (ring_side). Each term_key is the value km_quran's qr_passage_section.data_json already uses
-- (relation.type, arc.type, ring.side), so a section names its term without a lookup:
-- GT:<category>:<value>.
--
-- Applied by hand when the ledger is out of step: d1 execute --file, then
--   INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0122_gt_nazm_terms.sql');

INSERT OR IGNORE INTO ar_ling_gram_category (category_key, name_ar, name_en, name_ur, discipline, applies_to, is_closed, display_order) VALUES
('nazm_relation', 'المناسبة بين المقاطع', 'relation between passages', 'مقاطع کا باہمی ربط', 'BL', 'discourse', 1, 25),
('nazm_arc', 'أنساق المسار', 'shape of a movement', 'سلسلے کی ساخت', 'BL', 'discourse', 1, 26),
('ring_side', 'الموضع من الحلقة', 'place in the ring', 'حلقے میں مقام', 'BL', 'discourse', 1, 27);

INSERT OR IGNORE INTO ar_ling_gram_term (id, category_key, term_key, term_order, name_ar, name_en, name_ur, definition_en, badge_color, status, discipline, name_bare) VALUES
('GT:nazm_relation:premise', 'nazm_relation', 'premise', 1, 'التمهيد', 'premise', 'تمہید',
 'One passage lays the ground the other stands on.', '#7FB3D5', 'live', 'BL', 'التمهيد'),
('GT:nazm_relation:escalation', 'nazm_relation', 'escalation', 2, 'الترقّي', 'escalation', 'ترقی',
 'The later passage carries the earlier one a step further, never back.', '#E07A5F', 'live', 'BL', 'الترقي'),
('GT:nazm_relation:twin', 'nazm_relation', 'twin', 3, 'التناظر', 'twin', 'تناظر',
 'Two passages built on the same pattern, each answering the other.', '#81B29A', 'live', 'BL', 'التناظر'),
('GT:nazm_relation:mirror', 'nazm_relation', 'mirror', 4, 'التقابل', 'mirror', 'تقابل',
 'The second passage turns the first around: the same terms, the case reversed.', '#9C89B8', 'live', 'BL', 'التقابل'),
('GT:nazm_relation:contest', 'nazm_relation', 'contest', 5, 'المحاجّة', 'contest', 'محاجّہ',
 'Two sides set against each other: a claim and the answer to it.', '#F2CC8F', 'live', 'BL', 'المحاجة'),
('GT:nazm_relation:verdict_pair', 'nazm_relation', 'verdict_pair', 6, 'الحكمان المتقابلان', 'paired verdicts', 'متقابل فیصلے',
 'Two verdicts that face each other: the one passed on one party, the one on the other.', '#D8B657', 'live', 'BL', 'الحكمان المتقابلان'),
('GT:nazm_relation:root_link', 'nazm_relation', 'root_link', 7, 'الاشتراك في الجذر', 'shared root', 'مشترک مادہ',
 'The two passages are bound by words of one root.', '#4FB3A9', 'live', 'BL', 'الاشتراك في الجذر'),

('GT:nazm_arc:chain', 'nazm_arc', 'chain', 1, 'التسلسل', 'chain', 'تسلسل',
 'The passages follow one another, each taking up what the last left.', '#6D9DC5', 'live', 'BL', 'التسلسل'),
('GT:nazm_arc:escalation', 'nazm_arc', 'escalation', 2, 'الترقّي', 'escalation', 'ترقی',
 'Each station is a step higher than the one before it.', '#E07A5F', 'live', 'BL', 'الترقي'),
('GT:nazm_arc:ring', 'nazm_arc', 'ring', 3, 'البناء الحلقي', 'ring', 'حلقہ وار ساخت',
 'The movement returns at its end to where it began.', '#81B29A', 'live', 'BL', 'البناء الحلقي'),
('GT:nazm_arc:frame', 'nazm_arc', 'frame', 4, 'الإطار', 'frame', 'چوکھٹا',
 'An opening and a closing hold what stands between them.', '#9C89B8', 'live', 'BL', 'الإطار'),
('GT:nazm_arc:bracket', 'nazm_arc', 'bracket', 5, 'الاحتواء', 'bracket', 'احاطہ',
 'A short span closed at both ends by the same matter.', '#B388EB', 'live', 'BL', 'الاحتواء'),
('GT:nazm_arc:petition_to_law', 'nazm_arc', 'petition_to_law', 6, 'من الدعاء إلى الحكم', 'petition to law', 'دعا سے حکم تک',
 'What is first asked for is at the end laid down.', '#F4A261', 'live', 'BL', 'من الدعاء الى الحكم'),

('GT:ring_side:first', 'ring_side', 'first', 1, 'الطرف الأول', 'first side', 'پہلا سرا',
 'The passage opens a pair that a later passage closes.', '#7FB3D5', 'live', 'BL', 'الطرف الاول'),
('GT:ring_side:second', 'ring_side', 'second', 2, 'الطرف الثاني', 'second side', 'دوسرا سرا',
 'The passage closes a pair an earlier passage opened.', '#81B29A', 'live', 'BL', 'الطرف الثاني'),
('GT:ring_side:centre', 'ring_side', 'centre', 3, 'المركز', 'centre', 'مرکز',
 'The passage stands at the turning point the ring is built round.', '#D8B657', 'live', 'BL', 'المركز'),
('GT:ring_side:unpaired', 'ring_side', 'unpaired', 4, 'المنفرد', 'unpaired', 'منفرد',
 'The passage stands in the ring without a partner.', '#8D99A6', 'live', 'BL', 'المنفرد');

INSERT OR IGNORE INTO ar_ling_gram_term_alias (alias_bare, term_id, category_key, alias_raw, alias_lang, alias_kind, source)
SELECT name_bare, id, category_key, name_ar, 'ar', 'headword', 'name_ar' FROM ar_ling_gram_term
 WHERE category_key IN ('nazm_relation', 'nazm_arc', 'ring_side') AND name_bare IS NOT NULL;
