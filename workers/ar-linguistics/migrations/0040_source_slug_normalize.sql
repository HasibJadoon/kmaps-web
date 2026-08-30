UPDATE ar_ling_sources SET slug = NULL WHERE slug = 'qomra_jamharat_al_lugha';

UPDATE ar_ling_sources SET slug = NULL WHERE slug = 'qomra_al_misbah_al_munir';

UPDATE ar_ling_sources SET slug = NULL WHERE slug = 'lane_quranic_research_perseus';

UPDATE ar_ling_sources SET slug = 'raghib_mufradat' WHERE slug = 'al_raghib_mufradat';
UPDATE ar_ling_sources SET slug = 'jawhari_sihah' WHERE slug = 'ketabonline_al_jawhari_al_sihah';
UPDATE ar_ling_sources SET slug = 'ibn_manzur_lisan_arab' WHERE slug = 'ketabonline_ibn_manzur_lisan_al_arab';
UPDATE ar_ling_sources SET slug = 'zabidi_taj_arus' WHERE slug = 'ketabonline_al_zabidi_taj_al_arus';
UPDATE ar_ling_sources SET slug = 'ibn_durayd_jamharat_lugha' WHERE slug = 'ketabonline_ibn_duraid_jamharat_al_lugha';
UPDATE ar_ling_sources SET slug = 'fayyumi_misbah_munir' WHERE slug = 'ketabonline_al_fayyumi_misbah_munir';
UPDATE ar_ling_sources SET slug = 'khalil_kitab_ayn' WHERE slug = 'thahabi_al_khalil_kitab_al_ayn';
UPDATE ar_ling_sources SET slug = 'maqayis_lugha' WHERE slug = 'saaid_maqayis_al_lugha';
UPDATE ar_ling_sources SET slug = 'qamus_muhit' WHERE slug = 'qomra_al_qamus_al_muhit';
UPDATE ar_ling_sources SET slug = 'ubab_zakhir' WHERE slug = 'qomra_al_ubab_al_zakhir';
UPDATE ar_ling_sources SET slug = 'hamalawi_shadha_arf' WHERE slug = 'hamalawi_shadha_al_arf';

UPDATE ar_ling_citations
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_conjugation_templates
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_context_passages
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_expressions
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_form_families
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_form_paradigms
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_form_semantics
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_gram_bab
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_gram_chunks
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_gram_term_sources
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_inflection_rules
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_lane_patch_log
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_lemma_form_map
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_letters
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_lexicon_block_links
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');

UPDATE ar_ling_lexicon_book_pages
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_lexicon_display_profile
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_lexicon_display_rule
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_lexicon_display_section
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_lexicon_entry_sections
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_lexicon_quran_refs
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_lexicon_root_entries
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_lexicon_root_entry_sources
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_memlets
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_morph_corrections
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_orthography_rules
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_question_items
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_root_build_jobs
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_root_development_stages
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_root_form_attested
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_root_relations
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_root_scholarship
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_root_semantic_fields
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_root_sense_axes
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_root_senses
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_root_stage
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_source_chunks
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_vector_records
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');
UPDATE ar_ling_word_sums
   SET source_slug = CASE source_slug
        WHEN 'al_raghib_mufradat' THEN 'raghib_mufradat'
        WHEN 'ketabonline_al_jawhari_al_sihah' THEN 'jawhari_sihah'
        WHEN 'ketabonline_ibn_manzur_lisan_al_arab' THEN 'ibn_manzur_lisan_arab'
        WHEN 'ketabonline_al_zabidi_taj_al_arus' THEN 'zabidi_taj_arus'
        WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 'ibn_durayd_jamharat_lugha'
        WHEN 'ketabonline_al_fayyumi_misbah_munir' THEN 'fayyumi_misbah_munir'
        WHEN 'thahabi_al_khalil_kitab_al_ayn' THEN 'khalil_kitab_ayn'
        WHEN 'saaid_maqayis_al_lugha' THEN 'maqayis_lugha'
        WHEN 'qomra_al_qamus_al_muhit' THEN 'qamus_muhit'
        WHEN 'qomra_al_ubab_al_zakhir' THEN 'ubab_zakhir'
        WHEN 'hamalawi_shadha_al_arf' THEN 'hamalawi_shadha_arf'
        ELSE source_slug END
 WHERE source_slug IN ('al_raghib_mufradat', 'ketabonline_al_jawhari_al_sihah', 'ketabonline_ibn_manzur_lisan_al_arab', 'ketabonline_al_zabidi_taj_al_arus', 'ketabonline_ibn_duraid_jamharat_al_lugha', 'ketabonline_al_fayyumi_misbah_munir', 'thahabi_al_khalil_kitab_al_ayn', 'saaid_maqayis_al_lugha', 'qomra_al_qamus_al_muhit', 'qomra_al_ubab_al_zakhir', 'hamalawi_shadha_al_arf');

UPDATE ar_ling_lexicon_display_section
   SET id = 'LXDS:' || 'raghib_mufradat' || ':' || kind_code
 WHERE id LIKE 'LXDS:' || 'al_raghib_mufradat' || ':%';
UPDATE ar_ling_lexicon_display_rule
   SET id = 'LXDR:' || 'raghib_mufradat' || ':' || rule_key || ':' || seq
 WHERE id LIKE 'LXDR:' || 'al_raghib_mufradat' || ':%';
UPDATE ar_ling_lexicon_display_section
   SET id = 'LXDS:' || 'jawhari_sihah' || ':' || kind_code
 WHERE id LIKE 'LXDS:' || 'ketabonline_al_jawhari_al_sihah' || ':%';
UPDATE ar_ling_lexicon_display_rule
   SET id = 'LXDR:' || 'jawhari_sihah' || ':' || rule_key || ':' || seq
 WHERE id LIKE 'LXDR:' || 'ketabonline_al_jawhari_al_sihah' || ':%';
UPDATE ar_ling_lexicon_display_section
   SET id = 'LXDS:' || 'ibn_manzur_lisan_arab' || ':' || kind_code
 WHERE id LIKE 'LXDS:' || 'ketabonline_ibn_manzur_lisan_al_arab' || ':%';
UPDATE ar_ling_lexicon_display_rule
   SET id = 'LXDR:' || 'ibn_manzur_lisan_arab' || ':' || rule_key || ':' || seq
 WHERE id LIKE 'LXDR:' || 'ketabonline_ibn_manzur_lisan_al_arab' || ':%';
UPDATE ar_ling_lexicon_display_section
   SET id = 'LXDS:' || 'zabidi_taj_arus' || ':' || kind_code
 WHERE id LIKE 'LXDS:' || 'ketabonline_al_zabidi_taj_al_arus' || ':%';
UPDATE ar_ling_lexicon_display_rule
   SET id = 'LXDR:' || 'zabidi_taj_arus' || ':' || rule_key || ':' || seq
 WHERE id LIKE 'LXDR:' || 'ketabonline_al_zabidi_taj_al_arus' || ':%';
UPDATE ar_ling_lexicon_display_section
   SET id = 'LXDS:' || 'ibn_durayd_jamharat_lugha' || ':' || kind_code
 WHERE id LIKE 'LXDS:' || 'ketabonline_ibn_duraid_jamharat_al_lugha' || ':%';
UPDATE ar_ling_lexicon_display_rule
   SET id = 'LXDR:' || 'ibn_durayd_jamharat_lugha' || ':' || rule_key || ':' || seq
 WHERE id LIKE 'LXDR:' || 'ketabonline_ibn_duraid_jamharat_al_lugha' || ':%';
UPDATE ar_ling_lexicon_display_section
   SET id = 'LXDS:' || 'fayyumi_misbah_munir' || ':' || kind_code
 WHERE id LIKE 'LXDS:' || 'ketabonline_al_fayyumi_misbah_munir' || ':%';
UPDATE ar_ling_lexicon_display_rule
   SET id = 'LXDR:' || 'fayyumi_misbah_munir' || ':' || rule_key || ':' || seq
 WHERE id LIKE 'LXDR:' || 'ketabonline_al_fayyumi_misbah_munir' || ':%';
UPDATE ar_ling_lexicon_display_section
   SET id = 'LXDS:' || 'khalil_kitab_ayn' || ':' || kind_code
 WHERE id LIKE 'LXDS:' || 'thahabi_al_khalil_kitab_al_ayn' || ':%';
UPDATE ar_ling_lexicon_display_rule
   SET id = 'LXDR:' || 'khalil_kitab_ayn' || ':' || rule_key || ':' || seq
 WHERE id LIKE 'LXDR:' || 'thahabi_al_khalil_kitab_al_ayn' || ':%';
UPDATE ar_ling_lexicon_display_section
   SET id = 'LXDS:' || 'maqayis_lugha' || ':' || kind_code
 WHERE id LIKE 'LXDS:' || 'saaid_maqayis_al_lugha' || ':%';
UPDATE ar_ling_lexicon_display_rule
   SET id = 'LXDR:' || 'maqayis_lugha' || ':' || rule_key || ':' || seq
 WHERE id LIKE 'LXDR:' || 'saaid_maqayis_al_lugha' || ':%';
UPDATE ar_ling_lexicon_display_section
   SET id = 'LXDS:' || 'qamus_muhit' || ':' || kind_code
 WHERE id LIKE 'LXDS:' || 'qomra_al_qamus_al_muhit' || ':%';
UPDATE ar_ling_lexicon_display_rule
   SET id = 'LXDR:' || 'qamus_muhit' || ':' || rule_key || ':' || seq
 WHERE id LIKE 'LXDR:' || 'qomra_al_qamus_al_muhit' || ':%';
UPDATE ar_ling_lexicon_display_section
   SET id = 'LXDS:' || 'ubab_zakhir' || ':' || kind_code
 WHERE id LIKE 'LXDS:' || 'qomra_al_ubab_al_zakhir' || ':%';
UPDATE ar_ling_lexicon_display_rule
   SET id = 'LXDR:' || 'ubab_zakhir' || ':' || rule_key || ':' || seq
 WHERE id LIKE 'LXDR:' || 'qomra_al_ubab_al_zakhir' || ':%';
UPDATE ar_ling_lexicon_display_section
   SET id = 'LXDS:' || 'hamalawi_shadha_arf' || ':' || kind_code
 WHERE id LIKE 'LXDS:' || 'hamalawi_shadha_al_arf' || ':%';
UPDATE ar_ling_lexicon_display_rule
   SET id = 'LXDR:' || 'hamalawi_shadha_arf' || ':' || rule_key || ':' || seq
 WHERE id LIKE 'LXDR:' || 'hamalawi_shadha_al_arf' || ':%';
