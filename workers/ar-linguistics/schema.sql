-- Snapshot regenerated from live D1 km_arabic_linguistic (192f4792-deb3-4f2e-9204-532cf484ecd2) 2026-07-17 — canonical-v1

CREATE VIRTUAL TABLE ar_ling_balagha_concepts_fts USING fts5(name_ar, name_en, definition_ar, definition_en);

CREATE TABLE "ar_ling_conjugation_templates" (
  id              TEXT PRIMARY KEY,
  paradigm_id     TEXT NOT NULL,
  person          TEXT NOT NULL,
  tense           TEXT NOT NULL,
  voice           TEXT NOT NULL DEFAULT 'active',
  template_form   TEXT NOT NULL,
  note_md         TEXT, verb_form    TEXT, root_type    TEXT, weak_pattern TEXT,
  FOREIGN KEY (paradigm_id) REFERENCES "ar_ling_form_paradigms"(id)
);

CREATE TABLE "ar_ling_context_passages" (
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

CREATE TABLE ar_ling_embedding_jobs (
  job_id TEXT PRIMARY KEY,
  collection_name TEXT NOT NULL,
  embedding_model TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  total_expected INTEGER,
  total_embedded INTEGER,
  status TEXT,
  error_message TEXT
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

CREATE TABLE "ar_ling_expression_types" (
  id              TEXT PRIMARY KEY,
  type_key        TEXT NOT NULL UNIQUE,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  description_md  TEXT
, name_ur TEXT);

CREATE TABLE "ar_ling_expressions" (
  id              TEXT PRIMARY KEY,
  expression_ar   TEXT NOT NULL,
  expression_en   TEXT NOT NULL,
  expression_type_id TEXT,
  primary_lemma_id TEXT,
  explanation_md  TEXT,
  qr_refs_json    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')), source_slug      TEXT, root_ar          TEXT, lemma_ar         TEXT, surface_ar       TEXT, preposition_ar   TEXT, surah            INTEGER, ayah             INTEGER, source_page      INTEGER, construction_en  TEXT, notes_md         TEXT, usage_note       TEXT, match_method     TEXT, confidence       TEXT, status           TEXT NOT NULL DEFAULT 'live', updated_at       TEXT, ayah_translation_en TEXT,
  FOREIGN KEY (expression_type_id) REFERENCES "ar_ling_expression_types"(id),
  FOREIGN KEY (primary_lemma_id)   REFERENCES "ar_ling_lemmas"(id)
);

CREATE VIRTUAL TABLE ar_ling_expressions_fts USING fts5(expression_ar, expression_en, explanation_md);

CREATE TABLE ar_ling_form_families (
  id              TEXT PRIMARY KEY,
  family_order    INTEGER NOT NULL,
  kind            TEXT NOT NULL,
  tier_key        TEXT REFERENCES ar_ling_form_tiers(tier_key),
  roman           TEXT,
  verb_form_key   TEXT,
  derivation_type TEXT,
  qac_selector    TEXT,
  arabic_name     TEXT NOT NULL,
  english_name    TEXT,
  urdu_name       TEXT,
  wazn            TEXT,
  example_ar      TEXT,
  note_md         TEXT,
  icon            TEXT,
  source_slug     TEXT NOT NULL DEFAULT 'kmaps_five_lens',
  source_ref      TEXT,
  status          TEXT NOT NULL DEFAULT 'live',
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "ar_ling_form_paradigms" (
  id              TEXT PRIMARY KEY,
  paradigm_name   TEXT NOT NULL,
  paradigm_type   TEXT NOT NULL,
  verb_form       TEXT,
  root_type       TEXT,
  paradigm_json   TEXT NOT NULL,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_form_tiers (
  tier_key     TEXT PRIMARY KEY,
  tier_order   INTEGER NOT NULL,
  arabic_name  TEXT NOT NULL,
  english_name TEXT,
  urdu_name    TEXT,
  icon         TEXT
);

CREATE TABLE "ar_ling_gram_categories" (
  category_key   TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  discipline     TEXT NOT NULL,
  applies_to     TEXT NOT NULL,
  is_closed      INTEGER NOT NULL DEFAULT 1,
  display_order  INTEGER NOT NULL DEFAULT 0,
  icon           TEXT
);

CREATE TABLE "ar_ling_gram_term_examples" (
  id            TEXT PRIMARY KEY,
  term_id       TEXT NOT NULL,
  example_ar    TEXT NOT NULL,
  gloss_en TEXT, gloss_ur TEXT,
  example_kind  TEXT NOT NULL DEFAULT 'quran',
  qr_ref        TEXT,
  source_ref    TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (term_id) REFERENCES "ar_ling_gram_terms"(id)
);

CREATE TABLE "ar_ling_gram_term_relations" (
  from_term_id  TEXT NOT NULL,
  to_term_id    TEXT NOT NULL,
  relation_kind TEXT NOT NULL,
  note_ar TEXT, note_en TEXT, note_ur TEXT,
  PRIMARY KEY (from_term_id, to_term_id, relation_kind)
);

CREATE TABLE "ar_ling_gram_term_sources" (
  term_id     TEXT NOT NULL,
  source_slug TEXT NOT NULL,
  page_ref    TEXT,
  PRIMARY KEY (term_id, source_slug)
);

CREATE TABLE "ar_ling_gram_terms" (
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
  status      TEXT NOT NULL DEFAULT 'live', discipline TEXT,
  UNIQUE (category_key, term_key),
  UNIQUE (category_key, qac_flag),
  FOREIGN KEY (category_key)   REFERENCES "ar_ling_gram_categories"(category_key),
  FOREIGN KEY (parent_term_id) REFERENCES "ar_ling_gram_terms"(id)
);

CREATE TABLE ar_ling_import_runs (
  id                TEXT PRIMARY KEY,
  source_id         TEXT NOT NULL,
  importer_name     TEXT NOT NULL,
  importer_version  TEXT NOT NULL,
  mode              TEXT NOT NULL,
  status            TEXT NOT NULL,
  started_at        TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at       TEXT,
  stats_json        TEXT NOT NULL DEFAULT '{}',
  error_json        TEXT,
  FOREIGN KEY (source_id) REFERENCES ar_ling_sources(id)
);

CREATE TABLE "ar_ling_inflection_rules" (
  id              TEXT PRIMARY KEY,
  rule_name       TEXT NOT NULL,
  rule_type       TEXT NOT NULL,
  applies_to      TEXT NOT NULL,
  rule_description_md TEXT NOT NULL,
  example_before  TEXT,
  example_after   TEXT,
  note_md         TEXT
);

CREATE TABLE ar_ling_lane_patch_log (
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
  FOREIGN KEY (source_chunk_id)  REFERENCES ar_ling_source_chunks(id),
  FOREIGN KEY (display_block_id) REFERENCES ar_ling_source_lexicon_display_blocks(id)
);

CREATE TABLE ar_ling_lane_quality_index (
  lexicon_entry_id          TEXT PRIMARY KEY,
  root_text                 TEXT NOT NULL,
  heading_norm              TEXT,
  display_heading_ar        TEXT,
  page_no                   INTEGER,
  source_entry_seq          INTEGER,

  has_empty_aor             INTEGER NOT NULL DEFAULT 0,
  has_empty_infinitive      INTEGER NOT NULL DEFAULT 0,
  has_empty_synonym         INTEGER NOT NULL DEFAULT 0,
  has_circle_placeholder    INTEGER NOT NULL DEFAULT 0,
  has_form_missing          INTEGER NOT NULL DEFAULT 0,
  has_duplicate_and         INTEGER NOT NULL DEFAULT 0,
  has_bare_cross_ref        INTEGER NOT NULL DEFAULT 0,
  has_orphan_syn            INTEGER NOT NULL DEFAULT 0,
  has_quran_marker          INTEGER NOT NULL DEFAULT 0,
  has_arabic_form_block     INTEGER NOT NULL DEFAULT 0,

  entry_type                TEXT,
  broken_patterns_json      TEXT CHECK (broken_patterns_json IS NULL OR json_valid(broken_patterns_json)),
  repair_priority           INTEGER NOT NULL DEFAULT 0,
  issue_count               INTEGER NOT NULL DEFAULT 0,
  suggested_patch_types_json TEXT CHECK (suggested_patch_types_json IS NULL OR json_valid(suggested_patch_types_json)),

  last_scanned_at           TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id)
);

CREATE TABLE ar_ling_lane_source_pages (
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

CREATE TABLE "ar_ling_lemma_difficulty" (
  lemma_ar          TEXT PRIMARY KEY,
  frequency_quran   INTEGER,
  frequency_rank    INTEGER,
  morph_opacity     REAL,
  polysemy_count    INTEGER,
  abstractness      REAL,
  root_known_first  INTEGER,
  computed_level    INTEGER NOT NULL DEFAULT 3,
  computed_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_lemma_form_map (
  qac_lem_bw      TEXT PRIMARY KEY,
  root_bw         TEXT,
  lemma_ar        TEXT,
  form_roman      TEXT NOT NULL,
  form_family_id  TEXT NOT NULL REFERENCES ar_ling_form_families(id),
  derivation_type TEXT,
  occurrences     INTEGER NOT NULL DEFAULT 0,
  confidence      TEXT NOT NULL DEFAULT 'high',
  source_slug     TEXT NOT NULL DEFAULT 'qac_morphology',
  source_ref      TEXT NOT NULL DEFAULT 'QAC-0.4:stem.features',
  status          TEXT NOT NULL DEFAULT 'live',
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "ar_ling_lemma_registers" (
  id              TEXT PRIMARY KEY,
  lemma_id        TEXT NOT NULL,
  register        TEXT NOT NULL,
  frequency_note  TEXT,
  FOREIGN KEY (lemma_id) REFERENCES "ar_ling_lemmas"(id)
);

CREATE TABLE "ar_ling_lemma_root_links" (
  id              TEXT PRIMARY KEY,
  lemma_id        TEXT NOT NULL,
  root_id         TEXT NOT NULL,
  link_type       TEXT NOT NULL DEFAULT 'primary',
  note_md         TEXT,
  UNIQUE (lemma_id, root_id),
  FOREIGN KEY (lemma_id) REFERENCES "ar_ling_lemmas"(id),
  FOREIGN KEY (root_id)  REFERENCES "ar_ling_roots"(id)
);

CREATE TABLE "ar_ling_lemmas" (
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
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')), root_status TEXT NOT NULL DEFAULT 'pending',
  FOREIGN KEY (root_id) REFERENCES "ar_ling_roots"(id)
);

CREATE VIRTUAL TABLE ar_ling_lemmas_fts USING fts5(lemma_text, lemma_text_bare);

CREATE TABLE ar_ling_lexicon_block_annotations (
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
  updated_at        TEXT,
  FOREIGN KEY (block_id) REFERENCES ar_ling_lexicon_blocks(id)
);

CREATE TABLE ar_ling_lexicon_block_links (
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

  FOREIGN KEY (from_block_id) REFERENCES ar_ling_lexicon_blocks(id),
  FOREIGN KEY (to_block_id)   REFERENCES ar_ling_lexicon_blocks(id)
);

CREATE TABLE ar_ling_lexicon_block_tags (
  block_id      TEXT NOT NULL,
  tag           TEXT NOT NULL,
  source        TEXT NOT NULL DEFAULT 'auto'
                CHECK (source IN ('auto', 'curated', 'user')),
  weight        REAL DEFAULT 1.0,
  user_id       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (block_id, tag, source, user_id),
  FOREIGN KEY (block_id) REFERENCES ar_ling_lexicon_blocks(id)
);

CREATE TABLE ar_ling_lexicon_blocks (
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
  updated_at        TEXT,

  FOREIGN KEY (root_entry_id)   REFERENCES ar_ling_lexicon_root_entries(id),
  FOREIGN KEY (section_id)      REFERENCES ar_ling_lexicon_entry_sections(id),
  FOREIGN KEY (book_page_id)    REFERENCES ar_ling_lexicon_book_pages(id),
  FOREIGN KEY (parent_block_id) REFERENCES ar_ling_lexicon_blocks(id),
  UNIQUE(root_entry_id, block_path)
);

CREATE VIRTUAL TABLE ar_ling_lexicon_blocks_fts USING fts5(
  text_plain, title_ar, title_en, root_norm, source_slug, block_type,
  content='ar_ling_lexicon_blocks', content_rowid='rowid'
);

CREATE TABLE ar_ling_lexicon_book_pages (
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
  FOREIGN KEY (source_id) REFERENCES ar_ling_sources(id)
);

CREATE VIRTUAL TABLE ar_ling_lexicon_book_pages_fts USING fts5(
  clean_text, source_slug, root_norm,
  content='ar_ling_lexicon_book_pages', content_rowid='rowid'
);

CREATE TABLE ar_ling_lexicon_entry_embeddings (
  entry_id TEXT PRIMARY KEY,
  collection_name TEXT NOT NULL,
  qdrant_point_id TEXT NOT NULL,
  embedding_model TEXT NOT NULL,
  embedding_text_hash TEXT NOT NULL,
  embedded_at TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT
);

CREATE TABLE ar_ling_lexicon_entry_sections (
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

  FOREIGN KEY (root_entry_id) REFERENCES ar_ling_lexicon_root_entries(id),

  UNIQUE(root_entry_id, section_seq)
);

CREATE VIRTUAL TABLE ar_ling_lexicon_entry_sections_fts USING fts5(
  root_text,
  root_norm,
  heading_ar,
  heading_norm,
  heading_bare,
  section_type,
  text_ar,
  text_en,
  content='ar_ling_lexicon_entry_sections',
  content_rowid='rowid'
);

CREATE VIRTUAL TABLE ar_ling_lexicon_evidence_fts USING fts5(text_ar, text_en, note_md);

CREATE TABLE ar_ling_lexicon_quran_refs (
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
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (root_entry_id) REFERENCES ar_ling_lexicon_root_entries(id),
  FOREIGN KEY (section_id)    REFERENCES ar_ling_lexicon_entry_sections(id),
  FOREIGN KEY (block_id)      REFERENCES ar_ling_lexicon_blocks(id)
);

CREATE TABLE ar_ling_lexicon_root_entries (
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
  CHECK (entry_gloss_json IS NULL OR json_valid(entry_gloss_json)),

  FOREIGN KEY (root_id)          REFERENCES "ar_ling_roots"(id),
  FOREIGN KEY (source_id)        REFERENCES ar_ling_sources(id),
  FOREIGN KEY (source_chunk_id)  REFERENCES ar_ling_source_chunks(id),

  UNIQUE(source_slug, root_norm)
);

CREATE VIRTUAL TABLE ar_ling_lexicon_root_entries_fts USING fts5(
  root_text,
  root_norm,
  source_slug,
  entry_text_ar,
  entry_text_en,
  raw_text,
  content='ar_ling_lexicon_root_entries',
  content_rowid='rowid'
);

CREATE TABLE ar_ling_lexicon_root_entry_sources (
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

CREATE TABLE "ar_ling_memlet_kinds" (
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
);

CREATE TABLE "ar_ling_memlet_media" (
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
  FOREIGN KEY (memlet_id) REFERENCES "ar_ling_memlets"(id)
);

CREATE TABLE "ar_ling_memlets" (
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
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (scope_level, scope_key, memlet_key),
  FOREIGN KEY (memlet_key) REFERENCES "ar_ling_memlet_kinds"(memlet_key),
  CHECK ((is_synthesis = 1 AND source_slug LIKE 'kmaps_%')
      OR (is_synthesis = 0 AND source_ref IS NOT NULL))
);

CREATE TABLE ar_ling_morph_corrections (
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
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (upstream_slug, scope, key_bw, field)
);

CREATE TABLE "ar_ling_morphology" (
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

CREATE VIRTUAL TABLE ar_ling_nahw_concepts_fts USING fts5(concept_name_ar, concept_name_en, definition_ar, definition_en);

CREATE TABLE "ar_ling_near_synonym_evidence" (
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

CREATE TABLE "ar_ling_near_synonym_member_sources" (
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

CREATE TABLE "ar_ling_near_synonym_members" (
  id              TEXT PRIMARY KEY,
  set_id          TEXT NOT NULL,
  lemma_id        TEXT NOT NULL,
  nuance_note     TEXT NOT NULL, arabic_display TEXT, arabic_bare TEXT, basic_gloss TEXT, contrast_note TEXT, usage_rule TEXT, quran_usage_pattern TEXT, source_status TEXT DEFAULT 'manual', claim_basis TEXT DEFAULT 'direct_source', confidence TEXT DEFAULT 'needs_review', sort_order INTEGER DEFAULT 0, basic_gloss_ur TEXT, contrast_note_ur TEXT, usage_rule_ur TEXT, quran_usage_pattern_ur TEXT, nuance_note_ur TEXT,
  UNIQUE (set_id, lemma_id),
  FOREIGN KEY (set_id)   REFERENCES "ar_ling_near_synonym_sets"(id),
  FOREIGN KEY (lemma_id) REFERENCES "ar_ling_lemmas"(id)
);

CREATE TABLE "ar_ling_near_synonym_review_queue" (
  id              TEXT PRIMARY KEY,
  set_id          TEXT,
  member_id       TEXT,
  evidence_id     TEXT,
  issue_type      TEXT NOT NULL,
  issue_detail    TEXT NOT NULL,
  source_id       TEXT,
  chunk_id        TEXT,
  status          TEXT NOT NULL DEFAULT 'open',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT
);

CREATE TABLE "ar_ling_near_synonym_set_sources" (
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

CREATE TABLE "ar_ling_near_synonym_sets" (
  id              TEXT PRIMARY KEY,
  set_name        TEXT NOT NULL,
  description_md  TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
, slug TEXT, canonical_en TEXT, canonical_ar TEXT, semantic_domain_id TEXT, pos_hint TEXT DEFAULT 'mixed', short_summary TEXT, source_status TEXT DEFAULT 'manual', confidence TEXT DEFAULT 'needs_review', review_status TEXT DEFAULT 'draft', updated_at TEXT, canonical_ur TEXT);

CREATE TABLE "ar_ling_question_distractors" (
  id             TEXT PRIMARY KEY,
  item_id        TEXT NOT NULL,
  option_ar TEXT NOT NULL, option_en TEXT, option_ur TEXT,
  is_correct     INTEGER NOT NULL DEFAULT 0,
  distractor_kind TEXT,
  why_wrong_ar TEXT, why_wrong_en TEXT, why_wrong_ur TEXT,
  source_ref     TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (item_id) REFERENCES "ar_ling_question_items"(id)
);

CREATE TABLE "ar_ling_question_items" (
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
  status         TEXT NOT NULL DEFAULT 'draft',
  FOREIGN KEY (question_key) REFERENCES "ar_ling_question_kinds"(question_key),
  FOREIGN KEY (memlet_id)    REFERENCES "ar_ling_memlets"(id)
);

CREATE TABLE "ar_ling_question_kinds" (
  question_key   TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  memlet_key     TEXT,
  response_kind  TEXT NOT NULL,
  cognitive_level TEXT NOT NULL,
  difficulty_floor INTEGER NOT NULL DEFAULT 1,
  is_arabic_only INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (memlet_key) REFERENCES "ar_ling_memlet_kinds"(memlet_key)
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
, primary_tables_json_bak TEXT, allowed_source_slugs_json_bak TEXT, code_alpha TEXT, scheme_version TEXT DEFAULT 'v1');

CREATE TABLE ar_ling_reg_table_discipline (table_name TEXT, discipline TEXT, is_primary INTEGER DEFAULT 0, PRIMARY KEY (table_name, discipline));

CREATE TABLE ar_ling_reg_table_map (
  db          TEXT NOT NULL,
  table_name  TEXT NOT NULL,
  cluster     TEXT NOT NULL,
  layer_code  TEXT,
  role        TEXT, sub_code TEXT, role_code TEXT, code_full TEXT, discipline TEXT,
  PRIMARY KEY (db, table_name)
);

CREATE TABLE "ar_ling_root_antonyms" (
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
, root_id TEXT, confidence REAL DEFAULT 0.8, generated_by TEXT);
CREATE INDEX idx_ar_root_antonyms_rid ON ar_ling_root_antonyms(root_id);

CREATE TABLE ar_ling_root_build_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  root TEXT NOT NULL,
  source TEXT NOT NULL,
  book_scope TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  root_entry_id INTEGER,
  result_summary TEXT,
  error_message TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT
, source_slug TEXT, book_order INTEGER, root_norm TEXT);

CREATE TABLE ar_ling_root_build_status (
  root_norm    TEXT NOT NULL,
  book_scope   TEXT NOT NULL,
  total_books  INTEGER NOT NULL,
  done_books   INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'pending',
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  PRIMARY KEY (root_norm, book_scope)
);

CREATE TABLE "ar_ling_root_development_stages" (
  id          TEXT PRIMARY KEY,               -- 'RDS:نذر:1'
  root_norm   TEXT NOT NULL,
  stage_no    INTEGER NOT NULL,
  stage_ar    TEXT NOT NULL, stage_en TEXT, stage_ur TEXT,
  note_en     TEXT,
  source_ref  TEXT,                            -- Maqāyīs block id etc. when grounded
  source_slug TEXT NOT NULL DEFAULT 'kmaps_development',
  status      TEXT NOT NULL DEFAULT 'draft',
  root_id TEXT, confidence REAL DEFAULT 0.8, generated_by TEXT,
  UNIQUE (root_norm, stage_no)
);
CREATE INDEX idx_ar_root_devstages_rid ON ar_ling_root_development_stages(root_id);

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
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (source_id) REFERENCES ar_ling_sources(id),
  FOREIGN KEY (root_id)   REFERENCES "ar_ling_roots"(id)
);

CREATE TABLE "ar_ling_root_sense_axes" (
  id          TEXT PRIMARY KEY,               -- 'RSA:نذر:speech_act'
  root_norm   TEXT NOT NULL,
  axis_key    TEXT NOT NULL,
  axis_ar TEXT, axis_en TEXT, axis_ur TEXT,
  weight      INTEGER NOT NULL DEFAULT 0 CHECK (weight BETWEEN 0 AND 3),
  basis_json  TEXT CHECK (basis_json IS NULL OR json_valid(basis_json)),   -- the āyāt scored
  note_en     TEXT,
  source_slug TEXT NOT NULL DEFAULT 'kmaps_usage_map',
  status      TEXT NOT NULL DEFAULT 'draft',
  root_id TEXT, confidence REAL DEFAULT 0.8, generated_by TEXT,
  UNIQUE (root_norm, axis_key)
);
CREATE INDEX idx_ar_root_sense_axes_rid ON ar_ling_root_sense_axes(root_id);

CREATE TABLE "ar_ling_root_variants" (
  id              TEXT PRIMARY KEY,
  root_id         TEXT NOT NULL,
  variant_text    TEXT NOT NULL,
  variant_type    TEXT NOT NULL DEFAULT 'alternate',
  note_md         TEXT,
  FOREIGN KEY (root_id) REFERENCES "ar_ling_roots"(id)
);

CREATE TABLE "ar_ling_root_vocab" (
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
, buckwalter      TEXT, simple_lat      TEXT, root_normalized TEXT, canonical_id TEXT);

CREATE VIRTUAL TABLE ar_ling_roots_fts USING fts5(
  id            UNINDEXED,
  root_text,
  root_normalized,
  buckwalter,
  simple_lat,
  meaning_core_en,
  tokenize = "unicode61 remove_diacritics 2"
);

CREATE TABLE "ar_ling_semantic_fields" (
  id              TEXT PRIMARY KEY,
  field_name_ar   TEXT NOT NULL,
  field_name_en   TEXT NOT NULL UNIQUE,
  parent_field_id TEXT,
  description_md  TEXT, field_name_ur TEXT,
  FOREIGN KEY (parent_field_id) REFERENCES "ar_ling_semantic_fields"(id)
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
  created_at      TEXT NOT NULL DEFAULT (datetime('now')), surah_no   INTEGER, ayah_start INTEGER, ayah_end   INTEGER, root_id     TEXT, source_slug TEXT,
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

CREATE TABLE ar_ling_source_entry_refs (
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
  FOREIGN KEY (source_id)       REFERENCES ar_ling_sources(id),
  FOREIGN KEY (source_chunk_id) REFERENCES ar_ling_source_chunks(id)
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
  id              TEXT PRIMARY KEY,
  title_ar        TEXT NOT NULL,
  title_en        TEXT,
  source_type     TEXT NOT NULL DEFAULT 'classical_grammar',
  author_ref      TEXT,
  author_name     TEXT,
  period_label    TEXT,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
, genre TEXT, slug              TEXT, origin            TEXT, bilingual         INTEGER NOT NULL DEFAULT 0, footnote_source   TEXT, quran_block_shape TEXT, source_order      INTEGER, author_death_ah INTEGER, author_death_ce INTEGER);

CREATE TABLE ar_ling_syn_lemma (
  id                 TEXT PRIMARY KEY,                
  syn_root_id        TEXT NOT NULL,                   
  lemma_id           TEXT,                            
  root_norm          TEXT NOT NULL,
  lemma_ar           TEXT NOT NULL,                   
  lemma_bare         TEXT,                            
  
  part_of_speech     TEXT,                            
  morph_type_ar      TEXT,                            
  morph_type_en      TEXT,
  wazn_ar            TEXT,                            
  verb_form          TEXT,                            
  is_mubalagha       INTEGER NOT NULL DEFAULT 0,       
  gender_default     TEXT,                            
  number_default     TEXT,                            
  definiteness_potential TEXT,                        
  derived_from_ar    TEXT,                            
  semantic_field_ar  TEXT,
  semantic_field_en  TEXT,
  
  properties_json    TEXT NOT NULL DEFAULT '{}'        
                      CHECK (json_valid(properties_json)),
  sense_ids_json     TEXT NOT NULL DEFAULT '[]'        
                      CHECK (json_valid(sense_ids_json)),
  evidence_json      TEXT NOT NULL DEFAULT '[]'        
                      CHECK (json_valid(evidence_json)),
  occurrence_count   INTEGER NOT NULL DEFAULT 0,        
  layer_code         TEXT NOT NULL DEFAULT 'AL:200-LEM:00-CORE:P',
  status             TEXT NOT NULL DEFAULT 'raw',
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (syn_root_id) REFERENCES ar_ling_syn_root(id),
  UNIQUE (syn_root_id, lemma_ar)
);

CREATE TABLE ar_ling_syn_lemma_sense (
  id            TEXT PRIMARY KEY,                     
  syn_lemma_id  TEXT NOT NULL,                        
  syn_sense_id  TEXT NOT NULL,                        
  is_primary    INTEGER NOT NULL DEFAULT 0,            
  note_ar       TEXT,
  note_en       TEXT,
  evidence_json TEXT NOT NULL DEFAULT '[]'
                CHECK (json_valid(evidence_json)),
  layer_code    TEXT NOT NULL DEFAULT 'AL:200-LEM:40-LINK:B',
  status        TEXT NOT NULL DEFAULT 'raw',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (syn_lemma_id) REFERENCES ar_ling_syn_lemma(id),
  FOREIGN KEY (syn_sense_id) REFERENCES ar_ling_syn_sense(id),
  UNIQUE (syn_lemma_id, syn_sense_id)
);

CREATE TABLE ar_ling_syn_root (
  id                   TEXT PRIMARY KEY,              
  root_id              TEXT NOT NULL,                 
  root_norm            TEXT NOT NULL,                 
  root_text            TEXT NOT NULL,                 
  asl_ar               TEXT,                          
  asl_en               TEXT,
  asl_ur               TEXT,
  is_addad             INTEGER NOT NULL DEFAULT 0,     
  polarity_json        TEXT NOT NULL DEFAULT '[]'      
                        CHECK (json_valid(polarity_json)),
  sense_family_summary_ar TEXT,
  sense_family_summary_en TEXT,
  method_notes_json    TEXT NOT NULL DEFAULT '[]'      
                        CHECK (json_valid(method_notes_json)),
  source_agreement_json TEXT NOT NULL DEFAULT '[]'     
                        CHECK (json_valid(source_agreement_json)),
  source_dispute_json  TEXT NOT NULL DEFAULT '[]'      
                        CHECK (json_valid(source_dispute_json)),
  evidence_json        TEXT NOT NULL DEFAULT '[]'      
                        CHECK (json_valid(evidence_json)),
  layer_code           TEXT NOT NULL DEFAULT 'AL:100-ROOT:00-CORE:P',
  status               TEXT NOT NULL DEFAULT 'raw',    
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (root_id) REFERENCES ar_ling_roots(id)
);

CREATE TABLE ar_ling_syn_sense (
  id                 TEXT PRIMARY KEY,                
  syn_root_id        TEXT NOT NULL,                   
  root_norm          TEXT NOT NULL,
  sense_key          TEXT NOT NULL,                   
  ordinal            INTEGER NOT NULL DEFAULT 0,       
  gloss_ar           TEXT,
  gloss_en           TEXT,
  gloss_ur           TEXT,
  is_core            INTEGER NOT NULL DEFAULT 0,       
  derivation_note_ar TEXT,                            
  derivation_note_en TEXT,
  evidence_json      TEXT NOT NULL DEFAULT '[]'        
                      CHECK (json_valid(evidence_json)),
  layer_code         TEXT NOT NULL DEFAULT 'AL:100-ROOT:40-LINK:A',
  status             TEXT NOT NULL DEFAULT 'raw',
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (syn_root_id) REFERENCES ar_ling_syn_root(id),
  UNIQUE (syn_root_id, sense_key)
);

CREATE TABLE ar_ling_vector_records (
  id                  TEXT PRIMARY KEY,
    
  target_db           TEXT NOT NULL,
    
  target_table        TEXT NOT NULL,
    
  target_id           TEXT NOT NULL,
    
  qdrant_id           TEXT NOT NULL,
    
  qdrant_collection   TEXT NOT NULL DEFAULT 'km_source_chunks_v1',
  model_name          TEXT NOT NULL,
  embedding_profile   TEXT,
  surah_no            INTEGER,
  ayah_start          INTEGER,
  ayah_end            INTEGER,
  work_id             TEXT,
    
  scholar_id          TEXT,
    
  chunk_kind          TEXT,
    
  source_slug         TEXT,
    
  text_hash           TEXT,
  embedded_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "ar_ling_verb_government" (
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
, transitivity_term_id TEXT, taddiya_route TEXT);

CREATE TABLE "ar_ling_vocab_memory_hooks" (
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

CREATE TABLE "ar_ling_word_sums" (
  id              TEXT PRIMARY KEY,
  lemma_ar        TEXT NOT NULL UNIQUE,
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
  FOREIGN KEY (root_norm) REFERENCES "ar_ling_roots"(root_normalized)
);

CREATE INDEX idx_arl_ct_paradigm ON "ar_ling_conjugation_templates"(paradigm_id);

CREATE INDEX idx_alej_collection
  ON ar_ling_embedding_jobs(collection_name);

CREATE INDEX idx_alej_status
  ON ar_ling_embedding_jobs(status);

CREATE INDEX idx_arl_ei_type ON ar_ling_evidence_items(evidence_type);

CREATE INDEX idx_alx_ayah       ON ar_ling_expressions(surah, ayah);

CREATE INDEX idx_alx_confidence ON ar_ling_expressions(confidence);

CREATE INDEX idx_alx_root       ON ar_ling_expressions(root_ar);

CREATE INDEX idx_alx_source     ON ar_ling_expressions(source_slug);

CREATE INDEX idx_alx_type       ON ar_ling_expressions(expression_type_id);

CREATE INDEX idx_arl_exp_lemma ON "ar_ling_expressions"(primary_lemma_id);

CREATE INDEX idx_arl_exp_type  ON "ar_ling_expressions"(expression_type_id);

CREATE INDEX idx_arl_fp_type ON "ar_ling_form_paradigms"(paradigm_type);

CREATE INDEX idx_arl_import_runs_source
  ON ar_ling_import_runs(source_id, started_at);

CREATE INDEX idx_arl_import_runs_status
  ON ar_ling_import_runs(status);

CREATE INDEX idx_arl_lane_patch_entry
  ON ar_ling_lane_patch_log(lexicon_entry_id);

CREATE INDEX idx_arl_lane_patch_root
  ON ar_ling_lane_patch_log(root_text);

CREATE INDEX idx_arl_lane_patch_status
  ON ar_ling_lane_patch_log(status);

CREATE INDEX idx_arl_lane_patch_type
  ON ar_ling_lane_patch_log(patch_type);

CREATE INDEX idx_arl_lane_quality_aor
  ON ar_ling_lane_quality_index(has_empty_aor);

CREATE INDEX idx_arl_lane_quality_inf
  ON ar_ling_lane_quality_index(has_empty_infinitive);

CREATE INDEX idx_arl_lane_quality_missing
  ON ar_ling_lane_quality_index(has_form_missing);

CREATE INDEX idx_arl_lane_quality_page
  ON ar_ling_lane_quality_index(page_no, source_entry_seq);

CREATE INDEX idx_arl_lane_quality_priority
  ON ar_ling_lane_quality_index(repair_priority DESC, page_no, source_entry_seq);

CREATE INDEX idx_arl_lane_quality_root
  ON ar_ling_lane_quality_index(root_text);

CREATE INDEX idx_arl_lane_quality_syn
  ON ar_ling_lane_quality_index(has_empty_synonym);

CREATE INDEX idx_arl_lane_source_pages_norm
  ON ar_ling_lane_source_pages(root_norm);

CREATE INDEX idx_arl_lane_source_pages_root
  ON ar_ling_lane_source_pages(root_text);

CREATE INDEX idx_arl_lane_source_pages_status
  ON ar_ling_lane_source_pages(parse_status);

CREATE INDEX idx_arl_lr_lemma    ON "ar_ling_lemma_registers"(lemma_id);

CREATE INDEX idx_arl_lr_register ON "ar_ling_lemma_registers"(register);

CREATE INDEX idx_arl_lemrootlink_root ON ar_ling_lemma_root_links(root_id);

CREATE INDEX idx_arl_lrl_lemma ON "ar_ling_lemma_root_links"(lemma_id);

CREATE INDEX idx_arl_lrl_root  ON "ar_ling_lemma_root_links"(root_id);

CREATE INDEX idx_arl_lem_pos  ON "ar_ling_lemmas"(part_of_speech);

CREATE INDEX idx_arl_lem_qrn  ON "ar_ling_lemmas"(is_quran_word);

CREATE INDEX idx_arl_lem_root ON "ar_ling_lemmas"(root_id);

CREATE INDEX idx_albka_block
  ON ar_ling_lexicon_block_annotations(block_id);

CREATE INDEX idx_albka_kind
  ON ar_ling_lexicon_block_annotations(annotation_kind);

CREATE INDEX idx_albka_user
  ON ar_ling_lexicon_block_annotations(user_id);

CREATE INDEX idx_albka_visibility
  ON ar_ling_lexicon_block_annotations(visibility);

CREATE INDEX idx_albl_auth
  ON ar_ling_lexicon_block_links(to_authority_code);

CREATE INDEX idx_albl_ayah
  ON ar_ling_lexicon_block_links(to_surah, to_ayah, link_kind);

CREATE INDEX idx_albl_block
  ON ar_ling_lexicon_block_links(to_block_id);

CREATE INDEX idx_albl_from
  ON ar_ling_lexicon_block_links(from_block_id);

CREATE INDEX idx_albl_kind
  ON ar_ling_lexicon_block_links(link_kind);

CREATE INDEX idx_albl_root
  ON ar_ling_lexicon_block_links(to_root_norm, link_kind);

CREATE INDEX idx_albl_source
  ON ar_ling_lexicon_block_links(source_slug);

CREATE INDEX idx_albt_source
  ON ar_ling_lexicon_block_tags(source);

CREATE INDEX idx_albt_tag
  ON ar_ling_lexicon_block_tags(tag);

CREATE INDEX idx_albk_book_page
  ON ar_ling_lexicon_blocks(book_page_id);

CREATE INDEX idx_albk_origin
  ON ar_ling_lexicon_blocks(origin);

CREATE INDEX idx_albk_parent
  ON ar_ling_lexicon_blocks(parent_block_id);

CREATE INDEX idx_albk_root_entry_seq
  ON ar_ling_lexicon_blocks(root_entry_id, block_seq);

CREATE INDEX idx_albk_root_norm
  ON ar_ling_lexicon_blocks(root_norm);

CREATE INDEX idx_albk_section
  ON ar_ling_lexicon_blocks(section_id);

CREATE INDEX idx_albk_source_root
  ON ar_ling_lexicon_blocks(source_slug, root_norm);

CREATE INDEX idx_albk_type
  ON ar_ling_lexicon_blocks(block_type);

CREATE INDEX idx_albp_import_batch
  ON ar_ling_lexicon_book_pages(import_batch_id);

CREATE INDEX idx_albp_printed_page
  ON ar_ling_lexicon_book_pages(source_slug, printed_page_start);

CREATE INDEX idx_albp_root_norm
  ON ar_ling_lexicon_book_pages(source_slug, root_norm);

CREATE INDEX idx_albp_source_slug
  ON ar_ling_lexicon_book_pages(source_slug);

CREATE INDEX idx_albp_volume_seq
  ON ar_ling_lexicon_book_pages(source_slug, volume_no, page_seq);

CREATE INDEX idx_allee_collection
  ON ar_ling_lexicon_entry_embeddings(collection_name);

CREATE INDEX idx_allee_hash
  ON ar_ling_lexicon_entry_embeddings(embedding_text_hash);

CREATE INDEX idx_allee_model
  ON ar_ling_lexicon_entry_embeddings(embedding_model);

CREATE INDEX idx_allee_status
  ON ar_ling_lexicon_entry_embeddings(status);

CREATE INDEX idx_ales_heading_norm
  ON ar_ling_lexicon_entry_sections(heading_norm);

CREATE INDEX idx_ales_page
  ON ar_ling_lexicon_entry_sections(page_no);

CREATE INDEX idx_ales_root_entry
  ON ar_ling_lexicon_entry_sections(root_entry_id);

CREATE INDEX idx_ales_root_norm
  ON ar_ling_lexicon_entry_sections(root_norm);

CREATE INDEX idx_ales_source_root
  ON ar_ling_lexicon_entry_sections(source_slug, root_norm);

CREATE INDEX idx_alqr_ayah
  ON ar_ling_lexicon_quran_refs(surah, ayah);

CREATE INDEX idx_alqr_block
  ON ar_ling_lexicon_quran_refs(block_id);

CREATE INDEX idx_alqr_root_entry
  ON ar_ling_lexicon_quran_refs(root_entry_id);

CREATE INDEX idx_alqr_root_norm
  ON ar_ling_lexicon_quran_refs(root_norm);

CREATE INDEX idx_alqr_source_ayah
  ON ar_ling_lexicon_quran_refs(source_slug, surah, ayah);

CREATE INDEX idx_alre_import_batch
  ON ar_ling_lexicon_root_entries(import_batch_id);

CREATE INDEX idx_alre_root_norm
  ON ar_ling_lexicon_root_entries(root_norm);

CREATE INDEX idx_alre_source_root
  ON ar_ling_lexicon_root_entries(source_slug, root_norm);

CREATE INDEX idx_alre_source_slug
  ON ar_ling_lexicon_root_entries(source_slug);

CREATE INDEX idx_alre_status
  ON ar_ling_lexicon_root_entries(status);

CREATE INDEX idx_arl_lexrootentry_root ON ar_ling_lexicon_root_entries(root_id);

CREATE INDEX idx_alres_kind
  ON ar_ling_lexicon_root_entry_sources(source_kind);

CREATE INDEX idx_alres_root_entry
  ON ar_ling_lexicon_root_entry_sources(root_entry_id);

CREATE INDEX idx_alres_slug
  ON ar_ling_lexicon_root_entry_sources(source_slug);

CREATE INDEX idx_arl_morph_pattern ON "ar_ling_morphology"(pattern);

CREATE UNIQUE INDEX ux_morph_flags ON "ar_ling_morphology"(qac_flags, pos);

CREATE INDEX idx_arl_nse_member_id     ON "ar_ling_near_synonym_evidence"(member_id);

CREATE INDEX idx_arl_nse_qr_ref        ON "ar_ling_near_synonym_evidence"(qr_ref);

CREATE INDEX idx_arl_nse_set_id        ON "ar_ling_near_synonym_evidence"(set_id);

CREATE INDEX idx_arl_nse_surah_ayah    ON "ar_ling_near_synonym_evidence"(surah, ayah);

CREATE INDEX idx_arl_nsm_arabic_bare   ON "ar_ling_near_synonym_members"(arabic_bare);

CREATE INDEX idx_arl_nsm_lemma ON "ar_ling_near_synonym_members"(lemma_id);

CREATE INDEX idx_arl_nsm_lemma_id      ON "ar_ling_near_synonym_members"(lemma_id);

CREATE INDEX idx_arl_nsm_set   ON "ar_ling_near_synonym_members"(set_id);

CREATE INDEX idx_arl_nsm_set_id        ON "ar_ling_near_synonym_members"(set_id);

CREATE INDEX idx_arl_nss_domain        ON "ar_ling_near_synonym_sets"(semantic_domain_id);

CREATE INDEX idx_arl_nss_slug          ON "ar_ling_near_synonym_sets"(slug);

CREATE INDEX idx_aql_al_entity
  ON ar_ling_quran_links(al_entity_ref, al_entity_type);

CREATE INDEX idx_aql_al_type
  ON ar_ling_quran_links(al_entity_type);

CREATE INDEX idx_aql_link_type
  ON ar_ling_quran_links(link_type);

CREATE INDEX idx_aql_qr_scope
  ON ar_ling_quran_links(qr_scope_ref);

CREATE INDEX idx_arl_ql_entity ON ar_ling_quran_links(al_entity_ref);

CREATE INDEX idx_arl_ql_qr     ON ar_ling_quran_links(qr_scope_ref);

CREATE INDEX idx_reg_tmap_cluster ON ar_ling_reg_table_map(cluster);

CREATE INDEX idx_reg_tmap_layer ON ar_ling_reg_table_map(layer_code, db);

CREATE INDEX idx_ar_rant_root ON "ar_ling_root_antonyms"(root_norm, sort_order);

CREATE INDEX idx_ar_ling_root_build_jobs_status
  ON ar_ling_root_build_jobs (status, priority DESC, created_at ASC);

CREATE UNIQUE INDEX uq_ar_ling_root_build_jobs
  ON ar_ling_root_build_jobs (root, source_slug, COALESCE(book_scope,''));

CREATE INDEX idx_arl_rootschol_root ON ar_ling_root_scholarship(root_id);

CREATE INDEX idx_root_scholarship_kind      ON "ar_ling_root_scholarship"(reading_kind);

CREATE INDEX idx_root_scholarship_root_norm ON "ar_ling_root_scholarship"(root_norm);

CREATE INDEX idx_root_scholarship_slug_root ON "ar_ling_root_scholarship"(source_slug, root_norm);

CREATE INDEX idx_root_scholarship_source    ON "ar_ling_root_scholarship"(source_id);

CREATE INDEX idx_arl_rootvariants_root ON ar_ling_root_variants(root_id);

CREATE INDEX idx_arl_rv_root ON "ar_ling_root_variants"(root_id);

CREATE INDEX idx_arl_root_freq ON "ar_ling_roots"(frequency_quran);

CREATE INDEX idx_arl_root_type ON "ar_ling_roots"(root_type);

CREATE INDEX idx_rl_bw      ON "ar_ling_roots"(buckwalter);

CREATE INDEX idx_rl_norm    ON "ar_ling_roots"(root_normalized);

CREATE INDEX idx_rl_simple  ON "ar_ling_roots"(simple_lat);

CREATE INDEX ix_roots_canonical ON ar_ling_roots(canonical_id);

CREATE INDEX ix_roots_normalized ON ar_ling_roots(root_normalized);

CREATE UNIQUE INDEX ux_roots_norm ON "ar_ling_roots"(root_normalized);

CREATE INDEX idx_arl_sc_embedded ON ar_ling_source_chunks(is_embedded);

CREATE INDEX idx_arl_sc_heading
  ON ar_ling_source_chunks(heading_norm);

CREATE INDEX idx_arl_sc_kind     ON ar_ling_source_chunks(chunk_kind);

CREATE INDEX idx_arl_sc_root_id
  ON ar_ling_source_chunks(root_id);

CREATE INDEX idx_arl_sc_root_source
  ON ar_ling_source_chunks(heading_norm, source_slug);

CREATE INDEX idx_arl_sc_slug
  ON ar_ling_source_chunks(source_slug);

CREATE INDEX idx_arl_sc_source   ON ar_ling_source_chunks(source_id);

CREATE INDEX idx_arl_sc_surah
  ON ar_ling_source_chunks(surah_no, ayah_start);

CREATE INDEX idx_arl_se_source ON ar_ling_source_editions(source_id);

CREATE INDEX idx_arl_ser_buck
  ON ar_ling_source_entry_refs(source_id, buck);

CREATE INDEX idx_arl_ser_chunk
  ON ar_ling_source_entry_refs(source_chunk_id);

CREATE INDEX idx_arl_ser_headword
  ON ar_ling_source_entry_refs(source_id, headword_ar);

CREATE INDEX idx_arl_ser_page
  ON ar_ling_source_entry_refs(source_id, page_no);

CREATE INDEX idx_arl_ser_source_node
  ON ar_ling_source_entry_refs(source_id, external_node_id);

CREATE INDEX idx_arl_si_keyword ON ar_ling_source_index(keyword);

CREATE INDEX idx_arl_si_source  ON ar_ling_source_index(source_id);

CREATE INDEX idx_arl_toc_source ON ar_ling_source_toc(source_id);

CREATE INDEX idx_ar_ling_sources_origin
  ON ar_ling_sources(origin);

CREATE UNIQUE INDEX idx_ar_ling_sources_slug
  ON ar_ling_sources(slug) WHERE slug IS NOT NULL;

CREATE INDEX idx_ar_ling_sources_source_order
  ON ar_ling_sources(source_order) WHERE source_order IS NOT NULL;

CREATE INDEX idx_arl_src_type ON ar_ling_sources(source_type);

CREATE INDEX idx_syn_lemma_bare ON ar_ling_syn_lemma(lemma_bare);

CREATE INDEX idx_syn_lemma_root ON ar_ling_syn_lemma(syn_root_id);

CREATE INDEX idx_syn_lemma_status ON ar_ling_syn_lemma(status);

CREATE INDEX idx_syn_ls_lemma ON ar_ling_syn_lemma_sense(syn_lemma_id);

CREATE INDEX idx_syn_ls_sense ON ar_ling_syn_lemma_sense(syn_sense_id);

CREATE INDEX idx_arl_synroot_root ON ar_ling_syn_root(root_id);

CREATE INDEX idx_syn_root_norm ON ar_ling_syn_root(root_norm);

CREATE INDEX idx_syn_root_status ON ar_ling_syn_root(status);

CREATE INDEX idx_syn_sense_root ON ar_ling_syn_sense(syn_root_id);

CREATE INDEX idx_syn_sense_status ON ar_ling_syn_sense(status);

CREATE UNIQUE INDEX idx_alvr_qdrant
  ON ar_ling_vector_records(qdrant_id);

CREATE INDEX idx_alvr_surah
  ON ar_ling_vector_records(surah_no, ayah_start);

CREATE INDEX idx_alvr_target
  ON ar_ling_vector_records(target_table, target_id);

CREATE INDEX idx_alvr_work
  ON ar_ling_vector_records(work_id);

CREATE INDEX idx_ar_vgov_root ON "ar_ling_verb_government"(root_norm, sort_order);


-- ── Universal Root relational layer (migrations 0035-0037, applied 2026-07-17) ──
CREATE TABLE "ar_ling_root_senses" (
  id TEXT PRIMARY KEY, root_id TEXT, root_norm TEXT NOT NULL, sense_key TEXT NOT NULL,
  gloss_ar TEXT, gloss_en TEXT, gloss_ur TEXT, definition_md TEXT,
  is_core INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0,
  basis_json TEXT CHECK (basis_json IS NULL OR json_valid(basis_json)),
  provenance_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(provenance_json)),
  confidence REAL DEFAULT 0.8, generated_by TEXT,
  source_slug TEXT NOT NULL DEFAULT 'kmaps_sense_map', status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (root_norm, sense_key), FOREIGN KEY (root_id) REFERENCES ar_ling_roots(id));
CREATE INDEX idx_ar_root_senses_root ON ar_ling_root_senses(root_norm, sort_order);
CREATE INDEX idx_ar_root_senses_core ON ar_ling_root_senses(root_norm, is_core);

CREATE TABLE "ar_ling_root_semantic_fields" (
  id TEXT PRIMARY KEY, root_id TEXT, root_norm TEXT NOT NULL, field_id TEXT NOT NULL, sense_id TEXT,
  weight INTEGER NOT NULL DEFAULT 0 CHECK (weight BETWEEN 0 AND 3), is_primary INTEGER NOT NULL DEFAULT 0,
  note_md TEXT, provenance_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(provenance_json)),
  confidence REAL DEFAULT 0.8, generated_by TEXT, source_slug TEXT NOT NULL DEFAULT 'kmaps_field_map',
  status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (root_norm, field_id, sense_id),
  FOREIGN KEY (root_id) REFERENCES ar_ling_roots(id),
  FOREIGN KEY (field_id) REFERENCES ar_ling_semantic_fields(id),
  FOREIGN KEY (sense_id) REFERENCES ar_ling_root_senses(id));
CREATE INDEX idx_ar_root_fields_root ON ar_ling_root_semantic_fields(root_norm, is_primary);
CREATE INDEX idx_ar_root_fields_field ON ar_ling_root_semantic_fields(field_id);

CREATE TABLE "ar_ling_root_relations" (
  id TEXT PRIMARY KEY, from_root_id TEXT, from_root_norm TEXT NOT NULL, to_root_id TEXT, to_root_norm TEXT NOT NULL,
  relation_kind TEXT NOT NULL, from_sense_id TEXT, to_sense_id TEXT,
  direction TEXT NOT NULL DEFAULT 'directed', strength INTEGER NOT NULL DEFAULT 0 CHECK (strength BETWEEN 0 AND 3),
  gloss_en TEXT, note_md TEXT, evidence_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(evidence_json)),
  provenance_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(provenance_json)), confidence REAL DEFAULT 0.8,
  generated_by TEXT, source_ref TEXT, source_slug TEXT NOT NULL DEFAULT 'kmaps_root_graph',
  sort_order INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (from_root_norm, to_root_norm, relation_kind),
  FOREIGN KEY (from_root_id) REFERENCES ar_ling_roots(id), FOREIGN KEY (to_root_id) REFERENCES ar_ling_roots(id),
  FOREIGN KEY (from_sense_id) REFERENCES ar_ling_root_senses(id), FOREIGN KEY (to_sense_id) REFERENCES ar_ling_root_senses(id));
CREATE INDEX idx_ar_root_rel_from ON ar_ling_root_relations(from_root_norm, relation_kind, sort_order);
CREATE INDEX idx_ar_root_rel_to ON ar_ling_root_relations(to_root_norm, relation_kind);
CREATE INDEX idx_ar_root_rel_kind ON ar_ling_root_relations(relation_kind);

CREATE VIEW ar_ling_root_edges_v AS
  SELECT 'antonym' AS origin_table, a.id AS edge_id, NULL AS from_root_id, a.root_norm AS from_root_norm,
    NULL AS to_root_id, COALESCE(a.antonym_root, a.antonym_ar) AS to_root_norm, a.relation_kind AS relation_kind,
    NULL AS strength, a.antonym_en AS gloss_en, NULL AS evidence_json, a.status AS status, a.created_at AS created_at
  FROM ar_ling_root_antonyms a
  UNION ALL
  SELECT 'relation', r.id, r.from_root_id, r.from_root_norm, r.to_root_id, r.to_root_norm, r.relation_kind,
    r.strength, r.gloss_en, r.evidence_json, r.status, r.created_at
  FROM ar_ling_root_relations r
  UNION ALL
  SELECT 'synonym_family', s.id, s.root_id, s.root_norm, NULL, NULL,
    CASE WHEN s.is_addad = 1 THEN 'addad_family' ELSE 'synonym_family' END,
    NULL, s.sense_family_summary_en, s.evidence_json, s.status, s.created_at
  FROM ar_ling_syn_root s;
