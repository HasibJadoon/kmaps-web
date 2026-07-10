-- Schema for km_arabic_linguistic.
-- Generated from remote Cloudflare D1 sqlite_schema with data excluded.
-- Internal D1 bookkeeping tables and FTS5 shadow tables are omitted.

CREATE TABLE ar_ling_arabic_links (
  id              TEXT PRIMARY KEY,
  al_entity_ref   TEXT NOT NULL,
  al_entity_type  TEXT NOT NULL,
  ar_entity_ref   TEXT NOT NULL,
  ar_entity_type  TEXT NOT NULL,
  link_type       TEXT NOT NULL DEFAULT 'referenced_by',
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_balagha_branches (
  id              TEXT PRIMARY KEY,
  branch_key      TEXT NOT NULL UNIQUE,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  description_md  TEXT
);

CREATE TABLE ar_ling_balagha_concepts (
  id              TEXT PRIMARY KEY,
  parent_id       TEXT,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  branch          TEXT NOT NULL,
  concept_type    TEXT NOT NULL DEFAULT 'device',
  definition_ar   TEXT,
  definition_en   TEXT,
  effect_md       TEXT,
  discipline_unit_id TEXT,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES ar_ling_balagha_concepts(id)
);

CREATE VIRTUAL TABLE ar_ling_balagha_concepts_fts USING fts5(name_ar, name_en, definition_ar, definition_en);

CREATE TABLE ar_ling_balagha_examples (
  id              TEXT PRIMARY KEY,
  balagha_id      TEXT NOT NULL,
  example_ar      TEXT NOT NULL,
  example_en      TEXT,
  source_type     TEXT NOT NULL DEFAULT 'quran',
  qr_ref          TEXT,
  source_ref      TEXT,
  analysis_md     TEXT,
  note_md         TEXT,
  FOREIGN KEY (balagha_id) REFERENCES ar_ling_balagha_concepts(id)
);





CREATE TABLE ar_ling_conjugation_templates (
  id              TEXT PRIMARY KEY,
  paradigm_id     TEXT NOT NULL,
  person          TEXT NOT NULL,
  tense           TEXT NOT NULL,
  voice           TEXT NOT NULL DEFAULT 'active',
  template_form   TEXT NOT NULL,
  note_md         TEXT,
  -- Re-keying columns (master doc Gate 5, D6): templates should key on the
  -- (verb_form, root_type, weak_pattern) triple, not on a single root.
  verb_form       TEXT,
  root_type       TEXT,
  weak_pattern    TEXT,
  FOREIGN KEY (paradigm_id) REFERENCES ar_ling_form_paradigms(id)
);

CREATE TABLE ar_ling_content_links (
  id              TEXT PRIMARY KEY,
  al_entity_ref   TEXT NOT NULL,
  al_entity_type  TEXT NOT NULL,
  cm_entity_ref   TEXT NOT NULL,
  cm_entity_type  TEXT NOT NULL,
  link_type       TEXT NOT NULL DEFAULT 'cited_in',
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_discipline_containers (
  id              TEXT PRIMARY KEY,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  parent_id       TEXT,
  discipline      TEXT NOT NULL,
  description_md  TEXT,
  FOREIGN KEY (parent_id) REFERENCES ar_ling_discipline_containers(id)
);

CREATE TABLE ar_ling_discipline_relations (
  id              TEXT PRIMARY KEY,
  from_unit_id    TEXT NOT NULL,
  to_unit_id      TEXT NOT NULL,
  relation_type   TEXT NOT NULL,
  note_md         TEXT,
  FOREIGN KEY (from_unit_id) REFERENCES ar_ling_discipline_units(id),
  FOREIGN KEY (to_unit_id)   REFERENCES ar_ling_discipline_units(id)
);

CREATE TABLE ar_ling_discipline_units (
  id              TEXT PRIMARY KEY,
  container_id    TEXT NOT NULL,
  parent_unit_id  TEXT,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  unit_type       TEXT NOT NULL DEFAULT 'concept',
  description_md  TEXT,
  seq             INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (container_id)    REFERENCES ar_ling_discipline_containers(id),
  FOREIGN KEY (parent_unit_id)  REFERENCES ar_ling_discipline_units(id)
);

CREATE TABLE ar_ling_evidence_items (
  id              TEXT PRIMARY KEY,
  evidence_type   TEXT NOT NULL,
  text_ar         TEXT NOT NULL,
  text_en         TEXT,
  qr_ref          TEXT,
  source_ref      TEXT,
  locator_json    TEXT,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE ar_ling_evidence_items_fts USING fts5(text_ar, text_en, note_md);

CREATE TABLE ar_ling_expression_tokens (
  id              TEXT PRIMARY KEY,
  expression_id   TEXT NOT NULL,
  token_position  INTEGER NOT NULL,
  token_text      TEXT NOT NULL,
  lemma_id        TEXT,
  note_md         TEXT,
  FOREIGN KEY (expression_id) REFERENCES ar_ling_expressions(id),
  FOREIGN KEY (lemma_id)      REFERENCES ar_ling_lemmas(id)
);

CREATE TABLE ar_ling_expression_types (
  id              TEXT PRIMARY KEY,
  type_key        TEXT NOT NULL UNIQUE,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  description_md  TEXT
);

CREATE TABLE ar_ling_expressions (
  id              TEXT PRIMARY KEY,
  expression_ar   TEXT NOT NULL,
  expression_en   TEXT NOT NULL,
  expression_type_id TEXT,
  primary_lemma_id TEXT,
  explanation_md  TEXT,
  qr_refs_json    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (expression_type_id) REFERENCES ar_ling_expression_types(id),
  FOREIGN KEY (primary_lemma_id)   REFERENCES ar_ling_lemmas(id)
);

CREATE VIRTUAL TABLE ar_ling_expressions_fts USING fts5(expression_ar, expression_en, explanation_md);

CREATE TABLE ar_ling_form_paradigms (
  id              TEXT PRIMARY KEY,
  paradigm_name   TEXT NOT NULL,
  paradigm_type   TEXT NOT NULL,
  verb_form       TEXT,
  root_type       TEXT,
  paradigm_json   TEXT NOT NULL,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_inflection_rules (
  id              TEXT PRIMARY KEY,
  rule_name       TEXT NOT NULL,
  rule_type       TEXT NOT NULL,
  applies_to      TEXT NOT NULL,
  rule_description_md TEXT NOT NULL,
  example_before  TEXT,
  example_after   TEXT,
  note_md         TEXT
);

CREATE TABLE ar_ling_lemma_morphology (
  id              TEXT PRIMARY KEY,
  lemma_id        TEXT NOT NULL,
  morphology_id   TEXT NOT NULL,
  inflected_form  TEXT,
  UNIQUE (lemma_id, morphology_id),
  FOREIGN KEY (lemma_id)      REFERENCES ar_ling_lemmas(id),
  FOREIGN KEY (morphology_id) REFERENCES ar_ling_morphology(id)
);

CREATE TABLE ar_ling_lemma_registers (
  id              TEXT PRIMARY KEY,
  lemma_id        TEXT NOT NULL,
  register        TEXT NOT NULL,
  frequency_note  TEXT,
  FOREIGN KEY (lemma_id) REFERENCES ar_ling_lemmas(id)
);

CREATE TABLE ar_ling_lemma_root_links (
  id              TEXT PRIMARY KEY,
  lemma_id        TEXT NOT NULL,
  root_id         TEXT NOT NULL,
  link_type       TEXT NOT NULL DEFAULT 'primary',
  note_md         TEXT,
  UNIQUE (lemma_id, root_id),
  FOREIGN KEY (lemma_id) REFERENCES ar_ling_lemmas(id),
  FOREIGN KEY (root_id)  REFERENCES ar_ling_roots(id)
);

CREATE TABLE ar_ling_lemma_variants (
  id              TEXT PRIMARY KEY,
  lemma_id        TEXT NOT NULL,
  variant_text    TEXT NOT NULL,
  variant_type    TEXT NOT NULL DEFAULT 'alternate',
  note_md         TEXT,
  FOREIGN KEY (lemma_id) REFERENCES ar_ling_lemmas(id)
);

CREATE TABLE ar_ling_lemmas (
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
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (root_id) REFERENCES ar_ling_roots(id)
);

CREATE VIRTUAL TABLE ar_ling_lemmas_fts USING fts5(lemma_text, lemma_text_bare);

CREATE TABLE ar_ling_lexicon_entries (
  id              TEXT PRIMARY KEY,
  lemma_id        TEXT NOT NULL,
  entry_text      TEXT NOT NULL,
  definition_ar   TEXT,
  definition_en   TEXT NOT NULL,
  definition_source TEXT,
  usage_register  TEXT NOT NULL DEFAULT 'classical',
  root_id         TEXT,
  source_id       TEXT,
  source_slug     TEXT,
  source_chunk_id TEXT,
  entry_kind      TEXT,
  heading_norm    TEXT,
  source_entry_seq INTEGER,
  page_no         INTEGER,
  volume_no       INTEGER,
  tokens_approx   INTEGER,
  title_ar        TEXT,
  title_en        TEXT,
  display_heading_ar TEXT,
  display_heading_en TEXT,
  heading_key     TEXT,
  lemma_text      TEXT,
  root_text       TEXT,
  transliteration TEXT,
  pos_tag         TEXT,
  gloss_ar        TEXT,
  gloss_en        TEXT,
  summary_ar      TEXT,
  summary_en      TEXT,
  source_url      TEXT,
  is_embedded     INTEGER NOT NULL DEFAULT 0,
  qdrant_id       TEXT,
  embed_model     TEXT,
  meta_json       JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  semantic_field  TEXT,
  related_lemmas  JSON CHECK (related_lemmas IS NULL OR json_valid(related_lemmas)),
  sense_json      JSON CHECK (sense_json IS NULL OR json_valid(sense_json)),
  morphology_json JSON CHECK (morphology_json IS NULL OR json_valid(morphology_json)),
  examples_json   JSON CHECK (examples_json IS NULL OR json_valid(examples_json)),
  citations_json  JSON CHECK (citations_json IS NULL OR json_valid(citations_json)),
  ui_json         JSON CHECK (ui_json IS NULL OR json_valid(ui_json)),
  ai_json         JSON CHECK (ai_json IS NULL OR json_valid(ai_json)),
  cleaner_json    JSON CHECK (cleaner_json IS NULL OR json_valid(cleaner_json)),
  status          TEXT NOT NULL DEFAULT 'raw_promoted',
  quality_score   REAL,
  ai_fill_state   TEXT NOT NULL DEFAULT 'pending',
  ai_model        TEXT,
  ai_filled_at    TEXT,
  reviewed_at     TEXT,
  sort_key        TEXT,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lemma_id) REFERENCES ar_ling_lemmas(id),
  FOREIGN KEY (root_id) REFERENCES ar_ling_roots(id),
  FOREIGN KEY (source_id) REFERENCES ar_ling_sources(id),
  FOREIGN KEY (source_chunk_id) REFERENCES ar_ling_source_chunks(id)
);

CREATE VIRTUAL TABLE ar_ling_lexicon_entries_fts USING fts5(
  entry_text,
  heading_norm,
  title_ar,
  title_en,
  display_heading_ar,
  display_heading_en,
  gloss_ar,
  gloss_en,
  summary_ar,
  summary_en,
  definition_ar,
  definition_en,
  definition_source,
  source_slug,
  content='ar_ling_lexicon_entries',
  content_rowid='rowid'
);

CREATE TABLE ar_ling_lexicon_evidence (
  id              TEXT PRIMARY KEY,
  lexicon_entry_id TEXT NOT NULL,
  sense_id        TEXT,
  evidence_type   TEXT NOT NULL DEFAULT 'quran',
  text_ar         TEXT NOT NULL,
  text_en         TEXT,
  qr_ref          TEXT,
  source_ref      TEXT,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id),
  FOREIGN KEY (sense_id)         REFERENCES ar_ling_senses(id)
);

CREATE VIRTUAL TABLE ar_ling_lexicon_evidence_fts USING fts5(text_ar, text_en, note_md);

CREATE TABLE ar_ling_lexicon_morphology (
  id              TEXT PRIMARY KEY,
  lexicon_entry_id TEXT NOT NULL,
  morphology_id   TEXT NOT NULL,
  inflected_form  TEXT,
  UNIQUE (lexicon_entry_id, morphology_id),
  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id),
  FOREIGN KEY (morphology_id)    REFERENCES ar_ling_morphology(id)
);

CREATE TABLE ar_ling_morphology (
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
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  -- Added after split (master doc Gate 3). A morphology row is a BUNDLE: one row
  -- per distinct QAC parse, shared by every lemma that parses that way
  -- (مُبِين / مُنذِر / مُرْسِلِين all share ACT|MP|ACC|PCPL|(IV)). 963 bundles live.
  verb_form       TEXT,   -- I..XII / quadriliteral
  root_type       TEXT,   -- sound | ajwaf_ya | naqis_w …
  qac_flags       TEXT,   -- natural key: sort(flags) ∥ 'MOOD:'+features.MOOD (D33)
  pos             TEXT,
  mood            TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_morph_flags ON ar_ling_morphology(qac_flags, pos);

CREATE TABLE ar_ling_nahw_concepts (
  id              TEXT PRIMARY KEY,
  parent_id       TEXT,
  concept_name_ar TEXT NOT NULL,
  concept_name_en TEXT NOT NULL,
  concept_type    TEXT NOT NULL DEFAULT 'rule',
  definition_ar   TEXT,
  definition_en   TEXT,
  example_ar      TEXT,
  irab_label      TEXT,
  discipline_unit_id TEXT,
  source_ref      TEXT,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES ar_ling_nahw_concepts(id)
);

-- Core i'rab labels are seeded from seeds/ar_ling/nahw_irab_core_seed.sql.

CREATE VIRTUAL TABLE ar_ling_nahw_concepts_fts USING fts5(concept_name_ar, concept_name_en, definition_ar, definition_en);

CREATE TABLE ar_ling_nahw_relations (
  id              TEXT PRIMARY KEY,
  from_concept_id TEXT NOT NULL,
  to_concept_id   TEXT NOT NULL,
  relation_type   TEXT NOT NULL,
  note_md         TEXT,
  FOREIGN KEY (from_concept_id) REFERENCES ar_ling_nahw_concepts(id),
  FOREIGN KEY (to_concept_id)   REFERENCES ar_ling_nahw_concepts(id)
);

CREATE TABLE ar_ling_near_synonym_sets (
  id                TEXT PRIMARY KEY,
  set_name          TEXT NOT NULL,
  description_md    TEXT NOT NULL,
  slug              TEXT,
  canonical_en      TEXT,
  canonical_ar      TEXT,
  canonical_ur      TEXT,
  semantic_domain_id TEXT,
  pos_hint          TEXT DEFAULT 'mixed',
  short_summary     TEXT,
  source_status     TEXT DEFAULT 'manual',
  confidence        TEXT DEFAULT 'needs_review',
  review_status     TEXT DEFAULT 'draft',
  updated_at        TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_near_synonym_members (
  id                  TEXT PRIMARY KEY,
  set_id              TEXT NOT NULL,
  lemma_id            TEXT NOT NULL,
  nuance_note         TEXT NOT NULL,
  arabic_display      TEXT,
  arabic_bare         TEXT,
  basic_gloss         TEXT,
  basic_gloss_ur      TEXT,
  contrast_note       TEXT,
  contrast_note_ur    TEXT,
  usage_rule          TEXT,
  usage_rule_ur       TEXT,
  quran_usage_pattern TEXT,
  quran_usage_pattern_ur TEXT,
  nuance_note_ur      TEXT,
  source_status       TEXT DEFAULT 'manual',
  claim_basis         TEXT DEFAULT 'direct_source',
  confidence          TEXT DEFAULT 'needs_review',
  sort_order          INTEGER DEFAULT 0,
  UNIQUE (set_id, lemma_id),
  FOREIGN KEY (set_id)   REFERENCES ar_ling_near_synonym_sets(id),
  FOREIGN KEY (lemma_id) REFERENCES ar_ling_lemmas(id)
);

CREATE TABLE ar_ling_near_synonym_set_sources (
  id          TEXT PRIMARY KEY,
  set_id      TEXT NOT NULL,
  source_id   TEXT NOT NULL,
  chunk_id    TEXT,
  source_role TEXT NOT NULL DEFAULT 'evidence',
  source_path TEXT,
  source_url  TEXT,
  note_md     TEXT,
  confidence  TEXT NOT NULL DEFAULT 'needs_review',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (set_id, source_id, chunk_id)
);

CREATE TABLE ar_ling_near_synonym_member_sources (
  id          TEXT PRIMARY KEY,
  member_id   TEXT NOT NULL,
  source_id   TEXT NOT NULL,
  chunk_id    TEXT,
  claim_type  TEXT NOT NULL DEFAULT 'nuance',
  claim_text  TEXT NOT NULL,
  claim_basis TEXT NOT NULL DEFAULT 'direct_source',
  confidence  TEXT NOT NULL DEFAULT 'needs_review',
  note_md     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_near_synonym_evidence (
  id                  TEXT PRIMARY KEY,
  set_id              TEXT NOT NULL,
  member_id           TEXT,
  lemma_id            TEXT,
  qr_ref              TEXT NOT NULL,
  surah               INTEGER NOT NULL,
  ayah                INTEGER NOT NULL,
  word_index          INTEGER,
  word_occurrence_ref TEXT,
  arabic_quote        TEXT,
  translation_quote   TEXT,
  explanation_md      TEXT,
  evidence_type       TEXT NOT NULL DEFAULT 'source_ref',
  source_id           TEXT,
  chunk_id            TEXT,
  confidence          TEXT NOT NULL DEFAULT 'needs_review',
  validation_status   TEXT NOT NULL DEFAULT 'pending',
  note_md             TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_near_synonym_review_queue (
  id           TEXT PRIMARY KEY,
  set_id       TEXT,
  member_id    TEXT,
  evidence_id  TEXT,
  issue_type   TEXT NOT NULL,
  issue_detail TEXT NOT NULL,
  source_id    TEXT,
  chunk_id     TEXT,
  status       TEXT NOT NULL DEFAULT 'open',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT
);



CREATE TABLE ar_ling_projection_cache (
  id              TEXT PRIMARY KEY,
  cache_key       TEXT NOT NULL UNIQUE,
  cache_type      TEXT NOT NULL,
  payload_json    TEXT NOT NULL,
  source_refs     TEXT,
  expires_at      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_quran_links (
  id              TEXT PRIMARY KEY,
  al_entity_ref   TEXT NOT NULL,
  al_entity_type  TEXT NOT NULL,
  qr_scope_ref    TEXT NOT NULL,
  link_type       TEXT NOT NULL DEFAULT 'attests',
  note_md         TEXT,
  confidence      REAL NOT NULL DEFAULT 1.0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_rhetorical_relations (
  id              TEXT PRIMARY KEY,
  from_concept_id TEXT NOT NULL,
  to_concept_id   TEXT NOT NULL,
  relation_type   TEXT NOT NULL,
  note_md         TEXT,
  FOREIGN KEY (from_concept_id) REFERENCES ar_ling_balagha_concepts(id),
  FOREIGN KEY (to_concept_id)   REFERENCES ar_ling_balagha_concepts(id)
);

CREATE TABLE ar_ling_root_relations (
  id              TEXT PRIMARY KEY,
  from_root_id    TEXT NOT NULL,
  to_root_id      TEXT NOT NULL,
  relation_type   TEXT NOT NULL,
  evidence_ref    TEXT,
  note_md         TEXT,
  UNIQUE (from_root_id, to_root_id, relation_type),
  FOREIGN KEY (from_root_id) REFERENCES ar_ling_roots(id),
  FOREIGN KEY (to_root_id)   REFERENCES ar_ling_roots(id)
);

CREATE TABLE ar_ling_root_semantic_fields (
  id              TEXT PRIMARY KEY,
  root_id         TEXT NOT NULL,
  field_name      TEXT NOT NULL,
  is_primary      INTEGER NOT NULL DEFAULT 0,
  note_md         TEXT,
  FOREIGN KEY (root_id) REFERENCES ar_ling_roots(id)
);

CREATE TABLE ar_ling_root_variants (
  id              TEXT PRIMARY KEY,
  root_id         TEXT NOT NULL,
  variant_text    TEXT NOT NULL,
  variant_type    TEXT NOT NULL DEFAULT 'alternate',
  note_md         TEXT,
  FOREIGN KEY (root_id) REFERENCES ar_ling_roots(id)
);

CREATE TABLE ar_ling_roots (
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
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  -- Added after split. root_normalized is the join key used everywhere
  -- (verb_government, word_sums, root_dna). D31 fixed: 563 NULLs backfilled and
  -- 186 ALR:NS:% duplicates merged; a UNIQUE index now guards it.
  buckwalter       TEXT,
  simple_lat       TEXT,
  root_normalized  TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_roots_norm ON ar_ling_roots(root_normalized);

CREATE VIRTUAL TABLE ar_ling_roots_fts USING fts5(root_text, meaning_core_en, meaning_core_ar);

CREATE TABLE ar_ling_semantic_fields (
  id              TEXT PRIMARY KEY,
  field_name_ar   TEXT NOT NULL,
  field_name_en   TEXT NOT NULL UNIQUE,
  parent_field_id TEXT,
  description_md  TEXT,
  FOREIGN KEY (parent_field_id) REFERENCES ar_ling_semantic_fields(id)
);

CREATE TABLE ar_ling_sense_relations (
  id              TEXT PRIMARY KEY,
  from_sense_id   TEXT NOT NULL,
  to_sense_id     TEXT NOT NULL,
  relation_type   TEXT NOT NULL,
  nuance_note     TEXT,
  FOREIGN KEY (from_sense_id) REFERENCES ar_ling_senses(id),
  FOREIGN KEY (to_sense_id)   REFERENCES ar_ling_senses(id)
);

CREATE TABLE ar_ling_senses (
  id              TEXT PRIMARY KEY,
  lexicon_entry_id TEXT NOT NULL,
  sense_number    INTEGER NOT NULL,
  gloss_ar        TEXT,
  gloss_en        TEXT NOT NULL,
  context_note    TEXT,
  qr_ref          TEXT,
  note_md         TEXT,
  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id)
);

CREATE TABLE ar_ling_sentence_types (
  id              TEXT PRIMARY KEY,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  sentence_class  TEXT NOT NULL,
  description_md  TEXT
);

CREATE TABLE ar_ling_sentences (
  id              TEXT PRIMARY KEY,
  source_ref      TEXT NOT NULL,
  sentence_text   TEXT NOT NULL,
  sentence_text_bare TEXT,
  sentence_type   TEXT NOT NULL DEFAULT 'prose',
  irab_json       TEXT,
  tree_json       TEXT,
  page_no         INTEGER,
  tokens_json     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_source_chunks (
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
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id)  REFERENCES ar_ling_sources(id),
  FOREIGN KEY (edition_id) REFERENCES ar_ling_source_editions(id)
);

CREATE VIRTUAL TABLE ar_ling_source_chunks_fts USING fts5(heading_norm, text_ar, text_en);

CREATE TABLE ar_ling_source_editions (
  id              TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL,
  edition_label   TEXT NOT NULL,
  publisher       TEXT,
  year            TEXT,
  volume_count    INTEGER,
  note_md         TEXT,
  FOREIGN KEY (source_id) REFERENCES ar_ling_sources(id)
);

CREATE TABLE ar_ling_source_index (
  id              TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL,
  keyword         TEXT NOT NULL,
  chunk_id        TEXT NOT NULL,
  page_no         INTEGER,
  note_md         TEXT,
  FOREIGN KEY (source_id) REFERENCES ar_ling_sources(id),
  FOREIGN KEY (chunk_id)  REFERENCES ar_ling_source_chunks(id)
);

CREATE TABLE ar_ling_source_toc (
  id              TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL,
  parent_id       TEXT,
  title_ar        TEXT NOT NULL,
  title_en        TEXT,
  level           INTEGER NOT NULL DEFAULT 1,
  seq             INTEGER NOT NULL,
  page_start      INTEGER,
  FOREIGN KEY (source_id) REFERENCES ar_ling_sources(id),
  FOREIGN KEY (parent_id) REFERENCES ar_ling_source_toc(id)
);

CREATE TABLE ar_ling_sources (
  id                  TEXT PRIMARY KEY,
  title_ar            TEXT NOT NULL,
  title_en            TEXT,
  source_type         TEXT NOT NULL DEFAULT 'classical_grammar',
  author_ref          TEXT,
  author_name         TEXT,
  period_label        TEXT,
  note_md             TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  -- `genre` is set by scholarship/non-lexicon ingest paths and used by the
  -- catalog UI to colour-tint per-genre cards. Always TEXT — no enum.
  genre               TEXT,
  -- ─── Lexicon-source metadata (migration 0016) ────────────────────────
  -- The next six columns make ar_ling_sources the single source of truth
  -- for everything the worker's lexicon routes used to hardcode in TS
  -- Record<slug,{…}> maps. See SourcesRepo for the read API and
  -- migrations 0016 + 0017 + 0018 for the column adds and the data seed.
  --
  -- slug: TS-side stable identifier, also the URL path segment for the
  -- per-source /al/lex/v2/read/<slug>/:root endpoints. NULL for orphan
  -- duplicate rows that pre-date the ketabonline→qomra migration.
  slug                TEXT,
  -- origin: publisher pipeline that produced the source chunks. One of
  -- lane / ketabonline / thahabi / saaid / qomra. Two editions of the
  -- same book (e.g. al-Qamus from qomra and ketabonline) share a title
  -- but have different parsing characteristics; origin disambiguates.
  origin              TEXT,
  -- bilingual: Lane only. Drives two-column reader layouts.
  bilingual           INTEGER NOT NULL DEFAULT 0,
  -- Parser hints used by the lisan composer (lexicon_lisan.ts) to decide
  -- HOW to extract footnote text and Quran citations from each source.
  footnote_source     TEXT,   -- 'inline_brackets' | 'footnote_blocks' | 'none'
  quran_block_shape   TEXT,   -- 'inline_verse' | 'cue_only_verse_in_braces'
  -- source_order: catalogue display rank (lower = earlier). NULL sorts
  -- to the end so newly imported sources stay visible until ranked.
  source_order        INTEGER
);

CREATE UNIQUE INDEX idx_ar_ling_sources_slug
  ON ar_ling_sources(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_ar_ling_sources_origin
  ON ar_ling_sources(origin);
CREATE INDEX idx_ar_ling_sources_source_order
  ON ar_ling_sources(source_order) WHERE source_order IS NOT NULL;

CREATE TABLE ar_ling_syntax_relation_types (
  id              TEXT PRIMARY KEY,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  description_md  TEXT
);

CREATE TABLE ar_ling_token_lexicon_link (
  id              TEXT PRIMARY KEY,
  token_id        TEXT NOT NULL,
  lexicon_entry_id TEXT NOT NULL,
  confidence      REAL NOT NULL DEFAULT 1.0,
  UNIQUE (token_id, lexicon_entry_id),
  FOREIGN KEY (token_id)         REFERENCES ar_ling_tokens(id),
  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id)
);

CREATE TABLE ar_ling_tokens (
  id              TEXT PRIMARY KEY,
  token_text      TEXT NOT NULL,
  token_text_bare TEXT,
  lemma_id        TEXT,
  part_of_speech  TEXT,
  source_ref      TEXT,
  page_no         INTEGER,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lemma_id) REFERENCES ar_ling_lemmas(id)
);

CREATE INDEX idx_arl_arl_ar     ON ar_ling_arabic_links(ar_entity_ref);

CREATE INDEX idx_arl_arl_entity ON ar_ling_arabic_links(al_entity_ref);

CREATE INDEX idx_arl_bc_branch ON ar_ling_balagha_concepts(branch);

CREATE INDEX idx_arl_bc_parent ON ar_ling_balagha_concepts(parent_id);

CREATE INDEX idx_arl_be_balagha ON ar_ling_balagha_examples(balagha_id);

CREATE INDEX idx_arl_cl_cm     ON ar_ling_content_links(cm_entity_ref);

CREATE INDEX idx_arl_cl_entity ON ar_ling_content_links(al_entity_ref);



CREATE INDEX idx_arl_ct_paradigm ON ar_ling_conjugation_templates(paradigm_id);

CREATE INDEX idx_arl_dr_from ON ar_ling_discipline_relations(from_unit_id);

CREATE INDEX idx_arl_du_container ON ar_ling_discipline_units(container_id);

CREATE INDEX idx_arl_du_parent    ON ar_ling_discipline_units(parent_unit_id);

CREATE INDEX idx_arl_ei_type ON ar_ling_evidence_items(evidence_type);

CREATE INDEX idx_arl_et_exp ON ar_ling_expression_tokens(expression_id);

CREATE INDEX idx_arl_exp_lemma ON ar_ling_expressions(primary_lemma_id);

CREATE INDEX idx_arl_exp_type  ON ar_ling_expressions(expression_type_id);

CREATE INDEX idx_arl_fp_type ON ar_ling_form_paradigms(paradigm_type);

CREATE INDEX idx_arl_le_lemma ON ar_ling_lexicon_entries(lemma_id);

CREATE INDEX idx_arl_le_reg   ON ar_ling_lexicon_entries(usage_register);

CREATE INDEX idx_arl_le_root ON ar_ling_lexicon_entries(root_id);

CREATE INDEX idx_arl_le_source ON ar_ling_lexicon_entries(source_id);

CREATE INDEX idx_arl_le_source_slug ON ar_ling_lexicon_entries(source_slug);

CREATE UNIQUE INDEX ux_arl_le_source_chunk
  ON ar_ling_lexicon_entries(source_chunk_id)
  WHERE source_chunk_id IS NOT NULL;

CREATE INDEX idx_arl_le_heading ON ar_ling_lexicon_entries(heading_norm);

CREATE INDEX idx_arl_le_heading_key ON ar_ling_lexicon_entries(heading_key);

CREATE INDEX idx_arl_le_heading_source ON ar_ling_lexicon_entries(heading_norm, source_slug);

CREATE INDEX idx_arl_le_status ON ar_ling_lexicon_entries(status);

CREATE INDEX idx_arl_le_ai_fill_state ON ar_ling_lexicon_entries(ai_fill_state);

CREATE INDEX idx_arl_le_sort_key ON ar_ling_lexicon_entries(sort_key);

CREATE INDEX idx_arl_le_embedded ON ar_ling_lexicon_entries(is_embedded);

CREATE INDEX idx_arl_le_qdrant ON ar_ling_lexicon_entries(qdrant_id);

CREATE INDEX idx_arl_lem_pos  ON ar_ling_lemmas(part_of_speech);

CREATE INDEX idx_arl_lem_qrn  ON ar_ling_lemmas(is_quran_word);

CREATE INDEX idx_arl_lem_root ON ar_ling_lemmas(root_id);

CREATE INDEX idx_arl_lev_entry ON ar_ling_lexicon_evidence(lexicon_entry_id);

CREATE INDEX idx_arl_lev_type  ON ar_ling_lexicon_evidence(evidence_type);

CREATE INDEX idx_arl_lm_lemma ON ar_ling_lemma_morphology(lemma_id);

CREATE INDEX idx_arl_lm_morph ON ar_ling_lemma_morphology(morphology_id);

CREATE INDEX idx_arl_lr_lemma    ON ar_ling_lemma_registers(lemma_id);

CREATE INDEX idx_arl_lr_register ON ar_ling_lemma_registers(register);

CREATE INDEX idx_arl_lrl_lemma ON ar_ling_lemma_root_links(lemma_id);

CREATE INDEX idx_arl_lrl_root  ON ar_ling_lemma_root_links(root_id);

CREATE INDEX idx_arl_lv_lemma ON ar_ling_lemma_variants(lemma_id);

CREATE INDEX idx_arl_morph_pattern ON ar_ling_morphology(pattern);

CREATE INDEX idx_arl_nc_parent ON ar_ling_nahw_concepts(parent_id);

CREATE INDEX idx_arl_nc_type   ON ar_ling_nahw_concepts(concept_type);

CREATE INDEX idx_arl_nr_from ON ar_ling_nahw_relations(from_concept_id);

CREATE INDEX idx_arl_nsm_lemma         ON ar_ling_near_synonym_members(lemma_id);

CREATE INDEX idx_arl_nsm_set           ON ar_ling_near_synonym_members(set_id);

CREATE INDEX idx_arl_nss_slug          ON ar_ling_near_synonym_sets(slug);

CREATE INDEX idx_arl_nss_domain        ON ar_ling_near_synonym_sets(semantic_domain_id);

CREATE INDEX idx_arl_nsm_set_id        ON ar_ling_near_synonym_members(set_id);

CREATE INDEX idx_arl_nsm_lemma_id      ON ar_ling_near_synonym_members(lemma_id);

CREATE INDEX idx_arl_nsm_arabic_bare   ON ar_ling_near_synonym_members(arabic_bare);

CREATE INDEX idx_arl_nse_set_id        ON ar_ling_near_synonym_evidence(set_id);

CREATE INDEX idx_arl_nse_member_id     ON ar_ling_near_synonym_evidence(member_id);

CREATE INDEX idx_arl_nse_surah_ayah    ON ar_ling_near_synonym_evidence(surah, ayah);

CREATE INDEX idx_arl_nse_qr_ref        ON ar_ling_near_synonym_evidence(qr_ref);

CREATE INDEX idx_arl_pc_type ON ar_ling_projection_cache(cache_type);

CREATE INDEX idx_arl_ql_entity ON ar_ling_quran_links(al_entity_ref);

CREATE INDEX idx_arl_ql_qr     ON ar_ling_quran_links(qr_scope_ref);

CREATE INDEX idx_arl_root_freq ON ar_ling_roots(frequency_quran);

CREATE INDEX idx_arl_root_type ON ar_ling_roots(root_type);

CREATE INDEX idx_arl_rr_from ON ar_ling_rhetorical_relations(from_concept_id);

CREATE INDEX idx_arl_rrel_from ON ar_ling_root_relations(from_root_id);

CREATE INDEX idx_arl_rrel_to   ON ar_ling_root_relations(to_root_id);

CREATE INDEX idx_arl_rsf_field ON ar_ling_root_semantic_fields(field_name);

CREATE INDEX idx_arl_rsf_root  ON ar_ling_root_semantic_fields(root_id);

CREATE INDEX idx_arl_rv_root ON ar_ling_root_variants(root_id);

CREATE INDEX idx_arl_sc_embedded ON ar_ling_source_chunks(is_embedded);

CREATE INDEX idx_arl_sc_kind     ON ar_ling_source_chunks(chunk_kind);

CREATE INDEX idx_arl_sc_source   ON ar_ling_source_chunks(source_id);

CREATE INDEX idx_arl_se_source ON ar_ling_source_editions(source_id);

CREATE INDEX idx_arl_sense_entry ON ar_ling_senses(lexicon_entry_id);

CREATE INDEX idx_arl_sent_src ON ar_ling_sentences(source_ref);

CREATE INDEX idx_arl_si_keyword ON ar_ling_source_index(keyword);

CREATE INDEX idx_arl_si_source  ON ar_ling_source_index(source_id);

CREATE INDEX idx_arl_sr_from ON ar_ling_sense_relations(from_sense_id);

CREATE INDEX idx_arl_src_type ON ar_ling_sources(source_type);

CREATE INDEX idx_arl_toc_source ON ar_ling_source_toc(source_id);

CREATE INDEX idx_arl_tok_lemma ON ar_ling_tokens(lemma_id);
-- Migration 004: Sarf (morphology) canonical tables
-- Domain: km_arabic_linguistics (AL)
-- Created: 2026-04-27
--
-- Six new tables supporting the K-Maps صرف ingestion layer:
--   ar_ling_sarf_notes            - per-word sarf claims (lexicon, grammar, idiom)
--   ar_ling_sarf_tafsir_notes     - tafsir-linked morphology notes
--   ar_ling_verb_frames           - verb + preposition frames with idiomatic meanings
--   ar_ling_verb_frame_evidence   - Quran verse evidence per verb frame
--   ar_ling_antonym_pairs         - antonym/opposition pairs
--   ar_ling_antonym_evidence      - Quran verse evidence per antonym pair
--   ar_ling_sarf_translation_loss - English translation-loss notes
--   ar_ling_sarf_context_activations - tafsir-grounded root-activation notes

-- ── Sarf notes (per-word, non-tafsir sources) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_sarf_notes (
    id TEXT PRIMARY KEY,
    claim_id TEXT,                     -- alias for id (same value, for FK references)
    word_occurrence_ref TEXT,          -- "QR:surah:ayah:word_index" typed reference
    surah INTEGER,
    ayah INTEGER,
    word_index INTEGER,
    root_text TEXT,
    lemma_text TEXT,
    pattern TEXT,                      -- wazn / morphological pattern
    wazn TEXT,                         -- alternate pattern field
    verb_form TEXT,                    -- Form I–X
    noun_type TEXT,
    derivation_type TEXT,
    sarf_category TEXT NOT NULL,       -- claim_type from schema
    explanation_ar TEXT,
    explanation_en TEXT,
    source_id TEXT NOT NULL REFERENCES ar_ling_sources(id),
    chunk_id TEXT NOT NULL REFERENCES ar_ling_source_chunks(id),
    confidence TEXT NOT NULL DEFAULT 'needs_review'
        CHECK (confidence IN ('needs_review','checked','approved','rejected')),
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending','approved','rejected','flagged')),
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_asn_surah_ayah ON ar_ling_sarf_notes(surah, ayah);
CREATE INDEX IF NOT EXISTS idx_asn_root ON ar_ling_sarf_notes(root_text);
CREATE INDEX IF NOT EXISTS idx_asn_lemma ON ar_ling_sarf_notes(lemma_text);
CREATE INDEX IF NOT EXISTS idx_asn_word_ref ON ar_ling_sarf_notes(word_occurrence_ref);
CREATE INDEX IF NOT EXISTS idx_asn_confidence ON ar_ling_sarf_notes(confidence);
CREATE INDEX IF NOT EXISTS idx_asn_source ON ar_ling_sarf_notes(source_id);

-- ── Sarf tafsir notes (morphology claims from tafsir sources) ─────────────────
CREATE TABLE IF NOT EXISTS ar_ling_sarf_tafsir_notes (
    id TEXT PRIMARY KEY,
    claim_id TEXT,
    word_occurrence_ref TEXT,
    surah INTEGER,
    ayah_from INTEGER,
    ayah_to INTEGER,
    root_text TEXT,
    lemma_text TEXT,
    pattern TEXT,
    note_type TEXT NOT NULL,           -- tafsir_sarf claim_type
    note_ar TEXT,
    note_en TEXT,
    source_id TEXT NOT NULL REFERENCES ar_ling_sources(id),
    chunk_id TEXT NOT NULL REFERENCES ar_ling_source_chunks(id),
    locator_json TEXT,                 -- {chunk_id, source_id, surah, ayah_from, ayah_to}
    confidence TEXT NOT NULL DEFAULT 'needs_review'
        CHECK (confidence IN ('needs_review','checked','approved','rejected')),
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending','approved','rejected','flagged')),
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_astn_surah ON ar_ling_sarf_tafsir_notes(surah, ayah_from);
CREATE INDEX IF NOT EXISTS idx_astn_root ON ar_ling_sarf_tafsir_notes(root_text);
CREATE INDEX IF NOT EXISTS idx_astn_lemma ON ar_ling_sarf_tafsir_notes(lemma_text);
CREATE INDEX IF NOT EXISTS idx_astn_note_type ON ar_ling_sarf_tafsir_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_astn_confidence ON ar_ling_sarf_tafsir_notes(confidence);

-- ── Verb frames ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_verb_frames (
    id TEXT PRIMARY KEY,
    root_text TEXT,
    lemma_text TEXT,
    verb_form TEXT,
    preposition TEXT,
    frame_type TEXT NOT NULL,          -- direct/prep_object/double_object/idiom/tadmeen
    literal_meaning_en TEXT,
    idiomatic_meaning_en TEXT,
    idiomatic_meaning_ar TEXT,
    source_id TEXT REFERENCES ar_ling_sources(id),
    chunk_id TEXT REFERENCES ar_ling_source_chunks(id),
    confidence TEXT NOT NULL DEFAULT 'needs_review'
        CHECK (confidence IN ('needs_review','checked','approved','rejected')),
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending','approved','rejected','flagged')),
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_avf_root ON ar_ling_verb_frames(root_text);
CREATE INDEX IF NOT EXISTS idx_avf_lemma ON ar_ling_verb_frames(lemma_text);
CREATE INDEX IF NOT EXISTS idx_avf_preposition ON ar_ling_verb_frames(preposition);

-- ── Verb frame evidence ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_verb_frame_evidence (
    id TEXT PRIMARY KEY,
    frame_id TEXT NOT NULL REFERENCES ar_ling_verb_frames(id),
    surah INTEGER,
    ayah INTEGER,
    word_index INTEGER,
    quote_ar TEXT,
    translation_en TEXT,
    source_id TEXT REFERENCES ar_ling_sources(id),
    chunk_id TEXT REFERENCES ar_ling_source_chunks(id),
    note_md TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_avfe_frame ON ar_ling_verb_frame_evidence(frame_id);
CREATE INDEX IF NOT EXISTS idx_avfe_surah ON ar_ling_verb_frame_evidence(surah, ayah);

-- ── Antonym pairs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_antonym_pairs (
    id TEXT PRIMARY KEY,
    lemma_a_id TEXT,
    lemma_b_id TEXT,
    root_a TEXT,
    root_b TEXT,
    opposition_type TEXT NOT NULL,     -- direct/conceptual/gradational/complementary/directional/moral_charge
    opposition_note TEXT,
    pair_insight TEXT,
    source_status TEXT DEFAULT 'llm',  -- llm / human / classical_source
    confidence TEXT NOT NULL DEFAULT 'needs_review'
        CHECK (confidence IN ('needs_review','checked','approved','rejected')),
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending','approved','rejected','flagged')),
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_aap_root_a ON ar_ling_antonym_pairs(root_a);
CREATE INDEX IF NOT EXISTS idx_aap_root_b ON ar_ling_antonym_pairs(root_b);

-- ── Antonym evidence ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_antonym_evidence (
    id TEXT PRIMARY KEY,
    pair_id TEXT NOT NULL REFERENCES ar_ling_antonym_pairs(id),
    side TEXT NOT NULL CHECK (side IN ('a','b')),
    surah INTEGER,
    ayah INTEGER,
    word_index INTEGER,
    arabic_quote TEXT,
    explanation_md TEXT,
    source_id TEXT REFERENCES ar_ling_sources(id),
    chunk_id TEXT REFERENCES ar_ling_source_chunks(id),
    confidence TEXT NOT NULL DEFAULT 'needs_review'
        CHECK (confidence IN ('needs_review','checked','approved','rejected')),
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_aae_pair ON ar_ling_antonym_evidence(pair_id);
CREATE INDEX IF NOT EXISTS idx_aae_surah ON ar_ling_antonym_evidence(surah, ayah);

-- ── Translation loss notes ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_sarf_translation_loss (
    id TEXT PRIMARY KEY,
    word_occurrence_ref TEXT,
    surah INTEGER,
    ayah INTEGER,
    root_text TEXT,
    lemma_text TEXT,
    loss_type TEXT DEFAULT 'general',
    arabic_feature TEXT,               -- what morphological feature is lost
    english_loss_note TEXT,            -- how it collapses in English
    source_id TEXT REFERENCES ar_ling_sources(id),
    chunk_id TEXT REFERENCES ar_ling_source_chunks(id),
    confidence TEXT NOT NULL DEFAULT 'needs_review'
        CHECK (confidence IN ('needs_review','checked','approved','rejected')),
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending','approved','rejected','flagged')),
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_astl_surah ON ar_ling_sarf_translation_loss(surah, ayah);
CREATE INDEX IF NOT EXISTS idx_astl_root ON ar_ling_sarf_translation_loss(root_text);

-- ── Context activations (tafsir-grounded root sense per ayah) ─────────────────
CREATE TABLE IF NOT EXISTS ar_ling_sarf_context_activations (
    id TEXT PRIMARY KEY,
    root_text TEXT NOT NULL,
    lemma_text TEXT,
    surah INTEGER,
    ayah INTEGER,
    word_index INTEGER,
    active_sense_ar TEXT,              -- the root sense activated in this context
    active_sense_en TEXT,
    why_this_sense_md TEXT,            -- tafsir-backed explanation
    source_id TEXT REFERENCES ar_ling_sources(id),
    chunk_id TEXT REFERENCES ar_ling_source_chunks(id),
    confidence TEXT NOT NULL DEFAULT 'needs_review'
        CHECK (confidence IN ('needs_review','checked','approved','rejected')),
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending','approved','rejected','flagged')),
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_asca_root ON ar_ling_sarf_context_activations(root_text);
CREATE INDEX IF NOT EXISTS idx_asca_surah ON ar_ling_sarf_context_activations(surah, ayah);

-- ── Display block tables (per-domain) ────────────────────────────────────────
-- Each domain gets its own display-block table so reads are narrow and
-- the table name carries the domain. All three share the same column shape.

-- Lexicon display blocks — Lane / classical lexicon entries (0011 + 0012)
CREATE TABLE IF NOT EXISTS ar_ling_source_lexicon_display_blocks (
  id                TEXT PRIMARY KEY,
  source_id         TEXT NOT NULL,
  source_chunk_id   TEXT NOT NULL,
  lexicon_entry_id  TEXT,
  block_seq         INTEGER NOT NULL,
  block_type        TEXT NOT NULL,
  lang              TEXT,
  title_ar          TEXT,
  title_en          TEXT,
  text_ar           TEXT,
  text_en           TEXT,
  html_safe         TEXT,
  data_json         TEXT NOT NULL DEFAULT '{}',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT,
  UNIQUE(source_chunk_id, block_seq),
  FOREIGN KEY (source_id)        REFERENCES ar_ling_sources(id),
  FOREIGN KEY (source_chunk_id)  REFERENCES ar_ling_source_chunks(id),
  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_sdb_source ON ar_ling_source_lexicon_display_blocks(source_id);
CREATE INDEX IF NOT EXISTS idx_arl_sdb_chunk  ON ar_ling_source_lexicon_display_blocks(source_chunk_id, block_seq);
CREATE INDEX IF NOT EXISTS idx_arl_sdb_entry  ON ar_ling_source_lexicon_display_blocks(lexicon_entry_id);
CREATE INDEX IF NOT EXISTS idx_arl_sdb_type   ON ar_ling_source_lexicon_display_blocks(block_type);

CREATE TABLE IF NOT EXISTS ar_ling_lane_source_pages (
  id              TEXT PRIMARY KEY,
  root_text       TEXT NOT NULL,
  root_norm       TEXT NOT NULL,
  source_url      TEXT NOT NULL UNIQUE,
  source_path     TEXT,
  title_ar        TEXT,
  prev_root_text  TEXT,
  next_root_text  TEXT,
  page_refs_json  TEXT CHECK (page_refs_json IS NULL OR json_valid(page_refs_json)),
  html_sha256     TEXT,
  fetched_at      TEXT,
  parsed_at       TEXT,
  parser_version  TEXT,
  parse_status    TEXT NOT NULL DEFAULT 'pending',
  issue_json      TEXT CHECK (issue_json IS NULL OR json_valid(issue_json)),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_arl_lane_source_pages_root ON ar_ling_lane_source_pages(root_text);
CREATE INDEX IF NOT EXISTS idx_arl_lane_source_pages_norm ON ar_ling_lane_source_pages(root_norm);
CREATE INDEX IF NOT EXISTS idx_arl_lane_source_pages_status ON ar_ling_lane_source_pages(parse_status);

CREATE TABLE IF NOT EXISTS ar_ling_lane_quality_index (
  lexicon_entry_id           TEXT PRIMARY KEY,
  root_text                  TEXT NOT NULL,
  heading_norm               TEXT,
  display_heading_ar         TEXT,
  page_no                    INTEGER,
  source_entry_seq           INTEGER,
  has_empty_aor              INTEGER NOT NULL DEFAULT 0,
  has_empty_infinitive       INTEGER NOT NULL DEFAULT 0,
  has_empty_synonym          INTEGER NOT NULL DEFAULT 0,
  has_circle_placeholder     INTEGER NOT NULL DEFAULT 0,
  has_form_missing           INTEGER NOT NULL DEFAULT 0,
  has_duplicate_and          INTEGER NOT NULL DEFAULT 0,
  has_bare_cross_ref         INTEGER NOT NULL DEFAULT 0,
  has_orphan_syn             INTEGER NOT NULL DEFAULT 0,
  has_quran_marker           INTEGER NOT NULL DEFAULT 0,
  has_arabic_form_block      INTEGER NOT NULL DEFAULT 0,
  entry_type                 TEXT,
  broken_patterns_json       TEXT CHECK (broken_patterns_json IS NULL OR json_valid(broken_patterns_json)),
  repair_priority            INTEGER NOT NULL DEFAULT 0,
  issue_count                INTEGER NOT NULL DEFAULT 0,
  suggested_patch_types_json TEXT CHECK (suggested_patch_types_json IS NULL OR json_valid(suggested_patch_types_json)),
  last_scanned_at            TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_lane_quality_root ON ar_ling_lane_quality_index(root_text);
CREATE INDEX IF NOT EXISTS idx_arl_lane_quality_priority ON ar_ling_lane_quality_index(repair_priority DESC, page_no, source_entry_seq);
CREATE INDEX IF NOT EXISTS idx_arl_lane_quality_page ON ar_ling_lane_quality_index(page_no, source_entry_seq);
CREATE INDEX IF NOT EXISTS idx_arl_lane_quality_aor ON ar_ling_lane_quality_index(has_empty_aor);
CREATE INDEX IF NOT EXISTS idx_arl_lane_quality_inf ON ar_ling_lane_quality_index(has_empty_infinitive);
CREATE INDEX IF NOT EXISTS idx_arl_lane_quality_syn ON ar_ling_lane_quality_index(has_empty_synonym);
CREATE INDEX IF NOT EXISTS idx_arl_lane_quality_missing ON ar_ling_lane_quality_index(has_form_missing);

CREATE TABLE IF NOT EXISTS ar_ling_lane_patch_log (
  id                TEXT PRIMARY KEY,
  lexicon_entry_id  TEXT,
  source_chunk_id   TEXT,
  display_block_id  TEXT,
  root_text         TEXT NOT NULL,
  heading_norm      TEXT,
  source_slug       TEXT NOT NULL DEFAULT 'lane_lexicon',
  patch_type        TEXT NOT NULL,
  field_path        TEXT,
  old_value         TEXT,
  new_value         TEXT NOT NULL,
  evidence_url      TEXT,
  evidence_note     TEXT,
  confidence        REAL NOT NULL DEFAULT 0.90,
  status            TEXT NOT NULL DEFAULT 'pending',
  reviewed_by       TEXT,
  reviewed_at       TEXT,
  applied_at        TEXT,
  ai_model          TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id),
  FOREIGN KEY (source_chunk_id) REFERENCES ar_ling_source_chunks(id),
  FOREIGN KEY (display_block_id) REFERENCES ar_ling_source_lexicon_display_blocks(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_lane_patch_entry ON ar_ling_lane_patch_log(lexicon_entry_id);
CREATE INDEX IF NOT EXISTS idx_arl_lane_patch_root ON ar_ling_lane_patch_log(root_text);
CREATE INDEX IF NOT EXISTS idx_arl_lane_patch_status ON ar_ling_lane_patch_log(status);
CREATE INDEX IF NOT EXISTS idx_arl_lane_patch_type ON ar_ling_lane_patch_log(patch_type);

-- Iraab display blocks — إعراب syntactic-analysis entries (0012)
CREATE TABLE IF NOT EXISTS ar_ling_source_iraab_display_blocks (
  id                TEXT PRIMARY KEY,
  source_id         TEXT NOT NULL,
  source_chunk_id   TEXT NOT NULL,
  iraab_entry_id    TEXT,
  block_seq         INTEGER NOT NULL,
  block_type        TEXT NOT NULL,
  lang              TEXT,
  title_ar          TEXT,
  title_en          TEXT,
  text_ar           TEXT,
  text_en           TEXT,
  html_safe         TEXT,
  data_json         TEXT NOT NULL DEFAULT '{}',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT,
  UNIQUE(source_chunk_id, block_seq),
  FOREIGN KEY (source_id)       REFERENCES ar_ling_sources(id),
  FOREIGN KEY (source_chunk_id) REFERENCES ar_ling_source_chunks(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_idb_source ON ar_ling_source_iraab_display_blocks(source_id);
CREATE INDEX IF NOT EXISTS idx_arl_idb_chunk  ON ar_ling_source_iraab_display_blocks(source_chunk_id, block_seq);
CREATE INDEX IF NOT EXISTS idx_arl_idb_entry  ON ar_ling_source_iraab_display_blocks(iraab_entry_id);
CREATE INDEX IF NOT EXISTS idx_arl_idb_type   ON ar_ling_source_iraab_display_blocks(block_type);

-- Tafsir display blocks — تفسير exegesis entries (0012)
CREATE TABLE IF NOT EXISTS ar_ling_source_tafsir_display_blocks (
  id                TEXT PRIMARY KEY,
  source_id         TEXT NOT NULL,
  source_chunk_id   TEXT NOT NULL,
  tafsir_entry_id   TEXT,
  block_seq         INTEGER NOT NULL,
  block_type        TEXT NOT NULL,
  lang              TEXT,
  title_ar          TEXT,
  title_en          TEXT,
  text_ar           TEXT,
  text_en           TEXT,
  html_safe         TEXT,
  data_json         TEXT NOT NULL DEFAULT '{}',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT,
  UNIQUE(source_chunk_id, block_seq),
  FOREIGN KEY (source_id)       REFERENCES ar_ling_sources(id),
  FOREIGN KEY (source_chunk_id) REFERENCES ar_ling_source_chunks(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_tdb_source ON ar_ling_source_tafsir_display_blocks(source_id);
CREATE INDEX IF NOT EXISTS idx_arl_tdb_chunk  ON ar_ling_source_tafsir_display_blocks(source_chunk_id, block_seq);
CREATE INDEX IF NOT EXISTS idx_arl_tdb_entry  ON ar_ling_source_tafsir_display_blocks(tafsir_entry_id);
CREATE INDEX IF NOT EXISTS idx_arl_tdb_type   ON ar_ling_source_tafsir_display_blocks(block_type);

-- ============================================================
-- 0014: Lexicon root-entry model (added 2026-05-11)
-- ============================================================

CREATE TABLE IF NOT EXISTS ar_ling_lexicon_root_entries (
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
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (root_id)         REFERENCES ar_ling_roots(id),
  FOREIGN KEY (source_id)       REFERENCES ar_ling_sources(id),
  FOREIGN KEY (source_chunk_id) REFERENCES ar_ling_source_chunks(id),
  UNIQUE(source_slug, root_norm)
);

CREATE INDEX IF NOT EXISTS idx_alre_root_norm     ON ar_ling_lexicon_root_entries(root_norm);
CREATE INDEX IF NOT EXISTS idx_alre_source_slug   ON ar_ling_lexicon_root_entries(source_slug);
CREATE INDEX IF NOT EXISTS idx_alre_source_root   ON ar_ling_lexicon_root_entries(source_slug, root_norm);
CREATE INDEX IF NOT EXISTS idx_alre_status        ON ar_ling_lexicon_root_entries(status);
CREATE INDEX IF NOT EXISTS idx_alre_import_batch  ON ar_ling_lexicon_root_entries(import_batch_id);

CREATE TABLE IF NOT EXISTS ar_ling_lexicon_entry_sections (
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
  parser_notes_json         TEXT CHECK (parser_notes_json IS NULL OR json_valid(parser_notes_json)),
  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                TEXT,
  FOREIGN KEY (root_entry_id) REFERENCES ar_ling_lexicon_root_entries(id),
  UNIQUE(root_entry_id, section_seq)
);

CREATE INDEX IF NOT EXISTS idx_ales_root_entry  ON ar_ling_lexicon_entry_sections(root_entry_id);
CREATE INDEX IF NOT EXISTS idx_ales_root_norm   ON ar_ling_lexicon_entry_sections(root_norm);
CREATE INDEX IF NOT EXISTS idx_ales_source_root ON ar_ling_lexicon_entry_sections(source_slug, root_norm);
CREATE INDEX IF NOT EXISTS idx_ales_heading_norm ON ar_ling_lexicon_entry_sections(heading_norm);
CREATE INDEX IF NOT EXISTS idx_ales_page        ON ar_ling_lexicon_entry_sections(page_no);

CREATE TABLE IF NOT EXISTS ar_ling_lexicon_root_entry_sources (
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
  FOREIGN KEY (root_entry_id) REFERENCES ar_ling_lexicon_root_entries(id)
);

CREATE INDEX IF NOT EXISTS idx_alres_root_entry ON ar_ling_lexicon_root_entry_sources(root_entry_id);
CREATE INDEX IF NOT EXISTS idx_alres_kind       ON ar_ling_lexicon_root_entry_sources(source_kind);
CREATE INDEX IF NOT EXISTS idx_alres_slug       ON ar_ling_lexicon_root_entry_sources(source_slug);

CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_lexicon_root_entries_fts USING fts5(
  root_text, root_norm, source_slug, entry_text_ar, entry_text_en, raw_text,
  content='ar_ling_lexicon_root_entries', content_rowid='rowid'
);

CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_lexicon_entry_sections_fts USING fts5(
  root_text, root_norm, heading_ar, heading_norm, heading_bare,
  section_type, text_ar, text_en,
  content='ar_ling_lexicon_entry_sections', content_rowid='rowid'
);

-- =============================================================================
-- VOCABULARY & MORPHOLOGY — synced from live D1 on 2026-07-10
-- -----------------------------------------------------------------------------
-- Tables that live in production D1 but were absent from this snapshot. Grouped:
--   A. GRAMMATICAL REGISTER  (ar_ling_gram_*)   — trilingual term dictionary
--   B. ROOT SATELLITES       (antonyms, scholarship, sense_axes, dev_stages, vocab)
--   C. SARF ENGINE           (verb_government, word_sums)
--   D. MEMLET / QUESTION      (Membean-style learning layer)
--   E. LEARNER STATE          (context_passages, exposure_log, lemma_difficulty,
--                              vocab_memory_hooks)
-- All statements use IF NOT EXISTS so this snapshot is self-sufficient and also
-- co-exists with the incremental migrations that seeded some of these tables.
-- The exact ALTER-column top-ups are in 0023_vocab_morphology_d1_sync.sql.
-- =============================================================================

-- ── A. GRAMMATICAL REGISTER ────────────────────────────────────────────────
-- Two tables replace ~14 flat concept tables. ~24 categories, ~245 terms,
-- trilingual (ar/en/ur), each term optionally joined to QAC via qac_flag.
CREATE TABLE IF NOT EXISTS ar_ling_gram_categories (
  category_key   TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  discipline     TEXT NOT NULL,      -- 'sarf'|'nahw'|'balagha'|'dalala'
  applies_to     TEXT NOT NULL,      -- 'verb'|'noun'|'both'|'root'|'sentence'|'discourse'
  is_closed      INTEGER NOT NULL DEFAULT 1,
  display_order  INTEGER NOT NULL DEFAULT 0,
  icon           TEXT
);
CREATE TABLE IF NOT EXISTS ar_ling_gram_terms (
  id             TEXT PRIMARY KEY,          -- 'GT:voice:passive'
  category_key   TEXT NOT NULL,
  term_key       TEXT NOT NULL,
  qac_flag       TEXT,                      -- join into morphology_tag_json
  parent_term_id TEXT,                      -- hierarchy (أضرب الخبر …)
  term_order     INTEGER NOT NULL DEFAULT 0,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  short_ar TEXT, short_en TEXT, short_ur TEXT,
  definition_ar TEXT, definition_en TEXT, definition_ur TEXT,
  badge_color TEXT, icon TEXT,
  version     INTEGER NOT NULL DEFAULT 1,
  superseded_by TEXT,
  status      TEXT NOT NULL DEFAULT 'live',
  UNIQUE (category_key, term_key),
  UNIQUE (category_key, qac_flag),
  FOREIGN KEY (category_key)   REFERENCES ar_ling_gram_categories(category_key),
  FOREIGN KEY (parent_term_id) REFERENCES ar_ling_gram_terms(id)
);
CREATE TABLE IF NOT EXISTS ar_ling_gram_term_relations (
  from_term_id  TEXT NOT NULL,
  to_term_id    TEXT NOT NULL,
  relation_kind TEXT NOT NULL,  -- 'contrast'|'subsumes'|'requires'|'confused_with'|'reduplicated_from'|'variant_of'
  note_ar TEXT, note_en TEXT, note_ur TEXT,
  PRIMARY KEY (from_term_id, to_term_id, relation_kind)
);
CREATE TABLE IF NOT EXISTS ar_ling_gram_term_examples (
  id            TEXT PRIMARY KEY,
  term_id       TEXT NOT NULL,
  example_ar    TEXT NOT NULL,
  gloss_en TEXT, gloss_ur TEXT,
  example_kind  TEXT NOT NULL DEFAULT 'quran',  -- 'quran'|'hadith'|'poetry'|'constructed'
  qr_ref        TEXT, source_ref TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (term_id) REFERENCES ar_ling_gram_terms(id)
);
CREATE TABLE IF NOT EXISTS ar_ling_gram_term_sources (
  term_id     TEXT NOT NULL,
  source_slug TEXT NOT NULL,   -- 'ibn_hisham_shudhur'|'qazwini_talkhis'|'QAC-0.4'
  page_ref    TEXT,
  PRIMARY KEY (term_id, source_slug)
);

-- ── B. ROOT SATELLITES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_root_antonyms (
  id TEXT PRIMARY KEY,
  root_norm TEXT NOT NULL,
  antonym_ar TEXT NOT NULL, antonym_root TEXT, antonym_en TEXT,
  relation_kind TEXT NOT NULL DEFAULT 'antonym',
  note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  source_ref TEXT,                 -- a شاهد āyah, never an unsourced opinion
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_rant_root ON ar_ling_root_antonyms(root_norm, sort_order);

CREATE TABLE IF NOT EXISTS ar_ling_root_scholarship (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL, source_slug TEXT, source_native_id TEXT,
  root_id TEXT, root_norm TEXT NOT NULL, root_text TEXT,
  reading_kind TEXT NOT NULL DEFAULT 'general',
  title_en TEXT, title_ar TEXT,
  body_md TEXT, body_html TEXT, body_plain TEXT,
  comparanda_json TEXT, inscriptions_json TEXT, glosses_json TEXT, citations_json TEXT,
  page_no INTEGER, page_range TEXT, section_label TEXT,
  parser_version TEXT, import_batch_id TEXT,
  status TEXT DEFAULT 'raw',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES ar_ling_sources(id),
  FOREIGN KEY (root_id)   REFERENCES ar_ling_roots(id)
);
CREATE INDEX IF NOT EXISTS idx_root_scholarship_root_norm ON ar_ling_root_scholarship(root_norm);
CREATE INDEX IF NOT EXISTS idx_root_scholarship_slug_root ON ar_ling_root_scholarship(source_slug, root_norm);

-- D9: upstream core tables for the usage_map & development display blocks.
CREATE TABLE IF NOT EXISTS ar_ling_root_sense_axes (
  id          TEXT PRIMARY KEY,               -- 'RSA:نذر:speech_act'
  root_norm   TEXT NOT NULL,
  axis_key    TEXT NOT NULL,
  axis_ar TEXT, axis_en TEXT, axis_ur TEXT,
  weight      INTEGER NOT NULL DEFAULT 0 CHECK (weight BETWEEN 0 AND 3),
  basis_json  TEXT CHECK (basis_json IS NULL OR json_valid(basis_json)),   -- the āyāt scored
  note_en     TEXT,
  source_slug TEXT NOT NULL DEFAULT 'kmaps_usage_map',
  status      TEXT NOT NULL DEFAULT 'draft',
  UNIQUE (root_norm, axis_key)
);
CREATE TABLE IF NOT EXISTS ar_ling_root_development_stages (
  id          TEXT PRIMARY KEY,               -- 'RDS:نذر:1'
  root_norm   TEXT NOT NULL,
  stage_no    INTEGER NOT NULL,
  stage_ar    TEXT NOT NULL, stage_en TEXT, stage_ur TEXT,
  note_en     TEXT,
  source_ref  TEXT,                            -- Maqāyīs block id etc. when grounded
  source_slug TEXT NOT NULL DEFAULT 'kmaps_development',
  status      TEXT NOT NULL DEFAULT 'draft',
  UNIQUE (root_norm, stage_no)
);
CREATE TABLE IF NOT EXISTS ar_ling_root_vocab (
  root_norm           TEXT PRIMARY KEY,
  root_text           TEXT NOT NULL,
  root_id             TEXT,
  five_lens_entry_id  TEXT,
  core_sense_en       TEXT, core_sense_ar TEXT,
  membean_hook        TEXT, membean_anchors_json TEXT,
  illustration_key    TEXT, diagram_key TEXT,
  unique_senses_json  TEXT, examples_json TEXT,
  status              TEXT NOT NULL DEFAULT 'draft',
  first_surah         INTEGER, first_ayah INTEGER,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── C. SARF ENGINE ─────────────────────────────────────────────────────────
-- The irreducible authored layer: QAC cannot encode transitivity + حرف.
CREATE TABLE IF NOT EXISTS ar_ling_verb_government (
  id TEXT PRIMARY KEY,
  root_norm TEXT NOT NULL,
  verb_form TEXT,
  verb_ar TEXT NOT NULL,
  transitivity TEXT NOT NULL,          -- intransitive|transitive|transitive_by_harf|ditransitive
  harf TEXT,                           -- إلى / من / لـ / (هـ) / NULL
  meaning_en TEXT, meaning_ar TEXT,
  qr_ref TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  source_ref TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  transitivity_term_id TEXT             -- → ar_ling_gram_terms(category='transitivity')
);
CREATE INDEX IF NOT EXISTS idx_ar_vgov_root ON ar_ling_verb_government(root_norm, sort_order);

-- Arabic word decomposition: جذر + وزن + زوائد + the iʿlāl that moved the surface.
CREATE TABLE IF NOT EXISTS ar_ling_word_sums (
  id              TEXT PRIMARY KEY,      -- 'WS:مبين'
  lemma_ar        TEXT NOT NULL UNIQUE,
  root_norm       TEXT NOT NULL,
  root_letters_json TEXT NOT NULL,       -- ["ب","ي","ن"]
  wazn_ar         TEXT NOT NULL,         -- 'مُفْعِل'
  form_family_key TEXT,                  -- → ar_ling_gram_terms ('form_iv')
  zawaid_json     TEXT,                  -- [{"letter":"م","position":"prefix","function":"اسم فاعل"}]
  operation_key   TEXT,
  operation_ar TEXT, operation_en TEXT, operation_ur TEXT,
  surface_form_ar TEXT NOT NULL,         -- 'مُبِين'
  underlying_form_ar TEXT,               -- 'مُبْيِن'  ← before iʿlāl
  inflection_class_key TEXT,             -- 'ilal_naql'
  rule_ar TEXT, rule_en TEXT, rule_ur TEXT,
  source_slug TEXT NOT NULL, source_ref TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  FOREIGN KEY (root_norm) REFERENCES ar_ling_roots(root_normalized)
);

-- ── D. MEMLET / QUESTION LAYER ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_memlet_kinds (
  memlet_key     TEXT PRIMARY KEY,       -- 'context'|'word_sum'|'wazn_operation'|…  (14 rows)
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  purpose_ar TEXT, purpose_en TEXT, purpose_ur TEXT,
  modality       TEXT NOT NULL,          -- 'text'|'image'|'audio'|'video'|'diagram'
  encoding_axis  TEXT NOT NULL,          -- 'form'|'meaning'|'usage'|'network'|'sound'|'history'
  scope_level    TEXT NOT NULL,          -- 'root'|'lemma'|'both'
  block_type     TEXT,                   -- the display block it re-reads, if any
  is_arabic_only INTEGER NOT NULL DEFAULT 0,
  display_order  INTEGER NOT NULL DEFAULT 0,
  icon           TEXT
);
CREATE TABLE IF NOT EXISTS ar_ling_memlets (
  id             TEXT PRIMARY KEY,       -- 'MEM:مبين:context'
  memlet_key     TEXT NOT NULL,
  scope_level    TEXT NOT NULL CHECK (scope_level IN ('root','lemma')),
  scope_key      TEXT NOT NULL,          -- 'مبين' | 'بين'
  lemma_ar       TEXT, root_norm TEXT NOT NULL,
  title_ar TEXT, title_en TEXT, title_ur TEXT,
  body_ar  TEXT, body_en  TEXT, body_ur  TEXT,
  data_json      TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(data_json)),
  media_r2_key   TEXT,
  block_ref      TEXT,                   -- → qr_morph_display_blocks.id (L5: read, don't copy)
  difficulty     INTEGER NOT NULL DEFAULT 3,
  is_synthesis   INTEGER NOT NULL DEFAULT 1,
  source_slug    TEXT NOT NULL, source_ref TEXT,
  confidence     TEXT DEFAULT 'medium',
  status         TEXT NOT NULL DEFAULT 'draft',
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (scope_level, scope_key, memlet_key),
  FOREIGN KEY (memlet_key) REFERENCES ar_ling_memlet_kinds(memlet_key),
  CHECK ((is_synthesis = 1 AND source_slug LIKE 'kmaps_%')
      OR (is_synthesis = 0 AND source_ref IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS ar_ling_memlet_media (
  id            TEXT PRIMARY KEY,
  memlet_id     TEXT NOT NULL,
  media_kind    TEXT NOT NULL,           -- 'recitation'|'pronunciation'|'video'|'animation'
  r2_key        TEXT NOT NULL UNIQUE,
  bucket        TEXT NOT NULL DEFAULT 'kmaps-media',
  mime TEXT, duration_ms INTEGER, sha256 TEXT,
  reciter TEXT, qiraa TEXT, qr_ref TEXT,
  license TEXT, source_attribution TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  FOREIGN KEY (memlet_id) REFERENCES ar_ling_memlets(id)
);
CREATE TABLE IF NOT EXISTS ar_ling_memlet_mastery (
  id             TEXT PRIMARY KEY,
  core_user_ref  TEXT NOT NULL,
  lemma_ar       TEXT NOT NULL,
  memlet_key     TEXT NOT NULL,
  exposures      INTEGER NOT NULL DEFAULT 0,
  correct        INTEGER NOT NULL DEFAULT 0,
  encoding_score REAL NOT NULL DEFAULT 0,   -- 0..1 per axis
  last_seen_at   TEXT,
  UNIQUE (core_user_ref, lemma_ar, memlet_key)
);
CREATE TABLE IF NOT EXISTS ar_ling_question_kinds (
  question_key   TEXT PRIMARY KEY,       -- 11 rows (7 Membean + 4 Arabic-only)
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  memlet_key     TEXT,
  response_kind  TEXT NOT NULL,          -- 'mcq'|'multi'|'text'|'cloze'|'match'|'order'
  cognitive_level TEXT NOT NULL,         -- 'recognition'|'recall'|'discrimination'|'production'
  difficulty_floor INTEGER NOT NULL DEFAULT 1,
  is_arabic_only INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (memlet_key) REFERENCES ar_ling_memlet_kinds(memlet_key)
);
CREATE TABLE IF NOT EXISTS ar_ling_question_items (
  id             TEXT PRIMARY KEY,       -- 'Q:مبين:furuq:001'
  question_key   TEXT NOT NULL,
  lemma_ar       TEXT NOT NULL, root_norm TEXT NOT NULL,
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
  status         TEXT NOT NULL DEFAULT 'draft',
  FOREIGN KEY (question_key) REFERENCES ar_ling_question_kinds(question_key),
  FOREIGN KEY (memlet_id)    REFERENCES ar_ling_memlets(id)
);
CREATE TABLE IF NOT EXISTS ar_ling_question_distractors (
  id             TEXT PRIMARY KEY,
  item_id        TEXT NOT NULL,
  option_ar TEXT NOT NULL, option_en TEXT, option_ur TEXT,
  is_correct     INTEGER NOT NULL DEFAULT 0,
  distractor_kind TEXT,   -- 'near_synonym'|'same_root_wrong_form'|'same_wazn_wrong_root'|'antonym'|…
  why_wrong_ar TEXT, why_wrong_en TEXT, why_wrong_ur TEXT,
  source_ref     TEXT,    -- e.g. near_synonym_members.id — every wrong answer is a lesson
  sort_order     INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (item_id) REFERENCES ar_ling_question_items(id)
);

-- ── E. LEARNER STATE ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_context_passages (
  id             TEXT PRIMARY KEY,
  lemma_ar       TEXT NOT NULL,
  passage_ar     TEXT NOT NULL,          -- target word masked as {{1}}
  passage_en TEXT, passage_ur TEXT,
  blank_index    INTEGER NOT NULL DEFAULT 1,
  answer_ar      TEXT NOT NULL,
  clue_kind      TEXT,                   -- 'contrast'|'definition'|'example'|'inference'
  passage_kind   TEXT NOT NULL DEFAULT 'quran',
  qr_ref         TEXT,
  difficulty     INTEGER NOT NULL DEFAULT 3,
  source_slug TEXT NOT NULL, source_ref TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
);
CREATE TABLE IF NOT EXISTS ar_ling_exposure_log (
  id             TEXT PRIMARY KEY,
  core_user_ref  TEXT NOT NULL,
  lemma_ar       TEXT NOT NULL,
  memlet_key     TEXT, item_id TEXT,
  surface        TEXT NOT NULL,          -- 'study'|'quiz'|'reading'|'lesson'|'passive'
  qr_ref         TEXT,                   -- met while reading 44:2?
  outcome        TEXT,                   -- 'correct'|'incorrect'|'skipped'|'viewed'
  latency_ms     INTEGER,
  shown_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS ar_ling_lemma_difficulty (
  lemma_ar          TEXT PRIMARY KEY,
  frequency_quran   INTEGER, frequency_rank INTEGER,
  morph_opacity     REAL,                -- weak root + iʿlāl ⇒ harder
  polysemy_count    INTEGER,
  abstractness      REAL,
  root_known_first  INTEGER,
  computed_level    INTEGER NOT NULL DEFAULT 3,   -- 1..5
  computed_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS ar_ling_vocab_memory_hooks (
  id TEXT PRIMARY KEY,
  root_norm TEXT NOT NULL,
  sense_id TEXT,
  scope_type TEXT NOT NULL DEFAULT 'root',
  hook_kind TEXT NOT NULL DEFAULT 'sound',  -- widen: sound|image|etymon|contrast|story|calligraphic
  hook_md TEXT NOT NULL,
  anchor_word TEXT,
  source_ref TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  lemma_ar TEXT                          -- D26 re-scope: a learner meets مُبِين, not ب-ي-ن
);

-- Trilingual (Urdu) top-up columns present in live D1 on older reference tables.
-- Applied as ALTER in 0023 (can't be expressed as IF NOT EXISTS on a column):
--   ar_ling_semantic_fields.field_name_ur · ar_ling_sentence_types.name_ur
--   ar_ling_expression_types.name_ur      · ar_ling_nahw_concepts.concept_name_ur/definition_ur
--   ar_ling_balagha_concepts.name_ur/definition_ur
--   ar_ling_near_synonym_sets.canonical_ur
--   ar_ling_near_synonym_members.{basic_gloss_ur,contrast_note_ur,usage_rule_ur,
--                                 quran_usage_pattern_ur,nuance_note_ur}

-- ===== LAYER-CODE REGISTRY (master data · 00 Register … 90 Media) =====
CREATE TABLE IF NOT EXISTS ar_ling_reg_build_layer (
  layer_code   TEXT PRIMARY KEY,          -- '00' Register · '10' Root · '20' Lemma …
  layer_key    TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  cluster      TEXT NOT NULL,             -- reg|morph|syn|expr|learn|display|source|curriculum
  scope_level  TEXT NOT NULL,             -- global|root|lemma|context|user|any
  fill_order   INTEGER NOT NULL,
  once_only    INTEGER NOT NULL DEFAULT 1,
  mode         TEXT NOT NULL,             -- authored|projection|synthesis|generated|ingested|runtime
  primary_tables_json       TEXT NOT NULL,
  allowed_source_slugs_json TEXT NOT NULL,-- L1: the only sources a row at this layer may cite
  note_en TEXT
);
CREATE TABLE IF NOT EXISTS ar_ling_reg_table_map (
  db          TEXT NOT NULL,              -- km_arabic | km_quran | km_arabic_linguistic
  table_name  TEXT NOT NULL,
  cluster     TEXT NOT NULL,
  layer_code  TEXT,                       -- -> ar_ling_reg_build_layer.layer_code
  role        TEXT,
  PRIMARY KEY (db, table_name)
);
CREATE INDEX IF NOT EXISTS idx_reg_tmap_layer ON ar_ling_reg_table_map(layer_code, db);
CREATE INDEX IF NOT EXISTS idx_reg_tmap_cluster ON ar_ling_reg_table_map(cluster);
