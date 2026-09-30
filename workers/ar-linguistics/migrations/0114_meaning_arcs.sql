-- 0114_meaning_arcs.sql
--
-- DERIVED meaning arcs for every Qurʾānic root, at three grains — root, lemma, word — read from the
-- sources' own order and their own words (kmaps-resources scripts/lexicon/meaning_arcs.py; the pulls
-- in arc_pull.py). The hand-built layer (ar_ling_sense_arc + _step, ar_ling_root_sense,
-- ar_ling_lemma_arc, ar_ling_root_dna, ar_ling_root_tatawwur) is untouched and outranks this one:
-- GET /al/arc/root/:root serves it first.
--
-- Nothing is invented. A rung is a statement a source makes (quoted, with its block/fact), placed
-- where that source places it; an edge is a development formula the source writes («ومن الباب»،
-- «ثم كثر حتى»، «واستُعير»، "then applied to … hence"), quoted. Every row carries method + provenance.
--
--   ar_ling_arc_marker      each source's OWN inventory of development / relation markers — the
--                           candidates counted over its blocks, with hits, roots and verbatim samples;
--                           in_inventory = the ones it actually uses (≥ 3 roots), the only ones read
--   ar_ling_arc             one row per root × source (scope 'source') and one per root (scope
--                           'combined'); keys_json = every key the root was read under (رب for ربب …)
--   ar_ling_arc_rung        the rungs. A source rung points to the combined rung it was aligned to
--                           (combined_id); a combined rung lists every source that attests it and
--                           where that source places it (attest_json) — disagreements stay visible
--   ar_ling_arc_edge        the formulae between rungs, quoted (combined edges name their source edges)
--   ar_ling_arc_lemma_rung  LEMMA grain: the rungs a Qurʾānic lemma carries — by the headword the source
--                           gives (vocalised match where the source vocalises; folded only when
--                           unambiguous in the root), Lane's sections by their form number, and the
--                           lemmas of the words placed on a rung. how = vocalised | folded | lane-form |
--                           placed-word | ambiguous (never attached to a sub-arc)
--   ar_ling_arc_word        WORD grain: a Qurʾānic occurrence (surah:ayah:word_index) on the rung a source
--                           files it under (al-Rāghib's quotations, Lane's Qurʾān references, Mir's idioms)
--
-- Apply with `d1 execute --file`, then record it in d1_migrations (the ledger is out of sync).

CREATE TABLE IF NOT EXISTS ar_ling_arc_marker (
  source_slug   TEXT NOT NULL,
  marker_key    TEXT NOT NULL,
  relation      TEXT NOT NULL,      -- thesis branch outside extension metaphor metonymy naming usage origin addendum gloss alternative contrast
  label         TEXT NOT NULL,      -- the formula as the source writes it («ومن الباب», "then applied to")
  n_hits        INTEGER NOT NULL,   -- blocks carrying it
  n_roots       INTEGER NOT NULL,   -- Qurʾānic roots whose entry carries it
  total_roots   INTEGER NOT NULL,   -- Qurʾānic roots the source has an entry for
  share         REAL,
  in_inventory  INTEGER NOT NULL,   -- 1: the source uses it (≥ 3 roots) — the arcs read it
  examples_json TEXT,               -- up to 3 verbatim samples {root, text}
  method        TEXT NOT NULL,
  PRIMARY KEY (source_slug, marker_key)
);

CREATE TABLE IF NOT EXISTS ar_ling_arc (
  id            TEXT PRIMARY KEY,   -- ARC:<root>:<source_slug> | ARC:<root>:combined
  root_norm     TEXT NOT NULL,
  scope         TEXT NOT NULL CHECK (scope IN ('source','combined')),
  source_slug   TEXT,               -- NULL for the combined arc
  n_rungs       INTEGER NOT NULL,
  n_edges       INTEGER NOT NULL,
  n_sources     INTEGER,
  keys_json     TEXT,               -- the keys the root was read under
  handbuilt     INTEGER NOT NULL DEFAULT 0,   -- hand-built arcs the root also has (ar_ling_sense_arc) — they outrank this
  origin        TEXT NOT NULL DEFAULT 'derived',
  method        TEXT NOT NULL,
  provenance_json TEXT NOT NULL DEFAULT '[]',
  built_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_arc_root ON ar_ling_arc(root_norm, scope);

CREATE TABLE IF NOT EXISTS ar_ling_arc_rung (
  id            TEXT PRIMARY KEY,   -- <arc id>:<seq>
  arc_id        TEXT NOT NULL,
  root_norm     TEXT NOT NULL,
  source_slug   TEXT NOT NULL,      -- 'combined' for the combined arc
  seq           INTEGER NOT NULL,   -- its place in the source's (or the combined) order
  tier          TEXT NOT NULL,      -- asl | first | sense | addendum | quranic (source) · asl | lexical | quranic (combined)
  kind          TEXT NOT NULL,      -- asl branch outside extension metaphor metonymy origin sense tropical quranic idiom
  head_ar       TEXT,               -- the headword as the source writes it
  label_ar      TEXT,               -- the source's own words (verbatim, clipped)
  label_en      TEXT,               -- the source's own English (Lane, Mir) — never a translation of ours
  quote_ar      TEXT,
  quote_en      TEXT,
  marker        TEXT,               -- the source's marker: asl:1/2, A1 ‡, «ومن الباب» …
  page          TEXT,
  block_id      TEXT,               -- ar_ling_lexicon_block it is read from
  fact_id       TEXT,               -- ar_ling_lexicon_fact it is read from
  vocab_sense_id TEXT,              -- km_quran qr_vocab_sense (al-Rāghib's / Mir's Qurʾānic sense)
  found_under   TEXT,               -- the key the source files it under
  key_rank      INTEGER,
  combined_id   TEXT,               -- source rung → the combined rung it was aligned to
  attest_json   TEXT,               -- combined rung → [{source, rung_id, seq, of, found_under, kind}]
  ayat_json     TEXT,               -- the āyāt the source files under it
  n_words       INTEGER NOT NULL DEFAULT 0,
  confidence    TEXT NOT NULL DEFAULT 'medium',
  origin        TEXT NOT NULL DEFAULT 'derived',
  method        TEXT NOT NULL,
  provenance_json TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS ix_arc_rung_arc ON ar_ling_arc_rung(arc_id, seq);
CREATE INDEX IF NOT EXISTS ix_arc_rung_root ON ar_ling_arc_rung(root_norm, source_slug);
CREATE INDEX IF NOT EXISTS ix_arc_rung_combined ON ar_ling_arc_rung(combined_id);

CREATE TABLE IF NOT EXISTS ar_ling_arc_edge (
  id            TEXT PRIMARY KEY,
  arc_id        TEXT NOT NULL,
  root_norm     TEXT NOT NULL,
  source_slug   TEXT NOT NULL,      -- the source that writes the formula
  from_id       TEXT NOT NULL,
  to_id         TEXT NOT NULL,
  relation      TEXT NOT NULL,      -- branch outside extension metaphor metonymy naming usage origin
  marker_key    TEXT,
  formula       TEXT NOT NULL,      -- the formula («ومن الباب», "hence")
  quote_ar      TEXT,               -- the statement it stands in, verbatim
  quote_en      TEXT,
  block_id      TEXT,
  fact_id       TEXT,
  also_json     TEXT,               -- combined edges: every source edge that says the same
  origin        TEXT NOT NULL DEFAULT 'derived',
  method        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_arc_edge_arc ON ar_ling_arc_edge(arc_id);

CREATE TABLE IF NOT EXISTS ar_ling_arc_lemma_rung (
  root_norm     TEXT NOT NULL,
  lemma_ar      TEXT NOT NULL,      -- the Qurʾān's lemma (qr_word_occurrence.lemma)
  rung_id       TEXT NOT NULL,      -- the source rung (Lane sub-arc rungs: <arc id>:<section>:<n>)
  combined_id   TEXT,
  source_slug   TEXT NOT NULL,
  how           TEXT NOT NULL,      -- vocalised | folded | lane-form | placed-word | ambiguous
  seq           INTEGER,            -- its place in the lemma's sub-arc (Lane: his order under the headword)
  head_ar       TEXT,
  label_en      TEXT,               -- Lane sub-arc rungs carry his English here
  marker        TEXT,
  block_id      TEXT,
  page          TEXT,
  n_words       INTEGER,
  method        TEXT NOT NULL,
  PRIMARY KEY (lemma_ar, rung_id, how)
);
CREATE INDEX IF NOT EXISTS ix_arc_lemma_root ON ar_ling_arc_lemma_rung(root_norm, lemma_ar);
CREATE INDEX IF NOT EXISTS ix_arc_lemma_combined ON ar_ling_arc_lemma_rung(combined_id);

CREATE TABLE IF NOT EXISTS ar_ling_arc_word (
  surah         INTEGER NOT NULL,
  ayah          INTEGER NOT NULL,
  word_index    INTEGER NOT NULL,   -- km_quran qr_word_occurrence.word_index
  root_norm     TEXT NOT NULL,
  lemma_ar      TEXT,
  word_text     TEXT,
  rung_id       TEXT,               -- the combined rung
  src_rung_id   TEXT NOT NULL,      -- the source rung the source files it under
  source_slug   TEXT NOT NULL,
  how           TEXT NOT NULL,      -- qr_vocab_place.how: ayah · quote · head · lemma · link · attested
  note_ar       TEXT,               -- al-Rāghib's own reading of the āyah («أي: …»)
  vocab_sense_id TEXT,
  method        TEXT NOT NULL,
  PRIMARY KEY (surah, ayah, word_index, src_rung_id)
);
CREATE INDEX IF NOT EXISTS ix_arc_word_root ON ar_ling_arc_word(root_norm, rung_id);
CREATE INDEX IF NOT EXISTS ix_arc_word_rung ON ar_ling_arc_word(rung_id);
CREATE INDEX IF NOT EXISTS ix_arc_word_src ON ar_ling_arc_word(src_rung_id);
