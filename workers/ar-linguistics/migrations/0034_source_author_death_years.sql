ALTER TABLE ar_ling_sources ADD COLUMN author_death_ah INTEGER;
ALTER TABLE ar_ling_sources ADD COLUMN author_death_ce INTEGER;

UPDATE ar_ling_sources SET author_death_ah = CASE slug
  WHEN 'thahabi_al_khalil_kitab_al_ayn'          THEN 170
  WHEN 'qomra_jamharat_al_lugha'                 THEN 321
  WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 321
  WHEN 'ketabonline_al_jawhari_al_sihah'         THEN 393
  WHEN 'saaid_maqayis_al_lugha'                  THEN 395
  WHEN 'al_raghib_mufradat'                      THEN 502
  WHEN 'qomra_al_ubab_al_zakhir'                 THEN 650
  WHEN 'ketabonline_ibn_manzur_lisan_al_arab'    THEN 711
  WHEN 'qomra_al_misbah_al_munir'                THEN 770
  WHEN 'ketabonline_al_fayyumi_misbah_munir'     THEN 770
  WHEN 'qomra_al_qamus_al_muhit'                 THEN 817
  WHEN 'ketabonline_al_zabidi_taj_al_arus'       THEN 1205
  ELSE author_death_ah END;

UPDATE ar_ling_sources SET author_death_ce = 1876
  WHERE slug IN ('lane_lexicon', 'lane_quranic_research_perseus');
