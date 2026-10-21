-- Schema for km_arabic_linguistic.
-- Generated from remote Cloudflare D1 sqlite_schema with data excluded, 2026-10-02.
-- Internal D1 bookkeeping tables and FTS5 shadow tables are omitted.
-- Regenerate with scripts/regen_schemas.py — do not hand-edit.

-- ── Tables (158) ─────────────────────────────────────────────────

CREATE TABLE ar_ling_adima_entry (
  id              TEXT PRIMARY KEY,          -- ADM:<chunk id>:<n>
  discipline      TEXT NOT NULL,             -- NH | SF
  chunk_id        TEXT NOT NULL,             -- ar_ling_gram_chunk.id: the page it is read from
  volume_no       INTEGER,
  page_no         INTEGER,
  seq             INTEGER NOT NULL,          -- book order
  chapter_ar      TEXT,                      -- the study it belongs to («دراسة (افتعل)»)
  section_ar      TEXT,                      -- the heading it is listed under
  head_ar         TEXT,                      -- the word or sub-heading above it
  pattern_ar      TEXT,                      -- the verb pattern the chapter studies (ṣarf)
  pattern_term_id TEXT,                      -- GT:form_family:*
  meaning_ar      TEXT,                      -- the meaning the heading names
  meaning_term_id TEXT,                      -- GT:sigha_maani:* where it is one
  section_term_id TEXT,                      -- a GT term the heading names
  quote_ar        TEXT NOT NULL,
  surah           INTEGER NOT NULL,
  ayah            INTEGER NOT NULL,
  refs_json       TEXT,                      -- every place it lists: [[s, a], …]
  word_index      INTEGER,                   -- qr_word_occurrence.word_index of the word it is about
  word_ar         TEXT,
  quote_match     REAL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_adima_note (
  id              TEXT PRIMARY KEY,          -- ADN:<n>
  discipline      TEXT NOT NULL,
  chunk_id        TEXT NOT NULL,
  volume_no       INTEGER,
  page_no         INTEGER,
  chapter_ar      TEXT,
  section_ar      TEXT,
  head_ar         TEXT,
  pattern_ar      TEXT,
  pattern_term_id TEXT,
  meaning_ar      TEXT,
  meaning_term_id TEXT,
  section_term_id TEXT,
  note_ar         TEXT NOT NULL,             -- his observation, as he writes it
  drill_ar        TEXT,                      -- its one drillable sentence, or NULL
  about_readings  INTEGER NOT NULL DEFAULT 0 -- it speaks of the readings (the seven, the shādhdh)
);

CREATE TABLE ar_ling_arc (
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

CREATE TABLE ar_ling_arc_edge (
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

CREATE TABLE ar_ling_arc_lemma_rung (
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

CREATE TABLE ar_ling_arc_marker (
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

CREATE TABLE ar_ling_arc_rung (
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
, step_en TEXT);

CREATE TABLE ar_ling_arc_word (
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

CREATE TABLE ar_ling_concept_block (
  id                TEXT PRIMARY KEY,
  uid               TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(13)))),
  concept_entry_id  TEXT REFERENCES ar_ling_concept_entry(id) ON DELETE CASCADE,
  entry_uid         TEXT,
  term_id           TEXT REFERENCES ar_ling_gram_term(id),
  term_uid          TEXT,
  discipline_key    TEXT REFERENCES ar_ling_reg_discipline(discipline_key),
  sense_id          TEXT REFERENCES ar_ling_concept_sense(id),
  sense_uid         TEXT,
  section_id        TEXT REFERENCES ar_ling_concept_section(id),
  source_slug       TEXT,
  parent_block_id   TEXT REFERENCES ar_ling_concept_block(id),
  block_path        TEXT NOT NULL,
  block_seq         INTEGER NOT NULL,
  depth             INTEGER NOT NULL DEFAULT 0,
  block_type        TEXT NOT NULL,
  lang              TEXT,
  title_ar TEXT, title_en TEXT, title_ur TEXT,
  text_plain TEXT, text_html TEXT,
  translation_en TEXT, translation_ur TEXT,
  data_json         TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(data_json)),
  origin            TEXT NOT NULL DEFAULT 'book_native',
  origin_ref        TEXT,
  printed_page      INTEGER,
  printed_anchor    TEXT,
  status            TEXT NOT NULL DEFAULT 'draft',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT,
  CHECK (concept_entry_id IS NOT NULL OR term_id IS NOT NULL OR discipline_key IS NOT NULL)
);

CREATE VIRTUAL TABLE ar_ling_concept_block_fts USING fts5(
  block_id UNINDEXED, block_uid UNINDEXED, term_id UNINDEXED, source_slug UNINDEXED,
  title_ar, title_en, title_ur, text_plain, translation_en, translation_ur,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TABLE ar_ling_concept_block_link (
  id                TEXT PRIMARY KEY,
  uid               TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(13)))),
  from_block_id     TEXT NOT NULL REFERENCES ar_ling_concept_block(id) ON DELETE CASCADE,
  from_block_uid    TEXT,
  link_kind         TEXT NOT NULL,
  to_term_id TEXT, to_term_uid TEXT,
  to_sense_id TEXT, to_sense_uid TEXT,
  to_root_norm TEXT, to_root_uid TEXT,
  to_surah INTEGER, to_ayah INTEGER, to_ayah_to INTEGER,
  to_block_id TEXT REFERENCES ar_ling_concept_block(id),
  to_authority_code TEXT, to_lemma_ref TEXT, to_card_ref TEXT, to_url TEXT,
  to_db             TEXT,
  label TEXT, weight REAL DEFAULT 1.0, position_offset INTEGER,
  origin            TEXT NOT NULL DEFAULT 'derived',
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_concept_entry (
  id              TEXT PRIMARY KEY,
  uid             TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(13)))),
  source_id       TEXT NOT NULL REFERENCES ar_ling_source(id),
  source_slug     TEXT NOT NULL,
  term_id         TEXT NOT NULL REFERENCES ar_ling_gram_term(id),
  term_uid        TEXT,
  discipline_key  TEXT NOT NULL REFERENCES ar_ling_reg_discipline(discipline_key),
  heading_ar      TEXT,
  entry_text_ar   TEXT,
  raw_text        TEXT,
  translation_en  TEXT,
  translation_ur  TEXT,
  toc_id          TEXT REFERENCES ar_ling_source_toc(id),
  source_chunk_id TEXT REFERENCES ar_ling_source_chunk(id),
  page_start INTEGER, page_end INTEGER, volume_no INTEGER,
  source_url TEXT,
  stance          TEXT CHECK (stance IS NULL OR stance IN ('defines','divides','disputes','applies','mentions')),
  is_locus_classicus INTEGER NOT NULL DEFAULT 0,
  parser_version TEXT, raw_hash TEXT, import_batch_id TEXT,
  status          TEXT NOT NULL DEFAULT 'raw',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source_slug, term_id)
);

CREATE TABLE ar_ling_concept_equivalent (
  id           TEXT PRIMARY KEY,
  uid          TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(13)))),
  term_id      TEXT NOT NULL REFERENCES ar_ling_gram_term(id),
  term_uid     TEXT,
  sense_id     TEXT REFERENCES ar_ling_concept_sense(id),
  sense_uid    TEXT,
  tradition    TEXT NOT NULL CHECK (tradition IN ('en_linguistics','en_arabist','ur_balaghat','greek_rhetoric','latin_rhetoric','hebrew','syriac','other')),
  equiv_term   TEXT NOT NULL,
  equiv_script TEXT,
  equiv_gloss  TEXT,
  fit          TEXT NOT NULL CHECK (fit IN ('exact','close','partial','false_friend')),
  loss_kind    TEXT CHECK (loss_kind IN ('none','recoverable','partly_recoverable','structural')),
  divergence_ar TEXT, divergence_en TEXT, divergence_ur TEXT,
  source_ref   TEXT,
  is_preferred INTEGER NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_concept_external_link (
  id            TEXT PRIMARY KEY,
  uid           TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(13)))),
  from_kind     TEXT NOT NULL CHECK (from_kind IN ('discipline','group','term','sense','entry','block')),
  from_ref      TEXT NOT NULL,
  from_uid      TEXT NOT NULL,
  to_db         TEXT NOT NULL,
  to_kind       TEXT NOT NULL CHECK (to_kind IN ('course','unit','lesson','card','deck','quran_scope','document','asset')),
  to_ref        TEXT NOT NULL,
  to_uid        TEXT,
  role          TEXT NOT NULL DEFAULT 'taught_in' CHECK (role IN ('taught_in','reviewed_by','applied_at','documented_in','contrast')),
  label         TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (from_ref, to_ref, role)
);

CREATE TABLE ar_ling_concept_group (
  group_id        TEXT PRIMARY KEY,
  uid             TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(13)))),
  discipline_key  TEXT NOT NULL REFERENCES ar_ling_reg_discipline(discipline_key),
  group_kind      TEXT NOT NULL CHECK (group_kind IN ('bab','taxonomic','instrument','function','contrast_set','source_toc','thematic')),
  parent_group_id TEXT REFERENCES ar_ling_concept_group(group_id),
  source_slug     TEXT,
  toc_id          TEXT REFERENCES ar_ling_source_toc(id),
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  note_ar TEXT, note_en TEXT, note_ur TEXT,
  seq             INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'live',
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_concept_group_member (
  group_id    TEXT NOT NULL REFERENCES ar_ling_concept_group(group_id) ON DELETE CASCADE,
  term_id     TEXT NOT NULL REFERENCES ar_ling_gram_term(id),
  term_uid    TEXT,
  seq         INTEGER NOT NULL DEFAULT 0,
  role        TEXT,
  note_ar TEXT, note_en TEXT, note_ur TEXT,
  PRIMARY KEY (group_id, term_id)
);

CREATE TABLE ar_ling_concept_section (
  id               TEXT PRIMARY KEY,
  uid              TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(13)))),
  concept_entry_id TEXT NOT NULL REFERENCES ar_ling_concept_entry(id) ON DELETE CASCADE,
  entry_uid        TEXT,
  source_slug      TEXT NOT NULL,
  term_id          TEXT NOT NULL REFERENCES ar_ling_gram_term(id),
  section_seq      INTEGER NOT NULL,
  heading_ar TEXT, heading_norm TEXT,
  section_type     TEXT NOT NULL DEFAULT 'definition',
  text_ar TEXT, translation_en TEXT, translation_ur TEXT,
  page_no INTEGER, volume_no INTEGER,
  has_gaps         INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT,
  UNIQUE (concept_entry_id, section_seq)
);

CREATE TABLE ar_ling_concept_sense (
  id          TEXT PRIMARY KEY,
  uid         TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(13)))),
  term_id     TEXT NOT NULL REFERENCES ar_ling_gram_term(id),
  term_uid    TEXT,
  sense_key   TEXT NOT NULL,
  sense_order INTEGER NOT NULL DEFAULT 0,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  hadd_ar TEXT, hadd_en TEXT, hadd_ur TEXT,
  dabit_ar TEXT, dabit_en TEXT, dabit_ur TEXT,
  tarjama_athar_en TEXT, tarjama_athar_ur TEXT,
  loss_kind   TEXT CHECK (loss_kind IN ('recoverable','partly_recoverable','structural')),
  is_primary  INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'draft',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT,
  UNIQUE (term_id, sense_key)
);

CREATE TABLE ar_ling_concept_sense_example (
  id           TEXT PRIMARY KEY,
  uid          TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(13)))),
  sense_id     TEXT NOT NULL REFERENCES ar_ling_concept_sense(id) ON DELETE CASCADE,
  sense_uid    TEXT,
  term_id      TEXT NOT NULL REFERENCES ar_ling_gram_term(id),
  term_uid     TEXT,
  example_kind TEXT NOT NULL DEFAULT 'quran' CHECK (example_kind IN ('quran','hadith','shir','prose','proverb','constructed')),
  example_ar   TEXT NOT NULL,
  gloss_en TEXT, gloss_ur TEXT,
  analysis_ar TEXT, analysis_en TEXT, analysis_ur TEXT,
  qr_surah INTEGER, qr_ayah INTEGER, qr_ref TEXT,
  poet_or_speaker TEXT,
  source_slug TEXT, page_ref TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_concept_synthesis (
  term_id      TEXT PRIMARY KEY REFERENCES ar_ling_gram_term(id),
  uid          TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(13)))),
  term_uid     TEXT,
  hadd_ar TEXT, hadd_en TEXT, hadd_ur TEXT,
  discourse_ar TEXT, discourse_en TEXT, discourse_ur TEXT,
  dabit_ar TEXT, dabit_en TEXT, dabit_ur TEXT,
  khilaf_ar TEXT, khilaf_en TEXT, khilaf_ur TEXT,
  tarjama_athar_en TEXT, tarjama_athar_ur TEXT,
  easy_en TEXT, easy_ur TEXT,
  roster_expected INTEGER NOT NULL DEFAULT 0,
  roster_done     INTEGER NOT NULL DEFAULT 0,
  coverage_pct    REAL,
  depth_tier      TEXT CHECK (depth_tier IS NULL OR depth_tier IN ('stub','v1','v2','complete')),
  status          TEXT NOT NULL DEFAULT 'draft',
  reviewed_at     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT
);

CREATE TABLE ar_ling_gram_bab (
  id           TEXT PRIMARY KEY,
  discipline   TEXT NOT NULL,
  source_slug  TEXT NOT NULL,
  book_id      INTEGER NOT NULL,
  shamela_id   INTEGER,
  parent_id    TEXT,
  title_ar     TEXT NOT NULL,
  depth        INTEGER NOT NULL DEFAULT 0,
  matn_order   INTEGER NOT NULL,
  volume_no    INTEGER,
  page_start   INTEGER,
  page_id      INTEGER,
  status       TEXT NOT NULL DEFAULT 'raw',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
, title_en       TEXT, title_ur       TEXT, scope_level   TEXT, memlet_key    TEXT REFERENCES "ar_ling_learn_memlet_kind"(memlet_key), encoding_axis TEXT, carrier_table TEXT, storage_code  TEXT, edition_id    TEXT REFERENCES "ar_ling_source_edition"(id), fill_state    TEXT NOT NULL DEFAULT 'missing', depth_level   TEXT NOT NULL DEFAULT 'L2', layer_code    TEXT NOT NULL DEFAULT 'AL:000-REG:SF:00-CORE:P', page_extent REAL, qr_surah INTEGER, qr_ayah_from INTEGER, qr_ayah_to INTEGER);

CREATE TABLE "ar_ling_gram_category" (
  category_key   TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  discipline     TEXT NOT NULL,
  applies_to     TEXT NOT NULL,
  is_closed      INTEGER NOT NULL DEFAULT 1,
  display_order  INTEGER NOT NULL DEFAULT 0,
  icon           TEXT
);

CREATE TABLE "ar_ling_gram_chunk" (
  id           TEXT PRIMARY KEY,
  discipline   TEXT NOT NULL,
  source_slug  TEXT NOT NULL,
  book_id      INTEGER NOT NULL,
  bab_id       TEXT,
  volume_no    INTEGER,
  part_label   TEXT,
  page_no      INTEGER,
  seq          INTEGER NOT NULL,
  heading_norm TEXT,
  text_ar      TEXT NOT NULL,
  footnotes_ar TEXT,
  page_id      INTEGER,
  status       TEXT NOT NULL DEFAULT 'raw',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
, edition_id TEXT REFERENCES "ar_ling_source_edition"(id), layer_code TEXT NOT NULL DEFAULT 'AL:010-SRC:--:00-CORE:P', translation_en TEXT, translation_ur TEXT, text_norm TEXT);

CREATE TABLE ar_ling_gram_chunk_citation ( id TEXT PRIMARY KEY, chunk_id TEXT NOT NULL, source_slug TEXT NOT NULL, seq INTEGER NOT NULL, num_a INTEGER NOT NULL, num_b INTEGER NOT NULL, surah INTEGER, ayah INTEGER, ayah_text_ar TEXT, orientation TEXT CHECK (orientation IN ('surah_ayah','ayah_surah')), resolved_by TEXT CHECK (resolved_by IN ('text_match','entry_majority','unique_valid')), state TEXT NOT NULL DEFAULT 'unresolved' CHECK (state IN ('unresolved','resolved','ambiguous','rejected')), qr_ayah_ref TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')) );

CREATE TABLE ar_ling_gram_chunk_term ( chunk_id TEXT NOT NULL, term_id TEXT NOT NULL, match_kind TEXT NOT NULL CHECK (match_kind IN ('exact','prefix','contains','manual')), state TEXT NOT NULL DEFAULT 'auto' CHECK (state IN ('auto','confirmed','rejected')), note TEXT, PRIMARY KEY (chunk_id, term_id) );

CREATE VIRTUAL TABLE ar_ling_gram_chunks_fts USING fts5(
  id UNINDEXED, discipline UNINDEXED, source_slug UNINDEXED,
  heading_norm, text_ar, footnotes_ar,
  tokenize='unicode61 remove_diacritics 2');

CREATE TABLE ar_ling_gram_ext_bab (
  id TEXT PRIMARY KEY, book_id TEXT NOT NULL, ord INTEGER,
  title_ar TEXT NOT NULL, pages REAL, bab_ref TEXT, match_kind TEXT);

CREATE TABLE ar_ling_gram_ext_book (
  id TEXT PRIMARY KEY, source_slug TEXT NOT NULL, ord INTEGER,
  title_ar TEXT NOT NULL, author_ar TEXT, death_ah INTEGER,
  volumes INTEGER, pages_total INTEGER, bab_count INTEGER,
  al_source_slug TEXT, url TEXT);

CREATE TABLE ar_ling_gram_external_toc ( source_slug TEXT NOT NULL, section TEXT NOT NULL, entry_no INTEGER NOT NULL, title_ar TEXT NOT NULL, url TEXT GENERATED ALWAYS AS ('https://jamharah.net/archive/index.php/t-'||entry_no||'.html') VIRTUAL, id TEXT GENERATED ALWAYS AS ('adima:'||section||':'||entry_no) VIRTUAL, bab_ref     TEXT REFERENCES ar_ling_gram_bab(id), chunk_ref   TEXT REFERENCES ar_ling_gram_chunk(id), match_kind  TEXT, match_score REAL, PRIMARY KEY (source_slug, section, entry_no) );

CREATE TABLE ar_ling_gram_khilaf (
  id          TEXT PRIMARY KEY,
  source_slug TEXT NOT NULL,
  book_id     INTEGER NOT NULL,
  bab_id      TEXT,
  masala_no   INTEGER NOT NULL,
  title_ar    TEXT NOT NULL,
  kufa_ar     TEXT,
  basra_ar    TEXT,
  verdict     TEXT,
  volume_no   INTEGER,
  page_start  INTEGER,
  status      TEXT NOT NULL DEFAULT 'raw',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_gram_source_toc_rank ( source_slug TEXT PRIMARY KEY, source_rank INTEGER NOT NULL, tier TEXT NOT NULL, note TEXT );

CREATE TABLE "ar_ling_gram_term" (
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
  status      TEXT NOT NULL DEFAULT 'live', discipline TEXT, is_default_when_absent INTEGER NOT NULL DEFAULT 0, uid TEXT, qac_scope TEXT, applies_when TEXT, name_bare TEXT, aliases_json TEXT, band_key TEXT, badge_color_dark TEXT, badge_color_light TEXT,
  UNIQUE (category_key, term_key),
  UNIQUE (category_key, qac_flag),
  FOREIGN KEY (category_key)   REFERENCES "ar_ling_gram_category"(category_key),
  FOREIGN KEY (parent_term_id) REFERENCES "ar_ling_gram_term"(id)
);

CREATE TABLE ar_ling_gram_term_alias (
  alias_bare   TEXT NOT NULL,
  term_id      TEXT NOT NULL REFERENCES ar_ling_gram_term(id) ON DELETE CASCADE,
  category_key TEXT NOT NULL,
  alias_raw    TEXT NOT NULL,
  alias_lang   TEXT NOT NULL DEFAULT 'ar',
  alias_kind   TEXT NOT NULL DEFAULT 'variant',
  source       TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (alias_bare, category_key)
);

CREATE TABLE "ar_ling_gram_term_example" (
  id            TEXT PRIMARY KEY,
  term_id       TEXT NOT NULL,
  example_ar    TEXT NOT NULL,
  gloss_en TEXT, gloss_ur TEXT,
  example_kind  TEXT NOT NULL DEFAULT 'quran',
  qr_ref        TEXT,
  source_ref    TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0, evidence TEXT, focus_ar TEXT,
  FOREIGN KEY (term_id) REFERENCES "ar_ling_gram_term"(id)
);

CREATE TABLE "ar_ling_gram_term_outbox" (
  seq        INTEGER PRIMARY KEY AUTOINCREMENT,
  op         TEXT NOT NULL,
  term_id    TEXT NOT NULL,
  payload    TEXT,
  changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  applied_km_quran     INTEGER NOT NULL DEFAULT 0,
  applied_km_worldview INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE "ar_ling_gram_term_relation" (
  from_term_id  TEXT NOT NULL,
  to_term_id    TEXT NOT NULL,
  relation_kind TEXT NOT NULL,
  note_ar TEXT, note_en TEXT, note_ur TEXT,
  PRIMARY KEY (from_term_id, to_term_id, relation_kind)
);

CREATE TABLE ar_ling_gram_term_rule (
  id TEXT PRIMARY KEY,
  term_id TEXT NOT NULL,
  statement_ar TEXT, statement_en TEXT, statement_ur TEXT,
  caveat_ar TEXT, caveat_en TEXT, caveat_ur TEXT,
  applies_when TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'live',
  note_md TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (term_id) REFERENCES "ar_ling_gram_term"(id)
);

CREATE TABLE "ar_ling_gram_term_source" (
  term_id     TEXT NOT NULL,
  source_slug TEXT NOT NULL,
  page_ref    TEXT,
  PRIMARY KEY (term_id, source_slug)
);

CREATE TABLE ar_ling_gram_term_toc ( id TEXT PRIMARY KEY, term_id TEXT NOT NULL, category_key TEXT, source_slug TEXT NOT NULL, source_rank INTEGER NOT NULL, discipline TEXT, bab_id TEXT NOT NULL, bab_title_ar TEXT, page_start INTEGER, match_kind TEXT NOT NULL CHECK (match_kind IN ('exact','prefix','contains')), match_rank INTEGER NOT NULL, state TEXT NOT NULL DEFAULT 'auto' CHECK (state IN ('auto','confirmed','rejected')), note TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), external_url TEXT, UNIQUE (term_id, bab_id) );

CREATE TABLE "ar_ling_learn_example" (
  id             TEXT PRIMARY KEY,
  lemma_ar       TEXT NOT NULL,
  passage_ar     TEXT NOT NULL,
  passage_en TEXT, passage_ur TEXT,
  blank_index    INTEGER NOT NULL DEFAULT 1,
  answer_ar      TEXT NOT NULL,
  clue_kind      TEXT,
  passage_kind   TEXT NOT NULL DEFAULT 'quran',
  qr_ref         TEXT,
  difficulty     INTEGER NOT NULL DEFAULT 3,
  source_slug TEXT NOT NULL, source_ref TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
);

CREATE TABLE ar_ling_learn_lemma (
  lemma_id        TEXT PRIMARY KEY REFERENCES ar_ling_root_lemma(id),
  register        TEXT,
  frequency_note  TEXT,
  frequency_quran INTEGER,
  frequency_rank  INTEGER,
  morph_opacity   REAL,
  polysemy_count  INTEGER,
  abstractness    REAL,
  computed_level  INTEGER NOT NULL DEFAULT 3,
  computed_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "ar_ling_learn_memlet" (
  id             TEXT PRIMARY KEY,
  memlet_key     TEXT NOT NULL,
  scope_level    TEXT NOT NULL CHECK (scope_level IN ('root','lemma')),
  scope_key      TEXT NOT NULL,
  lemma_ar       TEXT, root_norm TEXT NOT NULL,
  title_ar TEXT, title_en TEXT, title_ur TEXT,
  body_ar  TEXT, body_en  TEXT, body_ur  TEXT,
  data_json      TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(data_json)),
  media_r2_key   TEXT,
  block_ref      TEXT,
  difficulty     INTEGER NOT NULL DEFAULT 3,
  is_synthesis   INTEGER NOT NULL DEFAULT 1,
  source_slug    TEXT NOT NULL,
  source_ref     TEXT,
  confidence     TEXT DEFAULT 'medium',
  status         TEXT NOT NULL DEFAULT 'draft',
  created_at     TEXT NOT NULL DEFAULT (datetime('now')), root_id   TEXT REFERENCES ar_ling_roots(id), lemma_ref TEXT REFERENCES "ar_ling_root_lemma"(id), display_json TEXT,
  UNIQUE (scope_level, scope_key, memlet_key),
  FOREIGN KEY (memlet_key) REFERENCES "ar_ling_learn_memlet_kind"(memlet_key),
  CHECK ((is_synthesis = 1 AND source_slug LIKE 'kmaps_%')
      OR (is_synthesis = 0 AND source_ref IS NOT NULL))
);

CREATE TABLE "ar_ling_learn_memlet_kind" (
  memlet_key     TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  purpose_ar TEXT, purpose_en TEXT, purpose_ur TEXT,
  modality       TEXT NOT NULL,
  encoding_axis  TEXT NOT NULL,
  scope_level    TEXT NOT NULL,
  block_type     TEXT,
  is_arabic_only INTEGER NOT NULL DEFAULT 0,
  display_order  INTEGER NOT NULL DEFAULT 0,
  icon           TEXT
, bab_key       TEXT, discipline    TEXT, carrier_table TEXT);

CREATE TABLE "ar_ling_learn_memlet_media" (
  id            TEXT PRIMARY KEY,
  memlet_id     TEXT NOT NULL,
  media_kind    TEXT NOT NULL,
  r2_key        TEXT NOT NULL UNIQUE,
  bucket        TEXT NOT NULL DEFAULT 'kmaps-media',
  mime          TEXT, duration_ms INTEGER, sha256 TEXT,
  reciter       TEXT,
  qiraa         TEXT,
  qr_ref        TEXT,
  license TEXT, source_attribution TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  FOREIGN KEY (memlet_id) REFERENCES "ar_ling_learn_memlet"(id)
);

CREATE TABLE "ar_ling_learn_memory_hook" (
  id TEXT PRIMARY KEY,
  root_norm TEXT NOT NULL,
  sense_id TEXT,
  scope_type TEXT NOT NULL DEFAULT 'root',
  hook_kind TEXT NOT NULL DEFAULT 'sound',
  hook_md TEXT NOT NULL,
  anchor_word TEXT,
  source_ref TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
, lemma_ar TEXT);

CREATE TABLE "ar_ling_learn_question" (
  id             TEXT PRIMARY KEY,
  question_key   TEXT NOT NULL,
  lemma_ar       TEXT NOT NULL,
  root_norm      TEXT NOT NULL,
  memlet_id      TEXT,
  prompt_ar TEXT NOT NULL, prompt_en TEXT, prompt_ur TEXT,
  answer_json    TEXT NOT NULL CHECK (json_valid(answer_json)),
  explanation_ar TEXT, explanation_en TEXT, explanation_ur TEXT,
  difficulty     INTEGER NOT NULL DEFAULT 3,
  discrimination REAL,
  times_shown    INTEGER NOT NULL DEFAULT 0,
  times_correct  INTEGER NOT NULL DEFAULT 0,
  qr_ref         TEXT,
  source_slug TEXT NOT NULL, source_ref TEXT,
  is_synthesis   INTEGER NOT NULL DEFAULT 1,
  status         TEXT NOT NULL DEFAULT 'draft', display_json TEXT,
  FOREIGN KEY (question_key) REFERENCES "ar_ling_learn_question_kind"(question_key),
  FOREIGN KEY (memlet_id)    REFERENCES "ar_ling_learn_memlet"(id)
);

CREATE TABLE "ar_ling_learn_question_distractor" (
  id             TEXT PRIMARY KEY,
  item_id        TEXT NOT NULL,
  option_ar TEXT NOT NULL, option_en TEXT, option_ur TEXT,
  is_correct     INTEGER NOT NULL DEFAULT 0,
  distractor_kind TEXT,
  why_wrong_ar TEXT, why_wrong_en TEXT, why_wrong_ur TEXT,
  source_ref     TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (item_id) REFERENCES "ar_ling_learn_question"(id)
);

CREATE TABLE "ar_ling_learn_question_kind" (
  question_key   TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  memlet_key     TEXT,
  response_kind  TEXT NOT NULL,
  cognitive_level TEXT NOT NULL,
  difficulty_floor INTEGER NOT NULL DEFAULT 1,
  is_arabic_only INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (memlet_key) REFERENCES "ar_ling_learn_memlet_kind"(memlet_key)
);

CREATE TABLE "ar_ling_learn_vocab" (
  root_norm           TEXT PRIMARY KEY,
  root_text           TEXT NOT NULL,
  root_id             TEXT,
  five_lens_entry_id  TEXT,
  core_sense_en       TEXT,
  core_sense_ar       TEXT,
  membean_hook        TEXT,
  membean_anchors_json TEXT,
  illustration_key    TEXT,
  diagram_key         TEXT,
  unique_senses_json  TEXT,
  examples_json       TEXT,
  status              TEXT NOT NULL DEFAULT 'draft',
  first_surah         INTEGER,
  first_ayah          INTEGER,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
, core_sense_ur TEXT);

CREATE TABLE ar_ling_lemma_arc (
  id            TEXT PRIMARY KEY,
  root_norm     TEXT NOT NULL,
  lemma_id      TEXT NOT NULL REFERENCES ar_ling_root_lemma(id),
  also_lemma_id TEXT REFERENCES ar_ling_root_lemma(id),
  construction_ar TEXT NOT NULL,
  harf          TEXT,
  has_object    INTEGER NOT NULL DEFAULT 1,
  attest_count  INTEGER NOT NULL,
  all_refs_json TEXT NOT NULL CHECK (json_valid(all_refs_json)),
  arc_ar        TEXT NOT NULL,
  arc_en        TEXT NOT NULL,
  arc_ur        TEXT,
  boundary_note_en TEXT,
  abstraction_note_en TEXT,
  branches_json TEXT CHECK (branches_json IS NULL OR json_valid(branches_json)),
  provenance_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(provenance_json)),
  confidence    REAL NOT NULL DEFAULT 0.9,
  status        TEXT NOT NULL DEFAULT 'live',
  superseded_by TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(lemma_id, harf, has_object)
);

CREATE TABLE ar_ling_lemma_arc_example (
  id         TEXT PRIMARY KEY,
  arc_id     TEXT NOT NULL REFERENCES ar_ling_lemma_arc(id) ON DELETE CASCADE,
  qr_ref     TEXT NOT NULL,
  surah      INTEGER NOT NULL,
  ayah       INTEGER NOT NULL,
  text_ar    TEXT NOT NULL,
  fluent_en  TEXT NOT NULL,
  fluent_ur  TEXT,
  note_en    TEXT,
  note_ar    TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  source_ref TEXT,
  seq        INTEGER NOT NULL DEFAULT 0,
  UNIQUE(arc_id, qr_ref)
);

CREATE TABLE "ar_ling_lexicon_block" (
  id                TEXT PRIMARY KEY,
  source_slug       TEXT NOT NULL,
  root_entry_id     TEXT NOT NULL,
  section_id        TEXT,
  book_page_id      TEXT,
  root_norm         TEXT NOT NULL,

  -- tree
  parent_block_id   TEXT,
  block_path        TEXT NOT NULL,
  block_seq         INTEGER NOT NULL,
  depth             INTEGER NOT NULL DEFAULT 0,

  -- content
  block_type        TEXT NOT NULL,
  lang              TEXT,
  title_ar          TEXT,
  title_en          TEXT,
  text_plain        TEXT,
  text_html         TEXT,
  data_json         TEXT NOT NULL DEFAULT '{}'
                    CHECK (json_valid(data_json)),

  -- provenance
  origin            TEXT NOT NULL DEFAULT 'book_native',
  origin_ref        TEXT,

  -- printed-page anchor
  printed_page      INTEGER,
  printed_anchor    TEXT,

  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT, title_ur TEXT, translation_en TEXT, translation_ur TEXT,

  FOREIGN KEY (root_entry_id)   REFERENCES "ar_ling_lexicon_entry"(id),
  FOREIGN KEY (section_id)      REFERENCES "ar_ling_lexicon_entry_section"(id),
  FOREIGN KEY (book_page_id)    REFERENCES "ar_ling_lexicon_book_page"(id),
  FOREIGN KEY (parent_block_id) REFERENCES "ar_ling_lexicon_block"(id),
  UNIQUE(root_entry_id, block_path)
);

CREATE TABLE "ar_ling_lexicon_block_annotation" (
  id                TEXT PRIMARY KEY,
  block_id          TEXT NOT NULL,
  annotation_kind   TEXT NOT NULL,
  -- 'callout' | 'sidenote' | 'learner_card' | 'user_note' | 'user_highlight'

  title_ar          TEXT,
  title_en          TEXT,
  body_md           TEXT,
  body_html         TEXT,
  data_json         TEXT NOT NULL DEFAULT '{}'
                    CHECK (json_valid(data_json)),

  visibility        TEXT NOT NULL DEFAULT 'public'
                    CHECK (visibility IN ('public', 'curated', 'user')),
  user_id           TEXT,
  tags_json         TEXT CHECK (tags_json IS NULL OR json_valid(tags_json)),

  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT, title_ur TEXT,
  FOREIGN KEY (block_id) REFERENCES "ar_ling_lexicon_block"(id)
);

CREATE VIRTUAL TABLE ar_ling_lexicon_block_fts USING fts5(
  text_plain, title_ar, title_en, root_norm, source_slug, block_type,
  content='ar_ling_lexicon_block', content_rowid='rowid',
  tokenize="unicode61 remove_diacritics 2"
);

CREATE TABLE "ar_ling_lexicon_block_link" (
  id                TEXT PRIMARY KEY,
  from_block_id     TEXT NOT NULL,
  source_slug       TEXT NOT NULL,

  link_kind         TEXT NOT NULL,
  -- 'root' | 'quran_ayah' | 'quran_range' | 'block'
  -- 'authority' | 'lemma' | 'concept' | 'external_url'

  to_root_norm      TEXT,
  to_surah          INTEGER,
  to_ayah           INTEGER,
  to_ayah_to        INTEGER,
  to_block_id       TEXT,
  to_authority_code TEXT,
  to_lemma_ref      TEXT,
  to_concept_ref    TEXT,
  to_url            TEXT,

  label             TEXT,
  weight            REAL DEFAULT 1.0,
  position_offset   INTEGER,

  origin            TEXT NOT NULL DEFAULT 'derived',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (from_block_id) REFERENCES "ar_ling_lexicon_block"(id),
  FOREIGN KEY (to_block_id)   REFERENCES "ar_ling_lexicon_block"(id)
);

CREATE TABLE "ar_ling_lexicon_block_tag" (
  block_id      TEXT NOT NULL,
  tag           TEXT NOT NULL,
  source        TEXT NOT NULL DEFAULT 'auto'
                CHECK (source IN ('auto', 'curated', 'user')),
  weight        REAL DEFAULT 1.0,
  user_id       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (block_id, tag, source, user_id),
  FOREIGN KEY (block_id) REFERENCES "ar_ling_lexicon_block"(id)
);

CREATE TABLE "ar_ling_lexicon_book_page" (
  id                       TEXT PRIMARY KEY,
  source_slug              TEXT NOT NULL,
  source_id                TEXT NOT NULL,
  root_norm                TEXT NOT NULL,
  volume_no                INTEGER,
  page_seq                 INTEGER,
  printed_page_start       INTEGER,
  printed_page_end         INTEGER,
  filename                 TEXT,
  source_url               TEXT,
  r2_key                   TEXT,
  html_sha256              TEXT,
  clean_text               TEXT,
  page_break_anchors_json  TEXT
                           CHECK (page_break_anchors_json IS NULL
                                  OR json_valid(page_break_anchors_json)),
  prev_page_id             TEXT,
  next_page_id             TEXT,
  parser_version           TEXT,
  import_batch_id          TEXT,
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT,
  UNIQUE(source_slug, filename),
  FOREIGN KEY (source_id) REFERENCES "ar_ling_source"(id)
);

CREATE VIRTUAL TABLE ar_ling_lexicon_book_page_fts USING fts5(
  clean_text, source_slug, root_norm,
  content='ar_ling_lexicon_book_page', content_rowid='rowid',
  tokenize="unicode61 remove_diacritics 2"
);

CREATE TABLE ar_ling_lexicon_display_block_kind (
  kind_code    TEXT PRIMARY KEY,
  kind_family  TEXT NOT NULL,                      
  panel_key    TEXT NOT NULL,                      
  style_key    TEXT NOT NULL,                      
  name_ar      TEXT NOT NULL,
  name_en      TEXT NOT NULL,
  name_ur      TEXT NOT NULL,
  is_visible   INTEGER NOT NULL DEFAULT 1,
  is_collapsed INTEGER NOT NULL DEFAULT 0,
  sort_weight  INTEGER NOT NULL,
  icon         TEXT,
  status       TEXT NOT NULL DEFAULT 'live',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_lexicon_display_profile (
  source_slug       TEXT PRIMARY KEY,              
  composer_key      TEXT NOT NULL,                 
  is_bilingual      INTEGER NOT NULL DEFAULT 0,
  footnote_mode     TEXT NOT NULL DEFAULT 'none',  
  quran_cue_mode    TEXT NOT NULL DEFAULT 'none',  
  headword_mode     TEXT NOT NULL DEFAULT 'root_header',
  page_anchor_mode  TEXT NOT NULL DEFAULT 'printed_page',
  script_key        TEXT NOT NULL DEFAULT 'amiri_quran',
  translation_langs TEXT NOT NULL DEFAULT '[]'
                    CHECK (json_valid(translation_langs)),
  display_order     INTEGER NOT NULL,
  status            TEXT NOT NULL DEFAULT 'live',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_lexicon_display_rule (
  id          TEXT PRIMARY KEY,
  source_slug TEXT NOT NULL,                       
  rule_key    TEXT NOT NULL,                       
  pattern     TEXT,
  flags       TEXT,
  replacement TEXT,
  seq         INTEGER NOT NULL DEFAULT 0,
  note_en     TEXT,
  status      TEXT NOT NULL DEFAULT 'live',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source_slug, rule_key, seq)
);

CREATE TABLE ar_ling_lexicon_display_section (
  id           TEXT PRIMARY KEY,
  source_slug  TEXT NOT NULL,                      
  kind_code    TEXT NOT NULL,                      
  panel_key    TEXT NOT NULL,
  seq          INTEGER NOT NULL,
  label_ar     TEXT,                               
  label_en     TEXT,
  label_ur     TEXT,
  is_visible   INTEGER,                            
  is_collapsed INTEGER,                            
  block_count  INTEGER NOT NULL DEFAULT 0,         
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source_slug, kind_code)
);

CREATE TABLE "ar_ling_lexicon_entry" (
  id                  TEXT PRIMARY KEY,

  source_id           TEXT NOT NULL,
  source_slug         TEXT NOT NULL,

  root_id             TEXT,
  root_text           TEXT NOT NULL,
  root_norm           TEXT NOT NULL,

  entry_text_ar       TEXT,
  entry_text_en       TEXT,
  raw_text            TEXT NOT NULL,

  source_chunk_id     TEXT,

  page_start          INTEGER,
  page_end            INTEGER,
  volume_no           INTEGER,

  source_url          TEXT,
  source_path         TEXT,

  source_native_id    TEXT,
  source_native_key   TEXT,

  parser_version      TEXT,
  raw_hash            TEXT,
  import_batch_id     TEXT,

  status              TEXT NOT NULL DEFAULT 'raw',

  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')), family_json TEXT
  CHECK (family_json IS NULL OR json_valid(family_json)), entry_gloss_json TEXT
  CHECK (entry_gloss_json IS NULL OR json_valid(entry_gloss_json)), translation_en TEXT, translation_ur TEXT, root_norm_canonical TEXT,

  FOREIGN KEY (root_id)          REFERENCES "ar_ling_roots"(id),
  FOREIGN KEY (source_id)        REFERENCES "ar_ling_source"(id),
  FOREIGN KEY (source_chunk_id)  REFERENCES "ar_ling_source_chunk"(id),

  UNIQUE(source_slug, root_norm)
);

CREATE TABLE ar_ling_lexicon_entry_ds (
  id             TEXT PRIMARY KEY,
  root_entry_id  TEXT NOT NULL,
  source_slug    TEXT NOT NULL,
  root_norm      TEXT NOT NULL,

  -- which contract this row was built to, so a reshape is a new row, not a
  -- silent rewrite of one the app is already drawing
  template_key   TEXT NOT NULL,
  template_ver   INTEGER NOT NULL DEFAULT 1,

  -- the entry as the template asks for it, verbatim from the book
  doc_json       TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(doc_json)),
  -- the same entry shaped into sections and blocks for a screen; block ids
  -- inside are ar_ling_lexicon_block.id
  ds_json        TEXT CHECK (ds_json IS NULL OR json_valid(ds_json)),

  -- 'raw' | 'clean' | 'blocked' | 'index_only' | 'absent'
  status         TEXT NOT NULL DEFAULT 'raw',
  built_by       TEXT,
  built_at       TEXT,

  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT,

  FOREIGN KEY (root_entry_id) REFERENCES "ar_ling_lexicon_entry"(id),
  UNIQUE (root_entry_id, template_key)
);

CREATE TABLE "ar_ling_lexicon_entry_embedding" (
  entry_id TEXT PRIMARY KEY,
  collection_name TEXT NOT NULL,
  qdrant_point_id TEXT NOT NULL,
  embedding_model TEXT NOT NULL,
  embedding_text_hash TEXT NOT NULL,
  embedded_at TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT
);

CREATE VIRTUAL TABLE ar_ling_lexicon_entry_fts USING fts5(root_text, root_norm, source_slug, entry_text_ar, entry_text_en, raw_text, content='ar_ling_lexicon_entry', content_rowid='rowid', tokenize="unicode61 remove_diacritics 2");

CREATE TABLE "ar_ling_lexicon_entry_section" (
  id                        TEXT PRIMARY KEY,

  root_entry_id             TEXT NOT NULL,

  source_slug               TEXT NOT NULL,
  root_text                 TEXT NOT NULL,
  root_norm                 TEXT NOT NULL,

  section_seq               INTEGER NOT NULL,

  heading_ar                TEXT,
  heading_norm              TEXT,
  heading_bare              TEXT,

  section_type              TEXT NOT NULL DEFAULT 'definition',

  text_ar                   TEXT,
  text_en                   TEXT,

  raw_xml                   TEXT,
  perseus_xml               TEXT,

  page_no                   INTEGER,
  volume_no                 INTEGER,

  source_native_section_id  TEXT,

  lane_node_id              TEXT,
  lane_node_num             INTEGER,
  lane_itype                TEXT,

  has_gaps                  INTEGER NOT NULL DEFAULT 0,

  parser_notes_json         TEXT CHECK (
    parser_notes_json IS NULL OR json_valid(parser_notes_json)
  ),

  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                TEXT, translation_en TEXT, translation_ur TEXT,

  FOREIGN KEY (root_entry_id) REFERENCES "ar_ling_lexicon_entry"(id),

  UNIQUE(root_entry_id, section_seq)
);

CREATE VIRTUAL TABLE ar_ling_lexicon_entry_section_fts USING fts5(root_text, root_norm, heading_ar, heading_norm, heading_bare, section_type, text_ar, text_en, content='ar_ling_lexicon_entry_section', content_rowid='rowid', tokenize="unicode61 remove_diacritics 2");

CREATE TABLE "ar_ling_lexicon_entry_source" (
  id                TEXT PRIMARY KEY,

  root_entry_id     TEXT NOT NULL,

  source_kind       TEXT NOT NULL,
  source_slug       TEXT NOT NULL,

  source_native_id  TEXT,
  source_url        TEXT,
  source_path       TEXT,

  checksum          TEXT,
  note_md           TEXT,

  created_at        TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (root_entry_id) REFERENCES "ar_ling_lexicon_entry"(id)
);

CREATE TABLE ar_ling_lexicon_fact (
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

CREATE TABLE ar_ling_lexicon_profile (
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

CREATE TABLE "ar_ling_lexicon_quran_ref" (
  id              TEXT PRIMARY KEY,
  source_slug     TEXT NOT NULL,
  root_entry_id   TEXT NOT NULL,
  section_id      TEXT,
  block_id        TEXT,
  root_norm       TEXT NOT NULL,
  surah           INTEGER NOT NULL CHECK (surah BETWEEN 1 AND 114),
  ayah            INTEGER NOT NULL CHECK (ayah >= 1),
  raw_ref         TEXT NOT NULL,           -- e.g. 'Kur viii. 62'
  context_snippet TEXT,                    -- short surrounding string
  created_at      TEXT NOT NULL DEFAULT (datetime('now')), hafs_surah INTEGER, hafs_ayah INTEGER, hafs_method TEXT,
  FOREIGN KEY (root_entry_id) REFERENCES "ar_ling_lexicon_entry"(id),
  FOREIGN KEY (section_id)    REFERENCES "ar_ling_lexicon_entry_section"(id),
  FOREIGN KEY (block_id)      REFERENCES "ar_ling_lexicon_block"(id)
);

CREATE TABLE ar_ling_reg_band_color (
  band_key TEXT PRIMARY KEY,
  color_hex TEXT NOT NULL,
  color_name_en TEXT
);

CREATE TABLE ar_ling_reg_band_fill_rule (
  band_code   TEXT PRIMARY KEY,
  carrier     TEXT,
  root_key    TEXT,
  fill_sql    TEXT,
  na_reason   TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_reg_build_layer (
  layer_code   TEXT PRIMARY KEY,
  layer_key    TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  cluster      TEXT NOT NULL,
  scope_level  TEXT NOT NULL,
  fill_order   INTEGER NOT NULL,
  once_only    INTEGER NOT NULL DEFAULT 1,
  mode         TEXT NOT NULL,
  primary_tables_json       TEXT NOT NULL,
  allowed_source_slugs_json TEXT NOT NULL,
  note_en TEXT
, primary_tables_json_bak TEXT, allowed_source_slugs_json_bak TEXT, code_alpha TEXT, scheme_version TEXT DEFAULT 'v1', note_ar TEXT, note_ur TEXT);

CREATE TABLE ar_ling_reg_conformance_check (
  check_id     TEXT PRIMARY KEY,
  band_code    TEXT NOT NULL,
  carrier      TEXT NOT NULL,
  dimension    TEXT NOT NULL,
  severity     TEXT NOT NULL DEFAULT 'warn',
  description  TEXT NOT NULL,
  offender_sql TEXT NOT NULL,
  auto_fixable INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'live',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_reg_decision (
  decision_id TEXT PRIMARY KEY,
  decided_on TEXT NOT NULL,
  decided_by TEXT NOT NULL,
  scope TEXT NOT NULL,
  title_ar TEXT, title_en TEXT, title_ur TEXT,
  statement_ar TEXT, statement_en TEXT, statement_ur TEXT,
  rationale_en TEXT,
  supersedes TEXT,
  data_state TEXT,
  application_state TEXT,
  enforced_by TEXT,
  status TEXT NOT NULL DEFAULT 'live',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_reg_discipline (
  discipline_key  TEXT PRIMARY KEY,
  uid             TEXT NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(13)))),
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  short_ar TEXT, short_en TEXT, short_ur TEXT,
  scope_ar TEXT, scope_en TEXT, scope_ur TEXT,
  roster_json     TEXT CHECK (roster_json IS NULL OR json_valid(roster_json)),
  display_order   INTEGER NOT NULL DEFAULT 0,
  icon TEXT, badge_color TEXT,
  status          TEXT NOT NULL DEFAULT 'live',
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_reg_display_token (
  token_key TEXT PRIMARY KEY,
  token_type TEXT NOT NULL CHECK (token_type IN ('band','term_role','notice_kind','heading_level')),
  code TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  name_ur TEXT,
  color_hex TEXT,
  icon TEXT,
  extra_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE ar_ling_reg_heading_style (
  level_key TEXT PRIMARY KEY,
  level_order INTEGER NOT NULL,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT,
  used_for_ar TEXT NOT NULL, used_for_en TEXT NOT NULL,
  font_family TEXT NOT NULL,
  font_size_px INTEGER NOT NULL,
  font_weight TEXT NOT NULL,
  color_rule TEXT NOT NULL,
  letter_spacing TEXT,
  text_transform TEXT DEFAULT 'none',
  uses_icon INTEGER NOT NULL DEFAULT 0,
  icon_size_px INTEGER,
  divider TEXT DEFAULT 'none',
  notes_ar TEXT, notes_en TEXT
);

CREATE TABLE ar_ling_reg_notice_kind (
  kind_key TEXT PRIMARY KEY, icon TEXT NOT NULL, color_hex TEXT NOT NULL,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT
);

CREATE TABLE ar_ling_reg_ref_namespace (
  prefix TEXT PRIMARY KEY, target_db TEXT NOT NULL, target_table TEXT NOT NULL,
  target_key TEXT NOT NULL, used_by_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(used_by_json)),
  note_en TEXT, status TEXT NOT NULL DEFAULT 'live');

CREATE TABLE ar_ling_reg_root_key (
  column_name TEXT PRIMARY KEY,
  bind_kind   TEXT NOT NULL CHECK (bind_kind IN ('root_norm','root_id','buckwalter','lemma')),
  precedence  INTEGER NOT NULL,
  note_md     TEXT,
  status      TEXT NOT NULL DEFAULT 'live'
);

CREATE TABLE "ar_ling_reg_semantic_field" (
  id              TEXT PRIMARY KEY,
  field_name_ar   TEXT NOT NULL,
  field_name_en   TEXT NOT NULL UNIQUE,
  parent_field_id TEXT,
  description_md  TEXT, field_name_ur TEXT,
  FOREIGN KEY (parent_field_id) REFERENCES "ar_ling_reg_semantic_field"(id)
);

CREATE TABLE ar_ling_reg_source_alias (
  alias TEXT NOT NULL,
  alias_scheme TEXT NOT NULL DEFAULT 'lane',
  target_kind TEXT NOT NULL,
  target_slug TEXT,
  name_ar TEXT,
  name_en TEXT,
  note_en TEXT,
  PRIMARY KEY (alias_scheme, alias)
);

CREATE TABLE ar_ling_reg_sub_layer (
  sub_code      TEXT PRIMARY KEY,
  band          INTEGER NOT NULL,
  band_key      TEXT NOT NULL,
  band_name_ar  TEXT,
  band_name_en  TEXT,
  name_ar       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  name_ur       TEXT,
  scope_level   TEXT NOT NULL,
  discipline    TEXT NOT NULL,
  default_card  TEXT NOT NULL DEFAULT 'P',
  authority_slug TEXT,
  carrier_hint  TEXT,
  display_order INTEGER NOT NULL,
  status        TEXT NOT NULL DEFAULT 'live',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
, tables_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tables_json)), bab_count   INTEGER NOT NULL DEFAULT 0, fill_state  TEXT NOT NULL DEFAULT 'missing', band_name_ur TEXT, na_when_json TEXT NOT NULL DEFAULT '[]', produced_by TEXT NOT NULL DEFAULT 'ingest', carrier_state TEXT NOT NULL DEFAULT 'unknown', display_icon TEXT);

CREATE TABLE ar_ling_reg_surah (
  surah INTEGER PRIMARY KEY CHECK (surah BETWEEN 1 AND 114),
  name_ar TEXT NOT NULL,
  name_bare TEXT NOT NULL,
  name_translit TEXT,
  ayah_count INTEGER NOT NULL,
  aliases_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_reg_table_discipline (table_name TEXT, discipline TEXT, is_primary INTEGER DEFAULT 0, PRIMARY KEY (table_name, discipline));

CREATE TABLE ar_ling_reg_table_map (
  db          TEXT NOT NULL,
  table_name  TEXT NOT NULL,
  cluster     TEXT NOT NULL,
  layer_code  TEXT,
  role        TEXT, sub_code TEXT, role_code TEXT, code_full TEXT, discipline TEXT, provenance_role TEXT, sensor_class TEXT NOT NULL DEFAULT 'none', scope_types_json TEXT NOT NULL DEFAULT '[]', row_count_at_audit INTEGER, audited_at TEXT, root_bind TEXT NOT NULL DEFAULT 'unset', root_bind_col TEXT, root_bind_note TEXT, root_bind_via_json TEXT CHECK (root_bind_via_json IS NULL OR json_valid(root_bind_via_json)),
  PRIMARY KEY (db, table_name)
);

CREATE TABLE ar_ling_reg_term_role (
  role_key TEXT PRIMARY KEY,
  color_hex TEXT NOT NULL,
  name_ar TEXT, name_en TEXT
);

CREATE TABLE ar_ling_root_asl (
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

CREATE TABLE ar_ling_root_asl_proposal (
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

CREATE TABLE "ar_ling_root_backlink" (
  id           TEXT PRIMARY KEY,
  root_norm    TEXT NOT NULL,
  from_table   TEXT NOT NULL,
  from_row_id  TEXT NOT NULL,
  from_code    TEXT NOT NULL,
  display_code TEXT,
  to_kind      TEXT NOT NULL,
  to_db        TEXT NOT NULL DEFAULT 'km_arabic_linguistic',
  to_table     TEXT,
  to_row_id    TEXT,
  to_ref       TEXT,
  relation     TEXT NOT NULL,
  quote_ar     TEXT,
  weight       REAL NOT NULL DEFAULT 1.0,
  layer_code   TEXT NOT NULL DEFAULT 'AL:100-ROOT:XC:40-LINK:B',
  status       TEXT NOT NULL DEFAULT 'raw',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')), display_json TEXT,
  UNIQUE (from_table, from_row_id, to_kind, to_row_id, to_ref)
);

CREATE TABLE ar_ling_root_band_fill (
  root_norm   TEXT NOT NULL,
  band_code   TEXT NOT NULL,
  n           INTEGER NOT NULL DEFAULT 0,
  computed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (root_norm, band_code)
);

CREATE TABLE "ar_ling_root_didd" (
  id TEXT PRIMARY KEY,
  root_norm TEXT NOT NULL,
  antonym_ar TEXT NOT NULL,
  antonym_root TEXT,
  antonym_en TEXT,
  relation_kind TEXT NOT NULL DEFAULT 'antonym',  
  note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  source_ref TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
, root_id TEXT, confidence REAL DEFAULT 0.8, generated_by TEXT, antonym_ur TEXT, note_ar TEXT, note_ur TEXT, note_en TEXT, display_json TEXT, antonym_root_id TEXT REFERENCES ar_ling_roots(id), lemma_id TEXT REFERENCES ar_ling_root_lemma(id), for_word_ar TEXT, for_word_en TEXT);

CREATE TABLE ar_ling_root_display (
  id TEXT PRIMARY KEY,
  root_norm TEXT NOT NULL,
  section_key TEXT NOT NULL,
  sub_code TEXT REFERENCES ar_ling_reg_sub_layer(sub_code),
  display_order INTEGER NOT NULL,
  icon TEXT,
  color_hex TEXT,
  heading_ar TEXT, heading_en TEXT, heading_ur TEXT,
  body_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(body_json)),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_root_dna (
  root_norm TEXT PRIMARY KEY,
  root_id TEXT,
  radicals_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(radicals_json)),
  headline_ar TEXT, headline_en TEXT, headline_ur TEXT,
  core_ar TEXT, core_en TEXT, core_ur TEXT,
  story_ar TEXT, story_en TEXT, story_ur TEXT,
  poles_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(poles_json)),
  senses_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(senses_json)),
  family_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(family_json)),
  icon TEXT,
  illustrations_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(illustrations_json)),
  palette_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(palette_json)),
  anchor_ref TEXT, anchor_word_ar TEXT,
  provenance_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(provenance_json)),
  confidence REAL DEFAULT 0.8,
  synthesis_version TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE "ar_ling_root_form_family" (
  id              TEXT PRIMARY KEY,
  family_order    INTEGER NOT NULL,
  kind            TEXT NOT NULL,
  tier_key        TEXT REFERENCES "ar_ling_root_form_tier"(tier_key),
  roman           TEXT,
  verb_form_key   TEXT,
  derivation_type TEXT,
  qac_selector    TEXT,
  name_ar     TEXT NOT NULL,
  name_en    TEXT,
  name_ur       TEXT,
  wazn            TEXT,
  example_ar      TEXT,
  note_md         TEXT,
  icon            TEXT,
  source_slug     TEXT NOT NULL DEFAULT 'kmaps_five_lens',
  source_ref      TEXT,
  status          TEXT NOT NULL DEFAULT 'live',
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
, example_gloss_ar TEXT, example_gloss_en TEXT, example_gloss_ur TEXT, gram_term_ref TEXT REFERENCES ar_ling_gram_term(id));

CREATE TABLE "ar_ling_root_form_masmu" (
  id                    TEXT PRIMARY KEY,
  root_norm             TEXT NOT NULL,
  root_id               TEXT REFERENCES ar_ling_roots(id),
  verb_form             TEXT NOT NULL,
  verb_ar               TEXT,
  active_participle_ar  TEXT,
  passive_participle_ar TEXT,
  masdar_json           TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(masdar_json)),
  voice_attested_json   TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(voice_attested_json)),
  meaning_en            TEXT,
  is_curated            INTEGER NOT NULL DEFAULT 0,
  source_slug           TEXT NOT NULL DEFAULT 'qac_morphology',
  source_ref            TEXT,
  note_md               TEXT,
  migrated_from         TEXT,
  layer_code            TEXT NOT NULL DEFAULT 'AL:150-FORM:SF:26-ATTEST:P',
  status                TEXT NOT NULL DEFAULT 'live',
  created_at            TEXT NOT NULL DEFAULT (datetime('now')), meaning_ar TEXT, meaning_ur TEXT, display_json TEXT,
  UNIQUE (root_norm, verb_form)
);

CREATE TABLE "ar_ling_root_form_paradigm" (
  id              TEXT PRIMARY KEY,
  paradigm_name   TEXT NOT NULL,
  paradigm_type   TEXT NOT NULL,
  verb_form       TEXT,
  root_type       TEXT,
  paradigm_json   TEXT NOT NULL,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
, source_slug  TEXT, source_ref   TEXT, bab_key      TEXT, weak_pattern TEXT, status       TEXT NOT NULL DEFAULT 'raw', layer_code   TEXT NOT NULL DEFAULT 'AL:150-FORM:SF:22-BAB:P', name_en TEXT, name_ur TEXT, display_json TEXT);

CREATE TABLE "ar_ling_root_form_template" (
  id              TEXT PRIMARY KEY,
  paradigm_id     TEXT NOT NULL,
  person          TEXT NOT NULL,
  tense           TEXT NOT NULL,
  voice           TEXT NOT NULL DEFAULT 'active',
  template_form   TEXT NOT NULL,
  note_md         TEXT, verb_form    TEXT, root_type    TEXT, weak_pattern TEXT, source_slug TEXT, source_ref  TEXT, status      TEXT NOT NULL DEFAULT 'raw', layer_code  TEXT NOT NULL DEFAULT 'AL:150-FORM:SF:22-BAB:P', note_ar TEXT, note_ur TEXT, note_en TEXT,
  FOREIGN KEY (paradigm_id) REFERENCES "ar_ling_root_form_paradigm"(id)
);

CREATE TABLE "ar_ling_root_form_tier" (
  tier_key     TEXT PRIMARY KEY,
  tier_order   INTEGER NOT NULL,
  name_ar  TEXT NOT NULL,
  name_en TEXT,
  name_ur    TEXT,
  icon         TEXT
, note_ar TEXT, note_en TEXT, note_ur TEXT);

CREATE TABLE "ar_ling_root_haql" (
  id TEXT PRIMARY KEY, root_id TEXT, root_norm TEXT NOT NULL, field_id TEXT NOT NULL, sense_id TEXT,
  weight INTEGER NOT NULL DEFAULT 0 CHECK (weight BETWEEN 0 AND 3), is_primary INTEGER NOT NULL DEFAULT 0,
  note_md TEXT, provenance_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(provenance_json)),
  confidence REAL DEFAULT 0.8, generated_by TEXT, source_slug TEXT NOT NULL DEFAULT 'kmaps_field_map',
  status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL DEFAULT (datetime('now')), display_json TEXT,
  UNIQUE (root_norm, field_id, sense_id),
  FOREIGN KEY (root_id) REFERENCES ar_ling_roots(id),
  FOREIGN KEY (field_id) REFERENCES "ar_ling_reg_semantic_field"(id),
  FOREIGN KEY (sense_id) REFERENCES "ar_ling_root_sense"(id));

CREATE TABLE "ar_ling_root_layer_fill_dep_20260815" (
  root TEXT NOT NULL, sub_code TEXT NOT NULL, band TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (root, sub_code));

CREATE TABLE "ar_ling_root_lemma" (
  id              TEXT PRIMARY KEY,
  root_id         TEXT,
  lemma_text      TEXT NOT NULL,
  lemma_text_bare TEXT,
  part_of_speech  TEXT NOT NULL DEFAULT 'noun',
  verb_form       TEXT,
  is_quran_word   INTEGER NOT NULL DEFAULT 0,
  frequency_quran INTEGER NOT NULL DEFAULT 0,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')), root_status TEXT NOT NULL DEFAULT 'pending', verb_form_ref TEXT REFERENCES ar_ling_gram_term(id), bab_ref TEXT REFERENCES ar_ling_gram_term(id), record_status TEXT NOT NULL DEFAULT 'live', merged_into TEXT REFERENCES ar_ling_root_lemma(id), lemma_text_canonical TEXT,
  FOREIGN KEY (root_id) REFERENCES "ar_ling_roots"(id)
);

CREATE TABLE "ar_ling_root_lemma_form_map" (
  qac_lem_bw      TEXT PRIMARY KEY,
  root_bw         TEXT,
  lemma_ar        TEXT,
  form_roman      TEXT NOT NULL,
  form_family_id  TEXT NOT NULL REFERENCES "ar_ling_root_form_family"(id),
  derivation_type TEXT,
  occurrences     INTEGER NOT NULL DEFAULT 0,
  confidence      TEXT NOT NULL DEFAULT 'high',
  source_slug     TEXT NOT NULL DEFAULT 'qac_morphology',
  source_ref      TEXT NOT NULL DEFAULT 'QAC-0.4:stem.features',
  status          TEXT NOT NULL DEFAULT 'live',
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "ar_ling_root_lemma_furuq_evidence" (
  id                TEXT PRIMARY KEY,
  set_id            TEXT NOT NULL,
  member_id         TEXT,
  lemma_id          TEXT,
  qr_ref            TEXT NOT NULL,
  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  word_index        INTEGER,
  word_occurrence_ref TEXT,
  arabic_quote      TEXT,
  translation_quote TEXT,
  explanation_md    TEXT,
  evidence_type     TEXT NOT NULL DEFAULT 'source_ref',
  source_id         TEXT,
  chunk_id          TEXT,
  confidence        TEXT NOT NULL DEFAULT 'needs_review',
  validation_status TEXT NOT NULL DEFAULT 'pending',
  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "ar_ling_root_lemma_furuq_member" (
  id              TEXT PRIMARY KEY,
  set_id          TEXT NOT NULL,
  lemma_id        TEXT NOT NULL,
  nuance_note     TEXT NOT NULL, arabic_display TEXT, arabic_bare TEXT, basic_gloss TEXT, contrast_note TEXT, usage_rule TEXT, quran_usage_pattern TEXT, source_status TEXT DEFAULT 'manual', claim_basis TEXT DEFAULT 'direct_source', confidence TEXT DEFAULT 'needs_review', sort_order INTEGER DEFAULT 0, basic_gloss_ur TEXT, contrast_note_ur TEXT, usage_rule_ur TEXT, quran_usage_pattern_ur TEXT, nuance_note_ur TEXT, display_json TEXT,
  UNIQUE (set_id, lemma_id),
  FOREIGN KEY (set_id)   REFERENCES "ar_ling_root_lemma_furuq_set"(id),
  FOREIGN KEY (lemma_id) REFERENCES "ar_ling_root_lemma"(id)
);

CREATE TABLE "ar_ling_root_lemma_furuq_member_src" (
  id              TEXT PRIMARY KEY,
  member_id       TEXT NOT NULL,
  source_id       TEXT NOT NULL,
  chunk_id        TEXT,
  claim_type      TEXT NOT NULL DEFAULT 'nuance',
  claim_text      TEXT NOT NULL,
  claim_basis     TEXT NOT NULL DEFAULT 'direct_source',
  confidence      TEXT NOT NULL DEFAULT 'needs_review',
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "ar_ling_root_lemma_furuq_set" (
  id              TEXT PRIMARY KEY,
  set_name        TEXT NOT NULL,
  description_md  TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
, slug TEXT, canonical_en TEXT, canonical_ar TEXT, semantic_domain_id TEXT, pos_hint TEXT DEFAULT 'mixed', short_summary TEXT, source_status TEXT DEFAULT 'manual', confidence TEXT DEFAULT 'needs_review', review_status TEXT DEFAULT 'draft', updated_at TEXT, canonical_ur TEXT);

CREATE TABLE "ar_ling_root_lemma_furuq_set_src" (
  id              TEXT PRIMARY KEY,
  set_id          TEXT NOT NULL,
  source_id       TEXT NOT NULL,
  chunk_id        TEXT,
  source_role     TEXT NOT NULL DEFAULT 'evidence',
  source_path     TEXT,
  source_url      TEXT,
  note_md         TEXT,
  confidence      TEXT NOT NULL DEFAULT 'needs_review',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (set_id, source_id, chunk_id)
);

CREATE TABLE "ar_ling_root_lemma_ilal" (
  id              TEXT PRIMARY KEY,
  rule_name       TEXT NOT NULL,
  rule_type       TEXT NOT NULL,
  applies_to      TEXT NOT NULL,
  rule_description_md TEXT NOT NULL,
  example_before  TEXT,
  example_after   TEXT,
  note_md         TEXT
, bab_key     TEXT, source_slug TEXT, source_ref  TEXT, edition_id  TEXT REFERENCES "ar_ling_source_edition"(id), page_ref    TEXT, is_qiyasi   INTEGER NOT NULL DEFAULT 1, status      TEXT NOT NULL DEFAULT 'raw', layer_code  TEXT NOT NULL DEFAULT 'AL:150-FORM:SF:24-ILAL:P', name_ar TEXT, name_en TEXT, name_ur TEXT, rule_ar TEXT, rule_en TEXT, rule_ur TEXT, bind_weak TEXT, bind_verb_form TEXT, bind_pos TEXT, bind_state TEXT NOT NULL DEFAULT 'bindable', bind_note TEXT);

CREATE TABLE ar_ling_root_lemma_ilal_apply (
  id TEXT PRIMARY KEY,
  root_norm TEXT NOT NULL,
  lemma_id TEXT NOT NULL REFERENCES ar_ling_root_lemma(id),
  rule_id TEXT NOT NULL REFERENCES ar_ling_root_lemma_ilal(id),
  step_no INTEGER NOT NULL DEFAULT 1,
  surface_before TEXT, surface_after TEXT,
  note_ar TEXT, note_en TEXT, note_ur TEXT,
  claim_basis TEXT NOT NULL DEFAULT 'derived' CHECK (claim_basis IN ('attested','derived')),
  source_slug TEXT, source_ref TEXT,
  confidence TEXT NOT NULL DEFAULT 'high',
  generated_by TEXT,
  status TEXT NOT NULL DEFAULT 'live',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (lemma_id, rule_id, step_no),
  CHECK (claim_basis = 'derived' OR source_ref IS NOT NULL)
);

CREATE TABLE "ar_ling_root_lemma_link" (
  id              TEXT PRIMARY KEY,
  lemma_id        TEXT NOT NULL,
  root_id         TEXT NOT NULL,
  link_type       TEXT NOT NULL DEFAULT 'primary',
  note_md         TEXT,
  UNIQUE (lemma_id, root_id),
  FOREIGN KEY (lemma_id) REFERENCES "ar_ling_root_lemma"(id),
  FOREIGN KEY (root_id)  REFERENCES "ar_ling_roots"(id)
);

CREATE TABLE "ar_ling_root_lemma_sarf" (
  id              TEXT PRIMARY KEY,
  pattern         TEXT NOT NULL,
  gender          TEXT,
  number          TEXT,
  case_marker     TEXT,
  tense           TEXT,
  voice           TEXT,
  person          TEXT,
  definiteness    TEXT,
  derivation_type TEXT,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
, verb_form TEXT, root_type TEXT, qac_flags TEXT, pos TEXT, mood TEXT);

CREATE TABLE "ar_ling_root_lemma_tabir" (
  id              TEXT PRIMARY KEY,
  expression_ar   TEXT NOT NULL,
  expression_en   TEXT NOT NULL,
  expression_type_id TEXT,
  primary_lemma_id TEXT,
  explanation_md  TEXT,
  qr_refs_json    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')), source_slug      TEXT, root_ar          TEXT, lemma_ar         TEXT, surface_ar       TEXT, preposition_ar   TEXT, surah            INTEGER, ayah             INTEGER, source_page      INTEGER, construction_en  TEXT, notes_md         TEXT, usage_note       TEXT, match_method     TEXT, confidence       TEXT, status           TEXT NOT NULL DEFAULT 'live', updated_at       TEXT, ayah_translation_en TEXT, expression_ur   TEXT, construction_ar TEXT, construction_ur TEXT, explanation_ar  TEXT, explanation_en  TEXT, explanation_ur  TEXT, usage_note_ar   TEXT, usage_note_en   TEXT, usage_note_ur   TEXT, ayah_translation_ur TEXT,
  FOREIGN KEY (expression_type_id) REFERENCES "ar_ling_root_lemma_tabir_kind"(id),
  FOREIGN KEY (primary_lemma_id)   REFERENCES "ar_ling_root_lemma"(id)
);

CREATE TABLE "ar_ling_root_lemma_tabir_kind" (
  id              TEXT PRIMARY KEY,
  type_key        TEXT NOT NULL UNIQUE,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  description_md  TEXT
, name_ur TEXT);

CREATE TABLE "ar_ling_root_lemma_tadiya" (
  id TEXT PRIMARY KEY,
  root_norm TEXT NOT NULL,
  verb_form TEXT,
  verb_ar TEXT NOT NULL,
  transitivity TEXT NOT NULL,          
  harf TEXT,                           
  meaning_en TEXT,
  meaning_ar TEXT,
  qr_ref TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  source_ref TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
, transitivity_term_id TEXT, taddiya_route TEXT, meaning_ur TEXT, display_json TEXT, taddiya_route_term_id TEXT REFERENCES ar_ling_gram_term(id), subject_class_term_id TEXT, object_class_term_id TEXT, frame_ar TEXT, shahid_ar TEXT);

CREATE TABLE "ar_ling_root_lemma_taswib" (
  id              TEXT PRIMARY KEY,
  upstream_slug   TEXT NOT NULL,
  upstream_version TEXT,
  scope           TEXT NOT NULL,
  key_bw          TEXT NOT NULL,
  root_bw         TEXT,
  surface_ar      TEXT,
  field           TEXT NOT NULL,
  upstream_value  TEXT,
  proposed_value  TEXT NOT NULL,
  detector        TEXT NOT NULL,
  rationale_en    TEXT,
  occurrences     INTEGER NOT NULL DEFAULT 0,
  confidence      TEXT NOT NULL DEFAULT 'medium',
  status          TEXT NOT NULL DEFAULT 'proposed',
  verified_against TEXT,
  source_slug     TEXT NOT NULL DEFAULT 'kmaps_five_lens',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')), rationale_ar TEXT, rationale_ur TEXT,
  UNIQUE (upstream_slug, scope, key_bw, field)
);

CREATE TABLE ar_ling_root_lemma_wazn (
  id             TEXT PRIMARY KEY,
  lemma_id       TEXT NOT NULL REFERENCES ar_ling_root_lemma(id),
  wazn_id        TEXT NOT NULL REFERENCES ar_ling_sarf_wazn(id),
  gram_term_ref  TEXT NOT NULL REFERENCES ar_ling_gram_term(id),
  rule_id        TEXT REFERENCES ar_ling_sarf_wazn_rule(id),
  base_verb      TEXT,
  base_bab       TEXT,
  transitivity   TEXT,
  basis          TEXT NOT NULL DEFAULT 'derived',
  confidence     TEXT NOT NULL DEFAULT 'medium',
  is_disputed    INTEGER NOT NULL DEFAULT 0,
  dispute_note   TEXT,
  source_slug    TEXT,
  source_ref     TEXT,
  quote_ar       TEXT,
  status         TEXT NOT NULL DEFAULT 'live',
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (lemma_id, gram_term_ref, rule_id)
);

CREATE TABLE ar_ling_root_lemma_wazn_detect (
  lemma_id       TEXT PRIMARY KEY REFERENCES ar_ling_root_lemma(id),
  wazn_id        TEXT NOT NULL REFERENCES ar_ling_sarf_wazn(id),
  lemma_bare     TEXT NOT NULL,
  root_text      TEXT NOT NULL,
  method         TEXT NOT NULL DEFAULT 'skeleton_match_v1',
  is_forked      INTEGER NOT NULL DEFAULT 0,
  class_status   TEXT NOT NULL DEFAULT 'needs_source',
  frequency_quran INTEGER NOT NULL DEFAULT 0,
  detected_at    TEXT NOT NULL DEFAULT (datetime('now'))
, root_verb_forms TEXT, route TEXT NOT NULL DEFAULT 'mushtaqq', root_verb_any INTEGER NOT NULL DEFAULT 0);

CREATE TABLE "ar_ling_root_lemma_word_quran_link" (
  id              TEXT PRIMARY KEY,
  al_entity_ref   TEXT NOT NULL,
  al_entity_type  TEXT NOT NULL,
  qr_scope_ref    TEXT NOT NULL,
  link_type       TEXT NOT NULL DEFAULT 'attests',
  note_md         TEXT,
  confidence      REAL NOT NULL DEFAULT 1.0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "ar_ling_root_lemma_word_silsila" (
  id              TEXT PRIMARY KEY,
  lemma_ar        TEXT NOT NULL,
  root_norm       TEXT NOT NULL,
  root_letters_json TEXT NOT NULL,
  wazn_ar         TEXT NOT NULL,
  form_family_key TEXT,
  zawaid_json     TEXT,
  operation_key   TEXT,
  operation_ar TEXT, operation_en TEXT, operation_ur TEXT,
  surface_form_ar TEXT NOT NULL,
  underlying_form_ar TEXT,
  inflection_class_key TEXT,
  rule_ar TEXT, rule_en TEXT, rule_ur TEXT,
  source_slug TEXT NOT NULL, source_ref TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  bab_key TEXT, edition_id TEXT REFERENCES "ar_ling_source_edition"(id), page_ref TEXT,
  rule_id TEXT REFERENCES "ar_ling_root_lemma_ilal"(id), lemma_ref TEXT REFERENCES "ar_ling_root_lemma"(id),
  root_id TEXT REFERENCES ar_ling_roots(id),
  step_seq INTEGER NOT NULL DEFAULT 1, step_of TEXT,
  is_qiyasi INTEGER NOT NULL DEFAULT 1, shadhdh_note_ar TEXT,
  layer_code TEXT NOT NULL DEFAULT 'AL:150-FORM:SF:24-ILAL:P',
  shadhdh_note_en TEXT, shadhdh_note_ur TEXT,
  UNIQUE (lemma_ar, operation_key, step_seq),
  FOREIGN KEY (root_norm) REFERENCES ar_ling_roots(root_normalized)
);

CREATE TABLE "ar_ling_root_letter" (
  id            TEXT PRIMARY KEY,
  letter_ar     TEXT NOT NULL UNIQUE,
  name_ar       TEXT NOT NULL,
  name_en       TEXT,
  makhraj_key   TEXT,
  makhraj_ar    TEXT,
  makhraj_order INTEGER,
  sifat_json    TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(sifat_json)),
  is_illa       INTEGER NOT NULL DEFAULT 0,
  is_ziyada     INTEGER NOT NULL DEFAULT 0,
  is_qalqala    INTEGER NOT NULL DEFAULT 0,
  bab_id        TEXT REFERENCES ar_ling_gram_bab(id),
  source_slug   TEXT NOT NULL DEFAULT 'ibn_jinni_sirr_sinaat',
  edition_id    TEXT REFERENCES "ar_ling_source_edition"(id),
  page_ref      TEXT,
  layer_code    TEXT NOT NULL DEFAULT 'AL:150-FORM:SF:28-PHON:P',
  status        TEXT NOT NULL DEFAULT 'raw',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
, name_ur    TEXT, makhraj_en TEXT, makhraj_ur TEXT, note_ar    TEXT, note_en    TEXT, note_ur    TEXT, example_ar TEXT, example_gloss_en TEXT, example_gloss_ur TEXT, example_gloss_ar TEXT);

CREATE TABLE ar_ling_root_letter_slot (
  id          TEXT PRIMARY KEY,
  root_id     TEXT,                       
  root_norm   TEXT NOT NULL,
  slot_index  INTEGER NOT NULL,           
  slot_role   TEXT NOT NULL,              
  letter_ar   TEXT NOT NULL,              
  is_weak     INTEGER NOT NULL DEFAULT 0, 
  is_hamza    INTEGER NOT NULL DEFAULT 0,
  derived_by  TEXT NOT NULL DEFAULT 'computed',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (root_norm, slot_index)
);

CREATE TABLE ar_ling_root_lexicon_alias (
  root_norm     TEXT PRIMARY KEY,
  lookup_norm   TEXT NOT NULL,
  reason        TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_root_lexicon_key (
  root_norm    TEXT NOT NULL,
  lookup_norm  TEXT NOT NULL,
  -- 0 is the root as spelled; higher numbers are the traditions that file it
  -- elsewhere. A reader wanting one entry takes the lowest rank that hits.
  key_rank     INTEGER NOT NULL DEFAULT 0,
  reason       TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (root_norm, lookup_norm)
);

CREATE TABLE "ar_ling_root_lugha" (
  id              TEXT PRIMARY KEY,
  root_id         TEXT NOT NULL,
  variant_text    TEXT NOT NULL,
  variant_type    TEXT NOT NULL DEFAULT 'alternate',
  note_md         TEXT,
  FOREIGN KEY (root_id) REFERENCES "ar_ling_roots"(id)
);

CREATE TABLE ar_ling_root_naw_sawti (
  root_norm     TEXT PRIMARY KEY,
  root_id       TEXT,                     
  radical_count INTEGER NOT NULL,         
  soundness     TEXT NOT NULL,            
  category      TEXT NOT NULL,            
                                          
  hamza_slot    TEXT,                     
  weak_letter   TEXT,                     
  legacy_weak_pattern TEXT,               
  agrees_with_legacy  INTEGER,            
  derived_by    TEXT NOT NULL DEFAULT 'computed',
  confidence    REAL NOT NULL DEFAULT 0.9,
  note_en       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
, display_json TEXT, root_type_term_id TEXT REFERENCES ar_ling_gram_term(id));

CREATE TABLE ar_ling_root_page_index (
  id TEXT PRIMARY KEY,
  root_norm TEXT NOT NULL,
  sub_code TEXT NOT NULL REFERENCES ar_ling_reg_sub_layer(sub_code),
  carrier_table TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE "ar_ling_root_relation" (
  id TEXT PRIMARY KEY, from_root_id TEXT, from_root_norm TEXT NOT NULL, to_root_id TEXT, to_root_norm TEXT NOT NULL,
  relation_kind TEXT NOT NULL, from_sense_id TEXT, to_sense_id TEXT,
  direction TEXT NOT NULL DEFAULT 'directed', strength INTEGER NOT NULL DEFAULT 0 CHECK (strength BETWEEN 0 AND 3),
  gloss_en TEXT, note_md TEXT, evidence_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(evidence_json)),
  provenance_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(provenance_json)), confidence REAL DEFAULT 0.8,
  generated_by TEXT, source_ref TEXT, source_slug TEXT NOT NULL DEFAULT 'kmaps_root_graph',
  sort_order INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')), gloss_ar TEXT, gloss_ur TEXT, display_json TEXT,
  UNIQUE (from_root_norm, to_root_norm, relation_kind),
  FOREIGN KEY (from_root_id) REFERENCES ar_ling_roots(id), FOREIGN KEY (to_root_id) REFERENCES ar_ling_roots(id),
  FOREIGN KEY (from_sense_id) REFERENCES "ar_ling_root_sense"(id), FOREIGN KEY (to_sense_id) REFERENCES "ar_ling_root_sense"(id));

CREATE TABLE ar_ling_root_sarf_form_index (
  form_id TEXT PRIMARY KEY,
  root_norm TEXT NOT NULL,
  source_slug TEXT NOT NULL,
  block_id TEXT NOT NULL REFERENCES ar_ling_lexicon_block(id),
  roman TEXT,
  pole TEXT,
  pole_family TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "ar_ling_root_scholarship" (
  id              TEXT PRIMARY KEY,

  
  source_id       TEXT NOT NULL,             
  source_slug     TEXT,                       
  source_native_id TEXT,                      

  
  root_id         TEXT,                       
  root_norm       TEXT NOT NULL,              
  root_text       TEXT,                       

  
  reading_kind    TEXT NOT NULL DEFAULT 'general',
                                              
                                              
                                              
                                              
                                              
                                              
                                              
                                              

  
  title_en        TEXT,
  title_ar        TEXT,
  body_md         TEXT,                       
  body_html       TEXT,                       
  body_plain      TEXT,                       

  
  comparanda_json TEXT,                       
  inscriptions_json TEXT,                     
  glosses_json    TEXT,                       
  citations_json  TEXT,                       

  
  page_no         INTEGER,
  page_range      TEXT,                       
  section_label   TEXT,                       

  
  parser_version  TEXT,
  import_batch_id TEXT,
  status          TEXT DEFAULT 'raw',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')), title_ur TEXT,

  FOREIGN KEY (source_id) REFERENCES "ar_ling_source"(id),
  FOREIGN KEY (root_id)   REFERENCES "ar_ling_roots"(id)
);

CREATE TABLE ar_ling_root_scholarship_bak_sinai(
  id TEXT,
  root_norm TEXT,
  body_md TEXT,
  backed_up_at
);

CREATE TABLE "ar_ling_root_sense" (
  id TEXT PRIMARY KEY,
  root_id TEXT,
  root_norm TEXT NOT NULL,
  scope_level TEXT NOT NULL DEFAULT 'root' CHECK (scope_level IN ('root','lemma')),
  scope_key TEXT NOT NULL,
  sense_key TEXT NOT NULL,
  gloss_ar TEXT, gloss_en TEXT, gloss_ur TEXT,
  label_ar TEXT, label_en TEXT, label_ur TEXT,
  definition_md TEXT,
  is_core INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  basis_json TEXT CHECK (basis_json IS NULL OR json_valid(basis_json)),
  provenance_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(provenance_json)),
  confidence REAL DEFAULT 0.8,
  generated_by TEXT,
  source_slug TEXT NOT NULL DEFAULT 'kmaps_sense_map',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  display_json TEXT,
  icon TEXT,
  UNIQUE (scope_level, scope_key, sense_key),
  FOREIGN KEY (root_id) REFERENCES ar_ling_roots(id)
);

CREATE TABLE "ar_ling_root_sense_axis" (
  id          TEXT PRIMARY KEY,               -- 'RSA:نذر:speech_act'
  root_norm   TEXT NOT NULL,
  axis_key    TEXT NOT NULL,
  axis_ar TEXT, axis_en TEXT, axis_ur TEXT,
  weight      INTEGER NOT NULL DEFAULT 0 CHECK (weight BETWEEN 0 AND 3),
  basis_json  TEXT CHECK (basis_json IS NULL OR json_valid(basis_json)),   -- the āyāt scored
  note_en     TEXT,
  source_slug TEXT NOT NULL DEFAULT 'kmaps_usage_map',
  status      TEXT NOT NULL DEFAULT 'draft', root_id TEXT, confidence REAL DEFAULT 0.8, generated_by TEXT, name_ur TEXT, note_ar TEXT, note_ur TEXT,
  UNIQUE (root_norm, axis_key)
);

CREATE TABLE ar_ling_root_taqalib (
  id            TEXT PRIMARY KEY,          
  group_key     TEXT NOT NULL,             
  permutation   TEXT NOT NULL,             
  perm_index    INTEGER NOT NULL,          
  is_used       INTEGER NOT NULL DEFAULT 0,
  used_root_id  TEXT,                      
  family_size   INTEGER NOT NULL,          
  derived_by    TEXT NOT NULL DEFAULT 'computed',
  note_en       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (group_key, perm_index)
);

CREATE TABLE "ar_ling_root_tatawwur" (
  id          TEXT PRIMARY KEY,               -- 'RDS:نذر:1'
  root_norm   TEXT NOT NULL,
  stage_no    INTEGER NOT NULL,
  stage_ar    TEXT NOT NULL, stage_en TEXT, stage_ur TEXT,
  note_en     TEXT,
  source_ref  TEXT,                            -- Maqāyīs block id etc. when grounded
  source_slug TEXT NOT NULL DEFAULT 'kmaps_development',
  status      TEXT NOT NULL DEFAULT 'draft', root_id TEXT, confidence REAL DEFAULT 0.8, generated_by TEXT, name_ur TEXT, note_ar TEXT, note_ur TEXT, display_json TEXT,
  UNIQUE (root_norm, stage_no)
);

CREATE TABLE "ar_ling_roots" (
  id              TEXT PRIMARY KEY,
  root_text       TEXT NOT NULL UNIQUE,
  root_letters    TEXT NOT NULL,
  root_type       TEXT NOT NULL DEFAULT 'trilateral',
  weak_pattern    TEXT,
  frequency_quran  INTEGER NOT NULL DEFAULT 0,
  frequency_hadith INTEGER NOT NULL DEFAULT 0,
  meaning_core_en  TEXT,
  meaning_core_ar  TEXT,
  note_md          TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
, buckwalter      TEXT, simple_lat      TEXT, root_normalized TEXT, canonical_id TEXT, meaning_core_ur TEXT, root_shape_term_id TEXT, root_weak_term_id TEXT);

CREATE VIRTUAL TABLE ar_ling_roots_fts USING fts5(
  id            UNINDEXED,
  root_text,
  root_normalized,
  buckwalter,
  simple_lat,
  meaning_core_en,
  tokenize = "unicode61 remove_diacritics 2"
);

CREATE TABLE ar_ling_sarf_wazn (
  id            TEXT PRIMARY KEY,
  wazn_key      TEXT NOT NULL UNIQUE,
  wazn_ar       TEXT NOT NULL,
  tier          TEXT NOT NULL DEFAULT 'thulathi_mujarrad',
  applies_to    TEXT NOT NULL DEFAULT 'ism',
  name_en       TEXT,
  name_ur       TEXT,
  wazn_order    INTEGER NOT NULL DEFAULT 0,
  note_md       TEXT,
  status        TEXT NOT NULL DEFAULT 'live',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_sarf_wazn_rule (
  id              TEXT PRIMARY KEY,
  wazn_id         TEXT NOT NULL REFERENCES ar_ling_sarf_wazn(id),
  gram_term_ref   TEXT NOT NULL REFERENCES ar_ling_gram_term(id),
  condition_key   TEXT NOT NULL DEFAULT 'any',
  strength        TEXT NOT NULL DEFAULT 'qiyasi',
  source_slug     TEXT,
  source_chunk_id TEXT REFERENCES ar_ling_gram_chunk(id),
  quote_ar        TEXT,
  confidence      TEXT NOT NULL DEFAULT 'high',
  note_md         TEXT,
  status          TEXT NOT NULL DEFAULT 'live',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (wazn_id, gram_term_ref, condition_key, source_slug)
);

CREATE TABLE ar_ling_sense_arc (
  id            TEXT PRIMARY KEY,
  scope_level   TEXT NOT NULL CHECK (scope_level IN ('root','lemma')),
  scope_key     TEXT NOT NULL,
  root_norm     TEXT NOT NULL,
  arc_key       TEXT NOT NULL,
  terminal_sense_id TEXT NOT NULL REFERENCES ar_ling_root_sense(id),
  arc_ar TEXT, arc_en TEXT, arc_ur TEXT,
  is_primary    INTEGER NOT NULL DEFAULT 0,
  is_synthesis  INTEGER NOT NULL DEFAULT 0,
  confidence    REAL DEFAULT 0.8,
  status        TEXT NOT NULL DEFAULT 'draft',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (scope_level, scope_key, arc_key)
);

CREATE TABLE ar_ling_sense_arc_step (
  id        TEXT PRIMARY KEY,
  arc_id    TEXT NOT NULL REFERENCES ar_ling_sense_arc(id),
  step_no   INTEGER NOT NULL,
  sense_id  TEXT NOT NULL REFERENCES ar_ling_root_sense(id),
  note_md   TEXT,
  story_en  TEXT,
  UNIQUE (arc_id, step_no),
  UNIQUE (arc_id, sense_id)
);

CREATE TABLE ar_ling_sense_attestation (
  id           TEXT PRIMARY KEY,
  target_type  TEXT NOT NULL CHECK (target_type IN ('sense','arc','arc_step')),
  target_id    TEXT NOT NULL,
  source_slug  TEXT NOT NULL,
  quote_ar     TEXT, quote_en TEXT,
  locator      TEXT,
  shamela_ref  TEXT,
  chunk_ref    TEXT,
  agreement    TEXT NOT NULL DEFAULT 'supports'
               CHECK (agreement IN ('supports','partial','contests')),
  confidence   REAL DEFAULT 0.8,
  status       TEXT NOT NULL DEFAULT 'live',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')), block_id TEXT
  REFERENCES "ar_ling_lexicon_block"(id), form_id TEXT,
  UNIQUE (target_type, target_id, source_slug, locator)
);

CREATE TABLE "ar_ling_source" (
  id              TEXT PRIMARY KEY,
  title_ar        TEXT NOT NULL,
  title_en        TEXT,
  source_type     TEXT NOT NULL DEFAULT 'classical_grammar',
  author_ref      TEXT,
  author_name     TEXT,
  period_label    TEXT,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
, genre TEXT, slug              TEXT, origin            TEXT, bilingual         INTEGER NOT NULL DEFAULT 0, footnote_source   TEXT, quran_block_shape TEXT, source_order      INTEGER, author_death_ah INTEGER, author_death_ce INTEGER, title_ur TEXT, title_short_ar TEXT, canonical_source_id TEXT REFERENCES ar_ling_source(id), pub_year_ce INTEGER, title_translit TEXT, title_gloss_en TEXT, author_en TEXT);

CREATE TABLE ar_ling_source_alias (
  alias_slug TEXT PRIMARY KEY,
  source_id  TEXT NOT NULL REFERENCES ar_ling_source(id),
  origin     TEXT,
  note_md    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "ar_ling_source_chunk" (
  id              TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL,
  edition_id      TEXT,
  chunk_kind      TEXT,
  chunk_seq       INTEGER NOT NULL,
  heading_norm    TEXT,
  text_ar         TEXT NOT NULL,
  text_en         TEXT,
  page_no         INTEGER,
  volume_no       INTEGER,
  tokens_approx   INTEGER,
  is_embedded     INTEGER NOT NULL DEFAULT 0,
  qdrant_id       TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')), surah_no   INTEGER, ayah_start INTEGER, ayah_end   INTEGER, root_id     TEXT, source_slug TEXT, translation_en TEXT, translation_ur TEXT,
  FOREIGN KEY (source_id)  REFERENCES "ar_ling_source"(id),
  FOREIGN KEY (edition_id) REFERENCES "ar_ling_source_edition"(id)
);

CREATE VIRTUAL TABLE ar_ling_source_chunks_fts USING fts5(heading_norm, text_ar, text_en, content='ar_ling_source_chunk', content_rowid='rowid', tokenize="unicode61 remove_diacritics 2");

CREATE TABLE "ar_ling_source_citation" (
  id TEXT PRIMARY KEY, root_norm TEXT, from_layer TEXT NOT NULL, from_id TEXT NOT NULL,
  to_ref TEXT NOT NULL, to_kind TEXT NOT NULL, relation TEXT NOT NULL DEFAULT 'grounds',
  source_slug TEXT, page_no INTEGER, quote_ar TEXT, confidence REAL,
  origin TEXT NOT NULL DEFAULT 'backfill', status TEXT NOT NULL DEFAULT 'live',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (from_layer, from_id, to_ref, relation)
);

CREATE TABLE "ar_ling_source_edition" (
  id              TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL,
  edition_label   TEXT NOT NULL,
  publisher       TEXT,
  year            TEXT,
  volume_count    INTEGER,
  note_md         TEXT,
  FOREIGN KEY (source_id) REFERENCES "ar_ling_source"(id)
);

CREATE TABLE "ar_ling_source_entry_ref" (
  id                      TEXT PRIMARY KEY,
  source_id               TEXT NOT NULL,
  source_chunk_id          TEXT NOT NULL,

  external_node_id         TEXT NOT NULL,
  external_parent_node_id  TEXT,
  external_key             TEXT,
  external_type            TEXT,

  headword_ar              TEXT,
  buck                     TEXT,
  page_no                  INTEGER,

  raw_xml                  TEXT,
  meta_json                TEXT NOT NULL DEFAULT '{}',

  created_at               TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE(source_id, external_node_id),
  FOREIGN KEY (source_id)       REFERENCES "ar_ling_source"(id),
  FOREIGN KEY (source_chunk_id) REFERENCES "ar_ling_source_chunk"(id)
);

CREATE TABLE "ar_ling_source_evidence" (
  id              TEXT PRIMARY KEY,
  evidence_type   TEXT NOT NULL,
  text_ar         TEXT NOT NULL,
  text_en         TEXT,
  qr_ref          TEXT,
  source_ref      TEXT,
  locator_json    TEXT,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
, text_ur TEXT);

CREATE TABLE ar_ling_source_toc (
  id              TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL,
  parent_id       TEXT,
  title_ar        TEXT NOT NULL,
  title_en        TEXT,
  level           INTEGER NOT NULL DEFAULT 1,
  seq             INTEGER NOT NULL,
  page_start      INTEGER, title_ur TEXT,
  FOREIGN KEY (source_id) REFERENCES "ar_ling_source"(id),
  FOREIGN KEY (parent_id) REFERENCES ar_ling_source_toc(id)
);

CREATE TABLE ar_ling_src_code (
  data_slug TEXT PRIMARY KEY,
  code      TEXT NOT NULL,
  discipline TEXT NOT NULL,
  title_en  TEXT
);

CREATE TABLE "ar_ling_term_dictionary" (
  term_text TEXT NOT NULL,
  root_norm TEXT,
  role_key TEXT NOT NULL REFERENCES ar_ling_reg_term_role(role_key), gram_term_id TEXT REFERENCES ar_ling_gram_term(id),
  PRIMARY KEY (term_text, root_norm)
);

CREATE TABLE kmaps_cache_version (
  family     TEXT PRIMARY KEY,
  version    TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE tmp_qroot (root TEXT PRIMARY KEY);


-- ── Views (30) ───────────────────────────────────────────────────

CREATE VIEW ar_ling_gram_term_signature AS
 SELECT COUNT(*) AS term_count,
        COUNT(DISTINCT category_key) AS category_count,
        SUM(version) AS version_sum,
        SUM(CASE WHEN status='live' THEN 1 ELSE 0 END) AS live_count,
        COUNT(*)||'.'||COUNT(DISTINCT category_key)||'.'||SUM(version)||'.'||SUM(length(id)+length(name_ar)+length(name_en)+length(COALESCE(name_ur,''))) AS signature
 FROM ar_ling_gram_term;

CREATE VIEW ar_ling_reg_band_carrier AS
SELECT
  t.sub_code,
  s.name_en            AS band_name_en,
  s.scope_level,
  s.discipline,
  COUNT(*)                                             AS carriers_total,
  SUM(t.root_bind IN ('direct','via'))                 AS carriers_measurable,
  SUM(t.root_bind='direct')                            AS carriers_direct,
  SUM(t.root_bind='via')                               AS carriers_via,
  SUM(t.root_bind='none')                              AS carriers_global,
  SUM(t.root_bind='unset')                             AS carriers_unresolved,
  CASE
    WHEN SUM(t.root_bind IN ('direct','via'))=0 AND SUM(t.root_bind='unset')=0 THEN 'na'
    WHEN SUM(t.root_bind='unset')>0                                            THEN 'unresolved'
    ELSE 'live' END                                    AS derived_status,
  (SELECT group_concat(x.table_name) FROM ar_ling_reg_table_map x
     WHERE x.sub_code=t.sub_code AND x.db=t.db AND x.root_bind IN ('direct','via'))
                                                       AS derived_carriers
FROM ar_ling_reg_table_map t
LEFT JOIN ar_ling_reg_sub_layer s ON s.sub_code=t.sub_code
WHERE t.db='km_arabic_linguistic'
GROUP BY t.sub_code;

CREATE VIEW ar_ling_reg_root_display_format AS
SELECT
  sl.sub_code,
  sl.scope_level,
  sl.name_ar AS section_name_ar, sl.name_en AS section_name_en, sl.name_ur AS section_name_ur,
  sl.band_key,
  sl.band_name_ar, sl.band_name_en,
  sl.display_icon AS section_icon,
  bc.color_hex AS section_color,
  bc.color_name_en AS section_color_name,
  hs.level_key AS heading_level, hs.font_family AS heading_font, hs.font_size_px AS heading_size,
  hs.color_rule AS heading_color_rule
FROM ar_ling_reg_sub_layer sl
LEFT JOIN ar_ling_reg_band_color bc ON bc.band_key = sl.band_key
LEFT JOIN ar_ling_reg_heading_style hs ON hs.level_key = 'h2_band'
ORDER BY sl.sub_code;

CREATE VIEW ar_ling_root_edges_v AS
  SELECT 'antonym' AS origin_table, a.id AS edge_id, NULL AS from_root_id, a.root_norm AS from_root_norm,
    NULL AS to_root_id, COALESCE(a.antonym_root, a.antonym_ar) AS to_root_norm, a.relation_kind AS relation_kind,
    NULL AS strength, a.antonym_en AS gloss_en, NULL AS evidence_json, a.status AS status, a.created_at AS created_at
  FROM "ar_ling_root_didd" a
  UNION ALL
  SELECT 'relation', r.id, r.from_root_id, r.from_root_norm, r.to_root_id, r.to_root_norm, r.relation_kind,
    r.strength, r.gloss_en, r.evidence_json, r.status, r.created_at
  FROM "ar_ling_root_relation" r
  UNION ALL
  SELECT 'asl', s.id, s.root_id, s.root_norm, NULL, NULL, 'attested_asl',
    NULL, s.statement_en, NULL, s.status, s.created_at
  FROM "ar_ling_root_asl" s;

CREATE VIEW ar_ling_root_layer_fill AS
SELECT f.root_norm AS root, f.band_code AS sub_code,
       COALESCE(s.band_name_en, s.name_en, f.band_code) AS band,
       f.n AS n, f.computed_at AS computed_at
FROM ar_ling_root_band_fill f
LEFT JOIN ar_ling_reg_sub_layer s ON s.sub_code = f.band_code;

CREATE VIEW ar_ling_root_lexicon_block_v AS
SELECT
  k.root_norm          AS root_norm,
  k.lookup_norm        AS found_under,
  k.key_rank           AS key_rank,
  b.id                 AS block_id,
  b.source_slug        AS source_slug,
  b.root_entry_id      AS root_entry_id,
  b.block_type         AS block_type,
  b.block_seq          AS block_seq,
  b.depth              AS depth,
  b.lang               AS lang,
  b.title_ar           AS title_ar,
  b.title_en           AS title_en,
  b.text_plain         AS text_plain,
  b.translation_en     AS translation_en,
  b.printed_page       AS printed_page
FROM ar_ling_root_lexicon_key k
JOIN ar_ling_lexicon_block b ON b.root_norm = k.lookup_norm;

CREATE VIEW ar_ling_root_lexicon_entry_v AS
SELECT
  k.root_norm          AS root_norm,
  k.lookup_norm        AS found_under,
  k.key_rank           AS key_rank,
  e.id                 AS entry_id,
  e.source_slug        AS source_slug,
  e.source_id          AS source_id,
  e.root_id            AS root_id,
  e.root_text          AS root_text,
  e.raw_text           AS raw_text,
  e.entry_text_ar      AS entry_text_ar,
  e.entry_text_en      AS entry_text_en,
  e.translation_en     AS translation_en,
  e.translation_ur     AS translation_ur,
  e.entry_gloss_json   AS entry_gloss_json,
  e.family_json        AS family_json,
  e.page_start         AS page_start,
  e.page_end           AS page_end,
  e.volume_no          AS volume_no,
  e.status             AS status
FROM ar_ling_root_lexicon_key k
JOIN ar_ling_lexicon_entry e ON e.root_norm = k.lookup_norm;

CREATE VIEW ar_ling_root_lexicon_fact_v AS
SELECT k.root_norm, f.root_norm AS found_under, k.key_rank,
       f.id, f.source_slug, f.block_id, f.section_id, f.headword_ar, f.fact_kind, f.value_ar, f.value_en, f.quote_ar,
       f.surah, f.ayah, f.marker, f.method, f.confidence, f.seq, f.data_json
  FROM ar_ling_root_lexicon_key k
  JOIN ar_ling_lexicon_fact f ON f.root_norm = k.lookup_norm;

CREATE VIEW ar_ling_root_lexicon_page_v AS
SELECT
  k.root_norm            AS root_norm,
  k.lookup_norm          AS found_under,
  k.key_rank             AS key_rank,
  p.id                   AS page_id,
  p.source_slug          AS source_slug,
  p.volume_no            AS volume_no,
  p.page_seq             AS page_seq,
  p.printed_page_start   AS printed_page_start,
  p.printed_page_end     AS printed_page_end,
  p.clean_text           AS clean_text,
  p.source_url           AS source_url,
  p.r2_key               AS r2_key
FROM ar_ling_root_lexicon_key k
JOIN ar_ling_lexicon_book_page p ON p.root_norm = k.lookup_norm;

CREATE VIEW ar_ling_root_lexicon_quran_ref_v AS
SELECT
  k.root_norm        AS root_norm,
  k.lookup_norm      AS found_under,
  k.key_rank         AS key_rank,
  q.id               AS ref_id,
  q.source_slug      AS source_slug,
  q.root_entry_id    AS root_entry_id,
  q.section_id       AS section_id,
  q.block_id         AS block_id,
  q.surah            AS surah,
  q.ayah             AS ayah,
  q.raw_ref          AS raw_ref,
  q.context_snippet  AS context_snippet
FROM ar_ling_root_lexicon_key k
JOIN ar_ling_lexicon_quran_ref q ON q.root_norm = k.lookup_norm;

CREATE VIEW ar_ling_root_lexicon_section_v AS
SELECT
  k.root_norm         AS root_norm,
  k.lookup_norm       AS found_under,
  k.key_rank          AS key_rank,
  s.id                AS section_id,
  s.root_entry_id     AS root_entry_id,
  s.source_slug       AS source_slug,
  s.root_text         AS root_text,
  s.section_seq       AS section_seq,
  s.section_type      AS section_type,
  s.heading_ar        AS heading_ar,
  s.heading_bare      AS heading_bare,
  s.text_ar           AS text_ar,
  s.text_en           AS text_en,
  s.translation_en    AS translation_en,
  s.translation_ur    AS translation_ur,
  s.lane_node_num     AS lane_node_num,
  s.lane_itype        AS lane_itype,
  s.has_gaps          AS has_gaps,
  s.page_no           AS page_no,
  s.volume_no         AS volume_no
FROM ar_ling_root_lexicon_key k
JOIN ar_ling_lexicon_entry_section s ON s.root_norm = k.lookup_norm;

CREATE VIEW ar_ling_stage_board AS
SELECT root_norm, layer_code,
  COUNT(*) AS backlinks,
  SUM(status='raw') AS raw,
  SUM(status='staged') AS staged,
  SUM(status='promoted') AS promoted
FROM ar_ling_root_backlink
GROUP BY root_norm, layer_code
ORDER BY root_norm, layer_code;

CREATE VIEW ar_ling_tablemap_board AS
SELECT cluster, layer_code, sub_code, code_full, discipline, table_name
FROM ar_ling_reg_table_map
WHERE db='km_arabic_linguistic'
ORDER BY cluster, layer_code, sub_code;

CREATE VIEW v_ar_ling_carrier_undeclared AS
SELECT m.table_name, m.sub_code, m.root_bind, m.root_bind_col
  FROM ar_ling_reg_table_map m
 WHERE m.role = 'carrier' AND m.root_bind = 'direct'
   AND NOT EXISTS (SELECT 1 FROM ar_ling_reg_sub_layer s
                    WHERE s.sub_code = m.sub_code
                      AND s.tables_json LIKE '%"' || m.table_name || '"%');

CREATE VIEW v_ar_ling_quran_lemma AS SELECT * FROM ar_ling_root_lemma WHERE is_quran_word=1 AND record_status='live';

CREATE VIEW v_ar_ling_source_resolved AS SELECT s.id AS ref_id, COALESCE(c.id, s.id) AS source_id, COALESCE(c.slug, s.slug) AS slug, COALESCE(c.title_ar, s.title_ar) AS title_ar, COALESCE(c.title_en, s.title_en) AS title_en, COALESCE(c.author_name, s.author_name) AS author_name, COALESCE(c.author_death_ah, s.author_death_ah) AS author_death_ah, COALESCE(c.author_death_ce, s.author_death_ce) AS author_death_ce, COALESCE(c.pub_year_ce, s.pub_year_ce) AS pub_year_ce, COALESCE(c.genre, s.genre) AS genre, COALESCE(c.period_label, s.period_label) AS period_label, COALESCE(c.source_order, s.source_order) AS source_order, COALESCE(COALESCE(c.author_death_ah, s.author_death_ah), CAST(ROUND((COALESCE(COALESCE(c.author_death_ce, s.author_death_ce), COALESCE(c.pub_year_ce, s.pub_year_ce)) - 622) * 1.0307) AS INTEGER)) AS chrono_ah, CASE WHEN COALESCE(c.author_death_ah, s.author_death_ah) IS NOT NULL THEN 'author death (AH)' WHEN COALESCE(c.author_death_ce, s.author_death_ce) IS NOT NULL THEN 'author death (CE→AH)' WHEN COALESCE(c.pub_year_ce, s.pub_year_ce) IS NOT NULL THEN 'publication (CE→AH)' ELSE 'undated' END AS chrono_basis, CASE WHEN s.canonical_source_id IS NULL THEN 0 ELSE 1 END AS is_alias FROM ar_ling_source s LEFT JOIN ar_ling_source c ON c.id = s.canonical_source_id;

CREATE VIEW v_balagha_bab AS SELECT * FROM ar_ling_gram_bab   WHERE discipline='BL';

CREATE VIEW v_balagha_pages AS SELECT * FROM "ar_ling_gram_chunk" WHERE discipline='BL';

CREATE VIEW v_gram_term_unbound AS
SELECT 'ar_ling_root_naw_sawti' AS tbl, root_norm AS row_id, 'root_type_term_id' AS col, root_type_term_id AS val
FROM ar_ling_root_naw_sawti WHERE root_type_term_id IS NULL OR root_type_term_id NOT IN (SELECT id FROM ar_ling_gram_term WHERE status='live')
UNION ALL
SELECT 'ar_ling_root_lemma_tadiya', id, 'transitivity_term_id', transitivity_term_id
FROM ar_ling_root_lemma_tadiya WHERE transitivity_term_id IS NULL OR transitivity_term_id NOT IN (SELECT id FROM ar_ling_gram_term WHERE status='live')
UNION ALL
SELECT 'ar_ling_root_lemma_tadiya', id, 'taddiya_route_term_id', taddiya_route_term_id
FROM ar_ling_root_lemma_tadiya WHERE taddiya_route_term_id IS NULL OR taddiya_route_term_id NOT IN (SELECT id FROM ar_ling_gram_term WHERE status='live');

CREATE VIEW v_id_convention_drift AS
SELECT 'ar_ling_root_lemma' AS tbl, id FROM ar_ling_root_lemma WHERE id LIKE 'AL:%'
UNION ALL SELECT 'ar_ling_roots', id FROM ar_ling_roots WHERE id LIKE 'AL:%'
UNION ALL SELECT 'ar_ling_root_sense', id FROM ar_ling_root_sense WHERE id LIKE 'AL:%'
UNION ALL SELECT 'ar_ling_lexicon_entry', id FROM ar_ling_lexicon_entry WHERE id LIKE 'AL:%';

CREATE VIEW v_meaning_layer_gaps AS
WITH scope AS (
  SELECT table_name FROM ar_ling_reg_table_map
  WHERE db='km_arabic_linguistic'
    AND (layer_code IN ('100','150','200','500','600')
      OR table_name IN ('ar_ling_gram_bab','ar_ling_gram_terms','ar_ling_gram_categories','ar_ling_reg_sub_layer'))
),
cols AS (SELECT m.name AS tbl, p.name AS col FROM sqlite_master m JOIN pragma_table_info(m.name) p WHERE m.name IN (SELECT table_name FROM scope)),
txt AS (
  SELECT tbl, col, substr(col,1,length(col)-3) AS stem FROM cols
  WHERE (col LIKE '%\_ar' ESCAPE '\' OR col LIKE '%\_en' ESCAPE '\' OR col LIKE '%\_ur' ESCAPE '\')
    AND substr(col,1,length(col)-3) IN
      ('definition','gloss','meaning','meaning_core','core_sense','sense_family_summary','rule','note',
       'explanation','operation','usage_note','short','translation','nuance','rationale','shadhdh_note',
       'example_gloss','decision_note','contrast','derivation_note','story')
)
SELECT DISTINCT t.tbl, t.stem,
  EXISTS (SELECT 1 FROM cols c WHERE c.tbl=t.tbl AND c.col=t.stem||'_ar') AS has_ar,
  EXISTS (SELECT 1 FROM cols c WHERE c.tbl=t.tbl AND c.col=t.stem||'_en') AS has_en,
  EXISTS (SELECT 1 FROM cols c WHERE c.tbl=t.tbl AND c.col=t.stem||'_ur') AS has_ur
FROM txt t
WHERE NOT (EXISTS (SELECT 1 FROM cols c WHERE c.tbl=t.tbl AND c.col=t.stem||'_ar')
       AND EXISTS (SELECT 1 FROM cols c WHERE c.tbl=t.tbl AND c.col=t.stem||'_en')
       AND EXISTS (SELECT 1 FROM cols c WHERE c.tbl=t.tbl AND c.col=t.stem||'_ur'));

CREATE VIEW v_nahw_bab   AS SELECT * FROM ar_ling_gram_bab    WHERE discipline='NH';

CREATE VIEW v_nahw_pages   AS SELECT * FROM "ar_ling_gram_chunk" WHERE discipline='NH';

CREATE VIEW v_naming_convention_drift AS
SELECT m.name AS tbl, p.name AS col FROM sqlite_master m JOIN pragma_table_info(m.name) p
WHERE m.type='table' AND m.name LIKE 'ar_ling%'
  AND (p.name LIKE 'arabic\_%' ESCAPE '\' OR p.name LIKE 'english\_%' ESCAPE '\' OR p.name LIKE 'urdu\_%' ESCAPE '\');

CREATE VIEW v_page_ref_without_edition AS
SELECT 'ar_ling_letters' AS tbl, id, page_ref, source_slug FROM "ar_ling_root_letter" WHERE page_ref IS NOT NULL AND edition_id IS NULL
UNION ALL SELECT 'ar_ling_word_sums', id, page_ref, source_slug FROM "ar_ling_root_lemma_word_silsila" WHERE page_ref IS NOT NULL AND edition_id IS NULL
UNION ALL SELECT 'ar_ling_inflection_rules', id, page_ref, source_slug FROM "ar_ling_root_lemma_ilal" WHERE page_ref IS NOT NULL AND edition_id IS NULL;

CREATE VIEW v_registry_dead_refs AS
SELECT 'reg_table_map' AS source, m.table_name AS ref, m.code_full AS ctx
FROM ar_ling_reg_table_map m
WHERE NOT EXISTS (SELECT 1 FROM sqlite_master s WHERE s.type='table' AND s.name=m.table_name)
UNION ALL
SELECT 'reg_sub_layer.tables_json', j.value, s.sub_code
FROM ar_ling_reg_sub_layer s, json_each(s.tables_json) j
WHERE NOT EXISTS (SELECT 1 FROM sqlite_master m WHERE m.type='table' AND m.name=j.value);

CREATE VIEW v_registry_unmapped AS
SELECT s.name AS table_name
FROM sqlite_master s
WHERE s.type='table' AND s.name LIKE 'ar_ling_%' AND s.name NOT LIKE '%\_fts%' ESCAPE '\'
  AND s.name NOT IN ('d1_migrations','_cf_KV')
  AND NOT EXISTS (SELECT 1 FROM ar_ling_reg_table_map m WHERE m.table_name=s.name);

CREATE VIEW v_sarf_bab   AS SELECT * FROM ar_ling_gram_bab    WHERE discipline='SF';

CREATE VIEW v_sarf_pages   AS SELECT * FROM "ar_ling_gram_chunk" WHERE discipline='SF';

CREATE VIEW v_sarf_unsourced AS
SELECT 'ar_ling_inflection_rules' AS tbl, id, name_ar AS label FROM "ar_ling_root_lemma_ilal" WHERE source_slug IS NULL
UNION ALL SELECT 'ar_ling_word_sums', id, lemma_ar FROM "ar_ling_root_lemma_word_silsila" WHERE source_ref IS NULL
UNION ALL SELECT 'ar_ling_form_paradigms', id, paradigm_name FROM "ar_ling_root_form_paradigm" WHERE source_slug IS NULL
UNION ALL SELECT 'ar_ling_conjugation_templates', id, template_form FROM "ar_ling_root_form_template" WHERE source_slug IS NULL;


-- ── Indexes (253) ────────────────────────────────────────────────

CREATE INDEX idx_albk_book_page
  ON "ar_ling_lexicon_block"(book_page_id);

CREATE INDEX idx_albk_origin
  ON "ar_ling_lexicon_block"(origin);

CREATE INDEX idx_albk_parent
  ON "ar_ling_lexicon_block"(parent_block_id);

CREATE INDEX idx_albk_root_entry_seq
  ON "ar_ling_lexicon_block"(root_entry_id, block_seq);

CREATE INDEX idx_albk_root_norm
  ON "ar_ling_lexicon_block"(root_norm);

CREATE INDEX idx_albk_section
  ON "ar_ling_lexicon_block"(section_id);

CREATE INDEX idx_albk_source_root
  ON "ar_ling_lexicon_block"(source_slug, root_norm);

CREATE INDEX idx_albk_type
  ON "ar_ling_lexicon_block"(block_type);

CREATE INDEX idx_albka_block
  ON "ar_ling_lexicon_block_annotation"(block_id);

CREATE INDEX idx_albka_kind
  ON "ar_ling_lexicon_block_annotation"(annotation_kind);

CREATE INDEX idx_albka_user
  ON "ar_ling_lexicon_block_annotation"(user_id);

CREATE INDEX idx_albka_visibility
  ON "ar_ling_lexicon_block_annotation"(visibility);

CREATE INDEX idx_albl_auth
  ON "ar_ling_lexicon_block_link"(to_authority_code);

CREATE INDEX idx_albl_ayah
  ON "ar_ling_lexicon_block_link"(to_surah, to_ayah, link_kind);

CREATE INDEX idx_albl_block
  ON "ar_ling_lexicon_block_link"(to_block_id);

CREATE INDEX idx_albl_from
  ON "ar_ling_lexicon_block_link"(from_block_id);

CREATE INDEX idx_albl_kind
  ON "ar_ling_lexicon_block_link"(link_kind);

CREATE INDEX idx_albl_root
  ON "ar_ling_lexicon_block_link"(to_root_norm, link_kind);

CREATE INDEX idx_albl_source
  ON "ar_ling_lexicon_block_link"(source_slug);

CREATE INDEX idx_albp_import_batch
  ON "ar_ling_lexicon_book_page"(import_batch_id);

CREATE INDEX idx_albp_printed_page
  ON "ar_ling_lexicon_book_page"(source_slug, printed_page_start);

CREATE INDEX idx_albp_root_norm
  ON "ar_ling_lexicon_book_page"(source_slug, root_norm);

CREATE INDEX idx_albp_source_slug
  ON "ar_ling_lexicon_book_page"(source_slug);

CREATE INDEX idx_albp_volume_seq
  ON "ar_ling_lexicon_book_page"(source_slug, volume_no, page_seq);

CREATE INDEX idx_albt_source
  ON "ar_ling_lexicon_block_tag"(source);

CREATE INDEX idx_albt_tag
  ON "ar_ling_lexicon_block_tag"(tag);

CREATE INDEX idx_alc_from   ON "ar_ling_source_citation"(from_layer, from_id);

CREATE INDEX idx_alc_root   ON "ar_ling_source_citation"(root_norm);

CREATE INDEX idx_alc_slug   ON "ar_ling_source_citation"(source_slug);

CREATE INDEX idx_alc_tokind ON "ar_ling_source_citation"(to_kind);

CREATE INDEX idx_alc_toref  ON "ar_ling_source_citation"(to_ref);

CREATE INDEX idx_ales_heading_norm
  ON "ar_ling_lexicon_entry_section"(heading_norm);

CREATE INDEX idx_ales_page
  ON "ar_ling_lexicon_entry_section"(page_no);

CREATE INDEX idx_ales_root_entry
  ON "ar_ling_lexicon_entry_section"(root_entry_id);

CREATE INDEX idx_ales_root_norm
  ON "ar_ling_lexicon_entry_section"(root_norm);

CREATE INDEX idx_ales_source_root
  ON "ar_ling_lexicon_entry_section"(source_slug, root_norm);

CREATE INDEX idx_allee_collection
  ON "ar_ling_lexicon_entry_embedding"(collection_name);

CREATE INDEX idx_allee_hash
  ON "ar_ling_lexicon_entry_embedding"(embedding_text_hash);

CREATE INDEX idx_allee_model
  ON "ar_ling_lexicon_entry_embedding"(embedding_model);

CREATE INDEX idx_allee_status
  ON "ar_ling_lexicon_entry_embedding"(status);

CREATE INDEX idx_alqr_ayah
  ON "ar_ling_lexicon_quran_ref"(surah, ayah);

CREATE INDEX idx_alqr_block
  ON "ar_ling_lexicon_quran_ref"(block_id);

CREATE INDEX idx_alqr_root_entry
  ON "ar_ling_lexicon_quran_ref"(root_entry_id);

CREATE INDEX idx_alqr_root_norm
  ON "ar_ling_lexicon_quran_ref"(root_norm);

CREATE INDEX idx_alqr_source_ayah
  ON "ar_ling_lexicon_quran_ref"(source_slug, surah, ayah);

CREATE INDEX idx_alre_import_batch
  ON "ar_ling_lexicon_entry"(import_batch_id);

CREATE INDEX idx_alre_root_norm
  ON "ar_ling_lexicon_entry"(root_norm);

CREATE INDEX idx_alre_source_root
  ON "ar_ling_lexicon_entry"(source_slug, root_norm);

CREATE INDEX idx_alre_source_slug
  ON "ar_ling_lexicon_entry"(source_slug);

CREATE INDEX idx_alre_status
  ON "ar_ling_lexicon_entry"(status);

CREATE INDEX idx_alres_kind
  ON "ar_ling_lexicon_entry_source"(source_kind);

CREATE INDEX idx_alres_root_entry
  ON "ar_ling_lexicon_entry_source"(root_entry_id);

CREATE INDEX idx_alres_slug
  ON "ar_ling_lexicon_entry_source"(source_slug);

CREATE INDEX idx_alx_ayah       ON "ar_ling_root_lemma_tabir"(surah, ayah);

CREATE INDEX idx_alx_confidence ON "ar_ling_root_lemma_tabir"(confidence);

CREATE INDEX idx_alx_root       ON "ar_ling_root_lemma_tabir"(root_ar);

CREATE INDEX idx_alx_source     ON "ar_ling_root_lemma_tabir"(source_slug);

CREATE INDEX idx_alx_type       ON "ar_ling_root_lemma_tabir"(expression_type_id);

CREATE INDEX idx_aql_al_entity
  ON "ar_ling_root_lemma_word_quran_link"(al_entity_ref, al_entity_type);

CREATE INDEX idx_aql_al_type
  ON "ar_ling_root_lemma_word_quran_link"(al_entity_type);

CREATE INDEX idx_aql_link_type
  ON "ar_ling_root_lemma_word_quran_link"(link_type);

CREATE INDEX idx_aql_qr_scope
  ON "ar_ling_root_lemma_word_quran_link"(qr_scope_ref);

CREATE INDEX idx_ar_ling_sources_origin
  ON "ar_ling_source"(origin);

CREATE UNIQUE INDEX idx_ar_ling_sources_slug
  ON "ar_ling_source"(slug) WHERE slug IS NOT NULL;

CREATE INDEX idx_ar_ling_sources_source_order
  ON "ar_ling_source"(source_order) WHERE source_order IS NOT NULL;

CREATE INDEX idx_ar_rant_root ON "ar_ling_root_didd"(root_norm, sort_order);

CREATE INDEX idx_ar_root_antonyms_rid ON "ar_ling_root_didd"(root_id);

CREATE INDEX idx_ar_root_devstages_rid ON "ar_ling_root_tatawwur"(root_id);

CREATE INDEX idx_ar_root_fields_field ON "ar_ling_root_haql"(field_id);

CREATE INDEX idx_ar_root_fields_root ON "ar_ling_root_haql"(root_norm, is_primary);

CREATE INDEX idx_ar_root_rel_from ON "ar_ling_root_relation"(from_root_norm, relation_kind, sort_order);

CREATE INDEX idx_ar_root_rel_kind ON "ar_ling_root_relation"(relation_kind);

CREATE INDEX idx_ar_root_rel_to ON "ar_ling_root_relation"(to_root_norm, relation_kind);

CREATE INDEX idx_ar_root_sense_axes_rid ON "ar_ling_root_sense_axis"(root_id);

CREATE INDEX idx_ar_root_senses_core ON ar_ling_root_sense(root_norm, is_core);

CREATE INDEX idx_ar_root_senses_root ON ar_ling_root_sense(root_norm, sort_order);

CREATE INDEX idx_ar_root_senses_scope ON ar_ling_root_sense(scope_level, scope_key, sort_order);

CREATE INDEX idx_ar_vgov_root ON "ar_ling_root_lemma_tadiya"(root_norm, sort_order);

CREATE INDEX idx_arc_step_sense ON ar_ling_sense_arc_step(sense_id);

CREATE INDEX idx_arl_ct_paradigm ON "ar_ling_root_form_template"(paradigm_id);

CREATE INDEX idx_arl_ei_type ON "ar_ling_source_evidence"(evidence_type);

CREATE INDEX idx_arl_exp_lemma ON "ar_ling_root_lemma_tabir"(primary_lemma_id);

CREATE INDEX idx_arl_exp_type  ON "ar_ling_root_lemma_tabir"(expression_type_id);

CREATE INDEX idx_arl_fp_type ON "ar_ling_root_form_paradigm"(paradigm_type);

CREATE INDEX idx_arl_lem_bare ON "ar_ling_root_lemma"(lemma_text_bare);

CREATE INDEX idx_arl_lem_pos  ON "ar_ling_root_lemma"(part_of_speech);

CREATE INDEX idx_arl_lem_qrn  ON "ar_ling_root_lemma"(is_quran_word);

CREATE INDEX idx_arl_lem_qrn_live ON "ar_ling_root_lemma"(record_status, is_quran_word);

CREATE INDEX idx_arl_lem_root ON "ar_ling_root_lemma"(root_id);

CREATE INDEX idx_arl_lemrootlink_root ON "ar_ling_root_lemma_link"(root_id);

CREATE INDEX idx_arl_lexrootentry_root ON "ar_ling_lexicon_entry"(root_id);

CREATE INDEX idx_arl_lrl_lemma ON "ar_ling_root_lemma_link"(lemma_id);

CREATE INDEX idx_arl_lrl_root  ON "ar_ling_root_lemma_link"(root_id);

CREATE INDEX idx_arl_morph_pattern ON "ar_ling_root_lemma_sarf"(pattern);

CREATE INDEX idx_arl_nse_member_id     ON "ar_ling_root_lemma_furuq_evidence"(member_id);

CREATE INDEX idx_arl_nse_qr_ref        ON "ar_ling_root_lemma_furuq_evidence"(qr_ref);

CREATE INDEX idx_arl_nse_set_id        ON "ar_ling_root_lemma_furuq_evidence"(set_id);

CREATE INDEX idx_arl_nse_surah_ayah    ON "ar_ling_root_lemma_furuq_evidence"(surah, ayah);

CREATE INDEX idx_arl_nsm_arabic_bare   ON "ar_ling_root_lemma_furuq_member"(arabic_bare);

CREATE INDEX idx_arl_nsm_lemma ON "ar_ling_root_lemma_furuq_member"(lemma_id);

CREATE INDEX idx_arl_nsm_lemma_id      ON "ar_ling_root_lemma_furuq_member"(lemma_id);

CREATE INDEX idx_arl_nsm_set   ON "ar_ling_root_lemma_furuq_member"(set_id);

CREATE INDEX idx_arl_nsm_set_id        ON "ar_ling_root_lemma_furuq_member"(set_id);

CREATE INDEX idx_arl_nss_domain        ON "ar_ling_root_lemma_furuq_set"(semantic_domain_id);

CREATE INDEX idx_arl_nss_slug          ON "ar_ling_root_lemma_furuq_set"(slug);

CREATE INDEX idx_arl_ql_entity ON "ar_ling_root_lemma_word_quran_link"(al_entity_ref);

CREATE INDEX idx_arl_ql_qr     ON "ar_ling_root_lemma_word_quran_link"(qr_scope_ref);

CREATE INDEX idx_arl_root_freq ON "ar_ling_roots"(frequency_quran);

CREATE INDEX idx_arl_root_type ON "ar_ling_roots"(root_type);

CREATE INDEX idx_arl_rootschol_root ON ar_ling_root_scholarship(root_id);

CREATE INDEX idx_arl_rootvariants_root ON "ar_ling_root_lugha"(root_id);

CREATE INDEX idx_arl_rv_root ON "ar_ling_root_lugha"(root_id);

CREATE INDEX idx_arl_sc_embedded ON "ar_ling_source_chunk"(is_embedded);

CREATE INDEX idx_arl_sc_heading
  ON "ar_ling_source_chunk"(heading_norm);

CREATE INDEX idx_arl_sc_kind     ON "ar_ling_source_chunk"(chunk_kind);

CREATE INDEX idx_arl_sc_root_id
  ON "ar_ling_source_chunk"(root_id);

CREATE INDEX idx_arl_sc_root_source
  ON "ar_ling_source_chunk"(heading_norm, source_slug);

CREATE INDEX idx_arl_sc_slug
  ON "ar_ling_source_chunk"(source_slug);

CREATE INDEX idx_arl_sc_source   ON "ar_ling_source_chunk"(source_id);

CREATE INDEX idx_arl_sc_surah
  ON "ar_ling_source_chunk"(surah_no, ayah_start);

CREATE INDEX idx_arl_se_source ON "ar_ling_source_edition"(source_id);

CREATE INDEX idx_arl_ser_buck
  ON "ar_ling_source_entry_ref"(source_id, buck);

CREATE INDEX idx_arl_ser_chunk
  ON "ar_ling_source_entry_ref"(source_chunk_id);

CREATE INDEX idx_arl_ser_headword
  ON "ar_ling_source_entry_ref"(source_id, headword_ar);

CREATE INDEX idx_arl_ser_page
  ON "ar_ling_source_entry_ref"(source_id, page_no);

CREATE INDEX idx_arl_ser_source_node
  ON "ar_ling_source_entry_ref"(source_id, external_node_id);

CREATE INDEX idx_arl_src_type ON "ar_ling_source"(source_type);

CREATE INDEX idx_arl_toc_source ON ar_ling_source_toc(source_id);

CREATE INDEX idx_ext_toc_title ON ar_ling_gram_external_toc (source_slug, title_ar);

CREATE INDEX idx_gbab_book ON ar_ling_gram_bab(book_id, matn_order);

CREATE INDEX idx_gbab_disc ON ar_ling_gram_bab(discipline, source_slug, matn_order);

CREATE INDEX idx_gbab_parent ON ar_ling_gram_bab(parent_id);

CREATE INDEX idx_gpg_bab ON "ar_ling_gram_chunk"(bab_id);

CREATE INDEX idx_gpg_book ON "ar_ling_gram_chunk"(book_id, seq);

CREATE INDEX idx_gpg_disc ON "ar_ling_gram_chunk"(discipline, source_slug, seq);

CREATE INDEX idx_gram_alias_bare ON ar_ling_gram_term_alias(alias_bare);

CREATE INDEX idx_gram_bab_quran ON ar_ling_gram_bab (qr_surah, qr_ayah_from, qr_ayah_to);

CREATE INDEX idx_gram_chunk_term_term ON ar_ling_gram_chunk_term (term_id, state);

CREATE INDEX idx_gram_cite_ayah ON ar_ling_gram_chunk_citation (surah, ayah) WHERE state='resolved';

CREATE INDEX idx_gram_cite_chunk ON ar_ling_gram_chunk_citation (chunk_id, seq);

CREATE INDEX idx_gram_cite_source ON ar_ling_gram_chunk_citation (source_slug, state);

CREATE INDEX idx_gram_khilaf_source
    ON ar_ling_gram_khilaf (source_slug, masala_no);

CREATE INDEX idx_gram_term_name_bare ON ar_ling_gram_term(name_bare);

CREATE INDEX idx_ilal_bab ON "ar_ling_root_lemma_ilal"(bab_key);

CREATE INDEX idx_letters_illa ON "ar_ling_root_letter"(is_illa);

CREATE INDEX idx_letters_makhraj ON "ar_ling_root_letter"(makhraj_key, makhraj_order);

CREATE INDEX idx_memlets_lemma ON "ar_ling_learn_memlet"(lemma_ref);

CREATE INDEX idx_memlets_root  ON "ar_ling_learn_memlet"(root_id);

CREATE INDEX idx_paradigm_rt ON "ar_ling_root_form_paradigm"(root_type, weak_pattern);

CREATE INDEX idx_reg_tmap_cluster ON ar_ling_reg_table_map(cluster);

CREATE INDEX idx_reg_tmap_layer ON ar_ling_reg_table_map(layer_code, db);

CREATE INDEX idx_rfa_form ON "ar_ling_root_form_masmu"(verb_form);

CREATE INDEX idx_rfa_root ON "ar_ling_root_form_masmu"(root_norm);

CREATE INDEX idx_rfa_rootid ON "ar_ling_root_form_masmu"(root_id);

CREATE INDEX idx_rl_bw      ON "ar_ling_roots"(buckwalter);

CREATE INDEX idx_rl_norm    ON "ar_ling_roots"(root_normalized);

CREATE INDEX idx_rl_simple  ON "ar_ling_roots"(simple_lat);

CREATE INDEX idx_root_lexicon_key_lookup
  ON ar_ling_root_lexicon_key (lookup_norm);

CREATE INDEX idx_root_scholarship_kind      ON "ar_ling_root_scholarship"(reading_kind);

CREATE INDEX idx_root_scholarship_root_norm ON "ar_ling_root_scholarship"(root_norm);

CREATE INDEX idx_root_scholarship_slug_root ON "ar_ling_root_scholarship"(source_slug, root_norm);

CREATE INDEX idx_root_scholarship_source    ON "ar_ling_root_scholarship"(source_id);

CREATE INDEX idx_sense_arc_scope ON ar_ling_sense_arc(scope_level, scope_key);

CREATE INDEX idx_sense_arc_term ON ar_ling_sense_arc(terminal_sense_id);

CREATE INDEX idx_sense_att_source ON ar_ling_sense_attestation(source_slug);

CREATE INDEX idx_sense_att_target ON ar_ling_sense_attestation(target_type, target_id);

CREATE INDEX idx_sublayer_band ON ar_ling_reg_sub_layer(band, display_order);

CREATE INDEX idx_synbl_from ON "ar_ling_root_backlink"(from_table, from_row_id);

CREATE INDEX idx_synbl_root ON "ar_ling_root_backlink"(root_norm, display_code);

CREATE INDEX idx_synbl_to   ON "ar_ling_root_backlink"(to_kind, to_row_id);

CREATE INDEX idx_term_toc_best ON ar_ling_gram_term_toc (term_id, match_rank, source_rank);

CREATE INDEX idx_term_toc_disc ON ar_ling_gram_term_toc (discipline, term_id, match_rank);

CREATE INDEX idx_term_toc_source ON ar_ling_gram_term_toc (source_slug, term_id);

CREATE INDEX idx_ws_lemma ON "ar_ling_root_lemma_word_silsila"(lemma_ref);

CREATE INDEX idx_ws_root ON "ar_ling_root_lemma_word_silsila"(root_norm, bab_key);

CREATE INDEX idx_ws_stepof ON "ar_ling_root_lemma_word_silsila"(step_of, step_seq);

CREATE INDEX ix_adima_entry_ayah    ON ar_ling_adima_entry(surah, ayah);

CREATE INDEX ix_adima_entry_meaning ON ar_ling_adima_entry(meaning_term_id);

CREATE INDEX ix_adima_entry_pattern ON ar_ling_adima_entry(discipline, pattern_term_id);

CREATE INDEX ix_adima_entry_section ON ar_ling_adima_entry(discipline, chapter_ar, section_ar);

CREATE INDEX ix_adima_entry_term    ON ar_ling_adima_entry(section_term_id);

CREATE INDEX ix_adima_note_drill ON ar_ling_adima_note(discipline, chapter_ar) WHERE drill_ar IS NOT NULL;

CREATE INDEX ix_arc_edge_arc ON ar_ling_arc_edge(arc_id);

CREATE INDEX ix_arc_lemma ON ar_ling_lemma_arc(lemma_id);

CREATE INDEX ix_arc_lemma_combined ON ar_ling_arc_lemma_rung(combined_id);

CREATE INDEX ix_arc_lemma_root ON ar_ling_arc_lemma_rung(root_norm, lemma_ar);

CREATE INDEX ix_arc_root ON ar_ling_lemma_arc(root_norm, status);

CREATE INDEX ix_arc_rung_arc ON ar_ling_arc_rung(arc_id, seq);

CREATE INDEX ix_arc_rung_combined ON ar_ling_arc_rung(combined_id);

CREATE INDEX ix_arc_rung_root ON ar_ling_arc_rung(root_norm, source_slug);

CREATE INDEX ix_arc_word_root ON ar_ling_arc_word(root_norm, rung_id);

CREATE INDEX ix_arc_word_rung ON ar_ling_arc_word(rung_id);

CREATE INDEX ix_arc_word_src ON ar_ling_arc_word(src_rung_id);

CREATE INDEX ix_arcex_arc ON ar_ling_lemma_arc_example(arc_id, seq);

CREATE INDEX ix_arcex_qr ON ar_ling_lemma_arc_example(surah, ayah);

CREATE INDEX ix_asl_proposal_root ON ar_ling_root_asl_proposal(root_norm);

CREATE INDEX ix_cb_sense ON ar_ling_concept_block(sense_id);

CREATE INDEX ix_cb_term  ON ar_ling_concept_block(term_id, block_type, block_seq);

CREATE INDEX ix_cbl_from ON ar_ling_concept_block_link(from_block_id, link_kind);

CREATE INDEX ix_cbl_qr   ON ar_ling_concept_block_link(to_surah, to_ayah);

CREATE INDEX ix_ce_term ON ar_ling_concept_entry(term_id, source_slug);

CREATE INDEX ix_ceq_term ON ar_ling_concept_equivalent(term_id, tradition, sort_order);

CREATE INDEX ix_cg_disc  ON ar_ling_concept_group(discipline_key, group_kind, seq);

CREATE INDEX ix_cgm_term ON ar_ling_concept_group_member(term_id);

CREATE INDEX ix_cse_qr    ON ar_ling_concept_sense_example(qr_surah, qr_ayah);

CREATE INDEX ix_cse_sense ON ar_ling_concept_sense_example(sense_id, sort_order);

CREATE INDEX ix_cxl_from ON ar_ling_concept_external_link(from_uid, to_db, to_kind);

CREATE INDEX ix_cxl_ref  ON ar_ling_concept_external_link(from_ref);

CREATE INDEX ix_cxl_to   ON ar_ling_concept_external_link(to_uid);

CREATE INDEX ix_ext_bab_book ON ar_ling_gram_ext_bab(book_id);

CREATE INDEX ix_ilal_apply_lemma ON ar_ling_root_lemma_ilal_apply(lemma_id);

CREATE INDEX ix_ilal_apply_root ON ar_ling_root_lemma_ilal_apply(root_norm);

CREATE INDEX ix_ilal_apply_rule ON ar_ling_root_lemma_ilal_apply(rule_id);

CREATE INDEX ix_lex_block_entry
  ON ar_ling_lexicon_block(root_entry_id, block_seq);

CREATE INDEX ix_lex_block_link_ayah
  ON ar_ling_lexicon_block_link(to_surah, to_ayah)
  WHERE to_surah IS NOT NULL;

CREATE INDEX ix_lex_block_link_from
  ON ar_ling_lexicon_block_link(from_block_id, link_kind);

CREATE INDEX ix_lex_block_link_root
  ON ar_ling_lexicon_block_link(to_root_norm)
  WHERE to_root_norm IS NOT NULL;

CREATE INDEX ix_lex_block_link_to
  ON ar_ling_lexicon_block_link(to_block_id, link_kind)
  WHERE to_block_id IS NOT NULL;

CREATE INDEX ix_lex_block_parent
  ON ar_ling_lexicon_block(parent_block_id)
  WHERE parent_block_id IS NOT NULL;

CREATE INDEX ix_lex_block_type
  ON ar_ling_lexicon_block(root_norm, block_type);

CREATE INDEX ix_lex_entry_ds_root
  ON ar_ling_lexicon_entry_ds(root_norm, source_slug);

CREATE INDEX ix_lex_entry_ds_template
  ON ar_ling_lexicon_entry_ds(template_key, status);

CREATE INDEX ix_lex_fact_ayah ON ar_ling_lexicon_fact(surah, ayah) WHERE surah IS NOT NULL;

CREATE INDEX ix_lex_fact_block ON ar_ling_lexicon_fact(block_id);

CREATE INDEX ix_lex_fact_kind_source ON ar_ling_lexicon_fact(fact_kind, source_slug, confidence);

CREATE INDEX ix_lex_fact_root_kind ON ar_ling_lexicon_fact(root_norm, fact_kind);

CREATE INDEX ix_lex_fact_root_kind_src ON ar_ling_lexicon_fact(root_norm, fact_kind, source_slug, confidence);

CREATE INDEX ix_lex_profile_family ON ar_ling_lexicon_profile(family, share);

CREATE INDEX ix_lexicon_display_profile_order
  ON ar_ling_lexicon_display_profile (display_order);

CREATE INDEX ix_lexicon_display_rule_slug_key
  ON ar_ling_lexicon_display_rule (source_slug, rule_key, seq);

CREATE INDEX ix_lexicon_display_section_kind
  ON ar_ling_lexicon_display_section (kind_code);

CREATE INDEX ix_lexicon_display_section_slug_seq
  ON ar_ling_lexicon_display_section (source_slug, seq);

CREATE INDEX ix_rlf_sub ON "ar_ling_root_layer_fill_dep_20260815"(sub_code, n);

CREATE INDEX ix_root_asl_death   ON ar_ling_root_asl(root_norm, death_hijri);

CREATE INDEX ix_root_asl_primary ON ar_ling_root_asl(root_norm, is_primary);

CREATE INDEX ix_root_asl_root    ON ar_ling_root_asl(root_norm);

CREATE INDEX ix_root_letter_slot_letter ON ar_ling_root_letter_slot (letter_ar, slot_role);

CREATE INDEX ix_root_letter_slot_root  ON ar_ling_root_letter_slot (root_norm, slot_index);

CREATE INDEX ix_root_naw_sawti_agree ON ar_ling_root_naw_sawti (agrees_with_legacy);

CREATE INDEX ix_root_naw_sawti_cat   ON ar_ling_root_naw_sawti (category, soundness);

CREATE INDEX ix_root_taqalib_group ON ar_ling_root_taqalib (group_key, perm_index);

CREATE INDEX ix_root_taqalib_perm  ON ar_ling_root_taqalib (permutation);

CREATE INDEX ix_root_taqalib_used  ON ar_ling_root_taqalib (is_used, family_size);

CREATE INDEX ix_roots_canonical ON ar_ling_roots(canonical_id);

CREATE INDEX ix_roots_normalized ON ar_ling_roots(root_normalized);

CREATE INDEX ix_sense_attest_block
  ON ar_ling_sense_attestation(block_id, target_type)
  WHERE block_id IS NOT NULL;

CREATE INDEX ix_sense_attest_form
  ON ar_ling_sense_attestation(source_slug, form_id)
  WHERE form_id IS NOT NULL;

CREATE INDEX ix_sense_attest_target
  ON ar_ling_sense_attestation(target_type, target_id, status);

CREATE UNIQUE INDEX ux_ar_ling_roots_root_normalized ON ar_ling_roots(root_normalized);

CREATE UNIQUE INDEX ux_cb_entry_path ON ar_ling_concept_block(concept_entry_id, block_path) WHERE concept_entry_id IS NOT NULL;

CREATE UNIQUE INDEX ux_gram_term_uid ON ar_ling_gram_term(uid);

CREATE UNIQUE INDEX ux_morph_flags ON "ar_ling_root_lemma_sarf"(qac_flags, pos);

CREATE UNIQUE INDEX ux_roots_norm ON "ar_ling_roots"(root_normalized);


-- ── Triggers (421) ───────────────────────────────────────────────

CREATE TRIGGER trg_gram_term_del AFTER DELETE ON ar_ling_gram_term BEGIN
  INSERT INTO ar_ling_gram_term_outbox (op,term_id,payload) VALUES ('delete', OLD.id, json_object('id',OLD.id));
END;

CREATE TRIGGER trg_gram_term_ins AFTER INSERT ON ar_ling_gram_term BEGIN
  INSERT INTO ar_ling_gram_term_outbox (op,term_id,payload) VALUES ('insert', NEW.id,
    json_object('id',NEW.id,'uid',NEW.uid,'category_key',NEW.category_key,'term_key',NEW.term_key,'parent_term_id',NEW.parent_term_id,'name_ar',NEW.name_ar,'name_en',NEW.name_en,'name_ur',NEW.name_ur,'discipline',NEW.discipline,'term_order',NEW.term_order,'status',NEW.status));
END;

CREATE TRIGGER trg_gram_term_upd AFTER UPDATE ON ar_ling_gram_term BEGIN
  INSERT INTO ar_ling_gram_term_outbox (op,term_id,payload) VALUES ('update', NEW.id,
    json_object('id',NEW.id,'uid',NEW.uid,'category_key',NEW.category_key,'term_key',NEW.term_key,'parent_term_id',NEW.parent_term_id,'name_ar',NEW.name_ar,'name_en',NEW.name_en,'name_ur',NEW.name_ur,'discipline',NEW.discipline,'term_order',NEW.term_order,'status',NEW.status,'old_id',OLD.id));
END;

CREATE TRIGGER trg_kcv_ar_ling_concept_block_d AFTER DELETE ON ar_ling_concept_block BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_block_i AFTER INSERT ON ar_ling_concept_block BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_block_link_d AFTER DELETE ON ar_ling_concept_block_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_block_link_i AFTER INSERT ON ar_ling_concept_block_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_block_link_u AFTER UPDATE ON ar_ling_concept_block_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_block_u AFTER UPDATE ON ar_ling_concept_block BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_entry_d AFTER DELETE ON ar_ling_concept_entry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_entry_i AFTER INSERT ON ar_ling_concept_entry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_entry_u AFTER UPDATE ON ar_ling_concept_entry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_equivalent_d AFTER DELETE ON ar_ling_concept_equivalent BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_equivalent_i AFTER INSERT ON ar_ling_concept_equivalent BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_equivalent_u AFTER UPDATE ON ar_ling_concept_equivalent BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_external_link_d AFTER DELETE ON ar_ling_concept_external_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_external_link_i AFTER INSERT ON ar_ling_concept_external_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_external_link_u AFTER UPDATE ON ar_ling_concept_external_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_group_d AFTER DELETE ON ar_ling_concept_group BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_group_i AFTER INSERT ON ar_ling_concept_group BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_group_member_d AFTER DELETE ON ar_ling_concept_group_member BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_group_member_i AFTER INSERT ON ar_ling_concept_group_member BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_group_member_u AFTER UPDATE ON ar_ling_concept_group_member BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_group_u AFTER UPDATE ON ar_ling_concept_group BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_section_d AFTER DELETE ON ar_ling_concept_section BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_section_i AFTER INSERT ON ar_ling_concept_section BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_section_u AFTER UPDATE ON ar_ling_concept_section BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_sense_d AFTER DELETE ON ar_ling_concept_sense BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_sense_example_d AFTER DELETE ON ar_ling_concept_sense_example BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_sense_example_i AFTER INSERT ON ar_ling_concept_sense_example BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_sense_example_u AFTER UPDATE ON ar_ling_concept_sense_example BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_sense_i AFTER INSERT ON ar_ling_concept_sense BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_sense_u AFTER UPDATE ON ar_ling_concept_sense BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_synthesis_d AFTER DELETE ON ar_ling_concept_synthesis BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_synthesis_i AFTER INSERT ON ar_ling_concept_synthesis BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_concept_synthesis_u AFTER UPDATE ON ar_ling_concept_synthesis BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_bab_d AFTER DELETE ON ar_ling_gram_bab BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_bab_i AFTER INSERT ON ar_ling_gram_bab BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_bab_u AFTER UPDATE ON ar_ling_gram_bab BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_category_d AFTER DELETE ON ar_ling_gram_category BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_category_i AFTER INSERT ON ar_ling_gram_category BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_category_u AFTER UPDATE ON ar_ling_gram_category BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_chunk_citation_d AFTER DELETE ON ar_ling_gram_chunk_citation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_chunk_citation_i AFTER INSERT ON ar_ling_gram_chunk_citation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_chunk_citation_u AFTER UPDATE ON ar_ling_gram_chunk_citation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_chunk_d AFTER DELETE ON ar_ling_gram_chunk BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_chunk_i AFTER INSERT ON ar_ling_gram_chunk BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_chunk_term_d AFTER DELETE ON ar_ling_gram_chunk_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_chunk_term_i AFTER INSERT ON ar_ling_gram_chunk_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_chunk_term_u AFTER UPDATE ON ar_ling_gram_chunk_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_chunk_u AFTER UPDATE ON ar_ling_gram_chunk BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_ext_bab_d AFTER DELETE ON ar_ling_gram_ext_bab BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_ext_bab_i AFTER INSERT ON ar_ling_gram_ext_bab BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_ext_bab_u AFTER UPDATE ON ar_ling_gram_ext_bab BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_ext_book_d AFTER DELETE ON ar_ling_gram_ext_book BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_ext_book_i AFTER INSERT ON ar_ling_gram_ext_book BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_ext_book_u AFTER UPDATE ON ar_ling_gram_ext_book BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_external_toc_d AFTER DELETE ON ar_ling_gram_external_toc BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_external_toc_i AFTER INSERT ON ar_ling_gram_external_toc BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_external_toc_u AFTER UPDATE ON ar_ling_gram_external_toc BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_khilaf_d AFTER DELETE ON ar_ling_gram_khilaf BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_khilaf_i AFTER INSERT ON ar_ling_gram_khilaf BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_khilaf_u AFTER UPDATE ON ar_ling_gram_khilaf BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_source_toc_rank_d AFTER DELETE ON ar_ling_gram_source_toc_rank BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_source_toc_rank_i AFTER INSERT ON ar_ling_gram_source_toc_rank BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_source_toc_rank_u AFTER UPDATE ON ar_ling_gram_source_toc_rank BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_alias_d AFTER DELETE ON ar_ling_gram_term_alias BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_alias_i AFTER INSERT ON ar_ling_gram_term_alias BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_alias_u AFTER UPDATE ON ar_ling_gram_term_alias BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_d AFTER DELETE ON ar_ling_gram_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_example_d AFTER DELETE ON ar_ling_gram_term_example BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_example_i AFTER INSERT ON ar_ling_gram_term_example BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_example_u AFTER UPDATE ON ar_ling_gram_term_example BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_i AFTER INSERT ON ar_ling_gram_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_relation_d AFTER DELETE ON ar_ling_gram_term_relation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_relation_i AFTER INSERT ON ar_ling_gram_term_relation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_relation_u AFTER UPDATE ON ar_ling_gram_term_relation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_rule_d AFTER DELETE ON ar_ling_gram_term_rule BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_rule_i AFTER INSERT ON ar_ling_gram_term_rule BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_rule_u AFTER UPDATE ON ar_ling_gram_term_rule BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_source_d AFTER DELETE ON ar_ling_gram_term_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_source_i AFTER INSERT ON ar_ling_gram_term_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_source_u AFTER UPDATE ON ar_ling_gram_term_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_toc_d AFTER DELETE ON ar_ling_gram_term_toc BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_toc_i AFTER INSERT ON ar_ling_gram_term_toc BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_toc_u AFTER UPDATE ON ar_ling_gram_term_toc BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_u AFTER UPDATE ON ar_ling_gram_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_example_d AFTER DELETE ON ar_ling_learn_example BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_example_i AFTER INSERT ON ar_ling_learn_example BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_example_u AFTER UPDATE ON ar_ling_learn_example BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_lemma_d AFTER DELETE ON ar_ling_learn_lemma BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_lemma_i AFTER INSERT ON ar_ling_learn_lemma BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_lemma_u AFTER UPDATE ON ar_ling_learn_lemma BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_memlet_d AFTER DELETE ON ar_ling_learn_memlet BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_memlet_i AFTER INSERT ON ar_ling_learn_memlet BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_memlet_kind_d AFTER DELETE ON ar_ling_learn_memlet_kind BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_memlet_kind_i AFTER INSERT ON ar_ling_learn_memlet_kind BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_memlet_kind_u AFTER UPDATE ON ar_ling_learn_memlet_kind BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_memlet_media_d AFTER DELETE ON ar_ling_learn_memlet_media BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_memlet_media_i AFTER INSERT ON ar_ling_learn_memlet_media BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_memlet_media_u AFTER UPDATE ON ar_ling_learn_memlet_media BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_memlet_u AFTER UPDATE ON ar_ling_learn_memlet BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_memory_hook_d AFTER DELETE ON ar_ling_learn_memory_hook BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_memory_hook_i AFTER INSERT ON ar_ling_learn_memory_hook BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_memory_hook_u AFTER UPDATE ON ar_ling_learn_memory_hook BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_question_d AFTER DELETE ON ar_ling_learn_question BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_question_distractor_d AFTER DELETE ON ar_ling_learn_question_distractor BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_question_distractor_i AFTER INSERT ON ar_ling_learn_question_distractor BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_question_distractor_u AFTER UPDATE ON ar_ling_learn_question_distractor BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_question_i AFTER INSERT ON ar_ling_learn_question BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_question_kind_d AFTER DELETE ON ar_ling_learn_question_kind BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_question_kind_i AFTER INSERT ON ar_ling_learn_question_kind BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_question_kind_u AFTER UPDATE ON ar_ling_learn_question_kind BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_question_u AFTER UPDATE ON ar_ling_learn_question BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_vocab_d AFTER DELETE ON ar_ling_learn_vocab BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_vocab_i AFTER INSERT ON ar_ling_learn_vocab BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_learn_vocab_u AFTER UPDATE ON ar_ling_learn_vocab BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_lemma_arc_d AFTER DELETE ON ar_ling_lemma_arc BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_lemma_arc_example_d AFTER DELETE ON ar_ling_lemma_arc_example BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_lemma_arc_example_i AFTER INSERT ON ar_ling_lemma_arc_example BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_lemma_arc_example_u AFTER UPDATE ON ar_ling_lemma_arc_example BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_lemma_arc_i AFTER INSERT ON ar_ling_lemma_arc BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_lemma_arc_u AFTER UPDATE ON ar_ling_lemma_arc BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_block_annotation_d AFTER DELETE ON ar_ling_lexicon_block_annotation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_block_annotation_i AFTER INSERT ON ar_ling_lexicon_block_annotation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_block_annotation_u AFTER UPDATE ON ar_ling_lexicon_block_annotation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_block_d AFTER DELETE ON ar_ling_lexicon_block BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_block_i AFTER INSERT ON ar_ling_lexicon_block BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_block_link_d AFTER DELETE ON ar_ling_lexicon_block_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_block_link_i AFTER INSERT ON ar_ling_lexicon_block_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_block_link_u AFTER UPDATE ON ar_ling_lexicon_block_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_block_tag_d AFTER DELETE ON ar_ling_lexicon_block_tag BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_block_tag_i AFTER INSERT ON ar_ling_lexicon_block_tag BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_block_tag_u AFTER UPDATE ON ar_ling_lexicon_block_tag BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_block_u AFTER UPDATE ON ar_ling_lexicon_block BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_book_page_d AFTER DELETE ON ar_ling_lexicon_book_page BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_book_page_i AFTER INSERT ON ar_ling_lexicon_book_page BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_book_page_u AFTER UPDATE ON ar_ling_lexicon_book_page BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_display_block_kind_d AFTER DELETE ON ar_ling_lexicon_display_block_kind BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_display_block_kind_i AFTER INSERT ON ar_ling_lexicon_display_block_kind BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_display_block_kind_u AFTER UPDATE ON ar_ling_lexicon_display_block_kind BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_display_profile_d AFTER DELETE ON ar_ling_lexicon_display_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_display_profile_i AFTER INSERT ON ar_ling_lexicon_display_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_display_profile_u AFTER UPDATE ON ar_ling_lexicon_display_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_display_rule_d AFTER DELETE ON ar_ling_lexicon_display_rule BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_display_rule_i AFTER INSERT ON ar_ling_lexicon_display_rule BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_display_rule_u AFTER UPDATE ON ar_ling_lexicon_display_rule BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_display_section_d AFTER DELETE ON ar_ling_lexicon_display_section BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_display_section_i AFTER INSERT ON ar_ling_lexicon_display_section BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_display_section_u AFTER UPDATE ON ar_ling_lexicon_display_section BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_entry_d AFTER DELETE ON ar_ling_lexicon_entry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_entry_ds_d AFTER DELETE ON ar_ling_lexicon_entry_ds BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_entry_ds_i AFTER INSERT ON ar_ling_lexicon_entry_ds BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_entry_ds_u AFTER UPDATE ON ar_ling_lexicon_entry_ds BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_entry_embedding_d AFTER DELETE ON ar_ling_lexicon_entry_embedding BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_entry_embedding_i AFTER INSERT ON ar_ling_lexicon_entry_embedding BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_entry_embedding_u AFTER UPDATE ON ar_ling_lexicon_entry_embedding BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_entry_i AFTER INSERT ON ar_ling_lexicon_entry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_entry_section_d AFTER DELETE ON ar_ling_lexicon_entry_section BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_entry_section_i AFTER INSERT ON ar_ling_lexicon_entry_section BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_entry_section_u AFTER UPDATE ON ar_ling_lexicon_entry_section BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_entry_source_d AFTER DELETE ON ar_ling_lexicon_entry_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_entry_source_i AFTER INSERT ON ar_ling_lexicon_entry_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_entry_source_u AFTER UPDATE ON ar_ling_lexicon_entry_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_entry_u AFTER UPDATE ON ar_ling_lexicon_entry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_quran_ref_d AFTER DELETE ON ar_ling_lexicon_quran_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_quran_ref_i AFTER INSERT ON ar_ling_lexicon_quran_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_lexicon_quran_ref_u AFTER UPDATE ON ar_ling_lexicon_quran_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_band_color_d AFTER DELETE ON ar_ling_reg_band_color BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_band_color_i AFTER INSERT ON ar_ling_reg_band_color BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_band_color_u AFTER UPDATE ON ar_ling_reg_band_color BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_band_fill_rule_d AFTER DELETE ON ar_ling_reg_band_fill_rule BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_band_fill_rule_i AFTER INSERT ON ar_ling_reg_band_fill_rule BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_band_fill_rule_u AFTER UPDATE ON ar_ling_reg_band_fill_rule BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_build_layer_d AFTER DELETE ON ar_ling_reg_build_layer BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_build_layer_i AFTER INSERT ON ar_ling_reg_build_layer BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_build_layer_u AFTER UPDATE ON ar_ling_reg_build_layer BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_conformance_check_d AFTER DELETE ON ar_ling_reg_conformance_check BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_conformance_check_i AFTER INSERT ON ar_ling_reg_conformance_check BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_conformance_check_u AFTER UPDATE ON ar_ling_reg_conformance_check BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_decision_d AFTER DELETE ON ar_ling_reg_decision BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_decision_i AFTER INSERT ON ar_ling_reg_decision BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_decision_u AFTER UPDATE ON ar_ling_reg_decision BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_discipline_d AFTER DELETE ON ar_ling_reg_discipline BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_discipline_i AFTER INSERT ON ar_ling_reg_discipline BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_discipline_u AFTER UPDATE ON ar_ling_reg_discipline BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_display_token_d AFTER DELETE ON ar_ling_reg_display_token BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_display_token_i AFTER INSERT ON ar_ling_reg_display_token BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_display_token_u AFTER UPDATE ON ar_ling_reg_display_token BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_heading_style_d AFTER DELETE ON ar_ling_reg_heading_style BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_heading_style_i AFTER INSERT ON ar_ling_reg_heading_style BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_heading_style_u AFTER UPDATE ON ar_ling_reg_heading_style BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_notice_kind_d AFTER DELETE ON ar_ling_reg_notice_kind BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_notice_kind_i AFTER INSERT ON ar_ling_reg_notice_kind BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_notice_kind_u AFTER UPDATE ON ar_ling_reg_notice_kind BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_ref_namespace_d AFTER DELETE ON ar_ling_reg_ref_namespace BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_ref_namespace_i AFTER INSERT ON ar_ling_reg_ref_namespace BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_ref_namespace_u AFTER UPDATE ON ar_ling_reg_ref_namespace BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_root_key_d AFTER DELETE ON ar_ling_reg_root_key BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_root_key_i AFTER INSERT ON ar_ling_reg_root_key BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_root_key_u AFTER UPDATE ON ar_ling_reg_root_key BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_semantic_field_d AFTER DELETE ON ar_ling_reg_semantic_field BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_semantic_field_i AFTER INSERT ON ar_ling_reg_semantic_field BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_semantic_field_u AFTER UPDATE ON ar_ling_reg_semantic_field BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_source_alias_d AFTER DELETE ON ar_ling_reg_source_alias BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_source_alias_i AFTER INSERT ON ar_ling_reg_source_alias BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_source_alias_u AFTER UPDATE ON ar_ling_reg_source_alias BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_sub_layer_d AFTER DELETE ON ar_ling_reg_sub_layer BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_sub_layer_i AFTER INSERT ON ar_ling_reg_sub_layer BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_sub_layer_u AFTER UPDATE ON ar_ling_reg_sub_layer BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_surah_d AFTER DELETE ON ar_ling_reg_surah BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_surah_i AFTER INSERT ON ar_ling_reg_surah BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_surah_u AFTER UPDATE ON ar_ling_reg_surah BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_table_discipline_d AFTER DELETE ON ar_ling_reg_table_discipline BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_table_discipline_i AFTER INSERT ON ar_ling_reg_table_discipline BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_table_discipline_u AFTER UPDATE ON ar_ling_reg_table_discipline BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_table_map_d AFTER DELETE ON ar_ling_reg_table_map BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_table_map_i AFTER INSERT ON ar_ling_reg_table_map BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_table_map_u AFTER UPDATE ON ar_ling_reg_table_map BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_term_role_d AFTER DELETE ON ar_ling_reg_term_role BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_term_role_i AFTER INSERT ON ar_ling_reg_term_role BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_reg_term_role_u AFTER UPDATE ON ar_ling_reg_term_role BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_asl_d AFTER DELETE ON ar_ling_root_asl BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_asl_i AFTER INSERT ON ar_ling_root_asl BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_asl_u AFTER UPDATE ON ar_ling_root_asl BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_backlink_d AFTER DELETE ON ar_ling_root_backlink BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_backlink_i AFTER INSERT ON ar_ling_root_backlink BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_backlink_u AFTER UPDATE ON ar_ling_root_backlink BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_band_fill_d AFTER DELETE ON ar_ling_root_band_fill BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_band_fill_i AFTER INSERT ON ar_ling_root_band_fill BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_band_fill_u AFTER UPDATE ON ar_ling_root_band_fill BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_didd_d AFTER DELETE ON ar_ling_root_didd BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_didd_i AFTER INSERT ON ar_ling_root_didd BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_didd_u AFTER UPDATE ON ar_ling_root_didd BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_display_d AFTER DELETE ON ar_ling_root_display BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_display_i AFTER INSERT ON ar_ling_root_display BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_display_u AFTER UPDATE ON ar_ling_root_display BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_dna_d AFTER DELETE ON ar_ling_root_dna BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_dna_i AFTER INSERT ON ar_ling_root_dna BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_dna_u AFTER UPDATE ON ar_ling_root_dna BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_form_family_d AFTER DELETE ON ar_ling_root_form_family BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_form_family_i AFTER INSERT ON ar_ling_root_form_family BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_form_family_u AFTER UPDATE ON ar_ling_root_form_family BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_form_masmu_d AFTER DELETE ON ar_ling_root_form_masmu BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_form_masmu_i AFTER INSERT ON ar_ling_root_form_masmu BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_form_masmu_u AFTER UPDATE ON ar_ling_root_form_masmu BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_form_paradigm_d AFTER DELETE ON ar_ling_root_form_paradigm BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_form_paradigm_i AFTER INSERT ON ar_ling_root_form_paradigm BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_form_paradigm_u AFTER UPDATE ON ar_ling_root_form_paradigm BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_form_template_d AFTER DELETE ON ar_ling_root_form_template BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_form_template_i AFTER INSERT ON ar_ling_root_form_template BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_form_template_u AFTER UPDATE ON ar_ling_root_form_template BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_form_tier_d AFTER DELETE ON ar_ling_root_form_tier BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_form_tier_i AFTER INSERT ON ar_ling_root_form_tier BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_form_tier_u AFTER UPDATE ON ar_ling_root_form_tier BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_haql_d AFTER DELETE ON ar_ling_root_haql BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_haql_i AFTER INSERT ON ar_ling_root_haql BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_haql_u AFTER UPDATE ON ar_ling_root_haql BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_d AFTER DELETE ON ar_ling_root_lemma BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_form_map_d AFTER DELETE ON ar_ling_root_lemma_form_map BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_form_map_i AFTER INSERT ON ar_ling_root_lemma_form_map BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_form_map_u AFTER UPDATE ON ar_ling_root_lemma_form_map BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_furuq_evidence_d AFTER DELETE ON ar_ling_root_lemma_furuq_evidence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_furuq_evidence_i AFTER INSERT ON ar_ling_root_lemma_furuq_evidence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_furuq_evidence_u AFTER UPDATE ON ar_ling_root_lemma_furuq_evidence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_furuq_member_d AFTER DELETE ON ar_ling_root_lemma_furuq_member BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_furuq_member_i AFTER INSERT ON ar_ling_root_lemma_furuq_member BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_furuq_member_src_d AFTER DELETE ON ar_ling_root_lemma_furuq_member_src BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_furuq_member_src_i AFTER INSERT ON ar_ling_root_lemma_furuq_member_src BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_furuq_member_src_u AFTER UPDATE ON ar_ling_root_lemma_furuq_member_src BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_furuq_member_u AFTER UPDATE ON ar_ling_root_lemma_furuq_member BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_furuq_set_d AFTER DELETE ON ar_ling_root_lemma_furuq_set BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_furuq_set_i AFTER INSERT ON ar_ling_root_lemma_furuq_set BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_furuq_set_src_d AFTER DELETE ON ar_ling_root_lemma_furuq_set_src BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_furuq_set_src_i AFTER INSERT ON ar_ling_root_lemma_furuq_set_src BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_furuq_set_src_u AFTER UPDATE ON ar_ling_root_lemma_furuq_set_src BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_furuq_set_u AFTER UPDATE ON ar_ling_root_lemma_furuq_set BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_i AFTER INSERT ON ar_ling_root_lemma BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_ilal_apply_d AFTER DELETE ON ar_ling_root_lemma_ilal_apply BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_ilal_apply_i AFTER INSERT ON ar_ling_root_lemma_ilal_apply BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_ilal_apply_u AFTER UPDATE ON ar_ling_root_lemma_ilal_apply BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_ilal_d AFTER DELETE ON ar_ling_root_lemma_ilal BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_ilal_i AFTER INSERT ON ar_ling_root_lemma_ilal BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_ilal_u AFTER UPDATE ON ar_ling_root_lemma_ilal BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_link_d AFTER DELETE ON ar_ling_root_lemma_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_link_i AFTER INSERT ON ar_ling_root_lemma_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_link_u AFTER UPDATE ON ar_ling_root_lemma_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_sarf_d AFTER DELETE ON ar_ling_root_lemma_sarf BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_sarf_i AFTER INSERT ON ar_ling_root_lemma_sarf BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_sarf_u AFTER UPDATE ON ar_ling_root_lemma_sarf BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_tabir_d AFTER DELETE ON ar_ling_root_lemma_tabir BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_tabir_i AFTER INSERT ON ar_ling_root_lemma_tabir BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_tabir_kind_d AFTER DELETE ON ar_ling_root_lemma_tabir_kind BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_tabir_kind_i AFTER INSERT ON ar_ling_root_lemma_tabir_kind BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_tabir_kind_u AFTER UPDATE ON ar_ling_root_lemma_tabir_kind BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_tabir_u AFTER UPDATE ON ar_ling_root_lemma_tabir BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_tadiya_d AFTER DELETE ON ar_ling_root_lemma_tadiya BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_tadiya_i AFTER INSERT ON ar_ling_root_lemma_tadiya BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_tadiya_u AFTER UPDATE ON ar_ling_root_lemma_tadiya BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_taswib_d AFTER DELETE ON ar_ling_root_lemma_taswib BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_taswib_i AFTER INSERT ON ar_ling_root_lemma_taswib BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_taswib_u AFTER UPDATE ON ar_ling_root_lemma_taswib BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_u AFTER UPDATE ON ar_ling_root_lemma BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_wazn_d AFTER DELETE ON ar_ling_root_lemma_wazn BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_wazn_detect_d AFTER DELETE ON ar_ling_root_lemma_wazn_detect BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_wazn_detect_i AFTER INSERT ON ar_ling_root_lemma_wazn_detect BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_wazn_detect_u AFTER UPDATE ON ar_ling_root_lemma_wazn_detect BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_wazn_i AFTER INSERT ON ar_ling_root_lemma_wazn BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_wazn_u AFTER UPDATE ON ar_ling_root_lemma_wazn BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_word_quran_link_d AFTER DELETE ON ar_ling_root_lemma_word_quran_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_word_quran_link_i AFTER INSERT ON ar_ling_root_lemma_word_quran_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_word_quran_link_u AFTER UPDATE ON ar_ling_root_lemma_word_quran_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_word_silsila_d AFTER DELETE ON ar_ling_root_lemma_word_silsila BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_word_silsila_i AFTER INSERT ON ar_ling_root_lemma_word_silsila BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lemma_word_silsila_u AFTER UPDATE ON ar_ling_root_lemma_word_silsila BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_letter_d AFTER DELETE ON ar_ling_root_letter BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_letter_i AFTER INSERT ON ar_ling_root_letter BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_letter_slot_d AFTER DELETE ON ar_ling_root_letter_slot BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_letter_slot_i AFTER INSERT ON ar_ling_root_letter_slot BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_letter_slot_u AFTER UPDATE ON ar_ling_root_letter_slot BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_letter_u AFTER UPDATE ON ar_ling_root_letter BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lexicon_alias_d AFTER DELETE ON ar_ling_root_lexicon_alias BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lexicon_alias_i AFTER INSERT ON ar_ling_root_lexicon_alias BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lexicon_alias_u AFTER UPDATE ON ar_ling_root_lexicon_alias BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lexicon_key_d AFTER DELETE ON ar_ling_root_lexicon_key BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lexicon_key_i AFTER INSERT ON ar_ling_root_lexicon_key BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lexicon_key_u AFTER UPDATE ON ar_ling_root_lexicon_key BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lugha_d AFTER DELETE ON ar_ling_root_lugha BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lugha_i AFTER INSERT ON ar_ling_root_lugha BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_lugha_u AFTER UPDATE ON ar_ling_root_lugha BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_naw_sawti_d AFTER DELETE ON ar_ling_root_naw_sawti BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_naw_sawti_i AFTER INSERT ON ar_ling_root_naw_sawti BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_naw_sawti_u AFTER UPDATE ON ar_ling_root_naw_sawti BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_page_index_d AFTER DELETE ON ar_ling_root_page_index BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_page_index_i AFTER INSERT ON ar_ling_root_page_index BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_page_index_u AFTER UPDATE ON ar_ling_root_page_index BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_relation_d AFTER DELETE ON ar_ling_root_relation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_relation_i AFTER INSERT ON ar_ling_root_relation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_relation_u AFTER UPDATE ON ar_ling_root_relation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_sarf_form_index_d AFTER DELETE ON ar_ling_root_sarf_form_index BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_sarf_form_index_i AFTER INSERT ON ar_ling_root_sarf_form_index BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_sarf_form_index_u AFTER UPDATE ON ar_ling_root_sarf_form_index BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_scholarship_d AFTER DELETE ON ar_ling_root_scholarship BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_scholarship_i AFTER INSERT ON ar_ling_root_scholarship BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_scholarship_u AFTER UPDATE ON ar_ling_root_scholarship BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_sense_axis_d AFTER DELETE ON ar_ling_root_sense_axis BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_sense_axis_i AFTER INSERT ON ar_ling_root_sense_axis BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_sense_axis_u AFTER UPDATE ON ar_ling_root_sense_axis BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_sense_d AFTER DELETE ON ar_ling_root_sense BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_sense_i AFTER INSERT ON ar_ling_root_sense BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_sense_u AFTER UPDATE ON ar_ling_root_sense BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_taqalib_d AFTER DELETE ON ar_ling_root_taqalib BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_taqalib_i AFTER INSERT ON ar_ling_root_taqalib BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_taqalib_u AFTER UPDATE ON ar_ling_root_taqalib BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_tatawwur_d AFTER DELETE ON ar_ling_root_tatawwur BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_tatawwur_i AFTER INSERT ON ar_ling_root_tatawwur BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_root_tatawwur_u AFTER UPDATE ON ar_ling_root_tatawwur BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_roots_d AFTER DELETE ON ar_ling_roots BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_roots_i AFTER INSERT ON ar_ling_roots BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_roots_u AFTER UPDATE ON ar_ling_roots BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_sarf_wazn_d AFTER DELETE ON ar_ling_sarf_wazn BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_sarf_wazn_i AFTER INSERT ON ar_ling_sarf_wazn BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_sarf_wazn_rule_d AFTER DELETE ON ar_ling_sarf_wazn_rule BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_sarf_wazn_rule_i AFTER INSERT ON ar_ling_sarf_wazn_rule BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_sarf_wazn_rule_u AFTER UPDATE ON ar_ling_sarf_wazn_rule BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_sarf_wazn_u AFTER UPDATE ON ar_ling_sarf_wazn BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_sense_arc_d AFTER DELETE ON ar_ling_sense_arc BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_sense_arc_i AFTER INSERT ON ar_ling_sense_arc BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_sense_arc_step_d AFTER DELETE ON ar_ling_sense_arc_step BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_sense_arc_step_i AFTER INSERT ON ar_ling_sense_arc_step BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_sense_arc_step_u AFTER UPDATE ON ar_ling_sense_arc_step BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_sense_arc_u AFTER UPDATE ON ar_ling_sense_arc BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_sense_attestation_d AFTER DELETE ON ar_ling_sense_attestation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_sense_attestation_i AFTER INSERT ON ar_ling_sense_attestation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_sense_attestation_u AFTER UPDATE ON ar_ling_sense_attestation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_alias_d AFTER DELETE ON ar_ling_source_alias BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_alias_i AFTER INSERT ON ar_ling_source_alias BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_alias_u AFTER UPDATE ON ar_ling_source_alias BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_chunk_d AFTER DELETE ON ar_ling_source_chunk BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_chunk_i AFTER INSERT ON ar_ling_source_chunk BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_chunk_u AFTER UPDATE ON ar_ling_source_chunk BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_citation_d AFTER DELETE ON ar_ling_source_citation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_citation_i AFTER INSERT ON ar_ling_source_citation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_citation_u AFTER UPDATE ON ar_ling_source_citation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_d AFTER DELETE ON ar_ling_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_edition_d AFTER DELETE ON ar_ling_source_edition BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_edition_i AFTER INSERT ON ar_ling_source_edition BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_edition_u AFTER UPDATE ON ar_ling_source_edition BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_entry_ref_d AFTER DELETE ON ar_ling_source_entry_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_entry_ref_i AFTER INSERT ON ar_ling_source_entry_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_entry_ref_u AFTER UPDATE ON ar_ling_source_entry_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_evidence_d AFTER DELETE ON ar_ling_source_evidence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_evidence_i AFTER INSERT ON ar_ling_source_evidence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_evidence_u AFTER UPDATE ON ar_ling_source_evidence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_i AFTER INSERT ON ar_ling_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_toc_d AFTER DELETE ON ar_ling_source_toc BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_toc_i AFTER INSERT ON ar_ling_source_toc BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_toc_u AFTER UPDATE ON ar_ling_source_toc BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_source_u AFTER UPDATE ON ar_ling_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_ar_ling_src_code_d AFTER DELETE ON ar_ling_src_code BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_src_code_i AFTER INSERT ON ar_ling_src_code BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_src_code_u AFTER UPDATE ON ar_ling_src_code BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_term_dictionary_d AFTER DELETE ON ar_ling_term_dictionary BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_term_dictionary_i AFTER INSERT ON ar_ling_term_dictionary BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_term_dictionary_u AFTER UPDATE ON ar_ling_term_dictionary BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_root_lemma_no_typed_prefix
BEFORE INSERT ON ar_ling_root_lemma
FOR EACH ROW WHEN NEW.id LIKE 'AL:%'
BEGIN
  SELECT RAISE(ABORT, 'ar_ling_root_lemma.id must be bare - the AL: prefix belongs at the reference site (qr_lemma.lx_lemma_ref), not in the primary key');
END;

CREATE TRIGGER trig_albk_fts_ad AFTER DELETE ON ar_ling_lexicon_block BEGIN
  INSERT INTO ar_ling_lexicon_block_fts(ar_ling_lexicon_block_fts, rowid, text_plain, title_ar, title_en, root_norm, source_slug, block_type)
  VALUES ('delete', old.rowid, COALESCE(old.text_plain,''), COALESCE(old.title_ar,''), COALESCE(old.title_en,''), old.root_norm, old.source_slug, old.block_type);
END;

CREATE TRIGGER trig_albk_fts_ai AFTER INSERT ON ar_ling_lexicon_block BEGIN
  INSERT INTO ar_ling_lexicon_block_fts(rowid, text_plain, title_ar, title_en, root_norm, source_slug, block_type)
  VALUES (new.rowid, COALESCE(new.text_plain,''), COALESCE(new.title_ar,''), COALESCE(new.title_en,''), new.root_norm, new.source_slug, new.block_type);
END;

CREATE TRIGGER trig_albk_fts_au AFTER UPDATE ON ar_ling_lexicon_block BEGIN
  INSERT INTO ar_ling_lexicon_block_fts(ar_ling_lexicon_block_fts, rowid, text_plain, title_ar, title_en, root_norm, source_slug, block_type)
  VALUES ('delete', old.rowid, COALESCE(old.text_plain,''), COALESCE(old.title_ar,''), COALESCE(old.title_en,''), old.root_norm, old.source_slug, old.block_type);
  INSERT INTO ar_ling_lexicon_block_fts(rowid, text_plain, title_ar, title_en, root_norm, source_slug, block_type)
  VALUES (new.rowid, COALESCE(new.text_plain,''), COALESCE(new.title_ar,''), COALESCE(new.title_en,''), new.root_norm, new.source_slug, new.block_type);
END;

CREATE TRIGGER trig_albp_fts_ad AFTER DELETE ON ar_ling_lexicon_book_page BEGIN
  INSERT INTO ar_ling_lexicon_book_page_fts(ar_ling_lexicon_book_page_fts, rowid, clean_text, source_slug, root_norm)
  VALUES ('delete', old.rowid, COALESCE(old.clean_text,''), old.source_slug, old.root_norm);
END;

CREATE TRIGGER trig_albp_fts_ai AFTER INSERT ON ar_ling_lexicon_book_page BEGIN
  INSERT INTO ar_ling_lexicon_book_page_fts(rowid, clean_text, source_slug, root_norm)
  VALUES (new.rowid, COALESCE(new.clean_text,''), new.source_slug, new.root_norm);
END;

CREATE TRIGGER trig_albp_fts_au AFTER UPDATE ON ar_ling_lexicon_book_page BEGIN
  INSERT INTO ar_ling_lexicon_book_page_fts(ar_ling_lexicon_book_page_fts, rowid, clean_text, source_slug, root_norm)
  VALUES ('delete', old.rowid, COALESCE(old.clean_text,''), old.source_slug, old.root_norm);
  INSERT INTO ar_ling_lexicon_book_page_fts(rowid, clean_text, source_slug, root_norm)
  VALUES (new.rowid, COALESCE(new.clean_text,''), new.source_slug, new.root_norm);
END;

CREATE TRIGGER trig_ales_fts_ad AFTER DELETE ON ar_ling_lexicon_entry_section BEGIN INSERT INTO ar_ling_lexicon_entry_section_fts( ar_ling_lexicon_entry_section_fts, rowid, root_text, root_norm, heading_ar, heading_norm, heading_bare, section_type, text_ar, text_en ) VALUES ( 'delete', old.rowid, old.root_text, old.root_norm, COALESCE(old.heading_ar, ''), COALESCE(old.heading_norm, ''), COALESCE(old.heading_bare, ''), COALESCE(old.section_type, ''), COALESCE(old.text_ar, ''), COALESCE(old.text_en, '') ); END;

CREATE TRIGGER trig_ales_fts_ai AFTER INSERT ON ar_ling_lexicon_entry_section BEGIN INSERT INTO ar_ling_lexicon_entry_section_fts( rowid, root_text, root_norm, heading_ar, heading_norm, heading_bare, section_type, text_ar, text_en ) VALUES ( new.rowid, new.root_text, new.root_norm, COALESCE(new.heading_ar, ''), COALESCE(new.heading_norm, ''), COALESCE(new.heading_bare, ''), COALESCE(new.section_type, ''), COALESCE(new.text_ar, ''), COALESCE(new.text_en, '') ); END;

CREATE TRIGGER trig_ales_fts_au AFTER UPDATE ON ar_ling_lexicon_entry_section BEGIN INSERT INTO ar_ling_lexicon_entry_section_fts( ar_ling_lexicon_entry_section_fts, rowid, root_text, root_norm, heading_ar, heading_norm, heading_bare, section_type, text_ar, text_en ) VALUES ( 'delete', old.rowid, old.root_text, old.root_norm, COALESCE(old.heading_ar, ''), COALESCE(old.heading_norm, ''), COALESCE(old.heading_bare, ''), COALESCE(old.section_type, ''), COALESCE(old.text_ar, ''), COALESCE(old.text_en, '') ); INSERT INTO ar_ling_lexicon_entry_section_fts( rowid, root_text, root_norm, heading_ar, heading_norm, heading_bare, section_type, text_ar, text_en ) VALUES ( new.rowid, new.root_text, new.root_norm, COALESCE(new.heading_ar, ''), COALESCE(new.heading_norm, ''), COALESCE(new.heading_bare, ''), COALESCE(new.section_type, ''), COALESCE(new.text_ar, ''), COALESCE(new.text_en, '') ); END;

CREATE TRIGGER trig_alre_fts_ad AFTER DELETE ON ar_ling_lexicon_entry BEGIN INSERT INTO ar_ling_lexicon_entry_fts( ar_ling_lexicon_entry_fts, rowid, root_text, root_norm, source_slug, entry_text_ar, entry_text_en, raw_text ) VALUES ( 'delete', old.rowid, old.root_text, old.root_norm, old.source_slug, COALESCE(old.entry_text_ar, ''), COALESCE(old.entry_text_en, ''), COALESCE(old.raw_text, '') ); END;

CREATE TRIGGER trig_alre_fts_ai AFTER INSERT ON ar_ling_lexicon_entry BEGIN INSERT INTO ar_ling_lexicon_entry_fts( rowid, root_text, root_norm, source_slug, entry_text_ar, entry_text_en, raw_text ) VALUES ( new.rowid, new.root_text, new.root_norm, new.source_slug, COALESCE(new.entry_text_ar, ''), COALESCE(new.entry_text_en, ''), COALESCE(new.raw_text, '') ); END;

CREATE TRIGGER trig_alre_fts_au AFTER UPDATE ON ar_ling_lexicon_entry BEGIN INSERT INTO ar_ling_lexicon_entry_fts( ar_ling_lexicon_entry_fts, rowid, root_text, root_norm, source_slug, entry_text_ar, entry_text_en, raw_text ) VALUES ( 'delete', old.rowid, old.root_text, old.root_norm, old.source_slug, COALESCE(old.entry_text_ar, ''), COALESCE(old.entry_text_en, ''), COALESCE(old.raw_text, '') ); INSERT INTO ar_ling_lexicon_entry_fts( rowid, root_text, root_norm, source_slug, entry_text_ar, entry_text_en, raw_text ) VALUES ( new.rowid, new.root_text, new.root_norm, new.source_slug, COALESCE(new.entry_text_ar, ''), COALESCE(new.entry_text_en, ''), COALESCE(new.raw_text, '') ); END;

CREATE TRIGGER trig_alsc_fts_ad AFTER DELETE ON ar_ling_source_chunk BEGIN INSERT INTO ar_ling_source_chunks_fts(ar_ling_source_chunks_fts, rowid, heading_norm, text_ar, text_en) VALUES ('delete', old.rowid, COALESCE(old.heading_norm,''), COALESCE(old.text_ar,''), COALESCE(old.text_en,'')); END;

CREATE TRIGGER trig_alsc_fts_ai AFTER INSERT ON ar_ling_source_chunk BEGIN INSERT INTO ar_ling_source_chunks_fts(rowid, heading_norm, text_ar, text_en) VALUES (new.rowid, COALESCE(new.heading_norm,''), COALESCE(new.text_ar,''), COALESCE(new.text_en,'')); END;

CREATE TRIGGER trig_alsc_fts_au AFTER UPDATE ON ar_ling_source_chunk BEGIN INSERT INTO ar_ling_source_chunks_fts(ar_ling_source_chunks_fts, rowid, heading_norm, text_ar, text_en) VALUES ('delete', old.rowid, COALESCE(old.heading_norm,''), COALESCE(old.text_ar,''), COALESCE(old.text_en,'')); INSERT INTO ar_ling_source_chunks_fts(rowid, heading_norm, text_ar, text_en) VALUES (new.rowid, COALESCE(new.heading_norm,''), COALESCE(new.text_ar,''), COALESCE(new.text_en,'')); END;
