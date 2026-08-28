-- 0011_gt_mirror_cutover.sql — point the display view at the replica
--
-- Apply ONLY after 0010 is applied AND scripts/sync_gt_mirror.py has run and
-- reported the replica signature matching the registry's. Until then the
-- replica is empty, and repointing the view at an empty registry blanks
-- features_json on every word in the corpus.
--
-- Check before applying, in km_quran:
--   SELECT signature FROM ar_ling_gram_term_signature;   -- expect 435.30.435.28894
-- and in km_arabic_linguistic:
--   SELECT signature FROM ar_ling_gram_term_signature;   -- the same string
--
-- Reversible: re-creating the view from 0006 restores the old shape, but only
-- while qr_gram_term_ref still exists, so that drop is the last statement here.

-- ── repoint the display view at the replica ──────────────────────────────────
-- Same shape as before; qr_gram_term_ref → ar_ling_gram_term and
-- t.gram_term_ref → t.id are the only changes. Kept as a view: a passage reads
-- in ~3 ms and the widest query in the app (al-Baqara, 3,897 words) in ~42 ms,
-- so materialising 50,171 rows would add a staleness surface and buy nothing.
DROP VIEW IF EXISTS qr_morph_display_word;
DROP VIEW IF EXISTS v_morph_display_word;

CREATE VIEW v_morph_display_word AS
SELECT
  'MDW:' || w.surah || ':' || w.ayah || ':' || w.word_index AS id,
  w.id AS word_occ_ref, w.surah AS surah_no, w.ayah AS ayah_no, w.word_index AS word_index,
  w.surah || ':' || w.ayah AS ayah_key,
  w.word_text AS surface_ar, w.word_text_bare AS surface_bare,
  COALESCE(o.lemma_ar, dl.lemma_ar, w.lemma) AS lemma_ar,
  COALESCE(o.root_ar, json_extract(w.morphology_tag_json,'$.stem.root_ar'), w.root) AS root_ar,
  COALESCE(o.root_display, dr.root_display, CASE length(COALESCE(w.root,''))
      WHEN 2 THEN substr(w.root,1,1)||' '||substr(w.root,2,1)
      WHEN 3 THEN substr(w.root,1,1)||' '||substr(w.root,2,1)||' '||substr(w.root,3,1)
      WHEN 4 THEN substr(w.root,1,1)||' '||substr(w.root,2,1)||' '||substr(w.root,3,1)||' '||substr(w.root,4,1)
      WHEN 5 THEN substr(w.root,1,1)||' '||substr(w.root,2,1)||' '||substr(w.root,3,1)||' '||substr(w.root,4,1)||' '||substr(w.root,5,1)
      ELSE w.root END) AS root_display,
  COALESCE(o.root_ref, w.root_uid) AS root_ref,
  COALESCE(o.word_group, r.word_group) AS word_group,
  COALESCE(e.pos_ar_override, o.pos_ar, r.pos_ar) AS pos_ar,
  COALESCE(o.pos_en, r.pos_en) AS pos_en,
  COALESCE(o.gloss_ar, dl.gloss_ar) AS gloss_ar,
  COALESCE(o.gloss_en, dl.gloss_en) AS gloss_en,
  COALESCE(o.badge_color, r.badge_color) AS badge_color,
  COALESCE(e.derived_type_ar_override, o.derived_type_ar, dl.derived_type_ar,
    (SELECT t.name_ar FROM ar_ling_gram_term t WHERE t.id =
       CASE WHEN EXISTS (SELECT 1 FROM json_each(json_extract(w.morphology_tag_json,'$.stem.flags')) a WHERE a.value='PCPL')
             AND EXISTS (SELECT 1 FROM json_each(json_extract(w.morphology_tag_json,'$.stem.flags')) b WHERE b.value='ACT')
            THEN 'GT:derivation_type:active_participle'
            WHEN EXISTS (SELECT 1 FROM json_each(json_extract(w.morphology_tag_json,'$.stem.flags')) a WHERE a.value='PCPL')
             AND EXISTS (SELECT 1 FROM json_each(json_extract(w.morphology_tag_json,'$.stem.flags')) b WHERE b.value='PASS')
            THEN 'GT:derivation_type:passive_participle'
            WHEN EXISTS (SELECT 1 FROM json_each(json_extract(w.morphology_tag_json,'$.stem.flags')) a WHERE a.value='VN')
            THEN 'GT:derivation_type:masdar' END)) AS derived_type_ar,
  COALESCE(e.derived_type_en_override, o.derived_type_en, dl.derived_type_en,
    (SELECT t.name_en FROM ar_ling_gram_term t WHERE t.id =
       CASE WHEN EXISTS (SELECT 1 FROM json_each(json_extract(w.morphology_tag_json,'$.stem.flags')) a WHERE a.value='PCPL')
             AND EXISTS (SELECT 1 FROM json_each(json_extract(w.morphology_tag_json,'$.stem.flags')) b WHERE b.value='ACT')
            THEN 'GT:derivation_type:active_participle'
            WHEN EXISTS (SELECT 1 FROM json_each(json_extract(w.morphology_tag_json,'$.stem.flags')) a WHERE a.value='PCPL')
             AND EXISTS (SELECT 1 FROM json_each(json_extract(w.morphology_tag_json,'$.stem.flags')) b WHERE b.value='PASS')
            THEN 'GT:derivation_type:passive_participle'
            WHEN EXISTS (SELECT 1 FROM json_each(json_extract(w.morphology_tag_json,'$.stem.flags')) a WHERE a.value='VN')
            THEN 'GT:derivation_type:masdar' END)) AS derived_type_en,
  COALESCE(e.wazn_ar_override, o.wazn_ar, dl.wazn_ar) AS wazn_ar,
  COALESCE(o.form_roman, dl.form_roman, (SELECT replace(replace(f.value,'(',''),')','')
       FROM json_each(json_extract(w.morphology_tag_json,'$.stem.flags')) f
      WHERE f.value LIKE '(%)' LIMIT 1)) AS form_roman,
  (SELECT json_group_array(json_object('cat',t.category_key,'ar',t.name_ar,'en',t.name_en,'ur',t.name_ur,'ref',t.id))
     FROM (
       SELECT d.gram_term_ref AS gref, MIN(d.sort_order) AS so
         FROM json_each(json_extract(w.morphology_tag_json,'$.stem.flags')) f
         JOIN qr_morph_flag_decomp d ON d.flag = f.value GROUP BY d.gram_term_ref
       UNION SELECT 'GT:definiteness:definite', 20
        WHERE EXISTS (SELECT 1 FROM json_each(json_extract(w.morphology_tag_json,'$.segments')) s WHERE json_extract(s.value,'$.tag')='DET')
       UNION SELECT 'GT:derivation_type:active_participle', 50
        WHERE EXISTS (SELECT 1 FROM json_each(json_extract(w.morphology_tag_json,'$.stem.flags')) a WHERE a.value='ACT')
          AND EXISTS (SELECT 1 FROM json_each(json_extract(w.morphology_tag_json,'$.stem.flags')) b WHERE b.value='PCPL')
       UNION SELECT 'GT:derivation_type:passive_participle', 50
        WHERE EXISTS (SELECT 1 FROM json_each(json_extract(w.morphology_tag_json,'$.stem.flags')) a WHERE a.value='PASS')
          AND EXISTS (SELECT 1 FROM json_each(json_extract(w.morphology_tag_json,'$.stem.flags')) b WHERE b.value='PCPL')
       ORDER BY 2
     ) x JOIN ar_ling_gram_term t ON t.id = x.gref) AS features_json,
  1 AS is_promoted, r.is_content_word AS is_content_word,
  COALESCE(e.importance, o.importance, 3) AS importance,
  COALESCE(e.difficulty, o.difficulty) AS difficulty,
  COALESCE(o.frequency_quran, rf.n) AS frequency_quran,
  'live' AS status, COALESCE(o.display_order, 0) AS display_order,
  o.meta_json AS meta_json,
  COALESCE(o.created_at, w.created_at) AS created_at,
  COALESCE(o.updated_at, w.created_at) AS updated_at,
  COALESCE(o.gloss_ur, dl.gloss_ur) AS gloss_ur,
  COALESCE(o.derived_type_ur, dl.derived_type_ur) AS derived_type_ur,
  COALESCE(o.pos_ur, r.pos_ur) AS pos_ur,
  COALESCE(e.is_anchor, o.is_anchor, 0) AS is_anchor,
  COALESCE(o.quran_meanings_json, dl.quran_meanings_json) AS quran_meanings_json,
  COALESCE(o.root_meaning_ar, dr.meaning_core_ar) AS root_meaning_ar,
  COALESCE(o.root_meaning_en, dr.meaning_core_en) AS root_meaning_en,
  COALESCE(o.form_ar, dl.form_ar) AS form_ar,
  COALESCE(o.sense_arc_en, dl.sense_arc_en) AS sense_arc_en,
  COALESCE(o.sense_range_en, dl.sense_range_en) AS sense_range_en,
  COALESCE(o.verb_form_ar, dl.verb_form_ar) AS verb_form_ar,
  COALESCE(o.lemma_ref, w.lemma_ref) AS lemma_ref
FROM qr_word_occurrence w
JOIN qr_morph_pos_rule r ON r.pos = TRIM(json_extract(w.morphology_tag_json,'$.stem.pos'))
LEFT JOIN qr_morph_word_override o ON o.surah_no=w.surah AND o.ayah_no=w.ayah AND o.word_index=w.word_index AND o.status='live'
LEFT JOIN qr_morph_editorial e ON e.surah_no=w.surah AND e.ayah_no=w.ayah AND e.word_index=w.word_index
LEFT JOIN qr_morph_display_lemma dl ON dl.lemma_ref = COALESCE(o.lemma_ref, w.lemma_ref) AND dl.status='live'
LEFT JOIN qr_morph_display_root  dr ON dr.root_ar = w.root AND dr.status='live'
LEFT JOIN qr_root_freq rf ON rf.root_ar = w.root
WHERE COALESCE(e.promote,
        CASE WHEN r.is_content_word = 1
              AND (w.root_uid IS NOT NULL OR r.requires_root = 0) THEN 1 ELSE 0 END) = 1;

CREATE VIEW qr_morph_display_word AS SELECT * FROM v_morph_display_word;

-- The partial projection this replaces. Dropped last, after the replica is
-- populated and the view above is repointed.
DROP TABLE IF EXISTS qr_gram_term_ref;
