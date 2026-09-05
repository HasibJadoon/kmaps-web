-- kmaps-word-card · QUERIES.sql

-- ─── 1 · THE OCCURRENCE (km_quran) ───────────────────────────────────
SELECT id, surah, ayah, word_index, word_text, lemma_id, root_norm
FROM qr_word_occurrence WHERE surah = :surah AND ayah = :ayah ORDER BY word_index;

-- the verse itself
SELECT surah_no, ayah_no, text_uthmani FROM qr_ayah
WHERE surah_no = :surah AND ayah_no BETWEEN :from AND :to;

-- ─── 2 · MEANING RANGE (km_arabic_linguistic) ────────────────────────
SELECT sense_key, gloss_ar, gloss_en, gloss_ur, is_core, scope_level, source_slug
FROM ar_ling_root_sense WHERE root_norm = :root AND scope_level IN ('lemma','word')
ORDER BY sort_order;

-- ─── 3 · NEAR SYNONYMS — every entry needs an auth ───────────────────
SELECT s.set_name, m.arabic_display, m.contrast_note, m.claim_basis, m.confidence
FROM ar_ling_root_lemma_furuq_member m
JOIN ar_ling_root_lemma l ON l.id = m.lemma_id
JOIN ar_ling_root_lemma_furuq_set s ON s.id = m.set_id
WHERE l.root_id = :root_uid;
-- claim_basis NULL => not usable. A farq without an authority is not a farq.

-- ─── 4 · ANTONYMS — every entry needs an axis and a status ───────────
SELECT antonym_ar, antonym_root, relation_kind, note_en, confidence, generated_by
FROM ar_ling_root_didd WHERE root_norm = :root;
-- generated_by='source_stated' => attested; 'kmaps_derived' => derived. Never conflate.

-- ─── 5 · TIBAQ TERMS (bind the axis) ─────────────────────────────────
SELECT id, term_key, name_ar, name_en FROM ar_ling_gram_term
WHERE status = 'live' AND term_key IN ('tibaq_ijab','tibaq_salb','muqabala');

-- ─── 6 · FLUENT RENDERING (km_quran) ─────────────────────────────────
SELECT scope_id, register, text_en, text_ur, reading_ref
FROM qr_ss_translation_unit WHERE scope_id LIKE 'QR:SS:' || :surah || ':' || :ayah || '%';

-- ─── 7 · CONFORMANCE (km_core) ───────────────────────────────────────
SELECT c.id,
  (SELECT COUNT(*) FROM json_each(n.fields_json) d
    WHERE json_extract(d.value,'$.name') NOT IN (SELECT key FROM json_each(c.fields_json))) AS missing,
  (SELECT COUNT(*) FROM json_each(c.fields_json) f
    WHERE f.key NOT IN (SELECT json_extract(value,'$.name') FROM json_each(n.fields_json))) AS extra,
  c.front_text = '' AS front_empty, c.back_text = '' AS back_empty
FROM core_srs_card c JOIN core_srs_note_type n ON n.id = c.note_type_id
WHERE c.note_type_id = 'NT:kmaps:word:v1';

-- ─── 8 · SCOPE VIOLATION CHECK — must return zero ────────────────────
SELECT c.id, f.key AS forbidden_field
FROM core_srs_card c, json_each(c.fields_json) f
WHERE c.note_type_id = 'NT:kmaps:word:v1'
  AND f.key IN ('Chain','Wazn','FormLadder','FormEffects','DnaThread','Taqalib','Arcs','FamilyArcs');
