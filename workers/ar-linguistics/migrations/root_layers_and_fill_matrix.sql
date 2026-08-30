CREATE TABLE IF NOT EXISTS ar_ling_root_asl (
  id            TEXT PRIMARY KEY,
  root_norm     TEXT NOT NULL,
  root_id       TEXT,

  statement_ar  TEXT NOT NULL,
  statement_en  TEXT,
  statement_ur  TEXT,

  authority_ar  TEXT,
  authority_en  TEXT,
  death_hijri   INTEGER,

  source_slug   TEXT,
  source_id     TEXT,
  lexicon_entry_id TEXT REFERENCES "ar_ling_lexicon_entry"(id),
  page_ref      TEXT,
  volume_no     INTEGER,

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

UPDATE ar_ling_reg_sub_layer
   SET tables_json = '["ar_ling_root_asl"]', carrier_state = 'empty'
 WHERE sub_code = '12-ASL';

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
