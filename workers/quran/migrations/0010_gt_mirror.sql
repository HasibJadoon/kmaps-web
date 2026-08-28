-- 0010_gt_mirror.sql — replicate the global term registry into km_quran
--
-- WHY THIS EXISTS
-- ---------------
-- D1 cannot join across databases. The morphology display path needs a
-- trilingual label for every QAC feature on every promoted word, and the terms
-- live in km_arabic_linguistic.ar_ling_gram_term. Reaching them at serve time
-- would mean a second round trip and a join done in JS, on the hot path of
-- every passage read. So km_quran carries the registry itself.
--
-- IT IS A REPLICA, NOT A PROJECTION
-- ---------------------------------
-- Same table names, same structure, same ids. ar_ling_gram_term here is
-- byte-for-byte the DDL of ar_ling_gram_term there — same columns, same
-- constraints, same unique index — and every row keeps the id it has in AL
-- ('GT:form_family:form_iii' is that string in both databases). A query written
-- against the registry in AL runs verbatim against the copy in QR. There is no
-- mapping layer to drift, and no local naming to translate through.
--
-- This replaces qr_gram_term_ref, which was none of those things: a
-- hand-maintained PARTIAL projection under a local name, 325 of the registry's
-- 435 terms, with its own column shape. By 2026-08 it had drifted both ways —
-- 110 terms missing outright, and six categories serving stale text (e.g.
-- GT:sigha_maani:musharaka read "reciprocal" locally against the registry's
-- "reciprocal — the act runs between two parties").
--
-- THE CONTRACT
-- ------------
-- 1. km_arabic_linguistic holds the ONLY authored copy. Nothing here is ever
--    hand-edited; every row is written by scripts/sync_gt_mirror.py.
-- 2. The replica is COMPLETE — all 435 terms, all 30 categories, every column.
--    A subset is what rotted last time and is not permitted.
-- 3. Drift is detectable: ar_ling_gram_term_signature is defined here with the
--    identical body it has in AL, so the two signatures are directly
--    comparable. Equal means current. This is the check GT-008 should make —
--    the previous one compared AL's signature against a recorded copy of AL's
--    OWN signature, which matches by construction and can never detect drift.

-- ── the replica ──────────────────────────────────────────────────────────────
-- Category first: ar_ling_gram_term carries a foreign key onto it.
CREATE TABLE IF NOT EXISTS "ar_ling_gram_category" (
  category_key   TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  discipline     TEXT NOT NULL,
  applies_to     TEXT NOT NULL,
  is_closed      INTEGER NOT NULL DEFAULT 1,
  display_order  INTEGER NOT NULL DEFAULT 0,
  icon           TEXT
);

CREATE TABLE IF NOT EXISTS "ar_ling_gram_term" (
  id             TEXT PRIMARY KEY,
  category_key   TEXT NOT NULL,
  term_key       TEXT NOT NULL,
  qac_flag       TEXT,
  parent_term_id TEXT,
  term_order     INTEGER NOT NULL DEFAULT 0,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  short_ar TEXT, short_en TEXT, short_ur TEXT,
  definition_ar TEXT, definition_en TEXT, definition_ur TEXT,
  badge_color TEXT, icon TEXT,
  version     INTEGER NOT NULL DEFAULT 1,
  superseded_by TEXT,
  status      TEXT NOT NULL DEFAULT 'live', discipline TEXT, is_default_when_absent INTEGER NOT NULL DEFAULT 0, uid TEXT, qac_scope TEXT, applies_when TEXT,
  UNIQUE (category_key, term_key),
  UNIQUE (category_key, qac_flag),
  FOREIGN KEY (category_key)   REFERENCES "ar_ling_gram_category"(category_key),
  FOREIGN KEY (parent_term_id) REFERENCES "ar_ling_gram_term"(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_gram_term_uid ON ar_ling_gram_term(uid);

-- No extra indexes: everything the display view looks up goes through the
-- primary key (features_json joins on t.id, the derived-type subqueries match
-- t.id against a literal GT ref), and the sync reads every row anyway. Adding
-- local-only indexes would be the first step back towards a divergent copy.
--
-- One trap for anything resolving a raw QAC flag: qac_flag is unique only
-- WITHIN a category, and two categories legitimately share a string. 'P' is
-- both GT:number:plural (a stem flag) and GT:pos:harf_jarr (a POS); 'ACC' both
-- GT:case:accusative and GT:harf_maani:harf_nasb (a segment tag). Key on
-- (qac_scope, qac_flag) or prepositions get labelled plural.

-- ── staleness ────────────────────────────────────────────────────────────────
-- Same name and same body as the view in km_arabic_linguistic, so the two
-- signatures can be compared directly. The charsum term is what catches a label
-- edit made without bumping version (GT-009).
CREATE VIEW IF NOT EXISTS ar_ling_gram_term_signature AS
 SELECT COUNT(*) AS term_count,
        COUNT(DISTINCT category_key) AS category_count,
        SUM(version) AS version_sum,
        SUM(CASE WHEN status='live' THEN 1 ELSE 0 END) AS live_count,
        COUNT(*)||'.'||COUNT(DISTINCT category_key)||'.'||SUM(version)||'.'||SUM(length(id)+length(name_ar)+length(name_en)+length(COALESCE(name_ur,''))) AS signature
 FROM ar_ling_gram_term;

-- ── flag decomposition, derived from the replica ─────────────────────────────
-- qr_morph_flag_decomp stays a TABLE rather than a view because the expansion
-- needs string parsing SQLite does badly: QAC emits '3MS' as ONE flag while the
-- registry holds '3', 'M' and 'S' as three separate terms. Its rows are written
-- by scripts/sync_gt_mirror.py from ar_ling_gram_term, so the registry stays the
-- only authored source here too. This one keeps its qr_ prefix — it is a
-- km_quran-local mapping from the corpus tagger's vocabulary onto registry ids,
-- not part of the registry.
--
-- Two flags the expansion deliberately omits:
--   • Form I — never emitted by QAC. It is the unmarked form, carried in the
--     registry by is_default_when_absent=1 with applies_when 'V:root3'.
--   • PCPL — resolved by the UNION branches in the view below, which pick the
--     right participle from ACT/PASS. The table this replaces mapped bare PCPL
--     to BOTH participles on the theory that it is ambiguous without them. It
--     never is: PCPL occurs bare 0 times in 3,525 participle words. That rule
--     therefore fired on every participle word and always added the wrong
--     label — all 3,524 rendered 'active participle' and 'passive participle'
--     together, 2,973 with active twice (the view re-adds it under a different
--     sort_order, so UNION cannot dedupe). Dropping it fixes all of them.
--
-- With those two gone the expansion is purely mechanical: 82 rows, no editorial
-- judgement, reproducible from ar_ling_gram_term alone.
ALTER TABLE qr_morph_flag_decomp ADD COLUMN derived_from TEXT NOT NULL DEFAULT 'ar_ling_gram_term';

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
