-- Arabic holds everything Arabic (owner, 2026-10-22: "MSA and all related to Arabic there — series, podcast"):
-- day-to-day speech and MSA stays in it; the Classical Arabic literature series is Arabic's; the stream's line says
-- speech too. Two Ghāfir podcasts that carried no stream are Qurʾān's, like the rest of their series.
UPDATE st_episodes SET ecosystem = 'arabic', updated_at = datetime('now') WHERE id = 'SER:eco:adab';
UPDATE st_episodes SET ecosystem = 'quran', updated_at = datetime('now')
 WHERE ecosystem IS NULL AND series_ref = 'SER:dozawiya:ghafir';
UPDATE st_streams
   SET tagline = 'Acquiring Classical Arabic — books, scene reactions, drills, grammar, balāgha, ṣarf and MSA speech',
       updated_at = datetime('now')
 WHERE key = 'arabic';
