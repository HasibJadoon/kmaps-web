-- 0040z — Source slug normalization for ar_ling_lexicon_blocks (phase 2).
--
-- Split out of 0040: this table alone accounts for ~900,000 of the rows the
-- slug rename touches, and bundling it with the other 39 tables produced a D1
-- internal error.
--
-- One statement per slug rather than a single CASE pass, so a failure names the
-- book it stopped on and the migration can be resumed by inspection. Every
-- statement is index-assisted via idx_albk_source_root(source_slug, root_norm)
-- and each is individually re-runnable — re-running matches nothing.
--
-- Largest first, so the riskiest write is the one that fails fastest if D1 is
-- going to reject the size at all.

-- ketabonline_al_zabidi_taj_al_arus → zabidi_taj_arus  (~534,236 blocks)
UPDATE ar_ling_lexicon_blocks SET source_slug = 'zabidi_taj_arus'
 WHERE source_slug = 'ketabonline_al_zabidi_taj_al_arus';
-- ketabonline_ibn_manzur_lisan_al_arab → ibn_manzur_lisan_arab  (~125,959 blocks)
UPDATE ar_ling_lexicon_blocks SET source_slug = 'ibn_manzur_lisan_arab'
 WHERE source_slug = 'ketabonline_ibn_manzur_lisan_al_arab';
-- saaid_maqayis_al_lugha → maqayis_lugha  (~46,724 blocks)
UPDATE ar_ling_lexicon_blocks SET source_slug = 'maqayis_lugha'
 WHERE source_slug = 'saaid_maqayis_al_lugha';
-- ketabonline_ibn_duraid_jamharat_al_lugha → ibn_durayd_jamharat_lugha  (~45,732 blocks)
UPDATE ar_ling_lexicon_blocks SET source_slug = 'ibn_durayd_jamharat_lugha'
 WHERE source_slug = 'ketabonline_ibn_duraid_jamharat_al_lugha';
-- ketabonline_al_jawhari_al_sihah → jawhari_sihah  (~45,612 blocks)
UPDATE ar_ling_lexicon_blocks SET source_slug = 'jawhari_sihah'
 WHERE source_slug = 'ketabonline_al_jawhari_al_sihah';
-- al_raghib_mufradat → raghib_mufradat  (~35,325 blocks)
UPDATE ar_ling_lexicon_blocks SET source_slug = 'raghib_mufradat'
 WHERE source_slug = 'al_raghib_mufradat';
-- thahabi_al_khalil_kitab_al_ayn → khalil_kitab_ayn  (~26,191 blocks)
UPDATE ar_ling_lexicon_blocks SET source_slug = 'khalil_kitab_ayn'
 WHERE source_slug = 'thahabi_al_khalil_kitab_al_ayn';
-- qomra_al_qamus_al_muhit → qamus_muhit  (~21,168 blocks)
UPDATE ar_ling_lexicon_blocks SET source_slug = 'qamus_muhit'
 WHERE source_slug = 'qomra_al_qamus_al_muhit';
-- ketabonline_al_fayyumi_misbah_munir → fayyumi_misbah_munir  (~16,516 blocks)
UPDATE ar_ling_lexicon_blocks SET source_slug = 'fayyumi_misbah_munir'
 WHERE source_slug = 'ketabonline_al_fayyumi_misbah_munir';
-- qomra_al_ubab_al_zakhir → ubab_zakhir  (~3,685 blocks)
UPDATE ar_ling_lexicon_blocks SET source_slug = 'ubab_zakhir'
 WHERE source_slug = 'qomra_al_ubab_al_zakhir';
-- hamalawi_shadha_al_arf → hamalawi_shadha_arf  (~0 blocks)
UPDATE ar_ling_lexicon_blocks SET source_slug = 'hamalawi_shadha_arf'
 WHERE source_slug = 'hamalawi_shadha_al_arf';
