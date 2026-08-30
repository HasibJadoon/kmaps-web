UPDATE ar_ling_sources
SET slug = 'lane_lexicon',
    origin = 'lane',
    bilingual = 1,
    source_order = 2
WHERE id = 'src_lane_lexicon';

UPDATE ar_ling_sources
SET slug = 'ketabonline_al_raghib_mufradat',
    origin = 'ketabonline',
    source_order = 1
WHERE id = 'SRC:KETABONLINE:MUFRADAT';

UPDATE ar_ling_sources
SET slug = 'ketabonline_al_jawhari_al_sihah',
    origin = 'ketabonline',
    source_order = 4
WHERE id = 'SRC:KETABONLINE:AL_SIHAH';

UPDATE ar_ling_sources
SET slug = 'ketabonline_ibn_manzur_lisan_al_arab',
    origin = 'ketabonline',
    source_order = 5
WHERE id = 'SRC:KETABONLINE:LISAN_AL_ARAB';

UPDATE ar_ling_sources
SET slug = 'ketabonline_al_zabidi_taj_al_arus',
    origin = 'ketabonline',
    source_order = 6
WHERE id = 'SRC:KETABONLINE:TAJ_AL_ARUS';

UPDATE ar_ling_sources
SET slug = 'ketabonline_ibn_duraid_jamharat_al_lugha',
    origin = 'ketabonline',
    source_order = 12
WHERE id = 'SRC:KETABONLINE:JAMHARAT_AL_LUGHA';

UPDATE ar_ling_sources
SET slug = 'ketabonline_al_fayyumi_misbah_munir',
    origin = 'ketabonline',
    source_order = 13
WHERE id = 'SRC:KETABONLINE:MISBAH_MUNIR';

UPDATE ar_ling_sources
SET slug = 'saaid_maqayis_al_lugha',
    origin = 'saaid',
    source_order = 7
WHERE id = 'SRC:SAAID:MAQAYIS_AL_LUGHA';

UPDATE ar_ling_sources
SET slug = 'thahabi_al_khalil_kitab_al_ayn',
    origin = 'thahabi',
    source_order = 14
WHERE id = 'SRC:THAHABI:KITAB_AL_AYN';

UPDATE ar_ling_sources
SET slug = 'qomra_al_misbah_al_munir',
    origin = 'qomra',
    source_order = 8
WHERE id = 'SRC:QOMRA:AL_MISBAH_AL_MUNIR';

UPDATE ar_ling_sources
SET slug = 'qomra_al_ubab_al_zakhir',
    origin = 'qomra',
    source_order = 9
WHERE id = 'SRC:QOMRA:AL_UBAB_AL_ZAKHIR';

UPDATE ar_ling_sources
SET slug = 'qomra_jamharat_al_lugha',
    origin = 'qomra',
    source_order = 10
WHERE id = 'SRC:QOMRA:JAMHARAT_AL_LUGHA';

UPDATE ar_ling_sources
SET slug = 'qomra_al_qamus_al_muhit',
    origin = 'qomra',
    source_order = 11
WHERE id = 'SRC:QOMRA:AL_QAMUS_AL_MUHIT';

UPDATE ar_ling_sources
SET origin = 'ketabonline'
WHERE id IN ('SRC:KETABONLINE:SIHAH',
             'SRC:KETABONLINE:QAMUS_MUHIT',
             'SRC:KETABONLINE:UBAB_ZAKHIR');

INSERT OR IGNORE INTO ar_ling_sources
  (id, title_ar, title_en, author_name, period_label, source_type, genre,
   slug, origin, bilingual, source_order)
VALUES (
  'SRC:LANE:LEGACY_PERSEUS',
  'معجم لين',
  "Lane's Arabic-English Lexicon",
  'Edward William Lane',
  '19th century',
  'lexicon',
  'classical_lexicon',
  'lane_quranic_research_perseus',
  'lane',
  1,
  3
);
