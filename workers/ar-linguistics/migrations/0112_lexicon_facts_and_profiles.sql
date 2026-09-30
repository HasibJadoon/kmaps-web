-- 0112_lexicon_facts_and_profiles.sql
--
-- The per-lexicon FACTS layer: what each classical lexicon itself says about a root, read by
-- that book's own markers (kmaps-resources scripts/lexicon/lexicon_facts.py) — Lane's labelled
-- senses and apparatus (inf. n., pl., syn., contr., aor., ‡/†), the Tāj/Qāmūs model words
-- (كنصر، كأمير) and «ج:», Maqāyīs's thesis split into each aṣl, ʿAyn's «headword: gloss»
-- digests and permutations, the Mufradāt's and the Tāj's Qurʾān references (verified against the
-- āyah), the dalāla formulae (يدل على، معناه، سمي بذلك لأن …), Sinai's key terms and verb +
-- particle constructions. Each fact keeps the block it was read from and the key the book FILES
-- it under; read facts through ar_ling_root_lexicon_fact_v, which joins ar_ling_root_lexicon_key
-- exactly as ar_ling_root_lexicon_block_v does (Lane files ربب under رب).
--
-- The per-lexicon PROFILE: each lexicon's own "engine" over its Qurʾānic-root entries — its
-- marker vocabulary, vocalisation, structure and the recurring formulae an open n-gram scan
-- finds — with verbatim examples (lexicon_profile.py).
--
-- Lane's Qurʾān references use Flügel's verse numbers: ar_ling_lexicon_quran_ref gains the
-- Ḥafṣ surah/āyah beside the stored numbers (never overwritten), and ar_ling_root_asl gains a
-- proposal table — corrections read from the Maqāyīs thesis, for review, not written over
-- verified rows.
--
-- The worker's migration ledger is out of sync: apply with `d1 execute --file`, then record
-- the file in d1_migrations. Never `migrations apply`.

CREATE TABLE IF NOT EXISTS ar_ling_lexicon_fact (
  id           TEXT PRIMARY KEY,
  source_slug  TEXT NOT NULL,
  root_norm    TEXT NOT NULL,             -- the key the book files the entry under
  block_id     TEXT,                      -- ar_ling_lexicon_block.id the fact starts in
  section_id   TEXT,
  headword_ar  TEXT,
  fact_kind    TEXT NOT NULL,             -- sense form masdar bab plural didd synonym dialect muarrab majaz mathal qawluhum
                                          -- tadiya authority quran asl digest taqalib dalala aorist feminine diminutive
                                          -- nisba participle keyterm verbal_idiom
  value_ar     TEXT,
  value_en     TEXT,
  quote_ar     TEXT,                      -- the book's own words round it (verbatim)
  surah        INTEGER,                   -- Ḥafṣ numbering (Lane's Flügel numbers converted)
  ayah         INTEGER,
  marker       TEXT,                      -- the book's marker: A1/B2, ‡, كنصر, antonym/addad, yadull …
  method       TEXT NOT NULL,             -- source:rule that read it
  confidence   TEXT NOT NULL DEFAULT 'medium',
  seq          INTEGER,
  data_json    TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_lex_fact_root_kind ON ar_ling_lexicon_fact(root_norm, fact_kind);
CREATE INDEX IF NOT EXISTS ix_lex_fact_kind_source ON ar_ling_lexicon_fact(fact_kind, source_slug, confidence);
CREATE INDEX IF NOT EXISTS ix_lex_fact_ayah ON ar_ling_lexicon_fact(surah, ayah) WHERE surah IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_lex_fact_block ON ar_ling_lexicon_fact(block_id);

DROP VIEW IF EXISTS ar_ling_root_lexicon_fact_v;
CREATE VIEW ar_ling_root_lexicon_fact_v AS
SELECT k.root_norm, f.root_norm AS found_under, k.key_rank,
       f.id, f.source_slug, f.block_id, f.section_id, f.headword_ar, f.fact_kind, f.value_ar, f.value_en, f.quote_ar,
       f.surah, f.ayah, f.marker, f.method, f.confidence, f.seq, f.data_json
  FROM ar_ling_root_lexicon_key k
  JOIN ar_ling_lexicon_fact f ON f.root_norm = k.lookup_norm;

CREATE TABLE IF NOT EXISTS ar_ling_lexicon_profile (
  source_slug   TEXT NOT NULL,
  feature       TEXT NOT NULL,            -- family:key, e.g. plural:jim_colon, lane:inf_n, voc:density, ngram:3:قال ابن سيده
  family        TEXT NOT NULL,            -- synonym contrast asl branch dialect muarrab majaz bab masdar plural apparatus
                                          -- authority sigla dalala voc struct ngram
  label         TEXT,
  n             INTEGER,                  -- entries that show it
  total         INTEGER,                  -- entries measured (the lexicon's Qurʾānic-root entries)
  share         REAL,                     -- n / total
  per_entry     REAL,                     -- occurrences per entry
  value         REAL,                     -- for measures that are not counts (density, lengths)
  examples_json TEXT,                     -- 2–3 verbatim samples
  computed_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (source_slug, feature)
);
CREATE INDEX IF NOT EXISTS ix_lex_profile_family ON ar_ling_lexicon_profile(family, share);

ALTER TABLE ar_ling_lexicon_quran_ref ADD COLUMN hafs_surah INTEGER;
ALTER TABLE ar_ling_lexicon_quran_ref ADD COLUMN hafs_ayah INTEGER;
ALTER TABLE ar_ling_lexicon_quran_ref ADD COLUMN hafs_method TEXT;

CREATE TABLE IF NOT EXISTS ar_ling_root_asl_proposal (
  id                    TEXT PRIMARY KEY,
  root_norm             TEXT NOT NULL,
  asl_id                TEXT,             -- the ar_ling_root_asl row it would correct (NULL: none exists)
  current_statement_ar  TEXT,
  proposed_statement_ar TEXT NOT NULL,
  asl_no                INTEGER,
  asl_count             INTEGER,
  reason                TEXT NOT NULL,
  fact_id               TEXT,             -- ar_ling_lexicon_fact the proposal is read from
  status                TEXT NOT NULL DEFAULT 'proposed',
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_asl_proposal_root ON ar_ling_root_asl_proposal(root_norm);
