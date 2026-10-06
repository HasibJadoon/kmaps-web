-- qr_083: what belongs to the LEMMA is held once, for the whole Qurʾān; the word in its āyah keeps
-- only its own detail.
--
-- Lemma (global, keyed by the QAC lemma — qr_word_occurrence.gid_lemma):
--   qr_morph_display_lemma.sense_arc_en   the lemma's arc, root picture → its Qurʾānic sense
--   qr_sarf_sense (+ lemma_id)            the lemma's range of meanings in the Qurʾān — only senses
--                                         THIS lemma carries, each cited from an āyah that holds it
-- Word (qr_sarf_word, keyed by QAC location):
--   here_en, here_src_json                what it means here, and the source lines behind it
--   here_sense                            which sense of the lemma's range is used here
--
-- The range used to be filed by root/verb, so تَنزِيل showed rain and iron (أَنْزَلَ), عِقَاب showed
-- عَاقِبَة and عُقْبَى, طَوْل showed طُول. Those senses belong to other lemmas and are removed here.
-- The per-word arc_en (qr_082) moves up to the lemma; the passage-level `here` flag moves to the word.

ALTER TABLE qr_sarf_sense ADD COLUMN lemma_id TEXT;
ALTER TABLE qr_sarf_word ADD COLUMN here_sense TEXT;
ALTER TABLE qr_sarf_word DROP COLUMN arc_en;

-- ── the arcs, on the lemma ──────────────────────────────────────────────────
UPDATE qr_morph_display_lemma SET sense_arc_en = 'coming down → sent down in stages → the Revelation', updated_at = datetime('now') WHERE gid_lemma = 'AL:1bc35f366d52a6776e838f0c4d';
UPDATE qr_morph_display_lemma SET sense_arc_en = 'joining together → writing → a book, a decree',       updated_at = datetime('now') WHERE gid_lemma = 'AL:26ec9894256ccd2fcb77820470';
UPDATE qr_morph_display_lemma SET sense_arc_en = 'strength → never overcome → mighty, rare and dear',    updated_at = datetime('now') WHERE gid_lemma = 'AL:3d42f257c274c5d8463f1b8371';
UPDATE qr_morph_display_lemma SET sense_arc_en = 'a mark → knowing → all-knowing',                       updated_at = datetime('now') WHERE gid_lemma = 'AL:9ba7ce572be40ce777e0d44853';
UPDATE qr_morph_display_lemma SET sense_arc_en = 'covering → shielding → forgiving',                     updated_at = datetime('now') WHERE gid_lemma = 'AL:ea923679f32861b46d50eade95';
UPDATE qr_morph_display_lemma SET sense_arc_en = 'a tail → what trails after → sin',                     updated_at = datetime('now') WHERE gid_lemma = 'AL:2e7a23ca384799c20b92778cf7';
UPDATE qr_morph_display_lemma SET sense_arc_en = 'facing → receiving → accepting',                       updated_at = datetime('now') WHERE gid_lemma = 'AL:89060f9f3668b069e4ca2ada7a';
UPDATE qr_morph_display_lemma SET sense_arc_en = 'returning → turning back to God',                      updated_at = datetime('now') WHERE gid_lemma = 'AL:a8886e1216f97189f836165615';
UPDATE qr_morph_display_lemma SET sense_arc_en = 'tying tight → strength → severe',                      updated_at = datetime('now') WHERE gid_lemma = 'AL:d598d16f55259b05ab7239513e';
UPDATE qr_morph_display_lemma SET sense_arc_en = 'coming after → what follows a deed → punishment',      updated_at = datetime('now') WHERE gid_lemma = 'AL:ef9ac712524e50d06a2a1f98de';
UPDATE qr_morph_display_lemma SET sense_arc_en = 'stretching far → more than enough → bounty',           updated_at = datetime('now') WHERE gid_lemma = 'AL:9e553feca8a3dea46195b29917';
UPDATE qr_morph_display_lemma SET sense_arc_en = 'worship → the one worshipped → a god',                 updated_at = datetime('now') WHERE gid_lemma = 'AL:c88f937fab2a9108ab54922b75';
UPDATE qr_morph_display_lemma SET sense_arc_en = 'becoming → ending up → the place of return',           updated_at = datetime('now') WHERE gid_lemma = 'AL:a6a5a940211be758e1edae8a66';

-- ── the ranges, on the lemma ────────────────────────────────────────────────
DELETE FROM qr_sarf_sense WHERE root IN ('نزل','غفر','قبل','توب','عقب','طول','صير','ذنب','شدد');

INSERT INTO qr_sarf_sense (id, root, lemma_ar, sense_en, sense_ar, cites_json, here, sort) VALUES
-- تَنزِيل (15×): always the sending down of revelation
('SS:نزل:tanzil',  'نزل', 'تَنزِيل', 'the Revelation sent down from God — the Qurʾān', 'الوحي المنزَّل من الله',
  '[{"surah": 40, "ayah": 2, "needle": "تنزيل الكتاب من الله"}, {"surah": 26, "ayah": 192, "needle": "وانه لتنزيل رب العالمين"}, {"surah": 56, "ayah": 80, "needle": "تنزيل من رب العالمين"}]', 0, 0),
('SS:نزل:stages',  'نزل', 'تَنزِيل', 'sent down part by part, in stages', 'التنزيل منجَّمًا',
  '[{"surah": 17, "ayah": 106, "needle": "ونزلناه تنزيلا"}, {"surah": 76, "ayah": 23, "needle": "نزلنا عليك القران تنزيلا"}]', 0, 1),
('SS:نزل:angels',  'نزل', 'تَنزِيل', 'the angels sent down, on the Day', 'تنزيل الملائكة يوم القيامة',
  '[{"surah": 25, "ayah": 25, "needle": "ونزل الملائكة تنزيلا"}]', 0, 2),
-- غَافِر (2×)
('SS:غفر:1', 'غفر', 'غَافِر', 'Forgiver of sin — of God', 'ساتر الذنب العافي عنه',
  '[{"surah": 40, "ayah": 3, "needle": "غافر الذنب"}, {"surah": 7, "ayah": 155, "needle": "وانت خير الغافرين"}]', 0, 0),
-- قَابِل (1×)
('SS:قبل:1', 'قبل', 'قَابِل', 'Accepter — of repentance', 'الذي يقبل التوبة',
  '[{"surah": 40, "ayah": 3, "needle": "وقابل التوب"}]', 0, 0),
-- التَّوْب (1×)
('SS:توب:1', 'توب', 'تَّوْب', 'repentance — turning back to God', 'التوبة والرجوع إلى الله',
  '[{"surah": 40, "ayah": 3, "needle": "وقابل التوب"}]', 0, 0),
-- عِقَاب (20×): always punishment
('SS:عقب:1', 'عقب', 'عِقَاب', 'punishment — what comes after wrongdoing', 'العقوبة تعقب الذنب',
  '[{"surah": 40, "ayah": 3, "needle": "شديد العقاب"}, {"surah": 38, "ayah": 14, "needle": "فحق عقاب"}, {"surah": 6, "ayah": 165, "needle": "ان ربك سريع العقاب"}]', 0, 0),
-- طَوْل (3×)
('SS:طول:1', 'طول', 'طَوْل', 'bounty, wide favour — of God', 'الفضل والسعة',
  '[{"surah": 40, "ayah": 3, "needle": "ذي الطول"}]', 0, 0),
('SS:طول:2', 'طول', 'طَوْل', 'means, wealth — of people', 'الغنى والقدرة',
  '[{"surah": 4, "ayah": 25, "needle": "ومن لم يستطع منكم طولا"}, {"surah": 9, "ayah": 86, "needle": "اولو الطول"}]', 0, 1),
-- مَصِير (28×)
('SS:صير:1', 'صير', 'مَصِير', 'the final return — to God', 'المرجع إلى الله',
  '[{"surah": 40, "ayah": 3, "needle": "اليه المصير"}, {"surah": 3, "ayah": 28, "needle": "والي الله المصير"}]', 0, 0),
('SS:صير:2', 'صير', 'مَصِير', 'an evil end — the Fire', 'سوء المآل',
  '[{"surah": 2, "ayah": 126, "needle": "وبئس المصير"}, {"surah": 14, "ayah": 30, "needle": "فان مصيركم الي النار"}]', 0, 1),
-- ذَنب (37×)
('SS:ذنب:1', 'ذنب', 'ذَنب', 'a sin before God', 'الإثم',
  '[{"surah": 40, "ayah": 3, "needle": "غافر الذنب"}, {"surah": 39, "ayah": 53, "needle": "يغفر الذنوب جميعا"}]', 0, 0),
('SS:ذنب:2', 'ذنب', 'ذَنب', 'a wrong done to people — a charge against someone', 'الجناية',
  '[{"surah": 26, "ayah": 14, "needle": "ولهم علي ذنب"}, {"surah": 81, "ayah": 9, "needle": "باي ذنب قتلت"}]', 0, 1),
-- شَدِيد (56×)
('SS:شدد:1', 'شدد', 'شَدِيد', 'severe — of punishment', 'شديد في العقوبة',
  '[{"surah": 40, "ayah": 3, "needle": "شديد العقاب"}]', 0, 0),
('SS:شدد:2', 'شدد', 'شَدِيد', 'strong, mighty in power', 'القوي',
  '[{"surah": 53, "ayah": 5, "needle": "علمه شديد القوي"}, {"surah": 17, "ayah": 5, "needle": "اولي باس شديد"}]', 0, 1),
('SS:شدد:3', 'شدد', 'شَدِيد', 'firm against (أَشِدَّاءُ عَلَى)', 'الغليظ على',
  '[{"surah": 48, "ayah": 29, "needle": "اشداء علي الكفار"}]', 0, 2),
('SS:شدد:4', 'شدد', 'شَدِيد', 'intense — of love for wealth', 'شديد الحب',
  '[{"surah": 100, "ayah": 8, "needle": "وانه لحب الخير لشديد"}]', 0, 3);

-- the lemma's own spelling (QAC) and key for the ranges that stay
UPDATE qr_sarf_sense SET lemma_ar = 'كِتَٰب' WHERE root = 'كتب';
UPDATE qr_sarf_sense SET cites_json = '[{"surah": 27, "ayah": 29, "needle": "اني القي الي كتاب كريم"}]' WHERE id = 'SS:كتب:2';
UPDATE qr_sarf_sense SET lemma_id = CASE root
  WHEN 'نزل' THEN 'AL:1bc35f366d52a6776e838f0c4d' WHEN 'كتب' THEN 'AL:26ec9894256ccd2fcb77820470'
  WHEN 'عزز' THEN 'AL:3d42f257c274c5d8463f1b8371' WHEN 'علم' THEN 'AL:9ba7ce572be40ce777e0d44853'
  WHEN 'غفر' THEN 'AL:ea923679f32861b46d50eade95' WHEN 'ذنب' THEN 'AL:2e7a23ca384799c20b92778cf7'
  WHEN 'قبل' THEN 'AL:89060f9f3668b069e4ca2ada7a' WHEN 'توب' THEN 'AL:a8886e1216f97189f836165615'
  WHEN 'شدد' THEN 'AL:d598d16f55259b05ab7239513e' WHEN 'عقب' THEN 'AL:ef9ac712524e50d06a2a1f98de'
  WHEN 'طول' THEN 'AL:9e553feca8a3dea46195b29917' WHEN 'اله' THEN 'AL:c88f937fab2a9108ab54922b75'
  WHEN 'صير' THEN 'AL:a6a5a940211be758e1edae8a66' END
WHERE root IN ('نزل','كتب','عزز','علم','غفر','ذنب','قبل','توب','شدد','عقب','طول','اله','صير');

-- ── which sense each word of 40:2–3 uses ───────────────────────────────────
UPDATE qr_sarf_word SET here_sense = CASE root
  WHEN 'نزل' THEN 'SS:نزل:tanzil' WHEN 'كتب' THEN 'SS:كتب:1' WHEN 'عزز' THEN 'SS:عزز:1' WHEN 'علم' THEN 'SS:علم:1'
  WHEN 'غفر' THEN 'SS:غفر:1' WHEN 'ذنب' THEN 'SS:ذنب:1' WHEN 'قبل' THEN 'SS:قبل:1' WHEN 'توب' THEN 'SS:توب:1'
  WHEN 'شدد' THEN 'SS:شدد:1' WHEN 'عقب' THEN 'SS:عقب:1' WHEN 'طول' THEN 'SS:طول:1' WHEN 'اله' THEN 'SS:اله:1'
  WHEN 'صير' THEN 'SS:صير:1' END
WHERE surah = 40 AND ayah IN (2, 3);
UPDATE qr_sarf_sense SET here = 0;
