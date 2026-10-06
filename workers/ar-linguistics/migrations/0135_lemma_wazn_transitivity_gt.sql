-- 0135: لازم / متعدٍّ of a lemma's base verb is a LEMMA fact; ar_ling_root_lemma_wazn already carries it
-- as text (transitivity). Here it gets its GT id beside the text (the text is kept, AGR:ANY:005), and the
-- registry gains "both" (لازم ومتعدٍّ) for verbs used both ways.
-- Fix (our own 0132 row): أَلَهَ = عَبَدَ («أَلَهَ … إلاهةً أي عَبَدَ عِبادةً», al-Ṣiḥāḥ) takes an object,
-- as «فِعال بمعنى مفعول» requires — متعدٍّ, not لازم.
INSERT OR IGNORE INTO ar_ling_gram_term (id, category_key, term_key, parent_term_id, term_order, name_ar, name_en, name_ur, short_ar, short_en, short_ur,
  badge_color, version, status, discipline, is_default_when_absent, uid, name_bare, band_key, badge_color_dark, badge_color_light)
SELECT 'GT:transitivity:both', category_key, 'both', NULL, 9, 'لازم ومتعدٍّ', 'used both with and without an object', 'لازم و متعدی', 'لازم ومتعدٍّ', 'both', 'لازم و متعدی',
  badge_color, 1, 'live', discipline, 0, 'f2e3a9043f592c092289c96165', 'لازم ومتعد', band_key, badge_color_dark, badge_color_light
FROM ar_ling_gram_term WHERE id = 'GT:transitivity:transitive';
ALTER TABLE ar_ling_root_lemma_wazn ADD COLUMN transitivity_ref TEXT REFERENCES ar_ling_gram_term(id);
UPDATE ar_ling_root_lemma_wazn SET transitivity = 'mutaaddi' WHERE id = 'LW:ilah:ism_maful' AND transitivity = 'lazim';
UPDATE ar_ling_root_lemma_wazn SET transitivity_ref = CASE transitivity
  WHEN 'lazim' THEN 'GT:transitivity:intransitive' WHEN 'mutaaddi' THEN 'GT:transitivity:transitive'
  WHEN 'transitive' THEN 'GT:transitivity:transitive' WHEN 'both' THEN 'GT:transitivity:both' END
 WHERE transitivity IS NOT NULL;
