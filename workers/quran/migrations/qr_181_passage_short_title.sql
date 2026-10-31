-- A passage's shortest name, for a tile in a sūra's passage backlog (owner, 2026-10-31: "passage title shortest").
-- Cut from the passage's own title_en, never a new reading of it.
ALTER TABLE qr_surah_study_passage ADD COLUMN title_short TEXT;

UPDATE qr_surah_study_passage SET title_short = CASE passage_no
  WHEN 1 THEN 'Tanzil' WHEN 2 THEN 'The Charge' WHEN 3 THEN 'The Word Due' WHEN 4 THEN 'Throne-Bearers'
  WHEN 5 THEN 'Call Refused' WHEN 6 THEN 'Day of Meeting' WHEN 7 THEN 'The Approaching' WHEN 8 THEN 'Travel I'
  WHEN 9 THEN 'Musa Sent' WHEN 10 THEN 'Believer Speaks' WHEN 11 THEN 'The Tower' WHEN 12 THEN 'Two Callings'
  WHEN 13 THEN 'Fire Dispute' WHEN 14 THEN 'Victory' WHEN 15 THEN 'Greater Creation' WHEN 16 THEN 'Call on Me'
  WHEN 17 THEN 'To the Chains' WHEN 18 THEN 'Patience' WHEN 19 THEN 'Cattle, Ships' WHEN 20 THEN 'Sunnat Allah'
END WHERE surah = 40;
