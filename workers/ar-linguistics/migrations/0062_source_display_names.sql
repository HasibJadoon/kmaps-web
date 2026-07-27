-- 0062 — proper Arabic display names for the lexicon sources.
--
-- Two problems this fixes, both surfaced by the iOS lexicon port:
--
-- 1. There was no short name. Every client that needed a spine label (the
--    reader's book strip, the library rows) was deriving one by truncating
--    `title_ar`, which gives "المفردات في" for المفردات and "الصحاح تاج" for
--    الصحاح. The short form is editorial data, not something a client can
--    compute, so it becomes a column.
--
-- 2. Several rows carried a bare shuhra where the catalogue wants the full
--    name (الجوهري → أبو نصر إسماعيل بن حمّاد الجوهري), and three carried a
--    Latin-script author into an Arabic-primary UI (Edward William Lane,
--    Nicolai Sinai, K-Maps). The reader is Arabic-primary, so the author
--    column is now Arabic throughout.
--
-- Titles are the full canonical titles as the printed editions carry them —
-- الصحاح تاج اللغة وصحاح العربية rather than الصحاح, تاج العروس من جواهر
-- القاموس rather than تاج العروس — with the short form beside it. Verified
-- against al-Maktaba al-Shamela and the standard editions.

ALTER TABLE ar_ling_source ADD COLUMN title_short_ar TEXT;

UPDATE ar_ling_source SET
  title_ar       = 'كتاب العين',
  title_short_ar = 'العين',
  author_name    = 'الخليل بن أحمد الفراهيدي'
WHERE slug = 'khalil_kitab_ayn';

UPDATE ar_ling_source SET
  title_ar       = 'جمهرة اللغة',
  title_short_ar = 'الجمهرة',
  author_name    = 'أبو بكر محمد بن الحسن بن دريد الأزدي'
WHERE slug = 'ibn_durayd_jamharat_lugha';

UPDATE ar_ling_source SET
  title_ar       = 'الصحاح تاج اللغة وصحاح العربية',
  title_short_ar = 'الصحاح',
  author_name    = 'أبو نصر إسماعيل بن حمّاد الجوهري'
WHERE slug = 'jawhari_sihah';

UPDATE ar_ling_source SET
  title_ar       = 'معجم مقاييس اللغة',
  title_short_ar = 'المقاييس',
  author_name    = 'أبو الحسين أحمد بن فارس بن زكريا الرازي'
WHERE slug = 'maqayis_lugha';

UPDATE ar_ling_source SET
  title_ar       = 'المفردات في غريب القرآن',
  title_short_ar = 'المفردات',
  author_name    = 'أبو القاسم الحسين بن محمد الراغب الأصفهاني'
WHERE slug = 'raghib_mufradat';

UPDATE ar_ling_source SET
  title_ar       = 'العباب الزاخر واللباب الفاخر',
  title_short_ar = 'العباب',
  author_name    = 'الحسن بن محمد الصغاني'
WHERE slug = 'ubab_zakhir';

UPDATE ar_ling_source SET
  title_ar       = 'لسان العرب',
  title_short_ar = 'اللسان',
  author_name    = 'محمد بن مكرم بن منظور الأنصاري الإفريقي'
WHERE slug = 'ibn_manzur_lisan_arab';

UPDATE ar_ling_source SET
  title_ar       = 'المصباح المنير في غريب الشرح الكبير',
  title_short_ar = 'المصباح',
  author_name    = 'أحمد بن محمد بن علي الفيّومي'
WHERE slug = 'fayyumi_misbah_munir';

UPDATE ar_ling_source SET
  title_ar       = 'القاموس المحيط',
  title_short_ar = 'القاموس',
  author_name    = 'مجد الدين محمد بن يعقوب الفيروزآبادي'
WHERE slug = 'qamus_muhit';

UPDATE ar_ling_source SET
  title_ar       = 'تاج العروس من جواهر القاموس',
  title_short_ar = 'تاج العروس',
  author_name    = 'محمد مرتضى الحسيني الزبيدي'
WHERE slug = 'zabidi_taj_arus';

UPDATE ar_ling_source SET
  title_ar       = 'معجم لين العربي الإنجليزي',
  title_short_ar = 'لين',
  author_name    = 'إدوارد وليم لين'
WHERE slug = 'lane_lexicon';

UPDATE ar_ling_source SET
  title_ar       = 'المفاتيح الدلالية للقرآن',
  title_short_ar = 'سيناي',
  author_name    = 'نيكولاي سيناي'
WHERE slug = 'sinai_key_terms';

UPDATE ar_ling_source SET
  title_ar       = 'تحليل المعاني الخمسة',
  title_short_ar = 'الخلاصة',
  author_name    = 'كي-مابس'
WHERE slug = 'kmaps_five_lens';
