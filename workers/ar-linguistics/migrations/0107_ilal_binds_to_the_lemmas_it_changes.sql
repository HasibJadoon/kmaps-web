-- ─── 24-ILAL · give the iʿlāl rules the join they never had ──────────────────
--
-- `ar_ling_root_lemma_ilal` holds 24 rules of iʿlāl and ibdāl — قلب الياء ألفًا,
-- النقل في الإفعال من الأجوف, حذف عين الأجوف. Every one is qiyāsī. But the table
-- has no lemma column and never did, so the registry filed it, correctly, as
-- `role = 'registry'` with the note "root references it, does not carry it",
-- and the sub-layer went to `carrier_state = 'unkeyable'`.
--
-- That reading was right about the table and wrong about the layer. A rule
-- catalogue SHOULD be a catalogue; what was missing is the join that says which
-- rule fires on which word. This adds it.
--
-- Two halves:
--   the locus   · each rule declares, in columns, the class of word it changes —
--                 a hollow root, a Form IV verb, a doubled verb. Declared once,
--                 on the rule, so the binding is reproducible rather than a
--                 hand-built list that rots.
--   the binding · one row per (lemma, rule) the locus actually selects.
--
-- Scope of the backfill: Qurʾānic lemmas. 2,854 bindings over 1,553 lemmas and
-- 719 roots. Every one is marked `derived` — a qiyāsī rule genuinely applies to
-- its whole class, and saying so is not the same as a lexicon attesting this
-- word. `surface_before` / `surface_after` stay NULL: the intermediate form has
-- to be generated or cited, never guessed by a migration.

-- ── 1 · each rule declares the class of word it changes ─────────────────────
ALTER TABLE ar_ling_root_lemma_ilal ADD COLUMN bind_weak      TEXT;
ALTER TABLE ar_ling_root_lemma_ilal ADD COLUMN bind_verb_form TEXT;
ALTER TABLE ar_ling_root_lemma_ilal ADD COLUMN bind_pos       TEXT;
ALTER TABLE ar_ling_root_lemma_ilal ADD COLUMN bind_state     TEXT NOT NULL DEFAULT 'bindable';
ALTER TABLE ar_ling_root_lemma_ilal ADD COLUMN bind_note      TEXT;

-- hollow: the ʿayn is a weak letter and moves, drops or turns
UPDATE ar_ling_root_lemma_ilal SET bind_weak='ajwaf_waw', bind_verb_form='I',  bind_pos='verb' WHERE id='IR:qalb:01';
UPDATE ar_ling_root_lemma_ilal SET bind_weak='ajwaf_ya',  bind_verb_form='I',  bind_pos='verb' WHERE id='IR:qalb:02';
UPDATE ar_ling_root_lemma_ilal SET bind_weak='ajwaf_*',                        bind_pos='verb' WHERE id='IR:naql:08';
UPDATE ar_ling_root_lemma_ilal SET bind_weak='ajwaf_*',   bind_verb_form='IV'                  WHERE id='IR:naql:10';
UPDATE ar_ling_root_lemma_ilal SET bind_weak='ajwaf_*',                        bind_pos='verb' WHERE id='IR:hadhf:13';

-- defective, assimilated, doubled
UPDATE ar_ling_root_lemma_ilal SET bind_weak='naqis_*',                        bind_pos='verb' WHERE id='IR:hadhf:14';
UPDATE ar_ling_root_lemma_ilal SET bind_weak='naqis_waw',                      bind_pos='verb' WHERE id='IR:qalb:05';
UPDATE ar_ling_root_lemma_ilal SET bind_weak='naqis_*',                        bind_pos='noun' WHERE id='IR:qalb:06';
UPDATE ar_ling_root_lemma_ilal SET bind_weak='mithal_waw',                     bind_pos='verb' WHERE id='IR:hadhf:12';
UPDATE ar_ling_root_lemma_ilal SET bind_weak='mudaaf',                         bind_pos='verb' WHERE id IN ('IR:idgham:21','IR:idgham:22');

-- form-driven, whatever the root's soundness
UPDATE ar_ling_root_lemma_ilal SET bind_verb_form='IV',   bind_pos='verb' WHERE id='IR:hadhf:15';
UPDATE ar_ling_root_lemma_ilal SET bind_verb_form='VIII'                  WHERE id IN ('IR:ibdal:16','IR:ibdal:17','IR:ibdal:18','IR:idgham:23');

-- ── rules that must NOT be auto-bound, and why ──────────────────────────────
-- Pronunciation, not the ṣarf of any particular word: إبدال النون ميمًا قبل الباء
-- happens across a word boundary. Binding it to a lemma would be a category error.
UPDATE ar_ling_root_lemma_ilal
   SET bind_state='not_lemma_scoped',
       bind_note='sandhi across a word boundary — belongs to tajwīd, not to a lemma'
 WHERE id IN ('IR:ibdal:20','IR:idgham:24');

-- These fire on a participle or a maṣdar specifically, and `ar_ling_root_lemma`
-- carries `verb_form` only on verbs. The derivation type lives in
-- `ar_ling_root_lemma_form_map`, whose key is Buckwalter and whose `lemma_ar` is
-- NULL, so there is no join to a lemma yet. Left declared and unbound rather
-- than bound approximately.
UPDATE ar_ling_root_lemma_ilal
   SET bind_state='needs_derivation_bridge',
       bind_note='fires on a participle or maṣdar; needs form_map↔lemma before it can bind'
 WHERE id IN ('IR:naql:09','IR:naql:11');

-- Noun patterns, not root-class driven.
UPDATE ar_ling_root_lemma_ilal
   SET bind_state='needs_pattern_bridge',
       bind_note='keyed on the noun pattern (مِفْعَال, مَفَاعِيل), which lemmas do not yet carry'
 WHERE id IN ('IR:qalb:03','IR:qalb:04','IR:qalb:07','IR:ibdal:19');

-- ── 2 · the binding itself ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_root_lemma_ilal_apply (
  id            TEXT PRIMARY KEY,
  root_norm     TEXT NOT NULL,               -- how a root reaches this row
  lemma_id      TEXT NOT NULL REFERENCES ar_ling_root_lemma(id),
  rule_id       TEXT NOT NULL REFERENCES ar_ling_root_lemma_ilal(id),
  step_no       INTEGER NOT NULL DEFAULT 1,  -- rules chain: naql then qalb
  surface_before TEXT,                       -- مُبْيِن — generated or cited, never guessed
  surface_after  TEXT,                       -- مُبِين
  note_ar TEXT, note_en TEXT, note_ur TEXT,
  claim_basis   TEXT NOT NULL DEFAULT 'derived'
                CHECK (claim_basis IN ('attested','derived')),
  source_slug   TEXT,
  source_ref    TEXT,
  confidence    TEXT NOT NULL DEFAULT 'high',
  generated_by  TEXT,
  status        TEXT NOT NULL DEFAULT 'live',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (lemma_id, rule_id, step_no),
  -- an attested application has to say where it is attested
  CHECK (claim_basis = 'derived' OR source_ref IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS ix_ilal_apply_root  ON ar_ling_root_lemma_ilal_apply(root_norm);
CREATE INDEX IF NOT EXISTS ix_ilal_apply_lemma ON ar_ling_root_lemma_ilal_apply(lemma_id);
CREATE INDEX IF NOT EXISTS ix_ilal_apply_rule  ON ar_ling_root_lemma_ilal_apply(rule_id);

-- ── 3 · fill it from the locus each rule declares ───────────────────────────
INSERT OR IGNORE INTO ar_ling_root_lemma_ilal_apply
  (id, root_norm, lemma_id, rule_id, claim_basis, confidence, generated_by)
SELECT 'ILA:' || substr(l.id, 1, 12) || ':' || replace(i.id, 'IR:', ''),
       r.root_text, l.id, i.id, 'derived', 'high', 'ilal_locus_bind/v1'
  FROM ar_ling_root_lemma_ilal i
  JOIN ar_ling_roots r
    ON i.bind_state = 'bindable'
   AND ( i.bind_weak IS NULL
      OR (i.bind_weak = 'ajwaf_*' AND r.weak_pattern IN ('ajwaf_waw','ajwaf_ya'))
      OR (i.bind_weak = 'naqis_*' AND r.weak_pattern IN ('naqis_waw','naqis_ya'))
      OR  r.weak_pattern = i.bind_weak )
  JOIN ar_ling_root_lemma l
    ON l.root_id = r.id
   AND l.is_quran_word = 1
   AND (i.bind_verb_form IS NULL OR l.verb_form      = i.bind_verb_form)
   AND (i.bind_pos       IS NULL OR l.part_of_speech = i.bind_pos);

-- ── 4 · tell the registry the layer is keyed now ────────────────────────────
INSERT OR REPLACE INTO ar_ling_reg_table_map
  (db, table_name, cluster, layer_code, role, sub_code, role_code, code_full,
   discipline, provenance_role, sensor_class, scope_types_json,
   row_count_at_audit, audited_at, root_bind, root_bind_col, root_bind_note)
SELECT db, 'ar_ling_root_lemma_ilal_apply', cluster, layer_code, 'carrier', '24-ILAL',
       role_code, code_full, discipline, provenance_role, sensor_class, '[]',
       (SELECT COUNT(*) FROM ar_ling_root_lemma_ilal_apply), datetime('now'),
       'direct', 'root_norm',
       'the join added by 0107 — the rule catalogue stays a catalogue, this carries the root'
  FROM ar_ling_reg_table_map WHERE table_name = 'ar_ling_root_lemma_ilal';

-- And the gate that actually kept the layer off the wire. `subLayers()` selects
-- `WHERE status = 'live'`, and 24-ILAL sat at 'na' — retired, presumably because
-- it could not be keyed. So the layer never reached a client whatever its carrier
-- state said. Keying it is only half the fix; this is the other half.
UPDATE ar_ling_reg_sub_layer
   SET tables_json = '["ar_ling_root_lemma_ilal_apply","ar_ling_root_lemma_ilal","ar_ling_root_lemma_word_silsila"]',
       carrier_state = 'populated',
       status = 'live'
 WHERE sub_code = '24-ILAL';

-- Note on the second carrier: `ar_ling_root_lemma_word_silsila` was ALWAYS
-- keyed (root_bind direct on root_norm) and always populated — 8 rows for بين,
-- carrying underlying/surface pairs, the operation, and a rule quoting Ibn
-- ʿUṣfūr, trilingually. None of it was reachable, because the sub-layer above it
-- was retired. The layer was not unkeyable; it was switched off.

-- ── 5 · lemma_sarf is not a lemma carrier, and never was ────────────────────
-- 963 rows of `pos = ACC | AMD | ANS | CERT | COND`, `pattern = '—'`, every
-- inflectional column NULL. These are QAC tag bundles for WORD OCCURRENCES, not
-- morphology of a lemma. It was filed under 00-CORE as a carrier with an unset
-- bind, which is what made it look like a gap to backfill. It is not: nothing
-- should ever bind it to a root, and the honest fix is to say so.
UPDATE ar_ling_reg_table_map
   SET role = 'registry',
       sub_code = NULL,
       root_bind = 'none',
       root_bind_note = 'QAC feature-bundle dictionary for word occurrences — a word '
                     || 'references a bundle, no root or lemma carries one. Not a gap.'
 WHERE table_name = 'ar_ling_root_lemma_sarf';
