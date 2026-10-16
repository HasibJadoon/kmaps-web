-- 065 — every Qurʾān card that stands at a place says so in intro_surah, so a sūra's review is an indexed read.
--
-- A drill card names its sūra in extra.group (introOf); a card whose resource is a place ("40", "40:7") did not, and
-- the review's ?surah= filter had to OR resource_ref = / LIKE / GLOB with intro_surah and the card→sūra map — no
-- index can serve an OR across columns. Those cards now carry it (filing derives it the same way), and the filter is
-- intro_surah, or the map for a word or root met in many sūras.
UPDATE core_srs_card
   SET intro_surah = CAST(CASE WHEN instr(resource_ref, ':') > 0 THEN substr(resource_ref, 1, instr(resource_ref, ':') - 1) ELSE resource_ref END AS INTEGER),
       intro_ayah = COALESCE(intro_ayah, CASE WHEN instr(resource_ref, ':') > 0 THEN CAST(substr(resource_ref, instr(resource_ref, ':') + 1) AS INTEGER) END)
 WHERE intro_surah IS NULL AND module = 'QR'
   AND (resource_ref GLOB '[0-9]' OR resource_ref GLOB '[0-9][0-9]' OR resource_ref GLOB '[0-9][0-9][0-9]'
        OR resource_ref GLOB '[0-9]*:[0-9]*');
CREATE INDEX IF NOT EXISTS idx_core_srs_card_intro ON core_srs_card (user_ref, intro_surah, intro_ayah);
