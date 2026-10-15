-- Ghāfir passage 4 (40:7–9) segmented into its sentences as the iʿrāb books read them. The al-Jadwal import made 40:7 w1 → 40:8
-- w12 one 39-word "sentence" (the throne-bearers' description, the call, «فاغفر», «وقهم», «ربنا وأدخلهم») and ran «إنك أنت العزيز
-- الحكيم» across into 40:9's «وقهم السيئات»; a sentence that wide would capture every drill of the passage. By al-Jadwal's own
-- verdicts (استئنافية / جواب النداء / جواب شرط مقدر / معطوفة على اغفر / تعليل للاسترحام), with al-Muyassar, al-Darwīsh and al-ʿUkbarī:
--   1  7:1–13   الذين يحملون العرش … ويستغفرون للذين آمنوا      استئنافية (the prayer after it is the speech of an omitted «يقولون», حال)
--   2  7:14–19  ربنا وسعت كل شيء رحمة وعلما                     النداء وجوابه
--   3  7:20–27  فاغفر للذين تابوا … وقهم عذاب الجحيم            جواب شرط مقدر: إن وسعت رحمتك كل شيء فاغفر
--   4  8:1–12   ربنا وأدخلهم جنات عدن … وذرياتهم                معطوفة على جملة اغفر
--   5  8:13–16  إنك أنت العزيز الحكيم                          تعليل للاسترحام
--   6  9:1–2    وقهم السيئات                                    معطوفة (الدرويش والميسر)
--   7  9:3–8    ومن تق السيئات يومئذ فقد رحمته                  استئنافية (the import started it one word late, at «تق»)
--   8  9:9–12   وذلك هو الفوز العظيم                           استئنافية
-- The four import rows keep their ids with corrected spans; four sentences are added; every import clause moves to its sentence
-- with its word span corrected. Nothing is deleted.

UPDATE qr_ss_occ_sentence SET ayah_to = 7, word_end_index = 13, updated_at = datetime('now') WHERE id = 'QR:SS:40:7:jadwal:s1';
UPDATE qr_ss_occ_sentence SET ayah_to = 8, word_end_index = 16, updated_at = datetime('now') WHERE id = 'QR:SS:40:8:jadwal:s13';
UPDATE qr_ss_occ_sentence SET word_start_index = 3, updated_at = datetime('now') WHERE id = 'QR:SS:40:9:jadwal:s4';

INSERT OR IGNORE INTO qr_ss_occ_sentence (id, surah, ayah_from, ayah_to, word_start_index, word_end_index, sentence_kind, note_md, is_virtual, source_basis, gt_sentence_class, created_at, updated_at) VALUES
('QR:SS:40:7:s2', 40, 7, 7, 14, 19, 'vocative', '«ربنا» منادى، «وسعت ...» لا محلّ لها جواب النداء (الجدول)؛ وجملة النداء مقول قول محذوف حال: قائلين (الميسر والعكبري).', 0, 'derived:jadwal', 'GT:sentence_class:filiyya', datetime('now'), datetime('now')),
('QR:SS:40:7:s3', 40, 7, 7, 20, 27, 'verbal', '«اغفر ...» في محل جزم جواب شرط مقدّر: إن وسعت رحمتك كلّ شيء فاغفر (الجدول)؛ الفاء الفصيحة (الميسر)؛ «قهم» معطوفة على اغفر.', 0, 'derived:jadwal', 'GT:sentence_class:filiyya', datetime('now'), datetime('now')),
('QR:SS:40:8:s1', 40, 8, 8, 1, 12, 'verbal', '«أدخلهم ...» في محلّ جزم معطوفة على جملة اغفر (الجدول)، و«ربنا» منادى معترض.', 0, 'derived:jadwal', 'GT:sentence_class:filiyya', datetime('now'), datetime('now')),
('QR:SS:40:9:s1', 40, 9, 9, 1, 2, 'verbal', '«قهم السيئات»: الواو عاطفة، فعل دعاء (الدرويش والميسر).', 0, 'derived:darwish', 'GT:sentence_class:filiyya', datetime('now'), datetime('now'));

-- each import clause to its sentence, its span corrected (the import numbered «آمنوا» 4 and cut three spans short)
UPDATE qr_ss_occ_clause SET word_end_index = 13 WHERE id = 'QR:CL:40:7:jadwal:c1';
UPDATE qr_ss_occ_clause SET word_start_index = 13, word_end_index = 13 WHERE id = 'QR:CL:40:7:jadwal:c4';
UPDATE qr_ss_occ_clause SET sentence_id = 'QR:SS:40:7:s2' WHERE id = 'QR:CL:40:7:jadwal:c15';
UPDATE qr_ss_occ_clause SET sentence_id = 'QR:SS:40:7:s3' WHERE id IN ('QR:CL:40:7:jadwal:c20','QR:CL:40:7:jadwal:c22','QR:CL:40:7:jadwal:c23','QR:CL:40:7:jadwal:c25');
UPDATE qr_ss_occ_clause SET sentence_id = 'QR:SS:40:8:s1' WHERE id IN ('QR:CL:40:8:jadwal:c2','QR:CL:40:8:jadwal:c6','QR:CL:40:8:jadwal:c8');
UPDATE qr_ss_occ_clause SET word_end_index = 16 WHERE id IN ('QR:CL:40:8:jadwal:c13','QR:CL:40:8:jadwal:c14');
UPDATE qr_ss_occ_clause SET word_end_index = 12 WHERE id = 'QR:CL:40:9:jadwal:c9';
