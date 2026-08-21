-- Root layers and sub-layers: the missing carrier, and the fill matrix.
--
-- Sub-layer 12-ASL declares carrier_hint 'ar_ling_root_asl' and tables_json
-- '[]' — the table was never created. That is the carrier for the aṣl
-- statement, which is the root card's load-bearing field ("the OLDEST
-- witness, not the famous one"), so the layer model had a hole exactly where
-- the most important claim goes.

CREATE TABLE IF NOT EXISTS ar_ling_root_asl (
  id            TEXT PRIMARY KEY,
  root_norm     TEXT NOT NULL,
  root_id       TEXT,

  -- The claim, in the words of the witness. statement_ar is quoted, never
  -- paraphrased: an aṣl reported in our own voice is not an attestation.
  statement_ar  TEXT NOT NULL,
  statement_en  TEXT,
  statement_ur  TEXT,

  -- Who said it and when. death_hijri is what makes "oldest" decidable
  -- rather than a matter of reputation — Ibn Durayd (321) outranks Ibn Fāris
  -- (395) on this axis even though Maqāyīs is the famous one.
  authority_ar  TEXT,
  authority_en  TEXT,
  death_hijri   INTEGER,

  -- Where it is, so the claim can be checked.
  source_slug   TEXT,
  source_id     TEXT,
  lexicon_entry_id TEXT REFERENCES "ar_ling_lexicon_entry"(id),
  page_ref      TEXT,
  volume_no     INTEGER,

  -- A narrower or competing statement from a later witness, kept rather than
  -- discarded: al-Rāghib narrowing Ibn Durayd is evidence, not noise.
  is_primary    INTEGER NOT NULL DEFAULT 1,
  narrows_id    TEXT REFERENCES ar_ling_root_asl(id),
  note_md       TEXT,

  confidence    TEXT NOT NULL DEFAULT 'medium',
  status        TEXT NOT NULL DEFAULT 'draft',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (root_norm, source_slug)
);

CREATE INDEX IF NOT EXISTS ix_root_asl_root    ON ar_ling_root_asl(root_norm);
CREATE INDEX IF NOT EXISTS ix_root_asl_death   ON ar_ling_root_asl(root_norm, death_hijri);
CREATE INDEX IF NOT EXISTS ix_root_asl_primary ON ar_ling_root_asl(root_norm, is_primary);

-- Register the carrier that now exists.
UPDATE ar_ling_reg_sub_layer
   SET tables_json = '["ar_ling_root_asl"]', carrier_state = 'empty'
 WHERE sub_code = '12-ASL';

-- ── The reduplicative four ───────────────────────────────────────────────
--
-- ذبذب صرصر كبكب هدهد are the only Qurʾānic roots with no lexicon entry, and
-- they are all reduplicated quadriliterals. The lexica do carry them — under
-- the biliteral base (ذبب صرر كبب هدد), which is where a reader of al-ʿAyn
-- would look. So this is a lookup rule, not missing data, and it belongs in
-- the root key registry rather than being hardcoded in a query.
CREATE TABLE IF NOT EXISTS ar_ling_root_lexicon_alias (
  root_norm     TEXT PRIMARY KEY,
  lookup_norm   TEXT NOT NULL,
  reason        TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR REPLACE INTO ar_ling_root_lexicon_alias (root_norm, lookup_norm, reason) VALUES
  ('ذبذب','ذبب','reduplicated quadriliteral — lexica index under the biliteral base'),
  ('صرصر','صرر','reduplicated quadriliteral — lexica index under the biliteral base'),
  ('كبكب','كبب','reduplicated quadriliteral — lexica index under the biliteral base'),
  ('هدهد','هدد','reduplicated quadriliteral — lexica index under the biliteral base');



-- ── The fill matrix ──────────────────────────────────────────────────────
--
-- One row per (Qurʾānic root × root-scope sub-layer), saying how much that
-- band holds. The registry's own fill_state is global per sub-layer, so it
-- can say "senses exist" but never which of 1,642 roots is short of them.
-- This can.
--
-- Written as a table filled band by band rather than one UNION view for two
-- reasons: the carriers key on three different columns (root_norm, root_id,
-- root_text), and D1 will not parse 17 compound SELECT terms.
--
-- Note 03-ASWAT: the registry's carrier list names ar_ling_root_letter, but
-- that table is the 29-letter registry (makhraj and sifat per LETTER, 29
-- rows). The per-root carrier is ar_ling_root_letter_slot, 89,812 rows —
-- one per root per slot. Counting the wrong one would have reported the
-- phonology band empty for every root.
DROP TABLE IF EXISTS ar_ling_root_layer_fill;
CREATE TABLE ar_ling_root_layer_fill (
  root TEXT NOT NULL, sub_code TEXT NOT NULL, band TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (root, sub_code));

INSERT INTO ar_ling_root_layer_fill (root, sub_code, band, n)
SELECT r.root, '010-SRC', 'Sources', (SELECT COUNT(*) FROM "ar_ling_lexicon_entry" t WHERE t.root_norm = r.lex_key)
  FROM (SELECT q.root,
               (SELECT id FROM "ar_ling_roots" x WHERE x.root_text = q.root) AS root_id,
               COALESCE((SELECT lookup_norm FROM ar_ling_root_lexicon_alias a
                          WHERE a.root_norm = q.root), q.root) AS lex_key
          FROM tmp_qroot q) r;

INSERT INTO ar_ling_root_layer_fill (root, sub_code, band, n)
SELECT r.root, '00-CORE', 'Identity', (SELECT COUNT(*) FROM "ar_ling_roots" t WHERE t.root_text = r.root)
  FROM (SELECT q.root,
               (SELECT id FROM "ar_ling_roots" x WHERE x.root_text = q.root) AS root_id,
               COALESCE((SELECT lookup_norm FROM ar_ling_root_lexicon_alias a
                          WHERE a.root_norm = q.root), q.root) AS lex_key
          FROM tmp_qroot q) r;

INSERT INTO ar_ling_root_layer_fill (root, sub_code, band, n)
SELECT r.root, '02-VARI', 'Variants', (SELECT COUNT(*) FROM "ar_ling_root_lugha" t WHERE t.root_id = r.root_id)
  FROM (SELECT q.root,
               (SELECT id FROM "ar_ling_roots" x WHERE x.root_text = q.root) AS root_id,
               COALESCE((SELECT lookup_norm FROM ar_ling_root_lexicon_alias a
                          WHERE a.root_norm = q.root), q.root) AS lex_key
          FROM tmp_qroot q) r;

INSERT INTO ar_ling_root_layer_fill (root, sub_code, band, n)
SELECT r.root, '03-ASWAT', 'Phonology', (SELECT COUNT(*) FROM ar_ling_root_letter_slot t WHERE t.root_norm = r.root)
  FROM (SELECT q.root,
               (SELECT id FROM "ar_ling_roots" x WHERE x.root_text = q.root) AS root_id,
               COALESCE((SELECT lookup_norm FROM ar_ling_root_lexicon_alias a
                          WHERE a.root_norm = q.root), q.root) AS lex_key
          FROM tmp_qroot q) r;

INSERT INTO ar_ling_root_layer_fill (root, sub_code, band, n)
SELECT r.root, '06-TAQL', 'Permutations', (SELECT COUNT(*) FROM ar_ling_root_taqalib t WHERE t.used_root_id = r.root_id)
  FROM (SELECT q.root,
               (SELECT id FROM "ar_ling_roots" x WHERE x.root_text = q.root) AS root_id,
               COALESCE((SELECT lookup_norm FROM ar_ling_root_lexicon_alias a
                          WHERE a.root_norm = q.root), q.root) AS lex_key
          FROM tmp_qroot q) r;

INSERT INTO ar_ling_root_layer_fill (root, sub_code, band, n)
SELECT r.root, '10-DNA', 'Root DNA', (SELECT COUNT(*) FROM ar_ling_root_dna t WHERE t.root_norm = r.root)
  FROM (SELECT q.root,
               (SELECT id FROM "ar_ling_roots" x WHERE x.root_text = q.root) AS root_id,
               COALESCE((SELECT lookup_norm FROM ar_ling_root_lexicon_alias a
                          WHERE a.root_norm = q.root), q.root) AS lex_key
          FROM tmp_qroot q) r;

INSERT INTO ar_ling_root_layer_fill (root, sub_code, band, n)
SELECT r.root, '12-ASL', 'Attested asl', (SELECT COUNT(*) FROM ar_ling_root_asl t WHERE t.root_norm = r.root)
  FROM (SELECT q.root,
               (SELECT id FROM "ar_ling_roots" x WHERE x.root_text = q.root) AS root_id,
               COALESCE((SELECT lookup_norm FROM ar_ling_root_lexicon_alias a
                          WHERE a.root_norm = q.root), q.root) AS lex_key
          FROM tmp_qroot q) r;

INSERT INTO ar_ling_root_layer_fill (root, sub_code, band, n)
SELECT r.root, '14-SENSE', 'Senses', (SELECT COUNT(*) FROM "ar_ling_root_sense" t WHERE t.root_norm = r.root)
  FROM (SELECT q.root,
               (SELECT id FROM "ar_ling_roots" x WHERE x.root_text = q.root) AS root_id,
               COALESCE((SELECT lookup_norm FROM ar_ling_root_lexicon_alias a
                          WHERE a.root_norm = q.root), q.root) AS lex_key
          FROM tmp_qroot q) r;

INSERT INTO ar_ling_root_layer_fill (root, sub_code, band, n)
SELECT r.root, '15-AXIS', 'Sense axes', (SELECT COUNT(*) FROM "ar_ling_root_sense_axis" t WHERE t.root_norm = r.root)
  FROM (SELECT q.root,
               (SELECT id FROM "ar_ling_roots" x WHERE x.root_text = q.root) AS root_id,
               COALESCE((SELECT lookup_norm FROM ar_ling_root_lexicon_alias a
                          WHERE a.root_norm = q.root), q.root) AS lex_key
          FROM tmp_qroot q) r;

INSERT INTO ar_ling_root_layer_fill (root, sub_code, band, n)
SELECT r.root, '16-TAT', 'Sense evolution', (SELECT COUNT(*) FROM "ar_ling_root_tatawwur" t WHERE t.root_norm = r.root)
  FROM (SELECT q.root,
               (SELECT id FROM "ar_ling_roots" x WHERE x.root_text = q.root) AS root_id,
               COALESCE((SELECT lookup_norm FROM ar_ling_root_lexicon_alias a
                          WHERE a.root_norm = q.root), q.root) AS lex_key
          FROM tmp_qroot q) r;

INSERT INTO ar_ling_root_layer_fill (root, sub_code, band, n)
SELECT r.root, '17-ARC', 'Sense arc', (SELECT COUNT(*) FROM ar_ling_sense_arc t WHERE t.root_norm = r.root)
  FROM (SELECT q.root,
               (SELECT id FROM "ar_ling_roots" x WHERE x.root_text = q.root) AS root_id,
               COALESCE((SELECT lookup_norm FROM ar_ling_root_lexicon_alias a
                          WHERE a.root_norm = q.root), q.root) AS lex_key
          FROM tmp_qroot q) r;

INSERT INTO ar_ling_root_layer_fill (root, sub_code, band, n)
SELECT r.root, '30-KIN', 'Antonyms', (SELECT COUNT(*) FROM "ar_ling_root_didd" t WHERE t.root_norm = r.root)
  FROM (SELECT q.root,
               (SELECT id FROM "ar_ling_roots" x WHERE x.root_text = q.root) AS root_id,
               COALESCE((SELECT lookup_norm FROM ar_ling_root_lexicon_alias a
                          WHERE a.root_norm = q.root), q.root) AS lex_key
          FROM tmp_qroot q) r;

INSERT INTO ar_ling_root_layer_fill (root, sub_code, band, n)
SELECT r.root, '32-FIELD', 'Semantic field', (SELECT COUNT(*) FROM "ar_ling_root_haql" t WHERE t.root_norm = r.root)
  FROM (SELECT q.root,
               (SELECT id FROM "ar_ling_roots" x WHERE x.root_text = q.root) AS root_id,
               COALESCE((SELECT lookup_norm FROM ar_ling_root_lexicon_alias a
                          WHERE a.root_norm = q.root), q.root) AS lex_key
          FROM tmp_qroot q) r;

INSERT INTO ar_ling_root_layer_fill (root, sub_code, band, n)
SELECT r.root, '40-LINK', 'Bridges', (SELECT COUNT(*) FROM "ar_ling_root_backlink" t WHERE t.root_norm = r.root)
  FROM (SELECT q.root,
               (SELECT id FROM "ar_ling_roots" x WHERE x.root_text = q.root) AS root_id,
               COALESCE((SELECT lookup_norm FROM ar_ling_root_lexicon_alias a
                          WHERE a.root_norm = q.root), q.root) AS lex_key
          FROM tmp_qroot q) r;

INSERT INTO ar_ling_root_layer_fill (root, sub_code, band, n)
SELECT r.root, '52-SCHOL', 'Scholarship', (SELECT COUNT(*) FROM "ar_ling_root_scholarship" t WHERE t.root_norm = r.root)
  FROM (SELECT q.root,
               (SELECT id FROM "ar_ling_roots" x WHERE x.root_text = q.root) AS root_id,
               COALESCE((SELECT lookup_norm FROM ar_ling_root_lexicon_alias a
                          WHERE a.root_norm = q.root), q.root) AS lex_key
          FROM tmp_qroot q) r;

INSERT INTO ar_ling_root_layer_fill (root, sub_code, band, n)
SELECT r.root, '70-VOCAB', 'Vocabulary', (SELECT COUNT(*) FROM ar_ling_learn_vocab t WHERE t.root_norm = r.root)
  FROM (SELECT q.root,
               (SELECT id FROM "ar_ling_roots" x WHERE x.root_text = q.root) AS root_id,
               COALESCE((SELECT lookup_norm FROM ar_ling_root_lexicon_alias a
                          WHERE a.root_norm = q.root), q.root) AS lex_key
          FROM tmp_qroot q) r;

INSERT INTO ar_ling_root_layer_fill (root, sub_code, band, n)
SELECT r.root, '200-LEM', 'Lemmas', (SELECT COUNT(*) FROM "ar_ling_root_lemma" t WHERE t.root_id = r.root_id)
  FROM (SELECT q.root,
               (SELECT id FROM "ar_ling_roots" x WHERE x.root_text = q.root) AS root_id,
               COALESCE((SELECT lookup_norm FROM ar_ling_root_lexicon_alias a
                          WHERE a.root_norm = q.root), q.root) AS lex_key
          FROM tmp_qroot q) r;

CREATE INDEX ix_rlf_sub ON ar_ling_root_layer_fill(sub_code, n);
