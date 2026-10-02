-- Spellings the tafsīr of Ghāfir 40:1–3 uses for terms the registry already holds (from the 397
-- recorded lines translated in QR qr_071; review: docs/tafsir-40-1-3-gt-review.md). Each is the
-- same concept under another spelling: a plural, the form without the article, a Kufan or older
-- name. The key is (spelling, category), so a spelling that already names a term in another
-- category (التعريف، الواو، صفة، حالية، إبدال، المبالغة) is added beside it, not over it: the
-- slot that reads it decides the category.
--
-- Not taken: phrases that are not a term's name (موقوفة الأواخر، في موضع الصفة، حذف الهمزة تخفيفًا),
-- words too common to resolve safely (العلم، رمز، المجرور), and vowelling in a reading
-- (فتح، كسر، تسكين), which is not the case sign the registry holds.
--
-- After applying, re-project the mirrors: node scripts/project-gram-terms.mjs

INSERT OR IGNORE INTO ar_ling_gram_term_alias (alias_bare, term_id, category_key, alias_raw, alias_lang, alias_kind, source) VALUES
('التعريف', 'GT:definiteness:definite', 'definiteness', 'التعريف', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- grammatical definiteness (a cause of منع الصرف); the same spelling already names the balāgha topic
('معارف', 'GT:definiteness:definite', 'definiteness', 'معارف', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- plural of معرفة
('نكرات', 'GT:definiteness:indefinite', 'definiteness', 'نكرات', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- plural of نكرة
('الإضمار', 'GT:irab_role:idmar_al_amil', 'irab_role', 'الإضمار', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- «بإضمار اقرأ»: the governing verb implied
('إضمار', 'GT:irab_role:idmar_al_amil', 'irab_role', 'إضمار', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- without the article
('تقدير', 'GT:irab_role:taqdir', 'irab_role', 'تقدير', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- without the article
('مبالغة', 'GT:derivation_type:mubalagha', 'derivation_type', 'مبالغة', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- the intensive pattern («العليم مبالغة في العلم»); the same spelling names hyperbole in بديع
('المبالغة', 'GT:derivation_type:mubalagha', 'derivation_type', 'المبالغة', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- with the article
('صفة', 'GT:irab_role:naat', 'irab_role', 'صفة', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- the Basran name of the role نعت; the same spelling names the part of speech
('الصفة', 'GT:irab_role:naat', 'irab_role', 'الصفة', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- with the article
('صفات', 'GT:irab_role:naat', 'irab_role', 'صفات', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- plural
('الصفات', 'GT:irab_role:naat', 'irab_role', 'الصفات', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- plural, with the article
('وصف', 'GT:irab_role:naat', 'irab_role', 'وصف', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- «وصفًا للنكرة»
('الوصف', 'GT:irab_role:naat', 'irab_role', 'الوصف', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- with the article
('أوصاف', 'GT:irab_role:naat', 'irab_role', 'أوصاف', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- plural
('نعوت', 'GT:irab_role:naat', 'irab_role', 'نعوت', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- plural of نعت
('أبدال', 'GT:irab_role:badal', 'irab_role', 'أبدال', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- plural of بدل
('الإبدال', 'GT:irab_role:badal', 'irab_role', 'الإبدال', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- making a word a substitute; the same spelling names letter substitution in morphology
('خفض', 'GT:case:genitive', 'case', 'خفض', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- the Kufan name of الجر
('الخفض', 'GT:case:genitive', 'case', 'الخفض', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- with the article
('الواو', 'GT:harf_maani:atf', 'harf_maani', 'الواو', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- the conjunction; the same spelling names the case sign
('انتهاء الغاية', 'GT:harf_maani:ila_intiha_ghaya', 'harf_maani', 'انتهاء الغاية', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- the sense of إلى
('الفواتح', 'GT:harf_maani:muqattaa', 'harf_maani', 'الفواتح', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- the sūra-opening letters (فواتح السور)
('مناسبة', 'GT:balagha_maani:munasaba', 'balagha_maani', 'مناسبة', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- without the article
('خلاف مقتضى الظاهر', 'GT:balagha_maani:mukhalafat_muqtada_zahir', 'balagha_maani', 'خلاف مقتضى الظاهر', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- the usual wording
('جعل المنكر كغير المنكر', 'GT:balagha_maani:tanzil_al_munkir_manzilat_ghayr_al_munkir', 'balagha_maani', 'جعل المنكر كغير المنكر', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- the same device, in other words
('الألف واللام', 'GT:balagha_maani:tarif_bil_lam', 'balagha_maani', 'الألف واللام', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- the definite article
('حرف التعريف', 'GT:balagha_maani:tarif_bil_lam', 'balagha_maani', 'حرف التعريف', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- the definite article
('أل', 'GT:balagha_maani:tarif_bil_lam', 'balagha_maani', 'أل', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- the definite article
('براعة المطلع', 'GT:balagha_badi:baraat_istihlal', 'balagha_badi', 'براعة المطلع', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- given as its synonym
('منع من الصرف', 'GT:noun_process:man_al_sarf', 'noun_process', 'منع من الصرف', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- verbal phrasing
('الممنوع من الصرف', 'GT:noun_process:man_al_sarf', 'noun_process', 'الممنوع من الصرف', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- the diptote
('المقصور', 'GT:noun_process:maqsur_mamdud', 'noun_process', 'المقصور', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- one half of the pair
('الممدود', 'GT:noun_process:maqsur_mamdud', 'noun_process', 'الممدود', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- the other half
('تثنية', 'GT:number:dual', 'number', 'تثنية', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- forming the dual
('بين بين', 'GT:phonotactic:imala', 'phonotactic', 'بين بين', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- half inclination (التقليل)
('مستأنفة', 'GT:sentence_role:istinafiyya', 'sentence_role', 'مستأنفة', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- a clause that begins anew
('حالية', 'GT:sentence_role:hal', 'sentence_role', 'حالية', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- a circumstantial clause; the same spelling names the wāw of circumstance
('الإضافة المحضة', 'GT:idafa_kind:manawiya', 'idafa_kind', 'الإضافة المحضة', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- the Basran name
('الإضافة الحقيقية', 'GT:idafa_kind:manawiya', 'idafa_kind', 'الإضافة الحقيقية', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- al-Zamakhsharī’s name
('الإضافة غير الحقيقية', 'GT:idafa_kind:lafziya', 'idafa_kind', 'الإضافة غير الحقيقية', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)'),   -- al-Zamakhsharī’s name
('الصفات المشبهة', 'GT:derivation_type:sifa_mushabbaha', 'derivation_type', 'الصفات المشبهة', 'ar', 'variant', 'tafsir 40:1-3 (qr_071)');   -- plural
