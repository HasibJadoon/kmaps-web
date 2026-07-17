-- 0034_source_author_death_years
--
-- Add author death years to ar_ling_sources so the lexicon reader can order a
-- root's sources chronologically (earliest author first) and render a dated
-- byline ("ت 502 هـ" / "ت 1876 م"). Classical authors carry a Hijri year;
-- CE-dated authors (Lane) carry a Gregorian year. Living scholars and K-Maps
-- synthesis sources keep both NULL and sort last.
--
-- The reader normalises Hijri→CE (H·0.970229 + 621.5643) to sort AH and CE
-- authors on one axis.

ALTER TABLE ar_ling_sources ADD COLUMN author_death_ah INTEGER;
ALTER TABLE ar_ling_sources ADD COLUMN author_death_ce INTEGER;

UPDATE ar_ling_sources SET author_death_ah = CASE slug
  WHEN 'thahabi_al_khalil_kitab_al_ayn'          THEN 170   -- al-Khalil b. Ahmad
  WHEN 'qomra_jamharat_al_lugha'                 THEN 321   -- Ibn Durayd
  WHEN 'ketabonline_ibn_duraid_jamharat_al_lugha' THEN 321
  WHEN 'ketabonline_al_jawhari_al_sihah'         THEN 393   -- al-Jawhari
  WHEN 'saaid_maqayis_al_lugha'                  THEN 395   -- Ibn Faris
  WHEN 'al_raghib_mufradat'                      THEN 502   -- al-Raghib al-Isfahani
  WHEN 'qomra_al_ubab_al_zakhir'                 THEN 650   -- al-Saghani
  WHEN 'ketabonline_ibn_manzur_lisan_al_arab'    THEN 711   -- Ibn Manzur
  WHEN 'qomra_al_misbah_al_munir'                THEN 770   -- al-Fayyumi
  WHEN 'ketabonline_al_fayyumi_misbah_munir'     THEN 770
  WHEN 'qomra_al_qamus_al_muhit'                 THEN 817   -- al-Firuzabadi
  WHEN 'ketabonline_al_zabidi_taj_al_arus'       THEN 1205  -- al-Zabidi
  ELSE author_death_ah END;

UPDATE ar_ling_sources SET author_death_ce = 1876
  WHERE slug IN ('lane_lexicon', 'lane_quranic_research_perseus');  -- Edward William Lane
