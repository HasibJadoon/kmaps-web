UPDATE ar_ling_sources
SET footnote_source = 'inline_brackets', quran_block_shape = 'inline_verse'
WHERE slug = 'ketabonline_ibn_manzur_lisan_al_arab';

UPDATE ar_ling_sources
SET footnote_source = 'none', quran_block_shape = 'cue_only_verse_in_braces'
WHERE slug = 'ketabonline_al_jawhari_al_sihah';

UPDATE ar_ling_sources
SET footnote_source = 'footnote_blocks', quran_block_shape = 'inline_verse'
WHERE slug = 'thahabi_al_khalil_kitab_al_ayn';

UPDATE ar_ling_sources
SET footnote_source = 'none', quran_block_shape = 'inline_verse'
WHERE slug = 'saaid_maqayis_al_lugha';

UPDATE ar_ling_sources
SET footnote_source = 'none', quran_block_shape = 'inline_verse'
WHERE slug = 'qomra_al_ubab_al_zakhir';

UPDATE ar_ling_sources
SET footnote_source = 'none', quran_block_shape = 'inline_verse'
WHERE slug = 'ketabonline_al_zabidi_taj_al_arus';

UPDATE ar_ling_sources
SET footnote_source = 'footnote_blocks', quran_block_shape = 'inline_verse'
WHERE slug = 'ketabonline_al_fayyumi_misbah_munir';

UPDATE ar_ling_sources
SET footnote_source = 'none', quran_block_shape = 'inline_verse'
WHERE slug = 'ketabonline_ibn_duraid_jamharat_al_lugha';

UPDATE ar_ling_sources
SET footnote_source = 'none', quran_block_shape = 'inline_verse'
WHERE slug = 'qomra_al_qamus_al_muhit';
