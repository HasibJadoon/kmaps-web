-- kmaps-lemma-card · QUERIES.sql
-- km_arabic_linguistic 192f4792 · km_quran 8bbd5053 · km_core afe84ce7

-- ─── 1 · THE LEMMA AND ITS SIBLINGS (km_arabic_linguistic) ───────────
SELECT id, lemma_text, part_of_speech, verb_form, is_quran_word, frequency_quran
FROM ar_ling_root_lemma
WHERE root_id = :root_uid
ORDER BY COALESCE(frequency_quran,0) DESC;

-- ─── 2 · COUNTS — the ONLY source. Never estimate. (km_quran) ────────
SELECT id, lemma_text, wazn_ar, total_occurrences,
       (SELECT COUNT(*) FROM qr_lemma_occurrence o WHERE o.lemma_id = qr_lemma.id) AS actual
FROM qr_lemma WHERE root = :root ORDER BY total_occurrences DESC;

-- occurrences of ONE lemma, for building Arcs by construction
SELECT o.surah, o.ayah, o.word_index
FROM qr_lemma_occurrence o WHERE o.lemma_id = :lemma_id ORDER BY o.surah, o.ayah;

-- ─── 3 · CHAIN + GOVERNMENT (drives Chain, FormEffects, family) ──────
SELECT verb_form, verb_ar, active_participle_ar, passive_participle_ar,
       masdar_json, meaning_en, note_md
FROM ar_ling_root_form_masmu WHERE root_norm = :root;

SELECT verb_form, verb_ar, transitivity, harf, meaning_en, meaning_ar, qr_ref
FROM ar_ling_root_lemma_tadiya WHERE root_norm = :root ORDER BY sort_order;

-- ─── 4 · ARC SOURCE (mined from, never the card itself) ──────────────
SELECT a.id, a.lemma_ref, a.construction_ar, a.count_quran, a.arc_ar, a.arc_en
FROM ar_ling_lemma_arc a WHERE a.lemma_ref = :lemma_ref;

SELECT e.arc_id, e.ayah_ref, e.text_ar, e.gloss_en, e.note_md
FROM ar_ling_lemma_arc_example e WHERE e.arc_id IN
  (SELECT id FROM ar_ling_lemma_arc WHERE lemma_ref = :lemma_ref);

-- ─── 5 · IMAGERY SOURCE — verbatim, for weaving ──────────────────────
-- Lane REQUIRES text_html; text_plain truncates at 400 chars
SELECT e.source_slug, b.block_seq, b.text_html
FROM ar_ling_lexicon_entry e JOIN ar_ling_lexicon_block b ON b.root_entry_id = e.id
WHERE e.root_norm = :root AND e.source_slug IN
  ('khalil_kitab_ayn','raghib_mufradat','ibn_manzur_lisan_arab','maqayis_lugha')
ORDER BY b.block_seq;

-- ─── 6 · INTEGRITY — must reconcile before commit (km_core) ──────────
SELECT id,
  json_extract(extra_json,'$.integrity.arc_sum.expected')    AS arc_sum,
  json_extract(extra_json,'$.integrity.family_sum.expected') AS family_sum,
  json_extract(extra_json,'$.integrity.card_total')          AS card_total,
  json_extract(extra_json,'$.integrity.outside')             AS outside,
  json_extract(extra_json,'$.integrity.root_total')          AS root_total,
  json_extract(extra_json,'$.integrity.check')               AS stated
FROM core_srs_card WHERE id = :card_id;
-- arc_sum + family_sum == card_total  AND  card_total + outside == root_total

-- ─── 7 · CONFORMANCE — 16 exactly, no extras, no gaps ────────────────
SELECT c.id,
  (SELECT COUNT(*) FROM json_each(n.fields_json) d
    WHERE json_extract(d.value,'$.name') NOT IN (SELECT key FROM json_each(c.fields_json))) AS missing,
  (SELECT COUNT(*) FROM json_each(c.fields_json) f
    WHERE f.key NOT IN (SELECT json_extract(value,'$.name') FROM json_each(n.fields_json))) AS extra,
  c.front_text = '' AS front_empty, c.back_text = '' AS back_empty,
  json_extract(c.extra_json,'$.imagery_check.shown') AS imagery_shown,
  LENGTH(COALESCE(c.fields_json,'')) AS fj_len
FROM core_srs_card c JOIN core_srs_note_type n ON n.id = c.note_type_id
WHERE c.note_type_id = 'NT:kmaps:lemma:sarf:v9';
-- all conformant cards: missing=0, extra=0, front_empty=1, back_empty=1, imagery_shown=1

-- ─── 8 · ARC COUNTS vs FREQUENCY — the silent failure ────────────────
SELECT c.id,
  (SELECT SUM(json_extract(value,'$.count')) FROM json_each(json_extract(c.fields_json,'$.Arcs')))       AS arcs_sum,
  (SELECT SUM(json_extract(value,'$.count')) FROM json_each(json_extract(c.fields_json,'$.FamilyArcs'))) AS family_arcs_sum
FROM core_srs_card c WHERE c.note_type_id = 'NT:kmaps:lemma:sarf:v9';
-- arcs_sum MUST equal the lemma's frequency_quran from query 2
