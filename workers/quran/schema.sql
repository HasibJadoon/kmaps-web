-- Schema for km_quran.
-- Generated from remote Cloudflare D1 sqlite_schema with data excluded, 2026-10-02.
-- Internal D1 bookkeeping tables and FTS5 shadow tables are omitted.
-- Regenerate with scripts/regen_schemas.py — do not hand-edit.

-- ── Tables (210) ─────────────────────────────────────────────────

CREATE TABLE "ar_ling_gram_category" (
  category_key   TEXT PRIMARY KEY,
  name_ar TEXT NOT NULL, name_en TEXT NOT NULL, name_ur TEXT NOT NULL,
  discipline     TEXT NOT NULL,
  applies_to     TEXT NOT NULL,
  is_closed      INTEGER NOT NULL DEFAULT 1,
  display_order  INTEGER NOT NULL DEFAULT 0,
  icon           TEXT
);

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
  status      TEXT NOT NULL DEFAULT 'live', discipline TEXT, is_default_when_absent INTEGER NOT NULL DEFAULT 0, uid TEXT, qac_scope TEXT, applies_when TEXT, name_bare TEXT, aliases_json TEXT,
  UNIQUE (category_key, term_key),
  UNIQUE (category_key, qac_flag),
  FOREIGN KEY (category_key)   REFERENCES "ar_ling_gram_category"(category_key),
  FOREIGN KEY (parent_term_id) REFERENCES "ar_ling_gram_term"(id)
);

CREATE TABLE ar_ling_gram_term_alias (
  alias_bare   TEXT NOT NULL,
  term_id      TEXT NOT NULL,
  category_key TEXT NOT NULL,
  alias_raw    TEXT NOT NULL,
  alias_lang   TEXT NOT NULL DEFAULT 'ar',
  alias_kind   TEXT NOT NULL DEFAULT 'variant',
  source       TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (alias_bare, category_key)
);

CREATE TABLE ar_ling_gram_term_source (
  term_id     TEXT NOT NULL,
  source_slug TEXT NOT NULL,
  page_ref    TEXT,
  PRIMARY KEY (term_id, source_slug)
);

CREATE TABLE core_concept (
  id          TEXT PRIMARY KEY,
  uid         TEXT NOT NULL UNIQUE,
  concept_key TEXT NOT NULL,
  label_en    TEXT,
  label_ar    TEXT,
  domain      TEXT NOT NULL,
  origin      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'live',
  note_md     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "gc_concept" (
  id           TEXT PRIMARY KEY,
  uid          TEXT NOT NULL,
  concept_key  TEXT NOT NULL,
  label_en     TEXT,
  label_ar     TEXT,
  domain       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'live',
  synced_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "gc_sync_meta" (
  registry     TEXT PRIMARY KEY,
  source_db    TEXT NOT NULL,
  source_table TEXT NOT NULL,
  row_count    INTEGER NOT NULL,
  synced_at    TEXT NOT NULL DEFAULT (datetime('now')),
  note         TEXT
);

CREATE TABLE "gt_sync_meta" (
  registry     TEXT PRIMARY KEY,
  source_db    TEXT NOT NULL,
  source_table TEXT NOT NULL,
  row_count    INTEGER NOT NULL,
  expected_count INTEGER,
  sync_status  TEXT NOT NULL DEFAULT 'complete',
  synced_at    TEXT NOT NULL DEFAULT (datetime('now')),
  note         TEXT
);

CREATE TABLE "gt_term" (
  id             TEXT PRIMARY KEY,
  uid            TEXT,
  category_key   TEXT NOT NULL,
  term_key       TEXT NOT NULL,
  parent_term_id TEXT,
  name_ar        TEXT,
  name_en        TEXT,
  name_ur        TEXT,
  discipline     TEXT,
  term_order     INTEGER,
  status         TEXT NOT NULL DEFAULT 'live',
  synced_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE kmaps_cache_version (
  family     TEXT PRIMARY KEY,
  version    TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE "qr_analysis_claim" (
  id                   TEXT PRIMARY KEY,
  scope_id             TEXT NOT NULL,
  claim_type           TEXT NOT NULL,
  claim_text           TEXT NOT NULL,
  claim_text_ar        TEXT,
  confidence           TEXT NOT NULL DEFAULT 'proposed',
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (scope_id) REFERENCES "qr_analysis_scope"(id)
);

CREATE VIRTUAL TABLE qr_analysis_claims_fts USING fts5(scope_id UNINDEXED, claim_type, claim_text, claim_text_ar);

CREATE TABLE "qr_analysis_scope" (
  id                   TEXT PRIMARY KEY,
  scope_type           TEXT NOT NULL,
  surah                INTEGER,
  ayah_from            INTEGER,
  ayah_to              INTEGER,
  ref_id               TEXT,
  label                TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_argument" (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER,
  title                TEXT NOT NULL,
  title_ar             TEXT,
  argument_type        TEXT NOT NULL DEFAULT 'analytical',
  summary_md           TEXT NOT NULL,
  claims_json          TEXT,
  evidence_ids_json    TEXT,
  confidence           TEXT NOT NULL DEFAULT 'proposed',
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_argument_link" (
  id                   TEXT PRIMARY KEY,
  from_argument_id     TEXT NOT NULL,
  to_argument_id       TEXT NOT NULL,
  relation_type        TEXT NOT NULL,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_argument_id) REFERENCES "qr_argument"(id),
  FOREIGN KEY (to_argument_id)   REFERENCES "qr_argument"(id)
);

CREATE TABLE qr_ayah (
  id                TEXT PRIMARY KEY,
  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  text_uthmani_clean TEXT,
  text_uthmani      TEXT,
  text_bare         TEXT,
  text              TEXT,
  translation       TEXT,
  verse_mark        TEXT,
  page_number       INTEGER,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')), juz INTEGER, hizb INTEGER, ruku INTEGER,
  UNIQUE (surah, ayah),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_citation" (
  id TEXT PRIMARY KEY, root_norm TEXT, from_domain TEXT NOT NULL DEFAULT 'qr',
  from_layer TEXT NOT NULL, from_id TEXT NOT NULL, to_ref TEXT NOT NULL, to_kind TEXT NOT NULL,
  relation TEXT NOT NULL DEFAULT 'grounds', source_slug TEXT, page_no INTEGER, quote_ar TEXT,
  confidence REAL, origin TEXT NOT NULL DEFAULT 'backfill', status TEXT NOT NULL DEFAULT 'live',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (from_domain, from_layer, from_id, to_ref, relation)
);

CREATE TABLE "qr_claim_evidence_link" (
  id                   TEXT PRIMARY KEY,
  claim_id             TEXT NOT NULL,
  evidence_id          TEXT NOT NULL,
  support_type         TEXT NOT NULL DEFAULT 'supports',
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (claim_id, evidence_id),
  FOREIGN KEY (claim_id)   REFERENCES "qr_analysis_claim"(id),
  FOREIGN KEY (evidence_id) REFERENCES "qr_evidence"(id)
);

CREATE TABLE qr_corpus_version (id INTEGER PRIMARY KEY CHECK (id = 1), version TEXT NOT NULL, built_at TEXT, note TEXT, updated_at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE TABLE qr_cross_ref (
  id                TEXT PRIMARY KEY,
  type_code         TEXT NOT NULL REFERENCES qr_cross_type(type_code),
  origin_kind       TEXT NOT NULL,
  origin_id         TEXT,
  origin_surah      INTEGER,
  origin_ayah_from  INTEGER,
  origin_ayah_to    INTEGER,
  origin_char_start INTEGER,
  origin_char_len   INTEGER,
  target_surah      INTEGER,
  target_ayah_from  INTEGER,
  target_ayah_to    INTEGER,
  target_passage_id TEXT,
  target_concept_ref TEXT,
  target_label_ar   TEXT,
  target_label_en   TEXT,
  author_kind       TEXT NOT NULL,
  author_slug       TEXT,
  cited_function    TEXT,
  quote_ar          TEXT,
  quote_en          TEXT,
  relation          TEXT,
  verified          INTEGER NOT NULL DEFAULT 0,
  display_order     INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'live',
  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_cross_type (
  type_code     TEXT PRIMARY KEY,
  scope         TEXT NOT NULL,
  name_ar       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  name_ur       TEXT,
  description_en TEXT,
  target_shape  TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'live'
);

CREATE TABLE "qr_debate_cluster" (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER,
  title_en             TEXT NOT NULL,
  title_ar             TEXT,
  cluster_type         TEXT NOT NULL DEFAULT 'theological',
  scope_description    TEXT,
  arguments_json       TEXT,
  summary_md           TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_doc_link" (
  id                   TEXT PRIMARY KEY,
  qr_scope_type        TEXT NOT NULL,
  qr_scope_id          TEXT NOT NULL,
  cm_doc_ref           TEXT NOT NULL,
  link_type            TEXT NOT NULL DEFAULT 'discusses',
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_drill_anchor (
  id          TEXT PRIMARY KEY,     -- ns:<member>:<s>:<a>:<w> · sk:<entry>:<term>:<s>:<a>:<w> · kc:<entry>:<s>:<a> · ex:<source row>[:<s>:<a>]
  family      TEXT NOT NULL,        -- nearsyn | keyterm | expression
  source      TEXT NOT NULL,        -- furuq · sinai_key_terms · sinai_cite · mir_verbal_idioms · adima_dirasat · kmaps_tadiya · ibn_ashur · kmaps_passage_study
  ref         TEXT NOT NULL,        -- AL typed ref: NS:<set>|<member> · SK:<entry>|<term> · TB:<tabir id> · TD:<tadiya id> · SV:<root>|<translit>
  grp         TEXT,                 -- what the options come from: the set · the entry · <root>|<particle> · type|<expression type>
  surah       INTEGER NOT NULL,
  ayah        INTEGER NOT NULL,
  word_index  INTEGER,              -- the marked word (qr_word_occurrence.word_index); NULL = the āyah as a whole
  word_to     INTEGER,              -- the particle / the last word of a multi-word term
  word_text   TEXT,
  lemma       TEXT,
  root        TEXT,                 -- the corpus root
  al_root     TEXT,                 -- the root as the source keys it
  match       TEXT NOT NULL,        -- lemma · evidence · surface · root · root_geminate · root_weak · …+key<n> (the view's key) · renumbered · cited
  head_ar     TEXT,                 -- the member / term / expression as the source writes it
  label_en    TEXT,                 -- its gloss / sense (the set's name for a near-synonym; Sinai's citing sentence for sinai_cite)
  note        TEXT,                 -- the source's note (Mir's explanation, the frame's Arabic, the term's transliteration)
  status      TEXT                  -- the source row's review status (a furūq set: source_status:review_status)
);

CREATE TABLE "qr_evidence" (
  id                   TEXT PRIMARY KEY,
  evidence_type        TEXT NOT NULL,
  provenance           TEXT,
  locator              TEXT,
  content_text         TEXT NOT NULL,
  content_text_ar      TEXT,
  is_disputed          INTEGER NOT NULL DEFAULT 0,
  dispute_note         TEXT,
  source_ref           TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE qr_evidence_items_fts USING fts5(evidence_type, provenance, content_text, content_text_ar);

CREATE TABLE "qr_historical_context" (
  surah                INTEGER PRIMARY KEY,
  arabian_milieu       TEXT,
  political_context    TEXT,
  late_antique_setting TEXT,
  inter_scriptural_env TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_inquiry" (
  id             TEXT PRIMARY KEY,
  scope_kind     TEXT NOT NULL,
  scope_ref      TEXT,
  surah          INTEGER,
  ayah_from      INTEGER,
  ayah_to        INTEGER,
  gt_term_ref    TEXT,
  discipline     TEXT,
  question_en    TEXT NOT NULL,
  question_ar    TEXT,
  question_ur    TEXT,
  issue_md       TEXT,
  answer_md      TEXT,
  summary_md     TEXT,
  verdict_md     TEXT,
  is_contested   INTEGER NOT NULL DEFAULT 0,
  asked_by       TEXT NOT NULL DEFAULT 'hasib',
  status         TEXT NOT NULL DEFAULT 'draft',
  note_md        TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_inquiry_position" (
  id             TEXT PRIMARY KEY,
  inquiry_id     TEXT NOT NULL,
  scholar_id     TEXT,
  school         TEXT,
  position_id    TEXT,
  stance_label   TEXT NOT NULL,
  claim_md       TEXT NOT NULL,
  mechanism_md   TEXT,
  evidence_md    TEXT,
  objection_md   TEXT,
  reply_md       TEXT,
  relation_to    TEXT,
  relation_kind  TEXT,
  is_primary     INTEGER NOT NULL DEFAULT 0,
  is_rejected    INTEGER NOT NULL DEFAULT 0,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  note_md        TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (inquiry_id) REFERENCES "qr_inquiry"(id) ON DELETE CASCADE,
  FOREIGN KEY (scholar_id) REFERENCES "qr_scholar_profile"(id)
);

CREATE TABLE "qr_inquiry_ref" (
  id             TEXT PRIMARY KEY,
  inquiry_id     TEXT NOT NULL,
  ip_id          TEXT,
  ref_kind       TEXT NOT NULL,
  ref_db         TEXT,
  ref_id         TEXT,
  source_slug    TEXT,
  locator        TEXT,
  quote_ar       TEXT,
  gloss_json     TEXT,
  is_verbatim    INTEGER NOT NULL DEFAULT 1,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (inquiry_id) REFERENCES "qr_inquiry"(id) ON DELETE CASCADE,
  FOREIGN KEY (ip_id) REFERENCES "qr_inquiry_position"(id) ON DELETE CASCADE
);

CREATE TABLE "qr_inquiry_scope" (
  id           TEXT PRIMARY KEY,
  inquiry_id   TEXT NOT NULL,
  scope_kind   TEXT NOT NULL,
  scope_ref    TEXT,
  surah        INTEGER,
  ayah_from    INTEGER,
  ayah_to      INTEGER,
  label        TEXT,
  is_primary   INTEGER NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (inquiry_id) REFERENCES "qr_inquiry"(id) ON DELETE CASCADE,
  FOREIGN KEY (scope_kind) REFERENCES "qr_inquiry_scope_kind"(key)
);

CREATE TABLE "qr_inquiry_scope_kind" (
  key          TEXT PRIMARY KEY,
  label_en     TEXT NOT NULL,
  label_ar     TEXT,
  ref_pattern  TEXT,
  needs_surah  INTEGER NOT NULL DEFAULT 0,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'live'
);

CREATE TABLE "qr_interpretive_difference" (
  id                   TEXT PRIMARY KEY,
  scope_type           TEXT NOT NULL,
  surah                INTEGER,
  ayah_from            INTEGER,
  ayah_to              INTEGER,
  question_ar          TEXT NOT NULL,
  question_en          TEXT,
  difference_type      TEXT NOT NULL DEFAULT 'meaning',
  positions_summary    TEXT,
  majority_view        TEXT,
  minority_view        TEXT,
  resolution_note      TEXT,
  is_doctrinally_significant INTEGER NOT NULL DEFAULT 0,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_irab_book_display_block" (
  id                  TEXT PRIMARY KEY,
  -- Provenance ----------------------------------------------------------------
  source_id           TEXT,
  source_chunk_id     TEXT,                            -- → qr_irab_source_chunks.id (NULL for Phase A entry-only blocks)
  source_entry_id     TEXT,                            -- → qr_irab_book_entries.id when projected from entries (Phase A)
  source_slug         TEXT NOT NULL,
  book_title          TEXT,
  author              TEXT,
  -- Locator -------------------------------------------------------------------
  surah_no            INTEGER,
  ayah_no             INTEGER,                         -- start ayah (best-effort; trust ayah_keys_json for span)
  ayah_to             INTEGER,                         -- end ayah of range
  ayah_key            TEXT,                            -- e.g. "2:3" — singleton anchor
  ayah_group_key      TEXT,                            -- e.g. "2:1-5" — canonical group form
  ayah_keys_json      JSON,                            -- e.g. ["2:1","2:2","2:3","2:4","2:5"]
  is_grouped          INTEGER NOT NULL DEFAULT 0,      -- 1 if span > 1 ayah
  word_index          INTEGER,
  word_text           TEXT,                            -- bare word as displayed
  phrase_text         TEXT,
  scope_type          TEXT,
  -- Block identity ------------------------------------------------------------
  block_type          TEXT NOT NULL,
  block_subtype       TEXT,                            -- finer category, free-form
  display_order       INTEGER NOT NULL DEFAULT 0,
  -- Content -------------------------------------------------------------------
  title_ar            TEXT,
  title_en            TEXT,
  text_ar             TEXT,
  text_en             TEXT,
  raw_text            TEXT,                            -- preserved verbatim
  -- Denormalized arrays for one-shot UI rendering -----------------------------
  tags_json               JSON,                        -- ["tafsir","2:3","jadwal"]
  grammar_tags_json       JSON,                        -- ["اسم موصول","مبني","فاعل"]
  sarf_tags_json          JSON,                        -- ["أفعال خمسة","حذف الهمزة"]
  balagha_tags_json       JSON,                        -- ["تكرار","تبعيض"]
  quran_refs_json         JSON,                        -- [{surah,ayah,word_index?}]
  backlinks_json          JSON,                        -- [{block_id,kind,label}]
  related_links_json      JSON,                        -- [{block_id,kind,label}]
  external_resource_json  JSON,                        -- {"r2_key":"…","kind":"svg","bytes":N} for dependency_graph blocks
  -- Provenance / QA -----------------------------------------------------------
  confidence          TEXT DEFAULT 'medium',
  review_status       TEXT NOT NULL DEFAULT 'ai_candidate',
  extraction_method   TEXT DEFAULT 'regex_parser',
  meta_json           JSON,
  -- Audit ---------------------------------------------------------------------
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE "qr_irab_book_display_block_fts"
USING fts5 (
  block_id UNINDEXED,
  source_slug UNINDEXED,
  surah_no UNINDEXED,
  ayah_no UNINDEXED,
  ayah_key UNINDEXED,
  ayah_group_key UNINDEXED,
  block_type UNINDEXED,
  title_ar, title_en,
  text_ar, text_en,
  raw_text,
  tokenize = "unicode61 remove_diacritics 2"
);

CREATE TABLE "qr_irab_book_display_link" (
  id            TEXT PRIMARY KEY,
  from_block_id TEXT NOT NULL,
  to_block_id   TEXT NOT NULL,
  link_kind     TEXT NOT NULL,                         -- 'backlink'|'related'|'same_ayah'|'same_word'|'same_grammar'|'comparison'|'disagreement'
  label         TEXT,
  weight        INTEGER NOT NULL DEFAULT 1,
  meta_json     JSON,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_irab_book_display_note" (
  id              TEXT PRIMARY KEY,
  block_id        TEXT,                                -- nullable: notes can stand alone
  note_kind       TEXT NOT NULL,                       -- 'author'|'teaching'|'footnote'|'reviewer'
  note_text_ar    TEXT,
  note_text_en    TEXT,
  is_inline       INTEGER NOT NULL DEFAULT 0,          -- inline footnote vs side-note
  surah_no        INTEGER,                             -- denormalized for filtering
  ayah_no         INTEGER,
  ayah_key        TEXT,                                -- "2:3"
  ayah_group_key  TEXT,                                -- "2:1-5" — filter by group quickly
  source_slug     TEXT,
  display_order   INTEGER NOT NULL DEFAULT 0,
  meta_json       JSON,
  review_status   TEXT NOT NULL DEFAULT 'ai_candidate',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_irab_book_display_ref" (
  id              TEXT PRIMARY KEY,
  block_id        TEXT NOT NULL,
  ref_kind        TEXT NOT NULL,                       -- 'ayah'|'word'|'lemma'|'root'|'concept'
  surah_no        INTEGER,
  ayah_no         INTEGER,
  ayah_to         INTEGER,
  ayah_key        TEXT,                                -- "2:3"
  ayah_group_key  TEXT,                                -- "2:1-5" — filter by group quickly
  word_index      INTEGER,
  typed_ref       TEXT,                                -- e.g. 'AL:01HX…' | 'QR:2:3:1' | 'LX:…'
  label           TEXT,                                -- display label for the chip
  meta_json       JSON,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_irab_book_display_source" (
  id                TEXT PRIMARY KEY,                  -- mirrors qr_irab_sources.id
  source_slug       TEXT NOT NULL UNIQUE,
  book_title_ar     TEXT,
  book_title_en     TEXT,
  author_name_ar    TEXT,
  author_name_en    TEXT,
  author_period     TEXT,                              -- e.g. "Classical (d. 745 AH)"
  badge_color       TEXT,                              -- UI hint, hex like '#C9A227'
  badge_glyph       TEXT,                              -- UI hint, short symbol
  short_description TEXT,
  long_description  TEXT,
  cover_image_url   TEXT,
  display_order     INTEGER DEFAULT 0,
  is_visible        INTEGER NOT NULL DEFAULT 1,
  meta_json         JSON,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_irab_book_display_tag" (
  id              TEXT PRIMARY KEY,
  block_id        TEXT NOT NULL,                       -- → qr_iraab_book_display_blocks.id
  tag_kind        TEXT NOT NULL,                       -- 'general'|'grammar'|'sarf'|'balagha'|'topic'|'review'
  tag_value       TEXT NOT NULL,                       -- 'اسم موصول' | 'tafsir' | 'needs_review' …
  tag_value_norm  TEXT,                                -- diacritics-stripped form for matching
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_irab_book_entry" (
  id TEXT PRIMARY KEY,
  source_id TEXT,
  source_slug TEXT NOT NULL,
  source_title TEXT,
  ayah_key TEXT NOT NULL,
  group_ayah_key TEXT,
  from_ayah TEXT,
  to_ayah TEXT,
  ayah_keys TEXT,
  surah INTEGER,
  ayah_from INTEGER,
  ayah_to INTEGER,
  entry_html TEXT,
  irab_text TEXT,
  source_chunk_id TEXT,
  entry_order INTEGER,
  source_quote_ar TEXT,
  source_quote_hash TEXT NOT NULL DEFAULT '',
  irab_text_ar TEXT,
  target_text_ar TEXT,
  target_text_bare TEXT,
  target_text_match_key TEXT,
  grammar_role_ar TEXT,
  grammar_role_norm TEXT,
  grammar_case_ar TEXT,
  mahal_ar TEXT,
  grammar_concept_ref TEXT,
  syntax_relation_ref TEXT,
  case_concept_ref TEXT,
  mahal_concept_ref TEXT,
  alternative_json TEXT,
  inline_note_ar TEXT,
  raw_annotation_ar TEXT,
  word_occurrence_id TEXT,
  word_link_status TEXT DEFAULT 'pending',
  word_link_note TEXT,
  promotion_candidate_json TEXT,
  al_mapping_status TEXT DEFAULT 'pending',
  al_mapping_confidence REAL,
  al_mapping_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_irab_book_word (
  id             TEXT PRIMARY KEY,  -- <source_slug>:<surah>:<ayah>:<word_index>
  surah          INTEGER NOT NULL,
  ayah           INTEGER NOT NULL,
  word_index     INTEGER NOT NULL,  -- qr_word_occurrence.word_index
  word_text      TEXT NOT NULL,
  source_slug    TEXT NOT NULL,     -- qul_irab_muyassar | qul_jadwal_irab_quran | qul_irab_darwish | tibyan_ukbari_irab | qul_irab_quran_daas
  role_gt        TEXT,              -- the role the parse opens with (GT:irab_role:*), if it opens with one
  alt_roles_json TEXT,              -- the other roles the book allows the word
  named_json     TEXT,              -- every role the parse names at all (never a wrong answer)
  parse_ar       TEXT NOT NULL,     -- the book's words, verbatim
  alt_ar         TEXT,              -- where it gives the other readings, verbatim
  entry_id       TEXT NOT NULL,     -- qr_irab_book_entry.id (al-Daʿʿās: the same, via qr_irab_drill_item)
  n_books        INTEGER NOT NULL DEFAULT 1,   -- how many books parse this word
  n_roles        INTEGER NOT NULL DEFAULT 1    -- how many first roles they give between them (2+ = they part ways)
, word_to INTEGER);

CREATE TABLE qr_irab_drill_item (
  id          TEXT PRIMARY KEY,     -- <source_slug>:<surah>:<ayah>:<word_index>
  surah       INTEGER NOT NULL,
  ayah        INTEGER NOT NULL,
  word_index  INTEGER NOT NULL,     -- qr_word_occurrence.word_index (1-based)
  word_text   TEXT NOT NULL,        -- the word as the muṣḥaf has it
  role_gt     TEXT NOT NULL,        -- GT:irab_role:*
  irab_ar     TEXT NOT NULL,        -- the book's parse of the word, verbatim
  source_slug TEXT NOT NULL,
  entry_id    TEXT NOT NULL         -- qr_irab_book_entry.id
);

CREATE TABLE "qr_irab_extraction_run" (
  id TEXT PRIMARY KEY,
  source_slug TEXT NOT NULL,
  resource_id INTEGER,
  input_path TEXT,
  parser_version TEXT,
  started_at TEXT,
  finished_at TEXT,
  status TEXT,
  records_read INTEGER DEFAULT 0,
  chunks_created INTEGER DEFAULT 0,
  entries_created INTEGER DEFAULT 0,
  entries_linked INTEGER DEFAULT 0,
  entries_unmapped INTEGER DEFAULT 0,
  error_message TEXT
);

CREATE TABLE "qr_irab_import_error" (
  id TEXT PRIMARY KEY,
  extraction_run_id TEXT,
  source_slug TEXT,
  surah INTEGER,
  ayah_from INTEGER,
  ayah_to INTEGER,
  source_chunk_id TEXT,
  error_type TEXT,
  error_message TEXT,
  raw_fragment TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "qr_irab_source" (
  id TEXT PRIMARY KEY,
  source_slug TEXT NOT NULL UNIQUE,
  source_title_ar TEXT,
  source_title_en TEXT,
  source_kind TEXT NOT NULL DEFAULT 'irab_book',
  source_version TEXT,
  source_downloaded_at TEXT,
  source_file_hash TEXT,
  source_file_size INTEGER,
  note_md TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_irab_source_chunk" (
  id TEXT PRIMARY KEY,
  extraction_run_id TEXT,
  source_id TEXT,
  source_slug TEXT NOT NULL,
  source_record_id TEXT,
  ayah_key TEXT,
  group_ayah_key TEXT,
  from_ayah TEXT,
  to_ayah TEXT,
  ayah_keys TEXT,
  surah INTEGER,
  ayah_from INTEGER,
  ayah_to INTEGER,
  section_kind TEXT NOT NULL,
  section_order INTEGER NOT NULL DEFAULT 0,
  content_format TEXT NOT NULL DEFAULT 'text',
  raw_html TEXT,
  raw_text TEXT,
  clean_text TEXT,
  source_record_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(source_slug, source_record_id, section_kind, section_order)
);

CREATE TABLE "qr_lc_binding" (
  concept_ref  TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_id    TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'expresses',
  note         TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (concept_ref, source_table, source_id),
  FOREIGN KEY (concept_ref) REFERENCES "qr_lc_concept"(id) ON DELETE CASCADE
);

CREATE TABLE "qr_lc_concept" (
  id            TEXT PRIMARY KEY,
  uid           TEXT NOT NULL UNIQUE,
  concept_key   TEXT NOT NULL,
  discipline    TEXT NOT NULL,
  label_ar      TEXT NOT NULL,
  label_en      TEXT,
  label_ur      TEXT,
  definition_md TEXT,
  gc_parent_ref TEXT,
  is_contested  INTEGER NOT NULL DEFAULT 0,
  origin        TEXT,
  status        TEXT NOT NULL DEFAULT 'live',
  note_md       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (discipline) REFERENCES "qr_lc_discipline"(key),
  FOREIGN KEY (gc_parent_ref) REFERENCES "gc_concept"(id)
);

CREATE TABLE "qr_lc_discipline" (
  key         TEXT PRIMARY KEY,
  label_ar    TEXT NOT NULL,
  label_en    TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'live'
);

CREATE TABLE "qr_lemma" (
  id                TEXT PRIMARY KEY,
  lemma_text        TEXT NOT NULL UNIQUE,
  root              TEXT,
  lx_lemma_ref      TEXT,
  total_occurrences INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
, wazn_ar TEXT);

CREATE TABLE "qr_lemma_occurrence" (
  id                TEXT PRIMARY KEY,
  lemma_id          TEXT NOT NULL,
  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  word_index        INTEGER NOT NULL,
  word_occurrence_id TEXT NOT NULL,
  UNIQUE (lemma_id, surah, ayah, word_index),
  FOREIGN KEY (lemma_id)          REFERENCES "qr_lemma"(id),
  FOREIGN KEY (word_occurrence_id) REFERENCES "qr_word_occurrence"(id)
);

CREATE TABLE qr_lemma_ref_resolution (
  lemma_ref TEXT PRIMARY KEY, lemma_text TEXT NOT NULL, root TEXT NOT NULL,
  al_lemma_id TEXT, al_lemma_text TEXT, match_basis TEXT NOT NULL, confidence TEXT NOT NULL,
  note TEXT, resolved_at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE TABLE "qr_morph_display_block" (
  id TEXT PRIMARY KEY,
  scope_level TEXT NOT NULL CHECK (scope_level IN ('root','lemma','context')),
  scope_key   TEXT NOT NULL,
  word_occ_ref TEXT, surah_no INTEGER, ayah_no INTEGER, word_index INTEGER,
  ayah_key TEXT, root_ar TEXT, lemma_ar TEXT,
  block_type TEXT NOT NULL,
  block_subtype TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  title_ar TEXT, title_en TEXT, title_ur TEXT,
  text_ar TEXT, text_en TEXT, text_ur TEXT,
  data_json JSON NOT NULL DEFAULT '{}',
  source_slug TEXT NOT NULL REFERENCES "qr_morph_display_source"(source_slug),
  source_ref TEXT, source_page TEXT,
  is_synthesis INTEGER NOT NULL DEFAULT 0, register TEXT,
  confidence TEXT DEFAULT 'medium', status TEXT NOT NULL DEFAULT 'live', meta_json JSON,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  registers_json JSON, media_r2_key TEXT, media_kind TEXT, media_alt TEXT,
  UNIQUE(scope_level, scope_key, block_type, block_subtype),
  CHECK ((is_synthesis = 1 AND source_slug LIKE 'kmaps_%')
      OR (is_synthesis = 0 AND source_slug NOT LIKE 'kmaps_%' AND source_ref IS NOT NULL))
);

CREATE TABLE qr_morph_display_build (
  build_id TEXT PRIMARY KEY,
  built_at TEXT NOT NULL DEFAULT (datetime('now')),
  gt_signature TEXT NOT NULL,
  gt_term_count INTEGER,
  row_count INTEGER,
  generator TEXT NOT NULL,
  note_md TEXT
);

CREATE TABLE "qr_morph_display_lemma" (
  id            TEXT PRIMARY KEY,            -- 'MDL:{bare}#{qr_lemmas.id[:8]}'
  lemma_ref     TEXT NOT NULL UNIQUE,        -- qr_lemmas.id (the real key)
  lemma_ar      TEXT NOT NULL,
  lemma_bare    TEXT,
  root_ar       TEXT,
  morphology_id TEXT,                        -- ar_ling_morphology bundle (km_arabic_linguistic)
  form_family_id TEXT,                       -- qr_morph_form_families.id
  tier_key      TEXT,                        -- qr_morph_form_tiers.tier_key
  wazn_ar       TEXT,
  derived_type_ar TEXT, derived_type_en TEXT, derived_type_ur TEXT,
  gloss_ar TEXT, gloss_en TEXT, gloss_ur TEXT,
  total_occurrences INTEGER,
  first_surah   INTEGER, first_ayah INTEGER,
  is_anchor     INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'draft',
  display_order INTEGER NOT NULL DEFAULT 0,
  meta_json     JSON,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
, form_roman TEXT, form_ar TEXT, verb_form_ar TEXT, sense_arc_en TEXT, sense_range_en TEXT, quran_meanings_json JSON, gid_lemma TEXT);

CREATE TABLE qr_morph_display_media (
  id                 TEXT PRIMARY KEY,               -- 'MDM:بين:root_dna'
  r2_key             TEXT NOT NULL UNIQUE,           -- object key inside the bucket
  bucket             TEXT NOT NULL DEFAULT 'kmaps-media',
  kind               TEXT NOT NULL,                  -- 'image' | 'animation' | 'audio'
  mime               TEXT,                           -- image/svg+xml · image/webp · video/mp4
  -- what it illustrates ------------------------------------------------------
  root_ar            TEXT,
  surah_no           INTEGER, ayah_no INTEGER, word_index INTEGER,
  block_type         TEXT,                           -- links the asset to its block
  alt_en             TEXT, alt_ar TEXT,
  -- provenance (the "source" of the asset) -----------------------------------
  source_kind        TEXT,                           -- 'generated' | 'licensed' | 'public_domain'
  source_url         TEXT,                           -- origin the pipeline fetched from (if any)
  source_attribution TEXT,
  license            TEXT,
  sha256             TEXT,                           -- integrity of the stored object
  width_px           INTEGER, height_px INTEGER, duration_ms INTEGER,
  status             TEXT NOT NULL DEFAULT 'pending',-- 'pending' | 'stored' | 'live'
  meta_json          JSON,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_morph_display_root" (
  id                 TEXT PRIMARY KEY,             -- 'MDR:بين'
  root_ar            TEXT NOT NULL UNIQUE,         -- 'بين'
  root_display       TEXT,                         -- 'ب ي ن'
  root_type          TEXT,                         -- 'ثلاثي'
  frequency_quran    INTEGER,
  meaning_core_ar    TEXT,
  meaning_core_en    TEXT,
  meaning_core_ur    TEXT,
  hook_ar            TEXT,
  hook_en            TEXT,
  hook_ur            TEXT,
  family_json        JSON,   -- [{ lemma_ar, pos, pos_icon, verb_form, is_quran_word }]
  lens_coverage_json JSON,   -- [{ key, label, icon, on }]
  senses_json        JSON,   -- ["…", …]
  semantic_field     TEXT,
  section_icons_json JSON,   -- { family, senses, hook, freq }  (all lucide names)
  is_anchor          INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'live',
  display_order      INTEGER NOT NULL DEFAULT 0,
  meta_json          JSON,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
, root_uid TEXT, al_root_ref TEXT, content_source TEXT NOT NULL DEFAULT 'al_projection', content_synced_at TEXT);

CREATE TABLE "qr_morph_display_source" (
  id TEXT PRIMARY KEY, source_slug TEXT NOT NULL UNIQUE, kind TEXT NOT NULL,
  title_ar TEXT, title_en TEXT, author_name_ar TEXT, author_name_en TEXT,
  death_year_hijri INTEGER, register TEXT, badge_color TEXT, badge_glyph TEXT,
  display_order INTEGER NOT NULL DEFAULT 0, is_visible INTEGER NOT NULL DEFAULT 1,
  meta_json JSON, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
, title_ur TEXT, author_name_ur TEXT, icon TEXT);

CREATE TABLE qr_morph_editorial (
  surah_no INTEGER NOT NULL,
  ayah_no INTEGER NOT NULL,
  word_index INTEGER NOT NULL,
  is_anchor INTEGER,
  importance INTEGER,
  difficulty INTEGER,
  promote INTEGER,
  pos_ar_override TEXT,
  derived_type_ar_override TEXT,
  derived_type_en_override TEXT,
  wazn_ar_override TEXT,
  note_md TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (surah_no, ayah_no, word_index)
);

CREATE TABLE qr_morph_flag_decomp (
  flag TEXT NOT NULL,
  gram_term_ref TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 50, requires_flag TEXT, derived_from TEXT NOT NULL DEFAULT 'ar_ling_gram_term',
  PRIMARY KEY (flag, gram_term_ref));

CREATE TABLE "qr_morph_form_family" (
  id            TEXT PRIMARY KEY,          -- 'FORM:IV' · 'BAB:nasara'
  family_order  INTEGER NOT NULL,          -- 1..N display order
  kind          TEXT NOT NULL,             -- 'form_i_bab' | 'derived_verb' | 'noun'
  roman         TEXT,                      -- 'I'..'X' (null for bāb/noun)
  verb_form_key TEXT,                      -- matches ar_ling_lemmas.verb_form (grouping key)
  arabic_name   TEXT NOT NULL,             -- 'إفعال' · 'تفعيل' · 'نصر'
  english_name  TEXT,                      -- 'Form IV — ifʿāl'
  urdu_name     TEXT,
  wazn          TEXT,                      -- 'أَفْعَلَ' · 'نَصَرَ يَنْصُرُ'
  example_ar    TEXT,                      -- 'نَصَرَ'
  note_md       TEXT,
  icon          TEXT,
  status        TEXT NOT NULL DEFAULT 'live'
, tier TEXT, gram_term_ref TEXT);

CREATE TABLE "qr_morph_form_tier" (
  tier_key     TEXT PRIMARY KEY,
  tier_order   INTEGER NOT NULL,
  arabic_name  TEXT NOT NULL,
  english_name TEXT,
  urdu_name    TEXT,
  icon         TEXT
);

CREATE TABLE qr_morph_pos_rule (
  pos TEXT PRIMARY KEY, word_group TEXT NOT NULL, pos_ar TEXT NOT NULL, pos_en TEXT NOT NULL,
  pos_ur TEXT, is_content_word INTEGER NOT NULL DEFAULT 0, badge_color TEXT,
  status TEXT NOT NULL DEFAULT 'live', gram_term_ref TEXT, requires_root INTEGER NOT NULL DEFAULT 1);

CREATE TABLE qr_morph_word_override(
  id TEXT,
  word_occ_ref TEXT,
  surah_no INT,
  ayah_no INT,
  word_index INT,
  ayah_key TEXT,
  surface_ar TEXT,
  surface_bare TEXT,
  lemma_ar TEXT,
  root_ar TEXT,
  root_display TEXT,
  root_ref TEXT,
  word_group TEXT,
  pos_ar TEXT,
  pos_en TEXT,
  gloss_ar TEXT,
  gloss_en TEXT,
  badge_color TEXT,
  derived_type_ar TEXT,
  derived_type_en TEXT,
  wazn_ar TEXT,
  form_roman TEXT,
  features_json NUM,
  is_promoted INT,
  is_content_word INT,
  importance INT,
  difficulty INT,
  frequency_quran INT,
  status TEXT,
  display_order INT,
  meta_json NUM,
  created_at TEXT,
  updated_at TEXT,
  gloss_ur TEXT,
  derived_type_ur TEXT,
  pos_ur TEXT,
  is_anchor INT,
  quran_meanings_json NUM,
  root_meaning_ar TEXT,
  root_meaning_en TEXT,
  form_ar TEXT,
  sense_arc_en TEXT,
  sense_range_en TEXT,
  verb_form_ar TEXT,
  lemma_ref TEXT
);

CREATE TABLE "qr_mushaf_layout_line" (
  id              TEXT PRIMARY KEY,
  layout_key      TEXT NOT NULL,
  page_number     INTEGER NOT NULL,
  line_number     INTEGER NOT NULL,
  line_type       TEXT NOT NULL CHECK (line_type IN ('ayah', 'surah_name', 'basmallah')),
  is_centered     INTEGER NOT NULL DEFAULT 0 CHECK (is_centered IN (0, 1)),
  first_token_id  INTEGER,
  last_token_id   INTEGER,
  surah_number    INTEGER,
  text_qpc_hafs   TEXT NOT NULL DEFAULT '',
  tokens_json     TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tokens_json)),
  refs_json       TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(refs_json)),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (layout_key, page_number, line_number)
);

CREATE TABLE qr_nazm_group (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_ar TEXT,
  name_en TEXT NOT NULL,
  name_translit TEXT,
  surah_from INTEGER NOT NULL,
  surah_to INTEGER NOT NULL,
  member_count INTEGER NOT NULL,
  contiguous INTEGER NOT NULL DEFAULT 1,
  group_basis TEXT NOT NULL,
  revelation_type TEXT,
  epithet_ar TEXT,
  epithet_attrib TEXT,
  summary_md TEXT NOT NULL,
  note_md TEXT,
  gloss_json TEXT,
  source_slug TEXT,
  evidence_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
, confidence TEXT NOT NULL DEFAULT 'attested');

CREATE TABLE qr_nazm_group_member (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  surah INTEGER NOT NULL,
  member_index INTEGER NOT NULL,
  member_role TEXT,
  opening_ayah INTEGER,
  opening_form TEXT,
  opening_text_ar TEXT,
  epithet_pair_ar TEXT,
  epithet_case TEXT,
  is_anomaly INTEGER NOT NULL DEFAULT 0,
  anomaly_note TEXT,
  note_md TEXT,
  gloss_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (group_id, surah),
  FOREIGN KEY (group_id) REFERENCES qr_nazm_group(id),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE qr_nazm_group_root (
  group_id   TEXT NOT NULL,
  root       TEXT NOT NULL,
  n_group    INTEGER NOT NULL,     -- occurrences in the group's surahs
  n_surahs   INTEGER NOT NULL,     -- how many of its surahs use it
  n_quran    INTEGER NOT NULL,     -- occurrences in the whole Qurʾān
  lift       REAL NOT NULL,        -- its share of the group's rooted words over its share of the Qurʾān's
  rank       INTEGER NOT NULL,
  PRIMARY KEY (group_id, root)
);

CREATE TABLE qr_nazm_link (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  reading_id TEXT,
  surah_a INTEGER NOT NULL,
  surah_b INTEGER NOT NULL,
  link_type TEXT NOT NULL,
  link_strength TEXT,
  link_evidence TEXT,
  ayah_a INTEGER,
  ayah_b INTEGER,
  note_md TEXT,
  source_slug TEXT,
  evidence_ref TEXT,
  gloss_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (group_id) REFERENCES qr_nazm_group(id),
  FOREIGN KEY (reading_id) REFERENCES qr_nazm_reading(id),
  FOREIGN KEY (surah_a) REFERENCES "qr_surah"(id),
  FOREIGN KEY (surah_b) REFERENCES "qr_surah"(id)
);

CREATE TABLE qr_nazm_pass (
  id TEXT PRIMARY KEY,
  reading_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  pass_index INTEGER NOT NULL,
  pass_label TEXT NOT NULL,
  surahs_json TEXT NOT NULL,
  surfaces_md TEXT NOT NULL,
  note_md TEXT,
  gloss_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (reading_id, pass_index),
  FOREIGN KEY (reading_id) REFERENCES qr_nazm_reading(id),
  FOREIGN KEY (group_id) REFERENCES qr_nazm_group(id)
);

CREATE TABLE qr_nazm_reading (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  reading_label TEXT NOT NULL,
  structure_type TEXT NOT NULL,
  pattern_notation TEXT,
  scholar_ref TEXT,
  paradigm_ref TEXT,
  confidence TEXT NOT NULL DEFAULT 'proposed',
  summary_md TEXT NOT NULL,
  dissent_md TEXT,
  note_md TEXT,
  source_slug TEXT,
  evidence_ref TEXT,
  gloss_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (group_id) REFERENCES qr_nazm_group(id)
);

CREATE TABLE qr_nazm_theme (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  theme_key TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_ar TEXT,
  marker_ar TEXT,
  summary_md TEXT NOT NULL,
  distribution_note TEXT,
  note_md TEXT,
  gloss_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (group_id, theme_key),
  FOREIGN KEY (group_id) REFERENCES qr_nazm_group(id)
);

CREATE TABLE qr_nazm_theme_attestation (
  id TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  surah INTEGER NOT NULL,
  ayah_from INTEGER NOT NULL,
  ayah_to INTEGER,
  text_ar TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  verified_against TEXT,
  note_md TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (theme_id) REFERENCES qr_nazm_theme(id),
  FOREIGN KEY (group_id) REFERENCES qr_nazm_group(id),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_passage_analysis" (
  id                 TEXT PRIMARY KEY,
  surah              INTEGER NOT NULL,
  study_passage_id   TEXT,
  cache_version      INTEGER NOT NULL DEFAULT 1,
  cache_generated_at TEXT,
  payload_json       TEXT,
  FOREIGN KEY (surah)            REFERENCES "qr_surah"(id),
  FOREIGN KEY (study_passage_id) REFERENCES "qr_surah_study_passage"(id)
);

CREATE TABLE "qr_passage_section" (
  id TEXT PRIMARY KEY, passage_id TEXT NOT NULL, surah INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0, section_key TEXT, title TEXT, badge TEXT,
  tone TEXT, renderer TEXT NOT NULL, data_json TEXT,
  status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_quran_bil_quran_link" (
  id                   TEXT PRIMARY KEY,
  from_surah           INTEGER NOT NULL,
  from_ayah            INTEGER NOT NULL,
  to_surah             INTEGER NOT NULL,
  to_ayah              INTEGER NOT NULL,
  relation_type        TEXT NOT NULL,
  scholar_ref          TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_surah) REFERENCES "qr_surah"(id),
  FOREIGN KEY (to_surah)   REFERENCES "qr_surah"(id)
);

CREATE TABLE qr_recitation (
  reciter_id  INTEGER NOT NULL,     -- Quran.com chapter-reciter id (7 = Mishary Rashid al-ʿAfāsī, murattal)
  reciter     TEXT NOT NULL,
  surah       INTEGER NOT NULL,
  audio_url   TEXT NOT NULL,
  file_size   INTEGER,
  PRIMARY KEY (reciter_id, surah)
);

CREATE TABLE qr_recitation_ayah (
  reciter_id    INTEGER NOT NULL,
  surah         INTEGER NOT NULL,
  ayah          INTEGER NOT NULL,
  start_ms      INTEGER NOT NULL,
  end_ms        INTEGER NOT NULL,
  segments_json TEXT,               -- [[word_position, start_ms, end_ms], …] on the surah recording's clock
  PRIMARY KEY (reciter_id, surah, ayah)
);

CREATE TABLE qr_root_freq (
  root_ar TEXT PRIMARY KEY, n INTEGER NOT NULL, computed_at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE TABLE qr_root_raw (
  id TEXT PRIMARY KEY, root_uid TEXT NOT NULL, root_norm TEXT, source_code TEXT NOT NULL,
  discipline TEXT NOT NULL, fetch_strategy TEXT NOT NULL, origin_db TEXT NOT NULL DEFAULT 'km_quran',
  origin_table TEXT NOT NULL, origin_id TEXT NOT NULL,
  surah INTEGER, ayah INTEGER, word_index INTEGER, word_text TEXT, lemma TEXT, pos TEXT, morphology_tag TEXT,
  text_ar TEXT, data_json TEXT, status TEXT NOT NULL DEFAULT 'raw', created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_root_registry (
  root_ar   TEXT PRIMARY KEY,
  root_uid  TEXT NOT NULL,
  buckwalter TEXT
, gid_root TEXT);

CREATE TABLE "qr_scholar_method_profile" (
  source_slug TEXT PRIMARY KEY,
  author_name_ar TEXT, author_name_en TEXT, death_year_hijri INTEGER,
  discipline_bias TEXT,
  method_ar TEXT, method_en TEXT, method_ur TEXT,
  signature_tools_json TEXT,
  tell_md TEXT,
  status TEXT NOT NULL DEFAULT 'live'
);

CREATE TABLE "qr_scholar_paradigm_link" (
  scholar_id           TEXT NOT NULL,
  paradigm_id          TEXT NOT NULL,
  affiliation_type     TEXT NOT NULL DEFAULT 'primary',
  note_md              TEXT,
  PRIMARY KEY (scholar_id, paradigm_id),
  FOREIGN KEY (scholar_id)  REFERENCES "qr_scholar_profile"(id),
  FOREIGN KEY (paradigm_id) REFERENCES "qr_scholarly_paradigm"(id)
);

CREATE TABLE "qr_scholar_passage_movement" (
  id TEXT PRIMARY KEY,
  tafsir_id TEXT NOT NULL,
  section_id TEXT,
  movement_ord INTEGER NOT NULL,
  incipit_ar TEXT NOT NULL,
  incipit_verified INTEGER NOT NULL DEFAULT 0,
  gloss_en TEXT, gloss_ur TEXT,
  ayah_anchor TEXT, section_kind TEXT,
  body_ar TEXT, body_en TEXT, body_ur TEXT,
  quote_ar TEXT, evidence_ref TEXT,
  verdict TEXT NOT NULL DEFAULT 'adopted',
  note_md TEXT,
  UNIQUE (tafsir_id, movement_ord)
);

CREATE TABLE "qr_scholar_passage_reading" (
  id TEXT PRIMARY KEY,
  passage_ref TEXT NOT NULL,
  surah INTEGER NOT NULL,
  ayah_from INTEGER NOT NULL,
  ayah_to INTEGER NOT NULL,
  source_slug TEXT NOT NULL,
  author_name_ar TEXT,
  author_name_en TEXT,
  death_year_hijri INTEGER,
  reading_stance TEXT,
  thesis_ar TEXT, thesis_en TEXT, thesis_ur TEXT,
  method_note_md TEXT,
  section_count INTEGER NOT NULL DEFAULT 0,
  evidence_refs_json TEXT,
  status TEXT NOT NULL DEFAULT 'live',
  created_at TEXT NOT NULL DEFAULT (datetime('now')), summary_ar TEXT, summary_en TEXT, summary_ur TEXT, key_notes_json TEXT,
  UNIQUE (passage_ref, source_slug)
);

CREATE TABLE "qr_scholar_passage_section" (
  id TEXT PRIMARY KEY,
  tafsir_id TEXT NOT NULL REFERENCES "qr_scholar_passage_reading"(id) ON DELETE CASCADE,
  section_ord INTEGER NOT NULL,
  heading_ar TEXT NOT NULL,
  heading_en TEXT NOT NULL,
  heading_ur TEXT,
  ayah_anchor TEXT,
  section_kind TEXT,
  body_ar TEXT, body_en TEXT, body_ur TEXT,
  quote_ar TEXT,
  evidence_ref TEXT,
  verdict TEXT NOT NULL DEFAULT 'adopted',
  note_md TEXT, incipit_ar TEXT, incipit_verified INTEGER NOT NULL DEFAULT 0, heading_origin TEXT NOT NULL DEFAULT 'mufassir_text', movement_from INTEGER, movement_to INTEGER,
  UNIQUE (tafsir_id, section_ord)
);

CREATE TABLE "qr_scholar_passage_term" (
  tafsir_id TEXT NOT NULL REFERENCES "qr_scholar_passage_reading"(id) ON DELETE CASCADE,
  section_id TEXT,
  term_ref TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'applied',
  ayah_anchor TEXT NOT NULL DEFAULT '',
  quote_ar TEXT,
  PRIMARY KEY (tafsir_id, term_ref, ayah_anchor)
);

CREATE TABLE qr_scholar_passage_xref (
  id TEXT PRIMARY KEY,
  reading_id TEXT NOT NULL,
  section_id TEXT,
  movement_ord INTEGER,
  xref_kind TEXT NOT NULL,
  ref_label_ar TEXT NOT NULL,
  ref_surah INTEGER, ref_ayah INTEGER,
  ref_key TEXT,
  cited_function TEXT NOT NULL,
  quoted_text_ar TEXT,
  host_ayah TEXT,
  note_md TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_scholar_position" (
  id                   TEXT PRIMARY KEY,
  scholar_id           TEXT NOT NULL,
  work_id              TEXT,
  scope_type           TEXT NOT NULL,
  surah                INTEGER,
  ayah_from            INTEGER,
  ayah_to              INTEGER,
  position_type        TEXT NOT NULL DEFAULT 'meaning',
  position_text_ar     TEXT NOT NULL,
  position_text_en     TEXT,
  position_summary     TEXT,
  original_page        TEXT,
  is_minority_view     INTEGER NOT NULL DEFAULT 0,
  is_contested         INTEGER NOT NULL DEFAULT 0,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (scholar_id) REFERENCES "qr_scholar_profile"(id),
  FOREIGN KEY (work_id)    REFERENCES "qr_scholar_work"(id)
);

CREATE VIRTUAL TABLE qr_scholar_positions_fts USING fts5(scholar_id UNINDEXED, surah UNINDEXED, position_type, position_text_ar, position_text_en, position_summary);

CREATE TABLE "qr_scholar_profile" (
  id                   TEXT PRIMARY KEY,
  name_ar              TEXT NOT NULL,
  name_en              TEXT,
  kunya                TEXT,
  laqab                TEXT,
  nisba                TEXT,
  birth_year_hijri     INTEGER,
  death_year_hijri     INTEGER,
  birth_year_ce        INTEGER,
  death_year_ce        INTEGER,
  era                  TEXT,
  madhab               TEXT,
  kalam_school         TEXT,
  specialization       TEXT,
  biography_md         TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE qr_scholar_profiles_fts USING fts5(name_ar, name_en, laqab, nisba, biography_md);

CREATE TABLE "qr_scholar_work" (
  id                   TEXT PRIMARY KEY,
  scholar_id           TEXT NOT NULL,
  title_ar             TEXT NOT NULL,
  title_en             TEXT,
  work_type            TEXT NOT NULL DEFAULT 'tafsir',
  composition_year_hijri INTEGER,
  composition_year_ce  INTEGER,
  lx_source_ref        TEXT,
  volumes              INTEGER,
  is_complete          INTEGER NOT NULL DEFAULT 1,
  print_edition        TEXT,
  summary              TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (scholar_id) REFERENCES "qr_scholar_profile"(id)
);

CREATE TABLE "qr_scholarly_paradigm" (
  id                   TEXT PRIMARY KEY,
  name_ar              TEXT NOT NULL,
  name_en              TEXT NOT NULL,
  paradigm_type        TEXT NOT NULL,
  description_md       TEXT,
  era_range            TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_scope_nuance" (
  id                   TEXT PRIMARY KEY,
  scope_id             TEXT NOT NULL,
  claim_id             TEXT,
  nuance_type          TEXT NOT NULL DEFAULT 'qualification',
  nuance_text          TEXT NOT NULL,
  nuance_text_ar       TEXT,
  discourse_force      TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (scope_id) REFERENCES "qr_analysis_scope"(id)
);

CREATE TABLE "qr_scope_topic" (
  id                   TEXT PRIMARY KEY,
  topic_id             TEXT NOT NULL,
  scope_type           TEXT NOT NULL,
  surah                INTEGER NOT NULL,
  ayah_from            INTEGER,
  ayah_to              INTEGER,
  prominence           TEXT NOT NULL DEFAULT 'secondary',
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (topic_id) REFERENCES qr_topic_registry(id),
  FOREIGN KEY (surah)    REFERENCES "qr_surah"(id)
);

CREATE TABLE qr_src_code (data_slug TEXT PRIMARY KEY, code TEXT NOT NULL, discipline TEXT NOT NULL, title_en TEXT);

CREATE TABLE qr_ss_book_note (
  id           TEXT PRIMARY KEY,     -- QR:BN:{s}:{a}:jadwal:{section}:{chunk}:{item}
  surah        INTEGER NOT NULL,
  ayah         INTEGER NOT NULL,
  scope_type   TEXT NOT NULL,        -- word | clause | ayah
  scope_id     TEXT NOT NULL,        -- qr_word_occurrence.id | qr_ss_occ_clause.id | QR:{s}:{a}
  word_start   INTEGER,
  word_end     INTEGER,
  source_slug  TEXT NOT NULL,
  section_kind TEXT NOT NULL,        -- sarf | balagha | fawaid
  item_no      INTEGER NOT NULL DEFAULT 1,
  head_ar      TEXT,                 -- the word (ṣarf) or the figure (balāgha) the item opens with
  gt_ref       TEXT,                 -- the balāgha figure's GT term, where it is one
  text_ar      TEXT NOT NULL,        -- verbatim
  chunk_id     TEXT                  -- qr_irab_source_chunk.id
);

CREATE TABLE qr_ss_clause_reading (
  id             TEXT PRIMARY KEY,   -- QR:CR:{s}:{a}:{book}:…
  clause_id      TEXT,               -- the derived qr_ss_occ_clause (NULL on an āyah the curated layer covers)
  surah          INTEGER NOT NULL,
  ayah           INTEGER NOT NULL,
  word_start     INTEGER NOT NULL,   -- qr_word_occurrence.word_index: the clause's quoted opening words
  word_end       INTEGER NOT NULL,
  quote_ar       TEXT,               -- the words the book quotes (al-Jadwal) or names
  source_slug    TEXT NOT NULL,      -- qul_jadwal_irab_quran | qul_irab_muyassar | qul_irab_quran_daas | qul_irab_darwish | tibyan_ukbari_irab
  entry_id       TEXT,               -- qr_irab_book_entry.id / qr_irab_source_chunk.id
  role_key       TEXT,               -- ss_role label key: istinafiyya, sila, khabar, hal, naat, maqul_qawl, maatufa …
  role_gt        TEXT,               -- GT:sentence_role:*
  mahall         TEXT,               -- none | raf | nasb | jarr | jazm
  alt_roles_json TEXT,               -- the other readings the book allows
  statement_ar   TEXT NOT NULL,      -- the book's words, verbatim
  is_backbone    INTEGER NOT NULL DEFAULT 0,
  agrees         INTEGER,            -- other books: same role as al-Jadwal; al-Jadwal: 0 when a book parts from it, 1 when those that speak agree
  kind           TEXT,               -- ismiyya | filiyya | shartiyya (al-Jadwal rows; read from the opening words' morphology)
  kind_head      TEXT,               -- the word that decides the kind
  kind_head_pos  TEXT,               -- its stem tag (V, N, PRON, DEM, REL, PN …)
  truncated      INTEGER NOT NULL DEFAULT 0   -- the quote runs on («… ...»): the span is the clause's opening
);

CREATE TABLE qr_ss_discourse_citation (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  reading_ref TEXT,
  seq INTEGER NOT NULL DEFAULT 0,
  position_ar TEXT NOT NULL,
  sources_ar TEXT,
  source_kind TEXT,
  stance TEXT,
  page_ref TEXT,
  status TEXT NOT NULL DEFAULT 'raw',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (note_id) REFERENCES qr_ss_discourse_note(id)
);

CREATE TABLE qr_ss_discourse_note (
  id TEXT PRIMARY KEY,
  scope_type TEXT NOT NULL DEFAULT 'sentence',
  scope_id TEXT NOT NULL,
  surah INTEGER NOT NULL,
  marker TEXT,
  question_ar TEXT NOT NULL,
  verdict_ar TEXT,
  source_basis TEXT,
  status TEXT NOT NULL DEFAULT 'raw',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_ss_discourse_source_link (
  id TEXT PRIMARY KEY,
  citation_id TEXT NOT NULL,
  note_id TEXT NOT NULL,
  source_kind TEXT,
  source_slug TEXT,
  entry_ref TEXT,
  entry_table TEXT,
  ayah INTEGER,
  page_ref TEXT,
  link_status TEXT NOT NULL DEFAULT 'linked',
  status TEXT NOT NULL DEFAULT 'raw',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (citation_id) REFERENCES qr_ss_discourse_citation(id)
);

CREATE TABLE qr_ss_ellipsis_event (
  id                   TEXT PRIMARY KEY,
  sentence_id          TEXT NOT NULL,
  scope_type           TEXT NOT NULL DEFAULT 'clause',
  scope_id             TEXT NOT NULL,
  ellipsis_type        TEXT NOT NULL,
  lx_ellipsis_ref      TEXT,
  elided_element       TEXT NOT NULL,
  rhetorical_effect    TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')), source_basis TEXT, source_ref TEXT,
  FOREIGN KEY (sentence_id) REFERENCES qr_ss_occ_sentence(id)
);

CREATE TABLE qr_ss_migration_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch TEXT NOT NULL, table_name TEXT NOT NULL, row_id TEXT NOT NULL,
  column_name TEXT NOT NULL, old_value TEXT, new_value TEXT, reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_ss_occ_clause (
  id                   TEXT PRIMARY KEY,
  sentence_id          TEXT NOT NULL,
  parent_clause_id     TEXT,
  clause_order         INTEGER NOT NULL DEFAULT 1,
  surah                INTEGER NOT NULL,
  ayah_from            INTEGER NOT NULL,
  ayah_to              INTEGER NOT NULL,
  word_start_index     INTEGER,
  word_end_index       INTEGER,
  clause_type          TEXT NOT NULL DEFAULT 'main',
  lx_clause_type_ref   TEXT,
  clause_function      TEXT,
  lx_clause_func_ref   TEXT,
  governing_particle   TEXT,
  is_elliptical        INTEGER NOT NULL DEFAULT 0,
  elided_element       TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')), discourse_theme TEXT, is_virtual INTEGER NOT NULL DEFAULT 0, gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)), source_basis TEXT,
  FOREIGN KEY (sentence_id)      REFERENCES qr_ss_occ_sentence(id),
  FOREIGN KEY (parent_clause_id) REFERENCES qr_ss_occ_clause(id)
);

CREATE TABLE qr_ss_occ_phrase (
  id                   TEXT PRIMARY KEY,
  clause_id            TEXT NOT NULL,
  phrase_order         INTEGER NOT NULL DEFAULT 1,
  surah                INTEGER NOT NULL,
  ayah                 INTEGER NOT NULL,
  word_start_index     INTEGER NOT NULL,
  word_end_index       INTEGER NOT NULL,
  phrase_type          TEXT NOT NULL,
  lx_phrase_type_ref   TEXT,
  phrase_function      TEXT,
  lx_phrase_func_ref   TEXT,
  head_word_id         TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (clause_id)    REFERENCES qr_ss_occ_clause(id),
  FOREIGN KEY (head_word_id) REFERENCES "qr_word_occurrence"(id)
);

CREATE TABLE qr_ss_occ_segment (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER NOT NULL,
  ayah                 INTEGER NOT NULL,
  word_occurrence_id   TEXT NOT NULL,
  segment_index        INTEGER NOT NULL,
  segment_text         TEXT NOT NULL,
  segment_type         TEXT NOT NULL,
  lx_particle_ref      TEXT,
  morphology_tag       TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (word_occurrence_id) REFERENCES "qr_word_occurrence"(id)
);

CREATE TABLE qr_ss_occ_sentence (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER NOT NULL,
  ayah_from            INTEGER NOT NULL,
  ayah_to              INTEGER NOT NULL,
  word_start_index     INTEGER,
  word_end_index       INTEGER,
  sentence_kind        TEXT NOT NULL DEFAULT 'declarative',
  lx_sentence_kind_ref TEXT,
  discourse_role       TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')), is_virtual INTEGER NOT NULL DEFAULT 0, gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)), source_basis TEXT, gt_sentence_class TEXT, gt_kalam_kind     TEXT, gt_sentence_role TEXT REFERENCES ar_ling_gram_term(id),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE qr_ss_pattern_register (
  pattern_key TEXT PRIMARY KEY,
  label_ar TEXT,
  signature_json TEXT CHECK (signature_json IS NULL OR json_valid(signature_json)),
  exemplar_sentence_id TEXT,
  exemplar_ayah TEXT,
  exemplar_tree_id TEXT,
  gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)),
  status TEXT NOT NULL DEFAULT 'canonical',
  note_md TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_ss_pattern_term_link (
  pattern_key   TEXT NOT NULL,
  facet         TEXT NOT NULL,          -- 'particle' today; clauses and balagha
                                        -- are the same shape when they are done
  raw_key       TEXT NOT NULL,          -- as signature_json spells it
  gram_term_ref TEXT,                   -- GT: id, or NULL where none exists yet
  sort_order    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (pattern_key, facet, raw_key)
);

CREATE TABLE qr_ss_scope_balagha_link (
  id                   TEXT PRIMARY KEY,
  scope_type           TEXT NOT NULL,
  scope_id             TEXT NOT NULL,
  lx_balagha_ref       TEXT NOT NULL,
  balagha_category     TEXT,
  rhetorical_effect    TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
, gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)));

CREATE TABLE qr_ss_scope_grammar_link (
  id                   TEXT PRIMARY KEY,
  scope_type           TEXT NOT NULL,
  scope_id             TEXT NOT NULL,
  lx_grammar_ref       TEXT NOT NULL,
  application_note     TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
, gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)));

CREATE TABLE "qr_ss_scope_link" (
  id                   TEXT PRIMARY KEY,
  from_scope_type      TEXT NOT NULL,
  from_scope_id        TEXT NOT NULL,
  to_scope_type        TEXT NOT NULL,
  to_scope_id          TEXT NOT NULL,
  relation_type        TEXT NOT NULL,
  lx_relation_ref      TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
, gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)), source_basis TEXT);

CREATE TABLE qr_ss_scope_member_map (
  id                   TEXT PRIMARY KEY,
  word_occurrence_id   TEXT NOT NULL,
  scope_type           TEXT NOT NULL,
  scope_id             TEXT NOT NULL,
  member_role          TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (word_occurrence_id, scope_type, scope_id),
  FOREIGN KEY (word_occurrence_id) REFERENCES "qr_word_occurrence"(id)
);

CREATE TABLE qr_ss_scope_morph_link (
  id                   TEXT PRIMARY KEY,
  scope_type           TEXT NOT NULL,
  scope_id             TEXT NOT NULL,
  lx_morph_ref         TEXT NOT NULL,
  irab_position        TEXT,
  irab_sign            TEXT,
  syntactic_function   TEXT,
  is_disputed          INTEGER NOT NULL DEFAULT 0,
  dispute_note         TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
, gram_term_ref TEXT);

CREATE TABLE qr_ss_scope_nuance (
  id                   TEXT PRIMARY KEY,
  scope_type           TEXT NOT NULL,
  scope_id             TEXT NOT NULL,
  nuance_type          TEXT NOT NULL DEFAULT 'discourse_force',
  lx_nuance_type_ref   TEXT,
  nuance_text          TEXT NOT NULL,
  nuance_text_ar       TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
, gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)), source_basis TEXT, source_ref TEXT);

CREATE VIRTUAL TABLE qr_ss_scope_nuance_fts USING fts5(scope_type UNINDEXED, scope_id UNINDEXED, nuance_type, nuance_text, nuance_text_ar);

CREATE TABLE qr_ss_scope_reading (
  id                   TEXT PRIMARY KEY,
  scope_type           TEXT NOT NULL,
  scope_id             TEXT NOT NULL,
  scholar_ref          TEXT,
  paradigm_ref         TEXT,
  reading_type         TEXT NOT NULL DEFAULT 'irab',
  lx_reading_type_ref  TEXT,
  reading_text         TEXT NOT NULL,
  reading_text_ar      TEXT,
  is_minority          INTEGER NOT NULL DEFAULT 0,
  is_contested         INTEGER NOT NULL DEFAULT 0,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
, gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)), is_selected INTEGER NOT NULL DEFAULT 0, selection_criteria TEXT, selection_rationale_json TEXT CHECK (selection_rationale_json IS NULL OR json_valid(selection_rationale_json)), witness_count INTEGER);

CREATE TABLE qr_ss_scope_reading_evidence_link (
  reading_id           TEXT NOT NULL,
  evidence_id          TEXT NOT NULL,
  support_type         TEXT NOT NULL DEFAULT 'supports',
  PRIMARY KEY (reading_id, evidence_id),
  FOREIGN KEY (reading_id)  REFERENCES qr_ss_scope_reading(id),
  FOREIGN KEY (evidence_id) REFERENCES "qr_evidence"(id)
);

CREATE VIRTUAL TABLE qr_ss_scope_reading_fts USING fts5(scope_type UNINDEXED, scope_id UNINDEXED, reading_type, reading_text, reading_text_ar);

CREATE TABLE qr_ss_source_register (
  band_code     TEXT NOT NULL,
  source_slug   TEXT NOT NULL,
  source_db     TEXT NOT NULL,
  source_table  TEXT NOT NULL,
  discipline    TEXT NOT NULL,
  title_ar      TEXT,
  title_en      TEXT,
  author_en     TEXT,
  death_ah      INTEGER,
  era           TEXT,
  source_role   TEXT NOT NULL DEFAULT 'primary',
  source_order  INTEGER NOT NULL DEFAULT 0,
  locator_json  TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(locator_json)),
  unit_count_at_audit INTEGER,
  status        TEXT NOT NULL DEFAULT 'live',
  audited_at    TEXT,
  PRIMARY KEY (band_code, source_slug)
);

CREATE TABLE "qr_ss_syntax_link" (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER NOT NULL,
  ayah                 INTEGER NOT NULL,
  head_word_id         TEXT NOT NULL,
  dep_word_id          TEXT NOT NULL,
  relation_label       TEXT NOT NULL,
  lx_rel_type_ref      TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (head_word_id) REFERENCES "qr_word_occurrence"(id),
  FOREIGN KEY (dep_word_id)  REFERENCES "qr_word_occurrence"(id)
);

CREATE TABLE qr_ss_translation_buildup (
  id TEXT PRIMARY KEY,
  passage_id TEXT NOT NULL,
  surah INTEGER NOT NULL,
  step_seq INTEGER NOT NULL,
  unit_id TEXT,
  combination_ref TEXT,
  relation_type TEXT,
  connector_en TEXT,
  added_en TEXT,
  cumulative_en TEXT NOT NULL,
  layers_ar TEXT,
  status TEXT NOT NULL DEFAULT 'raw',
  created_at TEXT NOT NULL DEFAULT (datetime('now')), gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)), added_gloss_json TEXT CHECK (added_gloss_json IS NULL OR json_valid(added_gloss_json)), driver_kind TEXT, driver_ref TEXT,
  FOREIGN KEY (passage_id) REFERENCES qr_ss_translation_passage(id)
);

CREATE TABLE qr_ss_translation_decision (
  id             TEXT PRIMARY KEY,
  unit_id        TEXT,
  buildup_id     TEXT,
  surah          INTEGER NOT NULL,
  ayah           INTEGER NOT NULL,
  step_seq       INTEGER,
  target_span_ar TEXT NOT NULL,
  rendered_json  TEXT CHECK (rendered_json IS NULL OR json_valid(rendered_json)),
  driver_kind    TEXT NOT NULL,
  driver_ref     TEXT NOT NULL,
  rationale_json TEXT CHECK (rationale_json IS NULL OR json_valid(rationale_json)),
  status         TEXT NOT NULL DEFAULT 'live',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_ss_translation_nuance (
  id TEXT PRIMARY KEY,
  translation_unit_id TEXT NOT NULL,
  driver_ar TEXT NOT NULL,
  fork_json TEXT NOT NULL DEFAULT '[]',
  chosen_en TEXT,
  changes_translation INTEGER NOT NULL DEFAULT 1,
  nuance_ref TEXT,
  note_md TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (translation_unit_id) REFERENCES qr_ss_translation_unit(id)
);

CREATE TABLE qr_ss_translation_passage (
  id TEXT PRIMARY KEY,
  passage_ref TEXT,
  surah INTEGER NOT NULL,
  ayah_from INTEGER NOT NULL,
  ayah_to INTEGER NOT NULL,
  assembled_fluent_en TEXT,
  final_fluent_en TEXT NOT NULL,
  assembly_note_ar TEXT,
  status TEXT NOT NULL DEFAULT 'raw',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
, synthesis_md TEXT, gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)), rejected_assemblies_json TEXT CHECK (rejected_assemblies_json IS NULL OR json_valid(rejected_assemblies_json)), nazm_ref TEXT);

CREATE TABLE qr_ss_translation_unit (
  id TEXT PRIMARY KEY,
  scope_type TEXT NOT NULL DEFAULT 'sentence',
  scope_id TEXT NOT NULL,
  surah INTEGER NOT NULL,
  ayah_from INTEGER NOT NULL,
  ayah_to INTEGER NOT NULL,
  seq INTEGER NOT NULL DEFAULT 0,
  structural_literal_en TEXT,
  fluent_en TEXT NOT NULL,
  fluent_ar TEXT,
  decision_note_ar TEXT,
  status TEXT NOT NULL DEFAULT 'raw',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
, synthesis_md TEXT, gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)), reading_ref TEXT, rejected_readings_json TEXT CHECK (rejected_readings_json IS NULL OR json_valid(rejected_readings_json)));

CREATE TABLE qr_ss_tree (
  id                   TEXT PRIMARY KEY,
  sentence_id          TEXT NOT NULL,
  tree_type            TEXT NOT NULL DEFAULT 'constituency',
  generated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  note_md              TEXT, grounding TEXT NOT NULL DEFAULT 'authored', source_ref TEXT,
  FOREIGN KEY (sentence_id) REFERENCES qr_ss_occ_sentence(id)
);

CREATE TABLE qr_ss_tree_edge (
  id                   TEXT PRIMARY KEY,
  tree_id              TEXT NOT NULL,
  parent_node_id       TEXT NOT NULL,
  child_node_id        TEXT NOT NULL,
  edge_label           TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tree_id)        REFERENCES qr_ss_tree(id),
  FOREIGN KEY (parent_node_id) REFERENCES qr_ss_tree_node(id),
  FOREIGN KEY (child_node_id)  REFERENCES qr_ss_tree_node(id)
);

CREATE TABLE "qr_ss_tree_layout" (
  tree_id              TEXT PRIMARY KEY,
  layout_json          TEXT NOT NULL,
  renderer             TEXT NOT NULL DEFAULT 'd3_tidy_tree',
  generated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tree_id) REFERENCES qr_ss_tree(id)
);

CREATE TABLE qr_ss_tree_node (
  id                   TEXT PRIMARY KEY,
  tree_id              TEXT NOT NULL,
  parent_node_id       TEXT,
  node_label           TEXT NOT NULL,
  scope_type           TEXT,
  scope_id             TEXT,
  depth                INTEGER NOT NULL DEFAULT 0,
  node_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')), term_key TEXT, label_ar TEXT, note_md TEXT, word_occurrence_id TEXT, is_virtual INTEGER NOT NULL DEFAULT 0, tafsir_note_md TEXT, tafsir_refs TEXT, balagha_note_md TEXT, balagha_refs TEXT, gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)), sarf_note_md TEXT, sarf_refs TEXT, sarf_term_ref TEXT, gram_term_ref TEXT,
  FOREIGN KEY (tree_id)        REFERENCES qr_ss_tree(id),
  FOREIGN KEY (parent_node_id) REFERENCES qr_ss_tree_node(id)
);

CREATE TABLE qr_ss_vocab_register (
  kind TEXT NOT NULL,
  key TEXT NOT NULL,
  label_ar TEXT,
  label_en TEXT,
  gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)),
  category TEXT,
  discipline TEXT,
  status TEXT NOT NULL DEFAULT 'canonical',
  canonical_key TEXT,
  aliases_json TEXT,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  note_md TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), gram_term_id TEXT, mapping_status TEXT NOT NULL DEFAULT 'unset',
  PRIMARY KEY (kind, key)
);

CREATE TABLE qr_study_label (
  scope      TEXT NOT NULL,
  key        TEXT NOT NULL,
  label      TEXT NOT NULL,
  label_ar   TEXT,
  detail     TEXT,
  icon       TEXT,
  color      TEXT,
  min_value  INTEGER,
  extra_json TEXT,
  sort       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (scope, key)
);

CREATE TABLE "qr_study_question" (
  id            TEXT PRIMARY KEY,
  surah         INTEGER NOT NULL,
  passage_id    TEXT,
  scope_ref     TEXT,
  ayah_from     INTEGER,
  ayah_to       INTEGER,
  question_type TEXT NOT NULL DEFAULT 'comprehension',
  question_en   TEXT NOT NULL,
  question_ar   TEXT,
  options_json  TEXT,
  answer_md     TEXT,
  difficulty    TEXT NOT NULL DEFAULT 'standard',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'draft',
  note_md       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id),
  FOREIGN KEY (passage_id) REFERENCES "qr_surah_study_passage"(id) ON DELETE CASCADE
);

CREATE TABLE "qr_surah" (
  id                INTEGER PRIMARY KEY,
  name_ar           TEXT NOT NULL,
  name_en           TEXT NOT NULL,
  name_transliteration TEXT,
  revelation_type   TEXT NOT NULL DEFAULT 'makki',
  ayah_count        INTEGER NOT NULL,
  juz_start         INTEGER,
  page_start        INTEGER,
  order_revelation  INTEGER,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_surah_analysis" (
  surah                INTEGER PRIMARY KEY,
  cache_version        INTEGER NOT NULL DEFAULT 1,
  cache_generated_at   TEXT,
  payload_json         TEXT,
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_atomic_profile" (
  surah                  INTEGER PRIMARY KEY,
  atomic_center          TEXT NOT NULL,
  atomic_center_ar       TEXT,
  structural_type        TEXT NOT NULL,
  structural_type_note   TEXT,
  resolution_pattern     TEXT,
  interpretive_lens      TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE qr_surah_ayah_meta (
  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  juz               INTEGER,
  hizb              INTEGER,
  ruku              INTEGER,
  manzil            INTEGER,
  sajda             INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (surah, ayah),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_clause_pattern" (
  surah                INTEGER PRIMARY KEY,
  dominant_clause_type TEXT,
  nominal_clause_pct   REAL,
  verbal_clause_pct    REAL,
  conditional_count    INTEGER NOT NULL DEFAULT 0,
  oath_count           INTEGER NOT NULL DEFAULT 0,
  interrogative_count  INTEGER NOT NULL DEFAULT 0,
  dominant_mood        TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_closure" (
  surah                  INTEGER PRIMARY KEY,
  ayah_from              INTEGER NOT NULL,
  ayah_to                INTEGER NOT NULL,
  closure_type           TEXT NOT NULL,
  echo_of_opening        INTEGER NOT NULL DEFAULT 0,
  rhetorical_force       TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')), source_slug TEXT, evidence_ref TEXT, gloss_json TEXT,
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_coherence_signal" (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  signal_type            TEXT NOT NULL,
  description            TEXT NOT NULL,
  ayahs_json             TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')), source_slug TEXT, evidence_ref TEXT, gloss_json TEXT,
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_diamond_pattern" (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  structure_reading_id   TEXT,
  pattern_type           TEXT NOT NULL DEFAULT 'diamond',
  top_section_from       INTEGER,
  top_section_to         INTEGER,
  center_from            INTEGER,
  center_to              INTEGER,
  bottom_section_from    INTEGER,
  bottom_section_to      INTEGER,
  balance_note           TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_ellipsis_pattern" (
  surah                INTEGER PRIMARY KEY,
  dominant_ellipsis_type TEXT,
  total_ellipsis_count INTEGER NOT NULL DEFAULT 0,
  typical_effect       TEXT,
  notable_instances    TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE qr_surah_info (
  surah         INTEGER NOT NULL,
  source        TEXT NOT NULL,         -- who wrote the introduction
  short_text    TEXT,
  sections_json TEXT NOT NULL,         -- [{"heading": "Period of Revelation", "text": "…"}, …]
  text_html     TEXT NOT NULL,
  PRIMARY KEY (surah, source)
);

CREATE TABLE qr_surah_layer (
  surah         INTEGER NOT NULL,
  layer         TEXT NOT NULL,                     -- sarf | nahw | balagha | themes | structure
  payload_json  TEXT NOT NULL CHECK (json_valid(payload_json)),
  sources_json  TEXT,
  method        TEXT NOT NULL,
  built_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (surah, layer)
);

CREATE TABLE "qr_surah_link" (
  id                   TEXT PRIMARY KEY,
  surah_a              INTEGER NOT NULL,
  surah_b              INTEGER NOT NULL,
  relation_type        TEXT NOT NULL,
  description          TEXT,
  evidence_summary     TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah_a) REFERENCES "qr_surah"(id),
  FOREIGN KEY (surah_b) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_motif_cluster" (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  cluster_label          TEXT NOT NULL,
  cluster_label_ar       TEXT,
  motif_keys             TEXT NOT NULL,
  ayah_range_json        TEXT,
  semantic_role          TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')), source_slug TEXT, evidence_ref TEXT, gloss_json TEXT,
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_opening" (
  surah                  INTEGER PRIMARY KEY,
  ayah_from              INTEGER NOT NULL DEFAULT 1,
  ayah_to                INTEGER NOT NULL,
  opening_type           TEXT NOT NULL,
  rhetorical_force       TEXT,
  sets_up_md             TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')), source_slug TEXT, evidence_ref TEXT, gloss_json TEXT,
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE qr_surah_passage_proposal (
  id               TEXT PRIMARY KEY,               -- QR:SPP:{surah}:{from}-{to}
  surah            INTEGER NOT NULL,
  passage_no       INTEGER NOT NULL,
  ayah_from        INTEGER NOT NULL,
  ayah_to          INTEGER NOT NULL,
  title_en         TEXT,                           -- only a source's own title; else «Āyāt a–b»
  title_ar         TEXT,
  words            INTEGER NOT NULL DEFAULT 0,
  opening_score    REAL,                           -- NULL for a surah's first passage
  opening_support  INTEGER NOT NULL DEFAULT 0,     -- spine + iʿrāb books that start a group here
  basis_json       TEXT NOT NULL CHECK (json_valid(basis_json)),
  method           TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'derived',
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (surah, passage_no),
  UNIQUE (surah, ayah_from, ayah_to)
);

CREATE TABLE "qr_surah_profile" (
  surah                  INTEGER PRIMARY KEY,
  governing_movement     TEXT,
  central_claim          TEXT,
  opening_force          TEXT,
  closure_force          TEXT,
  dominant_addressee     TEXT,
  dominant_tone          TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_reception" (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER NOT NULL,
  era                  TEXT NOT NULL,
  dominant_methodology TEXT,
  dominant_themes      TEXT,
  notable_scholars     TEXT,
  tendencies_md        TEXT,
  notable_shifts_md    TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (surah, era),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_register_shift" (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER NOT NULL,
  ayah_shift           INTEGER NOT NULL,
  shift_axis           TEXT NOT NULL,
  from_state           TEXT,
  to_state             TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')), source_slug TEXT, evidence_ref TEXT, gloss_json TEXT,
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE qr_surah_revelation_rank (
  surah        INTEGER PRIMARY KEY,
  rank         INTEGER,                 -- NULL where he says the rank is not settled
  source_slug  TEXT NOT NULL,           -- ibn_ashur
  evidence_ar  TEXT NOT NULL,           -- his sentence, verbatim (diacritics stripped)
  note         TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_surah_rhetoric_profile" (
  surah                INTEGER PRIMARY KEY,
  dominant_mode        TEXT,
  clause_density       TEXT,
  emphasis_patterns    TEXT,
  suspension_use       TEXT,
  contrast_patterns    TEXT,
  rhetorical_devices   TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_sequence_pattern" (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  sequence_type          TEXT NOT NULL,
  stages_json            TEXT NOT NULL,
  description            TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_structural_pivot" (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  pivot_index            INTEGER NOT NULL,
  ayah                   INTEGER NOT NULL,
  pivot_type             TEXT NOT NULL,
  description            TEXT NOT NULL,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')), source_slug TEXT, evidence_ref TEXT, gloss_json TEXT,
  UNIQUE (surah, pivot_index),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_structure_link" (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  from_unit_id           TEXT NOT NULL,
  to_unit_id             TEXT NOT NULL,
  link_type              TEXT NOT NULL,
  link_evidence          TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')), source_slug TEXT, evidence_ref TEXT, gloss_json TEXT,
  FOREIGN KEY (from_unit_id) REFERENCES "qr_surah_structure_unit"(id),
  FOREIGN KEY (to_unit_id)   REFERENCES "qr_surah_structure_unit"(id)
);

CREATE TABLE "qr_surah_structure_reading" (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  reading_label          TEXT NOT NULL,
  structure_type         TEXT NOT NULL,
  scholar_ref            TEXT,
  paradigm_ref           TEXT,
  confidence             TEXT DEFAULT 'proposed',
  summary_md             TEXT NOT NULL,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_structure_unit" (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  unit_index             INTEGER NOT NULL,
  ayah_from              INTEGER NOT NULL,
  ayah_to                INTEGER NOT NULL,
  unit_role              TEXT NOT NULL,
  label                  TEXT,
  reading_id             TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_study_passage" (
  id                    TEXT PRIMARY KEY,           -- QR:SP:{surah}:{ayah_from}-{ayah_to}
  surah                 INTEGER NOT NULL,
  passage_no            INTEGER NOT NULL,
  ayah_from             INTEGER NOT NULL,
  ayah_to               INTEGER NOT NULL,

  -- Public compatibility identifiers returned to existing clients.
  public_unit_id        TEXT NOT NULL UNIQUE,       -- U:C:QURAN:{surah}:{range}
  public_surah_unit_id  TEXT,                       -- U:C:QURAN:{surah}
  legacy_container_id   TEXT,
  legacy_lesson_id      INTEGER,

  label                 TEXT,
  title_en              TEXT,
  title_ar              TEXT,
  subtitle              TEXT,
  theme                 TEXT,
  summary_md            TEXT,
  start_ref             TEXT,
  end_ref               TEXT,
  text_cache            TEXT,
  meta_json             TEXT,
  status                TEXT NOT NULL DEFAULT 'draft',
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (surah, passage_no),
  UNIQUE (surah, ayah_from, ayah_to),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_study_step" (
  id                    TEXT PRIMARY KEY,           -- QR:STEP:{surah}:{range}:{step_key}
  passage_id            TEXT NOT NULL,
  step_key              TEXT NOT NULL,              -- reading|morphology|sentence_structure|...
  step_no               INTEGER NOT NULL,
  title                 TEXT,
  title_ar              TEXT,
  intro_task_id         TEXT,                       -- public root task id for compatibility
  status                TEXT NOT NULL DEFAULT 'draft',
  meta_json             TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (passage_id, step_key),
  FOREIGN KEY (passage_id) REFERENCES "qr_surah_study_passage"(id) ON DELETE CASCADE
);

CREATE TABLE "qr_surah_study_task" (
  id                    TEXT PRIMARY KEY,
  passage_id            TEXT NOT NULL,
  step_id               TEXT NOT NULL,
  parent_task_id        TEXT,                       -- internal id; currently same as public_task_id

  -- Public compatibility identifier returned to existing clients.
  public_task_id        TEXT NOT NULL UNIQUE,       -- UT:C:QURAN:{surah}:{range}:{code}:{step}

  task_type             TEXT NOT NULL,
  task_name             TEXT,
  step_no               INTEGER,
  status                TEXT NOT NULL DEFAULT 'draft',
  task_json             TEXT,

  source_table          TEXT DEFAULT 'ar_container_unit_task',
  source_id             TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (passage_id) REFERENCES "qr_surah_study_passage"(id) ON DELETE CASCADE,
  FOREIGN KEY (step_id)    REFERENCES "qr_surah_study_step"(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_task_id) REFERENCES "qr_surah_study_task"(id) ON DELETE CASCADE
);

CREATE TABLE "qr_surah_study_task_chunk" (
  task_id       TEXT NOT NULL,
  passage_id    TEXT NOT NULL,
  chunk_index   INTEGER NOT NULL,
  chunk_text    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (task_id, chunk_index),
  FOREIGN KEY (task_id)    REFERENCES "qr_surah_study_task"(id) ON DELETE CASCADE,
  FOREIGN KEY (passage_id) REFERENCES "qr_surah_study_passage"(id) ON DELETE CASCADE
);

CREATE TABLE "qr_surah_symmetry_pattern" (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  structure_reading_id   TEXT,
  pattern_type           TEXT NOT NULL,
  center_ayah_from       INTEGER,
  center_ayah_to         INTEGER,
  pattern_notation       TEXT,
  pairs_json             TEXT,
  summary_md             TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE qr_surah_tafsir_chunk (
  id           TEXT PRIMARY KEY,
  reading_id   TEXT NOT NULL,
  theme_id     TEXT,
  passage_id   TEXT,
  surah        INTEGER NOT NULL,
  source_slug  TEXT NOT NULL,
  chunk_index  INTEGER NOT NULL,
  chunk_kind   TEXT NOT NULL,
  heading_ar   TEXT,
  heading_en   TEXT,
  char_start   INTEGER,
  char_len     INTEGER,
  text_ar      TEXT NOT NULL,
  text_en      TEXT,
  note_md      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')), unit_json TEXT,
  UNIQUE (reading_id, chunk_index)
);

CREATE TABLE qr_surah_tafsir_hadith (
  id               TEXT PRIMARY KEY,
  reading_id       TEXT NOT NULL,
  theme_id         TEXT,
  chunk_id         TEXT,
  passage_id       TEXT,
  surah            INTEGER NOT NULL,
  source_slug      TEXT NOT NULL,
  hadith_topic     TEXT,
  companion_ar     TEXT,
  companion_en     TEXT,
  narrator_ar      TEXT,
  narrator_en      TEXT,
  collectors_json  JSON NOT NULL,
  grade_vocab_kind TEXT DEFAULT 'term_key',
  grade_vocab_key  TEXT,
  grade_note       TEXT,
  grade_external   TEXT,
  matn_ar          TEXT NOT NULL,
  matn_en          TEXT,
  is_marfu         INTEGER NOT NULL DEFAULT 0,
  is_mursal        INTEGER NOT NULL DEFAULT 0,
  variant_of       TEXT,
  display_order    INTEGER NOT NULL DEFAULT 0,
  note_md          TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (grade_vocab_kind, grade_vocab_key) REFERENCES qr_ss_vocab_register(kind, key)
);

CREATE TABLE qr_surah_tafsir_reading (
  id                     TEXT PRIMARY KEY,
  passage_id             TEXT,
  surah                  INTEGER NOT NULL,
  ayah_from              INTEGER,
  ayah_to                INTEGER,
  source_slug            TEXT NOT NULL,
  scholar_id             TEXT,
  work_id                TEXT,
  source_tafsir_entry_id TEXT,
  source_page            TEXT,
  source_url             TEXT,
  scope_kind             TEXT NOT NULL DEFAULT 'ayah',
  text_ar                TEXT NOT NULL,
  text_en                TEXT,
  chunk_count            INTEGER NOT NULL DEFAULT 0,
  theme_count            INTEGER NOT NULL DEFAULT 0,
  translation_status     TEXT NOT NULL DEFAULT 'none',
  translator             TEXT,
  confidence             TEXT DEFAULT 'medium',
  review_status          TEXT NOT NULL DEFAULT 'ai_candidate',
  study_status           TEXT NOT NULL DEFAULT 'unread',
  extraction_method      TEXT DEFAULT 'entry_split',
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')), ui_json TEXT, text_json TEXT,
  UNIQUE (source_slug, surah, scope_kind, ayah_from, ayah_to),
  FOREIGN KEY (passage_id) REFERENCES qr_surah_study_passage(id),
  FOREIGN KEY (surah) REFERENCES qr_surah(id)
);

CREATE TABLE qr_surah_tafsir_term (
  id           TEXT PRIMARY KEY,
  reading_id   TEXT NOT NULL,
  theme_id     TEXT,
  chunk_id     TEXT,
  passage_id   TEXT,
  surah        INTEGER NOT NULL,
  source_slug  TEXT NOT NULL,
  vocab_kind   TEXT NOT NULL,
  vocab_key    TEXT NOT NULL,
  discipline   TEXT NOT NULL,
  surface_ar   TEXT NOT NULL,
  gloss_en     TEXT,
  role         TEXT,
  confidence   TEXT DEFAULT 'high',
  note_md      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (reading_id, chunk_id, vocab_kind, vocab_key, surface_ar),
  FOREIGN KEY (vocab_kind, vocab_key) REFERENCES qr_ss_vocab_register(kind, key)
);

CREATE TABLE qr_surah_tafsir_theme (
  id           TEXT PRIMARY KEY,
  reading_id   TEXT NOT NULL,
  passage_id   TEXT,
  surah        INTEGER NOT NULL,
  source_slug  TEXT NOT NULL,
  theme_index  INTEGER NOT NULL,
  theme_key    TEXT NOT NULL,
  title_ar     TEXT,
  title_en     TEXT,
  char_start   INTEGER NOT NULL,
  char_len     INTEGER NOT NULL,
  chunk_from   INTEGER,
  chunk_to     INTEGER,
  text_ar      TEXT NOT NULL,
  text_en      TEXT,
  note_md      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (reading_id, theme_index)
);

CREATE TABLE qr_surah_tafsir_xref (
  id            TEXT PRIMARY KEY,
  reading_id    TEXT NOT NULL,
  theme_id      TEXT,
  chunk_id      TEXT,
  passage_id    TEXT,
  surah         INTEGER NOT NULL,
  source_slug   TEXT NOT NULL,
  xref_kind     TEXT NOT NULL,
  target_surah  INTEGER,
  target_ayah   INTEGER,
  target_ayah_to INTEGER,
  ayah_key      TEXT,
  quote_ar      TEXT,
  quote_en      TEXT,
  relation      TEXT,
  verified      INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  note_md       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (target_surah, target_ayah) REFERENCES qr_ayah(surah, ayah)
);

CREATE TABLE "qr_surah_theme_profile" (
  surah                INTEGER PRIMARY KEY,
  primary_theme        TEXT NOT NULL,
  secondary_themes     TEXT,
  theological_axis     TEXT,
  ethical_axis         TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_theology_profile" (
  surah                INTEGER PRIMARY KEY,
  divine_attributes    TEXT,
  prophethood_aspects  TEXT,
  eschatology_aspects  TEXT,
  cosmology_aspects    TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_topic_flow" (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER NOT NULL,
  flow_index           INTEGER NOT NULL,
  ayah_from            INTEGER NOT NULL,
  ayah_to              INTEGER NOT NULL,
  topic_label          TEXT NOT NULL,
  topic_label_ar       TEXT,
  flow_direction       TEXT,
  transitions_from_id  TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (surah, flow_index),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_worldview_profile" (
  surah                INTEGER PRIMARY KEY,
  anthropology_notes   TEXT,
  value_architecture   TEXT,
  moral_universe       TEXT,
  divine_human_rel     TEXT,
  worldview_tensions   TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE qr_tafsir_audio (
  id            TEXT PRIMARY KEY,                 -- QRTA:<source_slug>:<nnn>
  source_slug   TEXT NOT NULL,
  seq           INTEGER NOT NULL,                 -- reading order of the recordings
  title_ar      TEXT,
  title_en      TEXT,
  speaker       TEXT,
  platform      TEXT,                             -- 'youtube' …
  source_url    TEXT,
  bucket        TEXT NOT NULL DEFAULT 'km-arabic-audio',
  object_key    TEXT NOT NULL UNIQUE,             -- served by /api/ar/audio/<key>
  mime_type     TEXT,
  duration_sec  REAL,
  size_bytes    INTEGER,
  sha256        TEXT,
  aligned       INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'live',
  meta_json     TEXT NOT NULL DEFAULT '{}',       -- {"pages": [...page ids...], "part": n, "reading": "full"|"parts"}
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_tafsir_audio_segment (
  id          TEXT PRIMARY KEY,                   -- SEG:<audio id>:<seq>
  audio_id    TEXT NOT NULL REFERENCES qr_tafsir_audio(id),
  page_id     TEXT NOT NULL REFERENCES qr_tafsir_read_page(id),
  seq         INTEGER NOT NULL,
  start_sec   REAL NOT NULL,
  end_sec     REAL NOT NULL,
  text_ar     TEXT NOT NULL,
  confidence  REAL,
  meta_json   TEXT NOT NULL DEFAULT '{}',         -- {"w": [[start,end],...], "line": n}
  UNIQUE (audio_id, seq)
);

CREATE VIRTUAL TABLE qr_tafsir_block_norm_fts USING fts5(
  block_id UNINDEXED, source_slug UNINDEXED, surah_no UNINDEXED, ayah_no UNINDEXED,
  ayah_key UNINDEXED, block_type UNINDEXED, text_norm,
  tokenize = "unicode61 remove_diacritics 2");

CREATE TABLE "qr_tafsir_book_display_block" (
  id                       TEXT PRIMARY KEY,
  -- Provenance --------------------------------------------------------------
  source_id                TEXT,
  source_tafsir_entry_id   TEXT,                        -- → qr_tafsir_entries.id (Phase A)
  source_slug              TEXT NOT NULL,
  book_title               TEXT,
  author                   TEXT,
  -- Scholar metadata denormalized for fast filter/render --------------------
  scholar_id               TEXT,                        -- → qr_scholar_profiles.id
  work_id                  TEXT,                        -- → qr_scholar_works.id
  scholar_name_ar          TEXT,
  scholar_name_en          TEXT,
  madhab                   TEXT,
  era                      TEXT,
  kalam_school             TEXT,
  death_year_hijri         INTEGER,
  -- Locator -----------------------------------------------------------------
  surah_no                 INTEGER,
  ayah_no                  INTEGER,                     -- start ayah
  ayah_to                  INTEGER,                     -- end ayah (range)
  ayah_key                 TEXT,                        -- "2:255"
  ayah_group_key           TEXT,                        -- "3:131-133"
  ayah_keys_json           JSON,                        -- ["3:131","3:132","3:133"]
  is_grouped               INTEGER NOT NULL DEFAULT 0,
  word_index               INTEGER,
  word_text                TEXT,
  phrase_text              TEXT,
  scope_type               TEXT,
  -- Block identity ----------------------------------------------------------
  block_type               TEXT NOT NULL,
  block_subtype            TEXT,
  display_order            INTEGER NOT NULL DEFAULT 0,
  paragraph_index          INTEGER,                     -- for paragraph_section blocks
  paragraph_count          INTEGER,                     -- total in source entry
  is_long_form             INTEGER NOT NULL DEFAULT 0,  -- 1 if source >5000 chars
  -- Content -----------------------------------------------------------------
  title_ar                 TEXT,
  title_en                 TEXT,
  text_ar                  TEXT,                        -- HTML-stripped
  text_en                  TEXT,                        -- reserved (NULL today)
  raw_text                 TEXT,                        -- verbatim with markup
  markup_tier              TEXT,                        -- copied from source
  source_page              TEXT,                        -- e.g. '٤' or '39'
  -- Denormalized arrays for one-shot UI render ------------------------------
  tags_json                JSON,                        -- ["explanation","tabari","narration"]
  grammar_tags_json        JSON,                        -- nullable
  theology_tags_json       JSON,                        -- ["mutazili_rebuttal","ashari_response"]
  narration_tags_json      JSON,                        -- ["sahih_muslim","sahih_bukhari"]
  quran_refs_json          JSON,                        -- [{surah,ayah,…}]
  scholar_refs_json        JSON,                        -- [{scholar_id,role,label}] who's quoted/responded
  backlinks_json           JSON,                        -- [{block_id,kind,label}]
  related_links_json       JSON,
  external_resource_json   JSON,                        -- reserved for audio/scan refs
  -- QA --------------------------------------------------------------------
  confidence               TEXT DEFAULT 'medium',
  review_status            TEXT NOT NULL DEFAULT 'ai_candidate',
  extraction_method        TEXT DEFAULT 'entry_projection',
  meta_json                JSON,                        -- structured payload (isnad_chain, paragraph_offsets, source_quote_hash, …)
  -- Audit -----------------------------------------------------------------
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
, text_norm TEXT);

CREATE VIRTUAL TABLE qr_tafsir_book_display_blocks_fts
USING fts5 (
  block_id UNINDEXED,
  source_slug UNINDEXED,
  scholar_id UNINDEXED,
  madhab UNINDEXED,
  era UNINDEXED,
  surah_no UNINDEXED,
  ayah_no UNINDEXED,
  ayah_key UNINDEXED,
  ayah_group_key UNINDEXED,
  block_type UNINDEXED,
  title_ar, title_en,
  text_ar, text_en,
  raw_text,
  tokenize = "unicode61 remove_diacritics 2"
);

CREATE TABLE "qr_tafsir_book_display_link" (
  id              TEXT PRIMARY KEY,
  from_block_id   TEXT NOT NULL,
  to_block_id     TEXT,                                 -- nullable when target is a canonical record
  to_typed_ref    TEXT,                                 -- 'QR:POSITION:01HX…' | 'QR:INTERPRETIVE_DIFF:…'
  link_kind       TEXT NOT NULL,                        -- 'backlink'|'related'|'same_ayah'|'same_word'|'same_grammar'|'same_paradigm'|'comparison'|'disagreement'|'scholar_response'|'reception_note'|'isnad_continues'
  label           TEXT,
  weight          INTEGER NOT NULL DEFAULT 1,
  meta_json       JSON,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_tafsir_book_display_note" (
  id              TEXT PRIMARY KEY,
  block_id        TEXT,                                 -- nullable: notes can float
  note_kind       TEXT NOT NULL,                        -- 'author'|'teaching'|'footnote'|'reviewer'|'editorial'|'source_citation'|'mutazili_rebuttal'
  note_text_ar    TEXT,
  note_text_en    TEXT,
  is_inline       INTEGER NOT NULL DEFAULT 0,
  surah_no        INTEGER,
  ayah_no         INTEGER,
  ayah_key        TEXT,
  ayah_group_key  TEXT,
  source_slug     TEXT,
  scholar_id      TEXT,                                 -- which scholar's note this is
  display_order   INTEGER NOT NULL DEFAULT 0,
  meta_json       JSON,                                 -- e.g. {"hadith_book":"المسند","volume":5,"page":133}
  review_status   TEXT NOT NULL DEFAULT 'ai_candidate',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_tafsir_book_display_ref" (
  id              TEXT PRIMARY KEY,
  block_id        TEXT NOT NULL,
  ref_kind        TEXT NOT NULL,                        -- 'ayah'|'word'|'lemma'|'root'|'concept'|'scholar'|'position'|'hadith_source'
  surah_no        INTEGER,
  ayah_no         INTEGER,
  ayah_to         INTEGER,
  ayah_key        TEXT,
  ayah_group_key  TEXT,
  word_index      INTEGER,
  typed_ref       TEXT,                                 -- 'QR:2:3' | 'QR:SCH:TABARI' | 'QR:POSITION:01HX…' | 'HADITH:MUSLIM:V5/P133'
  label           TEXT,
  meta_json       JSON,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_tafsir_book_display_source" (
  id                 TEXT PRIMARY KEY,                  -- mirrors qr_scholar_works.id
  source_slug        TEXT NOT NULL UNIQUE,              -- 'tabari','razi','zamakhshari',…
  scholar_id         TEXT,                              -- → qr_scholar_profiles.id
  work_id            TEXT,                              -- → qr_scholar_works.id
  book_title_ar      TEXT,
  book_title_en      TEXT,
  author_name_ar     TEXT,
  author_name_en     TEXT,
  author_kunya       TEXT,
  author_laqab       TEXT,
  death_year_hijri   INTEGER,
  death_year_ce      INTEGER,
  era                TEXT,                              -- 'classical' | 'modern'
  madhab             TEXT,                              -- 'sunni'|'maliki'|'shafii'|'hanbali'|'hanafi'|'mutazili'|'ashari'
  kalam_school       TEXT,
  specialization     TEXT,
  badge_color        TEXT,                              -- UI hint, hex
  badge_glyph        TEXT,                              -- UI hint, short symbol
  markup_tier        TEXT,                              -- 'full' | 'minimal' | 'none'
  short_description  TEXT,
  long_description   TEXT,
  cover_image_url    TEXT,
  display_order      INTEGER DEFAULT 0,
  is_visible         INTEGER NOT NULL DEFAULT 1,
  meta_json          JSON,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_tafsir_book_display_tag" (
  id              TEXT PRIMARY KEY,
  block_id        TEXT NOT NULL,                        -- → blocks.id
  tag_kind        TEXT NOT NULL,                        -- 'general'|'narration'|'theology'|'paradigm'|'madhab'|'topic'|'review'
  tag_value       TEXT NOT NULL,
  tag_value_norm  TEXT,                                 -- diacritic-stripped
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_tafsir_drill_item (
  id          TEXT PRIMARY KEY,     -- <kind>:<block / piece / section id>
  ask         TEXT NOT NULL,        -- tafsir_point | surah_intro | tafsir_who | tafsir_where | tafsir_school | tafsir_reading | tafsir_section
  surah       INTEGER NOT NULL,
  ayah_from   INTEGER,
  ayah_to     INTEGER,
  ayah        INTEGER,              -- the āyah heard with it
  source_slug TEXT,                 -- the book (qr_tafsir_book_display_source.source_slug, or qr_tafsir_en.source_code, or 'maududi')
  source_name TEXT,
  text        TEXT NOT NULL,        -- what is shown: the excerpt or the point, verbatim
  answer      TEXT,                 -- the book's slug, the āyah key, the surah, the section heading, or the point itself
  context     TEXT,                 -- more of the source, for after the answer
  tag         TEXT,                 -- the doctrine or school named, the word of the āyah named, the passage
  ref         TEXT,                 -- the row it was cut from
  page        TEXT,
  others_json TEXT                  -- the wrong answers that sit beside it: books, āyāt, surahs, points, headings
);

CREATE TABLE qr_tafsir_en (
  id          TEXT PRIMARY KEY,        -- <source_code>:<surah>:<ayah_from>
  source_code TEXT NOT NULL,           -- ibn-kathir-abridged | maarif | tazkir
  source_name TEXT NOT NULL,
  surah       INTEGER NOT NULL,
  ayah_from   INTEGER NOT NULL,
  ayah_to     INTEGER NOT NULL,
  text_html   TEXT NOT NULL,
  text_plain  TEXT NOT NULL
);

CREATE TABLE "qr_tafsir_entry" (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER NOT NULL,
  ayah_from            INTEGER NOT NULL,
  ayah_to              INTEGER NOT NULL,
  entry_type           TEXT NOT NULL DEFAULT 'explanation',
  scholar_id           TEXT,
  work_id              TEXT,
  content_ar           TEXT NOT NULL,
  content_en           TEXT,
  source_page          TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE qr_tafsir_page_cut (
  page_id   TEXT NOT NULL REFERENCES qr_tafsir_read_page(id),
  audio_id  TEXT NOT NULL REFERENCES qr_tafsir_audio(id),
  ayah      INTEGER NOT NULL,               -- the āyah whose lines begin here
  seq       INTEGER NOT NULL,               -- the first line (qr_tafsir_audio_segment.seq) on it
  note      TEXT,
  PRIMARY KEY (page_id, audio_id, ayah)
);

CREATE TABLE qr_tafsir_question (
  id            TEXT PRIMARY KEY,                 -- QR:TQ:<surah>:<from>-<to>:<nn>
  passage_id    TEXT NOT NULL REFERENCES qr_surah_study_passage(id),
  surah         INTEGER NOT NULL,
  ayah_from     INTEGER NOT NULL,
  ayah_to       INTEGER NOT NULL,
  question_en   TEXT NOT NULL,                    -- about the āyah's meaning, never the book
  interaction   TEXT NOT NULL DEFAULT 'choose',   -- choose | choose_all
  options_json  TEXT NOT NULL,                    -- the options, in no order (the drill shuffles)
  correct_json  TEXT NOT NULL,                    -- indices into options
  explain_en    TEXT,                             -- what rises after the answer
  support_json  TEXT NOT NULL,                    -- [{audio, page, from, to}] the lines that answer it
  sort_order    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'draft',    -- draft | live
  note_md       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_tafsir_read_page (
  id            TEXT PRIMARY KEY,                 -- QRTP:<source_slug>:<seq>
  source_slug   TEXT NOT NULL,                    -- → qr_tafsir_book_display_source.source_slug
  seq           INTEGER NOT NULL,                 -- reading order across the book
  kind          TEXT NOT NULL DEFAULT 'ayah',     -- 'front' | 'surah_preface' | 'ayah'
  surah_no      INTEGER,                          -- NULL for front matter
  ayah_group_key TEXT,                            -- "67:3-4"
  title_ar      TEXT,
  text_ar       TEXT NOT NULL,
  word_count    INTEGER NOT NULL DEFAULT 0,
  block_ids_json TEXT NOT NULL DEFAULT '[]',      -- the display blocks this page was built from
  status        TEXT NOT NULL DEFAULT 'live',
  meta_json     TEXT NOT NULL DEFAULT '{}',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source_slug, seq)
);

CREATE TABLE qr_tafsir_segment_en (
  segment_id  TEXT PRIMARY KEY REFERENCES qr_tafsir_audio_segment(id),
  audio_id    TEXT NOT NULL,
  seq         INTEGER NOT NULL,
  text_en     TEXT NOT NULL,
  terms_json  TEXT NOT NULL DEFAULT '[]',
  status      TEXT NOT NULL DEFAULT 'draft',      -- draft | live
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_tafsir_sura_preface (
  id TEXT PRIMARY KEY,
  source_slug TEXT NOT NULL,
  surah_no INTEGER NOT NULL,
  host_block_id TEXT NOT NULL,
  host_surah_no INTEGER NOT NULL,
  char_offset INTEGER NOT NULL,
  preface_len INTEGER NOT NULL,
  text_ar TEXT NOT NULL,
  has_aghrad INTEGER NOT NULL DEFAULT 0,
  has_naming INTEGER NOT NULL DEFAULT 0,
  has_revelation_place INTEGER NOT NULL DEFAULT 0,
  extraction_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'raw',
  note_md TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source_slug, surah_no)
);

CREATE TABLE qr_topic_registry (
  id                   TEXT PRIMARY KEY,
  topic_key            TEXT NOT NULL UNIQUE,
  topic_label_en       TEXT NOT NULL,
  topic_label_ar       TEXT,
  topic_domain         TEXT NOT NULL,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_translation" (
  id                TEXT PRIMARY KEY,
  source_id         TEXT NOT NULL,
  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  translation_text  TEXT NOT NULL,
  footnote_md       TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source_id, surah, ayah),
  FOREIGN KEY (source_id) REFERENCES "qr_translation_source"(id)
);

CREATE TABLE qr_translation_choice (
  surah      INTEGER NOT NULL,
  ayah       INTEGER NOT NULL,
  feature    TEXT NOT NULL,
  source_id  TEXT NOT NULL,             -- qr_translation_source.id
  choice     TEXT NOT NULL,             -- a key of the feature's choices_json
  evidence   TEXT,                      -- the English words the choice's regex matched
  value      REAL,                      -- the length ratio (English words ÷ Arabic words), for length_ratio
  PRIMARY KEY (surah, ayah, feature, source_id)
) WITHOUT ROWID;

CREATE TABLE qr_translation_feature (
  key             TEXT PRIMARY KEY,
  label_en        TEXT NOT NULL,
  label_ar        TEXT,
  detail          TEXT,                 -- why translators differ here, for the learner
  arabic_detector TEXT NOT NULL,        -- what counts as the feature on the Arabic side
  detector_json   TEXT,                 -- the detector's kind and parameters (lemmas, window …)
  scope           TEXT NOT NULL DEFAULT 'whole',   -- where the English is read: whole | start | end
  window_words    INTEGER,              -- … and how many words of it, for start / end
  choices_json    TEXT NOT NULL,        -- [{key, label, regex, flags, …}] in the order they are tried
  compare_json    TEXT,                 -- [{ask, yes:[choice], no:[choice]} | {ask, by:'min_value'|'max_value'}]
  n_ayat          INTEGER,              -- āyāt where the feature stands (written by the script)
  n_rows          INTEGER,              -- renderings classified
  computed_at     TEXT,
  sort            INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE qr_translation_feature_ayah (
  feature      TEXT NOT NULL,
  surah        INTEGER NOT NULL,
  ayah         INTEGER NOT NULL,
  word_indexes TEXT NOT NULL,           -- '1' or '3,4' — qr_word_occurrence.word_index; '' for a whole-āyah feature
  ar_words     TEXT,
  PRIMARY KEY (feature, surah, ayah)
) WITHOUT ROWID;

CREATE TABLE "qr_translation_passage" (
  id                TEXT PRIMARY KEY,
  source_id         TEXT NOT NULL,
  surah             INTEGER NOT NULL,
  ayah_from         INTEGER NOT NULL,
  ayah_to           INTEGER NOT NULL,
  passage_translation TEXT NOT NULL,
  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES "qr_translation_source"(id)
);

CREATE TABLE qr_translation_profile (
  feature    TEXT NOT NULL,
  source_id  TEXT NOT NULL,
  choice     TEXT NOT NULL,
  n          INTEGER NOT NULL,          -- renderings taking this choice
  total      INTEGER NOT NULL,          -- renderings of this feature by this translation
  share      REAL NOT NULL,             -- n ÷ total
  lift       REAL,                      -- share ÷ the mean share across translations: a signature is high
  PRIMARY KEY (feature, source_id, choice)
) WITHOUT ROWID;

CREATE TABLE "qr_translation_source" (
  id                TEXT PRIMARY KEY,
  source_code       TEXT NOT NULL UNIQUE,
  translator_name   TEXT NOT NULL,
  language          TEXT NOT NULL DEFAULT 'en',
  edition           TEXT,
  is_default        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_vocab_gloss (
  id          TEXT PRIMARY KEY,
  surah       INTEGER NOT NULL,
  ayah        INTEGER NOT NULL,
  word_index  INTEGER NOT NULL,     -- qr_vocab_item (surah, ayah, word_index)
  lang        TEXT NOT NULL,        -- ar | en
  text        TEXT NOT NULL,        -- the gloss, verbatim
  source_slug TEXT NOT NULL,        -- razi · alusi · zamakhshari · ibn_ashur · tabari · ibn_atiyya · abu_hayyan · ibn_kathir ·
                                    -- qul_irab_darwish · qul_jadwal_irab_quran · qul_irab_muyassar · ibn-kathir-abridged · maarif · tazkir ·
                                    -- raghib_mufradat · lane_lexicon · mir_verbal_idioms · sense_arc · adima_dirasat · <grammar book> · kmaps_word_view
  source_kind TEXT NOT NULL,        -- tafsir | tafsir_en | irab | lexicon | grammar | kmaps
  citation    TEXT NOT NULL,        -- the book, where, and on which āyah
  method      TEXT NOT NULL,        -- ay · yani · mana · bimana · murad · colon · lughat · qala · … · lane_ayah · mufradat_ayah · lane_context · tafsir_lemma …
  confidence  TEXT NOT NULL,        -- high | medium | low
  rank        REAL NOT NULL,        -- the priority above (lower first)
  role        TEXT,                 -- primary | en | ar | NULL
  grp         INTEGER,              -- agreement group within the word
  quote_ar    TEXT,                 -- the passage as it stands (the word, the formula, the gloss)
  al_ref      TEXT                  -- the block / fact / entry it was read from
);

CREATE TABLE qr_vocab_item (
  surah       INTEGER NOT NULL,
  ayah        INTEGER NOT NULL,
  word_index  INTEGER NOT NULL,     -- qr_word_occurrence.word_index
  word_text   TEXT NOT NULL,
  root        TEXT NOT NULL,
  lemma       TEXT,
  pos         TEXT,
  form_roman  TEXT,
  wazn_ar     TEXT,                 -- qr_lemma.wazn_ar
  lemma_n     INTEGER NOT NULL DEFAULT 0,   -- the lemma's words in the Qurʾān
  root_n      INTEGER NOT NULL DEFAULT 0,   -- the root's words in the Qurʾān
  tier        INTEGER NOT NULL,     -- 1 ≥100 · 2 ≥30 · 3 ≥10 · 4 ≥3 · 5 rarer (by lemma_n)
  n_lemmas    INTEGER NOT NULL DEFAULT 1,   -- the root's lemmas in the Qurʾān
  gloss_en    TEXT,                 -- the lemma's gloss (Lane: the headword's first sense, or the sense he cites the Qurʾān under)
  gloss_ref   TEXT,
  here_en     TEXT,                 -- the sense a source files THIS āyah under, in English (Lane, Mir)
  here_ref    TEXT,
  here_sense  TEXT,                 -- qr_vocab_sense.id of here_en
  senses_json TEXT,                 -- every qr_vocab_sense.id placed on this word
  n_range     INTEGER NOT NULL DEFAULT 0,   -- the root's Qurʾānic senses, all sources
  PRIMARY KEY (surah, ayah, word_index)
);

CREATE TABLE qr_vocab_place (
  surah       INTEGER NOT NULL,
  ayah        INTEGER NOT NULL,
  word_index  INTEGER NOT NULL,
  sense_id    TEXT NOT NULL,
  how         TEXT NOT NULL,        -- ayah (the only word of the root there) · quote · head · lemma · link · attested
  note_ar     TEXT,                 -- al-Rāghib's own reading of this āyah (his «أي: …»)
  PRIMARY KEY (surah, ayah, word_index, sense_id)
);

CREATE TABLE qr_vocab_root_core (
  root        TEXT NOT NULL,
  source_slug TEXT NOT NULL,        -- maqayis_lugha | kmaps_root_dna
  text_ar     TEXT,
  text_en     TEXT,
  citation    TEXT NOT NULL,
  al_ref      TEXT,
  PRIMARY KEY (root, source_slug)
);

CREATE TABLE qr_vocab_sense (
  id          TEXT PRIMARY KEY,     -- mfr:<hash> · lane:<block id> · mir:<hash> · arc:<arc id>:<sense id>
  source      TEXT NOT NULL,        -- raghib_mufradat | lane_lexicon | mir_verbal_idioms | sense_arc
  root        TEXT NOT NULL,        -- the Qurʾān's root (qr_word_occurrence.root)
  al_root     TEXT,                 -- the root as the source files it
  head_ar     TEXT,                 -- the headword / construction the sense is given for
  label_ar    TEXT,                 -- the source's own words (al-Rāghib's gloss, Mir's construction, the rung)
  label_en    TEXT,                 -- the source's own English (Lane's definition, Mir's sense, the rung)
  kind        TEXT,                 -- Lane's sense kind · Mir's construction · the rung's gloss
  marker      TEXT,                 -- Lane's sense label (A1, B …) · Mir's particle · the rung number
  page        TEXT,
  seq         INTEGER,              -- its place in the source's entry / the arc
  group_key   TEXT NOT NULL,        -- the senses read as one range: mfr:<root> · lane:<root> · mir:<root> · <arc id>
  ref         TEXT NOT NULL,        -- the citation shown
  al_ref      TEXT,                 -- the AL rows it was read from (facts, block, tabir, sense)
  ayat_json   TEXT NOT NULL,        -- the āyāt the source cites under it that hold a word of the root
  n_ayat      INTEGER NOT NULL,
  arc_json    TEXT                  -- sense arcs: the arc and its rungs
);

CREATE TABLE "qr_word_occurrence" (
  id                TEXT PRIMARY KEY,
  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  word_index        INTEGER NOT NULL,
  word_text         TEXT NOT NULL,
  word_text_bare    TEXT,
  root              TEXT,
  lemma             TEXT,
  pos               TEXT,
  morphology_tag    TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')), morphology_tag_json JSON
  CHECK (morphology_tag_json IS NULL OR json_valid(morphology_tag_json)), root_uid TEXT, lemma_ref TEXT, stem_pos           TEXT, gt_case            TEXT, gt_number          TEXT, gt_gender          TEXT, gt_person          TEXT, gt_voice           TEXT, gt_tense           TEXT, gt_mood            TEXT, gt_definiteness    TEXT, gt_derivation_type TEXT, gt_form_family     TEXT, stem_form_ar       TEXT, stem_lemma_ar      TEXT, stem_root_ar       TEXT, form_roman         TEXT, segment_count      INTEGER, prefix_count       INTEGER, suffix_count       INTEGER, has_det_prefix     INTEGER, has_pron_suffix    INTEGER, is_content_word    INTEGER, is_promoted        INTEGER, gid_lemma          TEXT, gid_root           TEXT, gt_jumud TEXT, gt_readings_json TEXT,
  UNIQUE (surah, ayah, word_index),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE qr_word_sense_link (
  id            TEXT PRIMARY KEY,
  word_occ_id   TEXT NOT NULL REFERENCES qr_word_occurrence(id),
  al_sense_id   TEXT NOT NULL,
  al_arc_id     TEXT,
  surah_no      INTEGER NOT NULL,
  ayah_no       INTEGER NOT NULL,
  word_index    INTEGER NOT NULL,
  ayah_key      TEXT,
  is_contextual INTEGER NOT NULL DEFAULT 0,
  is_primary    INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  evidence_json JSON NOT NULL DEFAULT '[]' CHECK (json_valid(evidence_json)),
  confidence    TEXT DEFAULT 'medium',
  status        TEXT NOT NULL DEFAULT 'live',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (word_occ_id, al_sense_id)
);

CREATE TABLE qr_word_term (
  id TEXT PRIMARY KEY,
  word_ref TEXT NOT NULL REFERENCES "qr_word_occurrence"(id),
  surah INTEGER NOT NULL, ayah INTEGER NOT NULL, word_index INTEGER NOT NULL,
  gram_term_ref TEXT NOT NULL, category_key TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('qac','rule','sourced')),
  basis TEXT NOT NULL DEFAULT 'derived' CHECK (basis IN ('attested','derived')),
  rule_id TEXT, source_slug TEXT, source_ref TEXT,
  confidence TEXT NOT NULL DEFAULT 'high',
  note_ar TEXT, note_en TEXT, note_ur TEXT,
  state TEXT NOT NULL DEFAULT 'live' CHECK (state IN ('live','draft','retired')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (word_ref, gram_term_ref),
  CHECK (tier <> 'rule' OR rule_id IS NOT NULL),
  CHECK (basis <> 'attested' OR source_ref IS NOT NULL)
);

CREATE TABLE qr_word_translation (
  surah     INTEGER NOT NULL,
  ayah      INTEGER NOT NULL,
  position  INTEGER NOT NULL,       -- Quran.com word position (1-based)
  lang      TEXT NOT NULL,          -- en | ur
  text      TEXT NOT NULL,
  word_ar   TEXT,                   -- the word as Quran.com writes it (to check the alignment)
  aligned   INTEGER NOT NULL DEFAULT 0,  -- 1 when the āyah's positions equal the corpus's word_index
  PRIMARY KEY (surah, ayah, position, lang)
);


-- ── Views (33) ───────────────────────────────────────────────────

CREATE VIEW ar_ling_gram_term_signature AS
 SELECT COUNT(*) AS term_count,
        COUNT(DISTINCT category_key) AS category_count,
        SUM(version) AS version_sum,
        SUM(CASE WHEN status='live' THEN 1 ELSE 0 END) AS live_count,
        COUNT(*)||'.'||COUNT(DISTINCT category_key)||'.'||SUM(version)||'.'||SUM(length(id)+length(name_ar)+length(name_en)+length(COALESCE(name_ur,''))) AS signature
 FROM ar_ling_gram_term;

CREATE VIEW qr_gram_term_folded AS
  SELECT id, category_key, name_ar,
    replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
      name_ar,'أ','ا'),'إ','ا'),'آ','ا'),'ٱ','ا'),'ة','ه'),'ى','ي'),
      'َ',''),'ُ',''),'ِ',''),'ْ',''),'ّ','') AS folded
  FROM ar_ling_gram_term WHERE status = 'live';

CREATE VIEW qr_gram_term_ref AS
SELECT id AS gram_term_ref, id, category_key, term_key, qac_flag, parent_term_id, term_order,
       name_ar, name_en, name_ur, short_ar, short_en, short_ur,
       definition_ar, definition_en, definition_ur, badge_color, icon,
       version, superseded_by, status, discipline, name_bare, aliases_json,
       'AL:ar_ling_gram_term' AS content_source
FROM ar_ling_gram_term;

CREATE VIEW qr_local_id_violations AS
  SELECT 'word.lemma' AS kind, w.id AS row_id, w.lemma_ref AS local_key
    FROM qr_word_occurrence w
   WHERE w.lemma_ref IS NOT NULL AND w.gid_lemma IS NULL
  UNION ALL
  SELECT 'word.root', w.id, w.root_uid
    FROM qr_word_occurrence w
   WHERE w.root IS NOT NULL AND w.gid_root IS NULL
  UNION ALL
  SELECT 'display_lemma', dl.id, dl.lemma_ref
    FROM qr_morph_display_lemma dl
   WHERE dl.lemma_ref IS NOT NULL AND dl.gid_lemma IS NULL
  UNION ALL
  SELECT 'root_registry', rr.root_ar, rr.root_uid
    FROM qr_root_registry rr
   WHERE rr.root_uid IS NOT NULL AND rr.gid_root IS NULL;

CREATE VIEW qr_morph_display_word AS SELECT * FROM v_morph_display_word;

CREATE VIEW qr_nazm_group_openings AS
SELECT g.slug, m.member_index, m.surah, s.name_ar AS surah_ar, s.name_transliteration AS surah_translit,
       m.member_role, m.opening_form, m.opening_ayah, a.text_uthmani_clean AS opening_live,
       m.opening_text_ar AS opening_stored,
       CASE WHEN a.text_uthmani_clean = m.opening_text_ar THEN 'ok' ELSE 'DRIFT' END AS integrity,
       m.epithet_pair_ar, m.epithet_case, m.is_anomaly
FROM qr_nazm_group_member m
JOIN qr_nazm_group g ON g.id = m.group_id
JOIN "qr_surah" s ON s.id = m.surah
LEFT JOIN qr_ayah a ON a.surah = m.surah AND a.ayah = m.opening_ayah
ORDER BY g.slug, m.member_index;

CREATE VIEW qr_nazm_scholar_layer AS
SELECT p.id AS scholar_id, p.name_en, p.birth_year_ce AS born, p.death_year_ce AS died,
       par.name_en AS paradigm, l.affiliation_type,
       (SELECT COUNT(*) FROM qr_nazm_group g
          WHERE (p.id='QR:SCH:ISLAHI' AND g.slug LIKE 'islahi_%')
             OR (p.id='QR:SCH:FARRIN' AND g.slug LIKE 'farrin_%')) AS group_rows,
       CASE
         WHEN p.id='QR:SCH:ISLAHI'   THEN 'complete group scheme'
         WHEN p.id='QR:SCH:FARRIN'   THEN 'rival group scheme (partial)'
         WHEN p.id='QR:SCH:FARAHI'   THEN 'principle only (amud)'
         WHEN p.id='QR:SCH:NAK'      THEN 'macro-order engagement, no named groups'
         WHEN p.id='QR:SCH:RANDHAWA' THEN 'macro-order engagement, no named groups'
         WHEN p.id='QR:SCH:GHAMIDI'  THEN 'follows Islahi, none independent'
         ELSE 'unassessed'
       END AS group_layer_contribution
FROM qr_scholar_profile p
JOIN qr_scholar_paradigm_link l ON l.scholar_id = p.id
JOIN qr_scholarly_paradigm par ON par.id = l.paradigm_id
WHERE l.affiliation_type <> 'influenced_by';

CREATE VIEW qr_nazm_surah_groups AS
SELECT s.id AS surah, s.name_transliteration AS surah_translit,
       COUNT(m.id) AS group_count,
       GROUP_CONCAT(g.slug) AS groups
FROM "qr_surah" s
LEFT JOIN qr_nazm_group_member m ON m.surah = s.id
LEFT JOIN qr_nazm_group g ON g.id = m.group_id
GROUP BY s.id;

CREATE VIEW qr_scholar_passage_incipit_check AS
SELECT m.id, m.tafsir_id reading_id, m.movement_ord, m.incipit_ar, m.evidence_ref,
  CASE WHEN instr(
    replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(b.text_ar,'ً',''),'ٌ',''),'ٍ',''),'َ',''),'ُ',''),'ِ',''),'ّ',''),'ْ',''),'ٰ',''),'ـ',''),
    replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(m.incipit_ar,'ً',''),'ٌ',''),'ٍ',''),'َ',''),'ُ',''),'ِ',''),'ّ',''),'ْ',''),'ٰ',''),'ـ','')
  )>0 THEN 1 ELSE 0 END AS verified_stripped
FROM qr_scholar_passage_movement m
LEFT JOIN qr_tafsir_book_display_block b ON b.id = m.evidence_ref;

CREATE VIEW qr_ss_balagha_span_candidates AS
  SELECT b.id, b.scope_type, b.scope_id, b.lx_balagha_ref AS gram_term_ref,
         g.name_ar AS figure, b.note_md
    FROM qr_ss_scope_balagha_link b
    LEFT JOIN ar_ling_gram_term g ON g.id = b.lx_balagha_ref
   WHERE b.scope_type = 'sentence'
     -- the figures that are about relations BETWEEN units by definition
     AND b.lx_balagha_ref IN (
       'GT:balagha_badi:iltifat',
       'GT:balagha_badi:muqabala',
       'GT:balagha_badi:tibaq',
       'GT:balagha_bayan:istiara',
       'GT:balagha_maani:tafsil',
       'GT:balagha_maani:taqdim_takhir'
     );

CREATE VIEW qr_ss_band_rows AS
 SELECT '310-40-IRAB' band_code, r.sentence_id, COUNT(*) n
   FROM qr_ss_scope_reading x JOIN qr_ss_scope_resolve r ON r.scope_id=x.scope_id GROUP BY 2
 UNION ALL
 SELECT '310-50-NAHW', r.sentence_id, COUNT(*)
   FROM qr_ss_scope_grammar_link x JOIN qr_ss_scope_resolve r ON r.scope_id=x.scope_id GROUP BY 2
 UNION ALL
 SELECT '310-60-BALAGHA', r.sentence_id, COUNT(*)
   FROM qr_ss_scope_balagha_link x JOIN qr_ss_scope_resolve r ON r.scope_id=x.scope_id GROUP BY 2
 UNION ALL
 SELECT '310-70-SIYAQ', r.sentence_id, COUNT(*)
   FROM qr_ss_scope_nuance x JOIN qr_ss_scope_resolve r ON r.scope_id=x.scope_id GROUP BY 2;

CREATE VIEW qr_ss_gaps AS
 SELECT * FROM qr_ss_gaps_core UNION ALL SELECT * FROM qr_ss_gaps_gloss;

CREATE VIEW qr_ss_gaps_core AS
SELECT '310-30-SHAJARA' band_code,'node_unexpanded' gap_kind,'high' severity, a.surah, a.ayah,'tree_node' scope_type, a.id scope_id, a.node_label detail
  FROM qr_ss_node_anchor a WHERE a.anchor_state='unexpanded'
UNION ALL
SELECT '310-20-TARKIB','segment_missing','high', a.surah, a.ayah,'tree_node', a.id, a.node_label
  FROM qr_ss_node_anchor a WHERE a.anchor_state='sub_word'
UNION ALL
SELECT '310-30-SHAJARA','leaf_unanchored','high', a.surah, a.ayah,'tree_node', a.id, a.node_label
  FROM qr_ss_node_anchor a WHERE a.anchor_state='unanchored'
UNION ALL
SELECT '310-40-IRAB','gloss_missing','medium', NULL, NULL,'scope_reading', r.id, r.scope_type
  FROM qr_ss_scope_reading r WHERE r.gloss_json IS NULL
UNION ALL
SELECT '310-40-IRAB','evidence_missing','high', NULL, NULL,'scope_reading', r.id, r.scope_type
  FROM qr_ss_scope_reading r
 WHERE NOT EXISTS (SELECT 1 FROM qr_ss_scope_reading_evidence_link e WHERE e.reading_id=r.id);

CREATE VIEW qr_ss_gaps_gloss AS
SELECT '310-50-NAHW' band_code,'gloss_missing' gap_kind,'medium' severity, NULL surah, NULL ayah,
       'scope_grammar_link' scope_type, id scope_id, lx_grammar_ref detail
  FROM qr_ss_scope_grammar_link WHERE gloss_json IS NULL
UNION ALL
SELECT '310-60-BALAGHA','gloss_missing','medium', NULL, NULL,'scope_balagha_link', id, lx_balagha_ref
  FROM qr_ss_scope_balagha_link WHERE gloss_json IS NULL
UNION ALL
SELECT '310-70-SIYAQ','gloss_missing','medium', NULL, NULL,'scope_nuance', id, nuance_type
  FROM qr_ss_scope_nuance WHERE gloss_json IS NULL
UNION ALL
SELECT '310-75-RABT','gloss_missing','medium', NULL, NULL,'scope_link', id, relation_type
  FROM qr_ss_scope_link WHERE gloss_json IS NULL
UNION ALL
SELECT '310-10-JUMLA','gloss_missing','medium', surah, ayah_from,'occ_sentence', id, sentence_kind
  FROM qr_ss_occ_sentence WHERE gloss_json IS NULL AND is_virtual=0;

CREATE VIEW qr_ss_gt_ref_cols AS
 SELECT 'lx_grammar_ref' col, 'qr_ss_scope_grammar_link' tbl, id row_id, lx_grammar_ref val FROM qr_ss_scope_grammar_link
 UNION ALL SELECT 'lx_balagha_ref','qr_ss_scope_balagha_link', id, lx_balagha_ref FROM qr_ss_scope_balagha_link
 UNION ALL SELECT 'lx_sentence_kind_ref','qr_ss_occ_sentence', id, lx_sentence_kind_ref FROM qr_ss_occ_sentence
 UNION ALL SELECT 'lx_clause_type_ref','qr_ss_occ_clause', id, lx_clause_type_ref FROM qr_ss_occ_clause
 UNION ALL SELECT 'lx_clause_func_ref','qr_ss_occ_clause', id, lx_clause_func_ref FROM qr_ss_occ_clause;

CREATE VIEW qr_ss_gt_ref_cols2 AS
 SELECT 'lx_phrase_type_ref' col, 'qr_ss_occ_phrase' tbl, id row_id, lx_phrase_type_ref val FROM qr_ss_occ_phrase
 UNION ALL SELECT 'lx_phrase_func_ref','qr_ss_occ_phrase', id, lx_phrase_func_ref FROM qr_ss_occ_phrase
 UNION ALL SELECT 'lx_particle_ref','qr_ss_occ_segment', id, lx_particle_ref FROM qr_ss_occ_segment
 UNION ALL SELECT 'lx_rel_type_ref','qr_ss_syntax_link', id, lx_rel_type_ref FROM qr_ss_syntax_link
 UNION ALL SELECT 'sarf_term_ref','qr_ss_tree_node', id, sarf_term_ref FROM qr_ss_tree_node;

CREATE VIEW qr_ss_gt_violations AS
 SELECT col kind, val key, tbl, row_id, 'grammar term ref is not a GT id from ar_ling_gram_term' problem FROM qr_ss_gt_ref_cols WHERE val IS NOT NULL AND val NOT LIKE 'GT:_%:_%'
 UNION ALL
 SELECT col, val, tbl, row_id, 'grammar term ref is not a GT id from ar_ling_gram_term' FROM qr_ss_gt_ref_cols2 WHERE val IS NOT NULL AND val NOT LIKE 'GT:_%:_%'
 UNION ALL
 SELECT 'grammar_concept_ref', e.grammar_concept_ref, 'qr_irab_book_entry', e.id, 'grammar term ref is not a GT id from ar_ling_gram_term' FROM qr_irab_book_entry e WHERE e.grammar_concept_ref IS NOT NULL AND e.grammar_concept_ref NOT LIKE 'GT:_%:_%'
 UNION ALL
 SELECT 'gram_term_id', v.kind||'/'||v.key, 'qr_ss_vocab_register', v.kind||':'||v.key, 'canonical key in use but not bound to a GT term' FROM qr_ss_vocab_register v WHERE v.status='canonical' AND v.gram_term_id IS NULL AND v.mapping_status NOT IN ('n/a','gap') AND v.kind IN ('term_key','clause_function','clause_type','segment_type','relation_label') AND (v.key IN (SELECT term_key FROM qr_ss_tree_node WHERE term_key IS NOT NULL) OR v.key IN (SELECT clause_function FROM qr_ss_occ_clause WHERE clause_function IS NOT NULL) OR v.key IN (SELECT clause_type FROM qr_ss_occ_clause) OR v.key IN (SELECT segment_type FROM qr_ss_occ_segment) OR v.key IN (SELECT relation_label FROM qr_ss_syntax_link))
 UNION ALL
 SELECT 'gram_term_id', v.kind||'/'||v.key, 'qr_ss_vocab_register', v.kind||':'||v.key, 'bound value is not a GT id' FROM qr_ss_vocab_register v WHERE v.gram_term_id IS NOT NULL AND v.gram_term_id NOT LIKE 'GT:_%:_%';

CREATE VIEW qr_ss_node_anchor AS
SELECT n.id, n.tree_id, t.sentence_id, s.surah, s.ayah_from ayah, n.node_label, n.term_key, n.depth,
 n.word_occurrence_id, n.is_virtual,
 trim(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
 n.node_label,'َ',''),'ً',''),'ُ',''),'ٌ',''),'ِ',''),'ٍ',''),'ْ',''),'ّ',''),'ٰ',''),'ۖ',''),'ـ','')) label_bare,
 CASE WHEN EXISTS (SELECT 1 FROM qr_ss_tree_node c WHERE c.parent_node_id=n.id) THEN 'internal'
      WHEN n.is_virtual=1                   THEN 'virtual'
      WHEN n.scope_type='segment'           THEN 'segment'
      WHEN n.word_occurrence_id IS NOT NULL THEN 'anchored'
      WHEN instr(trim(n.node_label),' ')>0  THEN 'unexpanded'
      WHEN EXISTS (SELECT 1 FROM qr_word_occurrence w WHERE w.surah=s.surah AND w.ayah=s.ayah_from
            AND w.word_index BETWEEN COALESCE(s.word_start_index,1) AND COALESCE(s.word_end_index,999)
            AND instr(w.word_text_bare, trim(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
                n.node_label,'َ',''),'ً',''),'ُ',''),'ٌ',''),'ِ',''),'ٍ',''),'ْ',''),'ّ',''),'ٰ',''),'ۖ',''),'ـ','')))>0)
                                            THEN 'sub_word'
      ELSE 'unanchored' END anchor_state
FROM qr_ss_tree_node n
JOIN qr_ss_tree t ON t.id=n.tree_id
JOIN qr_ss_occ_sentence s ON s.id=t.sentence_id;

CREATE VIEW qr_ss_passage_scope_span AS
  SELECT p.id AS passage_id, p.surah, p.ayah_from, p.ayah_to, s.id AS sentence_id
    FROM qr_surah_study_passage p
    JOIN qr_ss_occ_sentence s
      ON s.surah = p.surah AND s.ayah_from >= p.ayah_from AND s.ayah_to <= p.ayah_to;

CREATE VIEW qr_ss_pattern_term_violations AS
  SELECT pattern_key, facet, raw_key
    FROM qr_ss_pattern_term_link
   WHERE gram_term_ref IS NULL
      OR gram_term_ref NOT IN (SELECT id FROM ar_ling_gram_term WHERE status = 'live');

CREATE VIEW qr_ss_reading_verdict AS
SELECT r.scope_id, r.id reading_id, r.scholar_ref, r.paradigm_ref, r.witness_count,
 CASE WHEN r.is_selected=1 THEN 'SELECTED'
      WHEN r.selection_criteria LIKE 'rejected:%' THEN 'rejected'
      WHEN r.selection_criteria LIKE 'n/a:%' THEN 'n/a'
      WHEN r.selection_criteria='adopted_as_mechanism' THEN 'mechanism'
      ELSE 'unjudged' END verdict,
 r.selection_criteria,
 json_extract(r.selection_rationale_json,'$.en') why_en,
 json_extract(r.selection_rationale_json,'$.ar') why_ar,
 r.reading_text_ar,
 (SELECT COUNT(*) FROM qr_ss_scope_reading_evidence_link e WHERE e.reading_id=r.id) evidence_rows,
 (SELECT GROUP_CONCAT(e.evidence_id,' | ') FROM qr_ss_scope_reading_evidence_link e WHERE e.reading_id=r.id) evidence_ids
FROM qr_ss_scope_reading r;

CREATE VIEW qr_ss_scope_resolve AS
 SELECT id scope_id,'sentence' scope_type, id sentence_id, surah, ayah_from ayah FROM qr_ss_occ_sentence
 UNION ALL
 SELECT id,'clause', sentence_id, surah, ayah_from FROM qr_ss_occ_clause
 UNION ALL
 SELECT p.id,'phrase', c.sentence_id, p.surah, p.ayah FROM qr_ss_occ_phrase p
   LEFT JOIN qr_ss_occ_clause c ON c.id=p.clause_id
 UNION ALL
 SELECT g.id,'segment', s.id, g.surah, g.ayah FROM qr_ss_occ_segment g
   LEFT JOIN qr_ss_occ_sentence s ON s.surah=g.surah AND g.ayah BETWEEN s.ayah_from AND s.ayah_to
 UNION ALL
 -- The scope above the sentence. A figure attached here is a claim about the
 -- span, not about any one sentence in it — which is what iltifāt, muqābala and
 -- a developed istiʿāra actually are.
 SELECT id,'passage', NULL, surah, ayah_from FROM qr_surah_study_passage;

CREATE VIEW qr_ss_sentence_type_violations AS
  SELECT id, 'sentence_class' AS facet, sentence_kind AS wrote, gt_sentence_class AS resolved
    FROM qr_ss_occ_sentence
   WHERE gt_sentence_class IS NOT NULL
     AND gt_sentence_class NOT IN (SELECT id FROM ar_ling_gram_term WHERE status='live')
  UNION ALL
  SELECT id, 'kalam_kind', note_md, gt_kalam_kind
    FROM qr_ss_occ_sentence
   WHERE gt_kalam_kind IS NOT NULL
     AND gt_kalam_kind NOT IN (SELECT id FROM ar_ling_gram_term WHERE status='live');

CREATE VIEW qr_ss_translation_basis AS
SELECT u.id unit_id, u.scope_id, u.surah, u.ayah_from ayah, u.fluent_en,
 u.reading_ref taken_reading, r.scholar_ref taken_scholar, r.witness_count, r.selection_criteria taken_because,
 json_extract(r.selection_rationale_json,'$.en') taken_why_en,
 json_extract(r.selection_rationale_json,'$.ar') taken_why_ar,
 r.reading_text_ar taken_position_ar,
 json_array_length(COALESCE(u.rejected_readings_json,'[]')) rejected_count,
 u.rejected_readings_json rejected_detail,
 (SELECT COUNT(*) FROM qr_ss_translation_decision d WHERE d.unit_id=u.id) decisions,
 (SELECT COUNT(*) FROM qr_ss_translation_nuance n WHERE n.translation_unit_id=u.id) forks,
 u.synthesis_md
FROM qr_ss_translation_unit u
LEFT JOIN qr_ss_scope_reading r ON r.id=u.reading_ref;

CREATE VIEW qr_strip AS SELECT 1 x;

CREATE VIEW qr_tafsir_block_bare AS
SELECT id, source_slug, surah_no, ayah_no, ayah_to, block_type, display_order, LENGTH(text_ar) len,
 replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(text_ar,'ً',''),'ٌ',''),'ٍ',''),'َ',''),'ُ',''),'ِ',''),'ّ',''),'ْ',''),'ٰ',''),'ـ','') AS bare
FROM qr_tafsir_book_display_block;

CREATE VIEW qr_term_violations AS
  SELECT 'tree_node' AS tbl, n.id AS row_id, n.term_key AS wrote, n.gram_term_ref AS resolved
    FROM qr_ss_tree_node n
   WHERE n.term_key IS NOT NULL
     AND (n.gram_term_ref IS NULL
          OR n.gram_term_ref NOT LIKE 'GT:%'
          OR n.gram_term_ref NOT IN (SELECT id FROM ar_ling_gram_term))
  UNION ALL
  SELECT 'scope_morph', m.id, m.lx_morph_ref, m.gram_term_ref
    FROM qr_ss_scope_morph_link m
   WHERE m.gram_term_ref IS NULL
      OR m.gram_term_ref NOT LIKE 'GT:%'
      OR m.gram_term_ref NOT IN (SELECT id FROM ar_ling_gram_term)
  UNION ALL
  SELECT 'scope_grammar', g.id, g.lx_grammar_ref, g.lx_grammar_ref
    FROM qr_ss_scope_grammar_link g
   WHERE g.lx_grammar_ref IS NULL
      OR g.lx_grammar_ref NOT LIKE 'GT:%'
      OR g.lx_grammar_ref NOT IN (SELECT id FROM ar_ling_gram_term)
  UNION ALL
  SELECT 'scope_balagha', b.id, b.lx_balagha_ref, b.lx_balagha_ref
    FROM qr_ss_scope_balagha_link b
   WHERE b.lx_balagha_ref IS NULL
      OR b.lx_balagha_ref NOT LIKE 'GT:%'
      OR b.lx_balagha_ref NOT IN (SELECT id FROM ar_ling_gram_term);

CREATE VIEW qr_vw_surah_study_tasks_compat AS
SELECT
  t.public_task_id AS task_id,
  p.public_unit_id AS unit_id,
  parent.public_task_id AS parent_task_id,
  t.task_type,
  t.task_name,
  t.step_no,
  t.status,
  t.task_json,
  t.updated_at,
  t.passage_id,
  t.step_id
FROM "qr_surah_study_task" t
JOIN "qr_surah_study_passage" p ON p.id = t.passage_id
LEFT JOIN "qr_surah_study_task" parent ON parent.id = t.parent_task_id;

CREATE VIEW v_morph_display_word AS
SELECT
  'MDW:' || w.surah || ':' || w.ayah || ':' || w.word_index AS id,
  w.id AS word_occ_ref, w.surah AS surah_no, w.ayah AS ayah_no, w.word_index AS word_index,
  w.surah || ':' || w.ayah AS ayah_key,
  w.word_text AS surface_ar, w.word_text_bare AS surface_bare,
  COALESCE(o.lemma_ar, dl.lemma_ar, w.lemma) AS lemma_ar,
  COALESCE(o.root_ar, w.stem_root_ar, w.root) AS root_ar,
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
    (SELECT t.name_ar FROM ar_ling_gram_term t WHERE t.id = w.gt_derivation_type)) AS derived_type_ar,
  COALESCE(e.derived_type_en_override, o.derived_type_en, dl.derived_type_en,
    (SELECT t.name_en FROM ar_ling_gram_term t WHERE t.id = w.gt_derivation_type)) AS derived_type_en,
  COALESCE(e.wazn_ar_override, o.wazn_ar, dl.wazn_ar) AS wazn_ar,
  COALESCE(o.form_roman, dl.form_roman, w.form_roman) AS form_roman,
  -- The chips, from the ten GT columns. One pass over the registry with an IN
  -- list rather than a ten-way UNION: D1 caps the terms in a compound SELECT,
  -- and this is a single indexed lookup per term anyway. The CASE is the
  -- reading order of the card, which is a property of the category, not of the
  -- row -- iʿrāb first, then what the word IS, then what it was built from.
  (SELECT json_group_array(json_object('cat',cat,'ar',ar,'en',en,'ur',ur,'ref',ref))
     FROM (SELECT t.category_key cat, t.name_ar ar, t.name_en en, t.name_ur ur, t.id ref
             FROM ar_ling_gram_term t
            WHERE t.id IN (w.gt_case, w.gt_definiteness, w.gt_number, w.gt_gender,
                           w.gt_person, w.gt_tense, w.gt_mood, w.gt_voice,
                           w.gt_derivation_type, w.gt_form_family)
            ORDER BY CASE t.category_key
                       WHEN 'case' THEN 10 WHEN 'definiteness' THEN 20
                       WHEN 'number' THEN 30 WHEN 'gender' THEN 35
                       WHEN 'person' THEN 38 WHEN 'tense' THEN 40
                       WHEN 'mood' THEN 42 WHEN 'voice' THEN 45
                       WHEN 'derivation_type' THEN 50 WHEN 'form_family' THEN 60
                       ELSE 99 END)) AS features_json,
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
  COALESCE(o.lemma_ref, w.lemma_ref) AS lemma_ref,
  -- The registered global ids, carried on the word row by 011 instead of
  -- being joined for on every request. The grid used to reach qr_lemma just to
  -- turn its local key into the AL id it actually needed.
  w.gid_lemma AS lemma_uid,
  w.gid_root  AS root_uid_global
FROM qr_word_occurrence w
JOIN qr_morph_pos_rule r ON r.pos = w.stem_pos
LEFT JOIN qr_morph_word_override o ON o.surah_no=w.surah AND o.ayah_no=w.ayah AND o.word_index=w.word_index AND o.status='live'
LEFT JOIN qr_morph_editorial e ON e.surah_no=w.surah AND e.ayah_no=w.ayah AND e.word_index=w.word_index
LEFT JOIN qr_morph_display_lemma dl ON dl.lemma_ref = COALESCE(o.lemma_ref, w.lemma_ref) AND dl.status='live'
LEFT JOIN qr_morph_display_root  dr ON dr.root_ar = w.root AND dr.status='live'
LEFT JOIN qr_root_freq rf ON rf.root_ar = w.root
WHERE w.is_promoted = 1;

CREATE VIEW v_root_lemma_word AS
SELECT w.root, w.root_uid, w.lemma_ref, w.lemma AS lemma_surface,
       w.id AS word_occ_id, w.surah, w.ayah, w.word_index,
       w.word_text, w.pos, w.morphology_tag,
       w.surah || ':' || w.ayah AS ayah_key
  FROM qr_word_occurrence w;

CREATE VIEW v_ss_scope_span AS
  SELECT 'sentence' AS scope_type, id AS scope_id, surah,
         ayah_from, ayah_to, word_start_index AS word_start, word_end_index AS word_end
    FROM qr_ss_occ_sentence
  UNION ALL
  SELECT 'clause', id, surah, ayah_from, ayah_to, word_start_index, word_end_index
    FROM qr_ss_occ_clause
  UNION ALL
  SELECT 'phrase', id, surah, ayah, ayah, word_start_index, word_end_index
    FROM qr_ss_occ_phrase
  UNION ALL
  SELECT 'word', id, surah, ayah, ayah, word_index, word_index
    FROM qr_word_occurrence;

CREATE VIEW v_ss_scope_term AS
  SELECT scope_type, scope_id, 'balagha' AS discipline, lx_balagha_ref AS term_ref,
         balagha_category AS category, rhetorical_effect AS note, gloss_json
    FROM qr_ss_scope_balagha_link
  UNION ALL
  SELECT scope_type, scope_id, 'nahw', lx_grammar_ref, NULL, application_note, gloss_json
    FROM qr_ss_scope_grammar_link
  UNION ALL
  SELECT scope_type, scope_id, 'irab', lx_morph_ref, syntactic_function, irab_position, NULL
    FROM qr_ss_scope_morph_link;

CREATE VIEW v_word_term AS
SELECT w.root, w.root_uid, w.lemma_ref, w.lemma AS lemma_surface,
       w.id AS word_occ_id, w.surah, w.ayah, w.word_index, w.word_text,
       t.discipline, t.term_ref, t.category, t.note,
       t.scope_type AS attachment, t.scope_id
  FROM v_ss_scope_term t
  JOIN v_ss_scope_span s
    ON s.scope_type = t.scope_type AND s.scope_id = t.scope_id
  JOIN qr_word_occurrence w
    ON w.surah = s.surah
   AND w.ayah BETWEEN s.ayah_from AND s.ayah_to
   AND (s.word_start IS NULL OR w.word_index BETWEEN s.word_start AND s.word_end);


-- ── Indexes (243) ────────────────────────────────────────────────

CREATE INDEX idx_algts_term ON ar_ling_gram_term_source (term_id);

CREATE INDEX idx_core_concept_domain ON core_concept (domain);

CREATE INDEX idx_core_concept_key    ON core_concept (concept_key);

CREATE INDEX idx_gram_alias_bare ON ar_ling_gram_term_alias (alias_bare);

CREATE INDEX idx_gt_term_cat ON gt_term(category_key);

CREATE INDEX idx_iraab_block_ayah       ON "qr_irab_book_display_block" (surah_no, ayah_no);

CREATE INDEX idx_iraab_block_ayah_key   ON "qr_irab_book_display_block" (ayah_key);

CREATE INDEX idx_iraab_block_chunk      ON "qr_irab_book_display_block" (source_chunk_id);

CREATE INDEX idx_iraab_block_entry      ON "qr_irab_book_display_block" (source_entry_id);

CREATE INDEX idx_iraab_block_group      ON "qr_irab_book_display_block" (ayah_group_key);

CREATE INDEX idx_iraab_block_grouped    ON "qr_irab_book_display_block" (surah_no, is_grouped);

CREATE INDEX idx_iraab_block_order      ON "qr_irab_book_display_block" (surah_no, ayah_no, display_order);

CREATE INDEX idx_iraab_block_review     ON "qr_irab_book_display_block" (review_status);

CREATE INDEX idx_iraab_block_slug       ON "qr_irab_book_display_block" (source_slug);

CREATE INDEX idx_iraab_block_source     ON "qr_irab_book_display_block" (source_id);

CREATE INDEX idx_iraab_block_surah      ON "qr_irab_book_display_block" (surah_no);

CREATE INDEX idx_iraab_block_type       ON "qr_irab_book_display_block" (block_type);

CREATE INDEX idx_iraab_link_to ON "qr_irab_book_display_link" (to_block_id, link_kind);

CREATE INDEX idx_iraab_note_ayah  ON "qr_irab_book_display_note" (surah_no, ayah_no);

CREATE INDEX idx_iraab_note_block ON "qr_irab_book_display_note" (block_id);

CREATE INDEX idx_iraab_note_group ON "qr_irab_book_display_note" (ayah_group_key);

CREATE INDEX idx_iraab_note_kind  ON "qr_irab_book_display_note" (note_kind);

CREATE INDEX idx_iraab_ref_ayah    ON "qr_irab_book_display_ref" (surah_no, ayah_no);

CREATE INDEX idx_iraab_ref_block   ON "qr_irab_book_display_ref" (block_id);

CREATE INDEX idx_iraab_ref_group   ON "qr_irab_book_display_ref" (ayah_group_key);

CREATE INDEX idx_iraab_ref_typed   ON "qr_irab_book_display_ref" (typed_ref);

CREATE INDEX idx_iraab_tag_value_norm
  ON "qr_irab_book_display_tag" (tag_kind, tag_value_norm);

CREATE INDEX idx_mdl_bare ON "qr_morph_display_lemma"(lemma_bare);

CREATE INDEX idx_mdl_root ON "qr_morph_display_lemma"(root_ar);

CREATE INDEX idx_morph_blocks_ayah  ON "qr_morph_display_block"(ayah_key, scope_level);

CREATE INDEX idx_morph_blocks_root  ON "qr_morph_display_block"(root_ar, scope_level);

CREATE INDEX idx_morph_blocks_scope ON "qr_morph_display_block"(scope_level, scope_key, display_order);

CREATE INDEX idx_morph_media_root ON qr_morph_display_media(root_ar, block_type);

CREATE INDEX idx_morph_media_word ON qr_morph_display_media(surah_no, ayah_no, word_index);

CREATE INDEX idx_qr_drill_anchor_family_source ON qr_drill_anchor(family, source, word_index);

CREATE INDEX idx_qr_drill_anchor_grp ON qr_drill_anchor (family, grp);

CREATE INDEX idx_qr_drill_anchor_ref ON qr_drill_anchor (ref);

CREATE INDEX idx_qr_drill_anchor_scope ON qr_drill_anchor (family, surah, ayah);

CREATE INDEX idx_qr_irab_book_entries_chunk
  ON "qr_irab_book_entry"(source_chunk_id);

CREATE INDEX idx_qr_irab_book_entries_mapping
  ON "qr_irab_book_entry"(al_mapping_status);

CREATE INDEX idx_qr_irab_book_entries_word_link
  ON "qr_irab_book_entry"(word_link_status);

CREATE INDEX idx_qr_irab_book_word_alt ON qr_irab_book_word (surah, ayah) WHERE alt_roles_json IS NOT NULL;

CREATE INDEX idx_qr_irab_book_word_book ON qr_irab_book_word (source_slug, surah, ayah);

CREATE INDEX idx_qr_irab_book_word_split ON qr_irab_book_word (n_roles, surah);

CREATE INDEX idx_qr_irab_book_word_word ON qr_irab_book_word (surah, ayah, word_index);

CREATE INDEX idx_qr_irab_drill_ayah ON qr_irab_drill_item(surah, ayah);

CREATE INDEX idx_qr_irab_drill_role ON qr_irab_drill_item(role_gt);

CREATE INDEX idx_qr_irab_source_chunks_ayah
  ON "qr_irab_source_chunk"(surah, ayah_from, ayah_to);

CREATE INDEX idx_qr_irab_source_chunks_section
  ON "qr_irab_source_chunk"(section_kind);

CREATE INDEX idx_qr_irab_source_chunks_source
  ON "qr_irab_source_chunk"(source_slug);

CREATE INDEX idx_qr_mdr_al_ref ON "qr_morph_display_root"(al_root_ref);

CREATE INDEX idx_qr_mushaf_layout_page
  ON "qr_mushaf_layout_line"(layout_key, page_number, line_number);

CREATE INDEX idx_qr_mushaf_layout_surah
  ON "qr_mushaf_layout_line"(layout_key, surah_number);

CREATE INDEX idx_qr_passage_sections_passage ON "qr_passage_section"(passage_id, sort_order);

CREATE INDEX idx_qr_ss_book_note_ayah ON qr_ss_book_note (surah, ayah, section_kind);

CREATE INDEX idx_qr_ss_book_note_scope ON qr_ss_book_note (scope_type, scope_id);

CREATE INDEX idx_qr_ss_clause_basis ON qr_ss_occ_clause (source_basis, surah, ayah_from);

CREATE INDEX idx_qr_ss_clause_reading_ayah ON qr_ss_clause_reading (surah, ayah, word_start);

CREATE INDEX idx_qr_ss_clause_reading_backbone ON qr_ss_clause_reading (is_backbone, surah, role_key);

CREATE INDEX idx_qr_ss_clause_reading_clause ON qr_ss_clause_reading (clause_id);

CREATE INDEX idx_qr_ss_clause_sentence ON qr_ss_occ_clause (sentence_id);

CREATE INDEX idx_qr_ss_ellipsis_scope ON qr_ss_ellipsis_event (scope_type, scope_id);

CREATE INDEX idx_qr_ss_link_from ON qr_ss_scope_link (from_scope_type, from_scope_id);

CREATE INDEX idx_qr_ss_nuance_scope ON qr_ss_scope_nuance (scope_type, scope_id);

CREATE INDEX idx_qr_ss_phrase_clause ON qr_ss_occ_phrase (clause_id);

CREATE INDEX idx_qr_ss_sentence_basis ON qr_ss_occ_sentence (source_basis, surah, ayah_from);

CREATE INDEX idx_qr_ss_tree_node_term ON qr_ss_tree_node(term_key);

CREATE INDEX idx_qr_ss_tree_node_word ON qr_ss_tree_node(word_occurrence_id);

CREATE INDEX idx_qr_tafsir_audio_segment_page ON qr_tafsir_audio_segment (page_id, seq);

CREATE INDEX idx_qr_tafsir_audio_source ON qr_tafsir_audio (source_slug, seq);

CREATE INDEX idx_qr_tafsir_drill_ask ON qr_tafsir_drill_item (ask, surah, ayah_from);

CREATE INDEX idx_qr_tafsir_en_range ON qr_tafsir_en(surah, ayah_from, ayah_to);

CREATE INDEX idx_qr_tafsir_question_passage ON qr_tafsir_question(passage_id, status, sort_order);

CREATE INDEX idx_qr_tafsir_read_page_surah ON qr_tafsir_read_page (source_slug, surah_no, seq);

CREATE INDEX idx_qr_tafsir_segment_en_audio ON qr_tafsir_segment_en(audio_id, seq);

CREATE INDEX idx_qr_tfa_ayah ON qr_translation_feature_ayah (surah, ayah);

CREATE INDEX idx_qr_vocab_gloss_role ON qr_vocab_gloss (surah, role) WHERE role IS NOT NULL;

CREATE INDEX idx_qr_vocab_gloss_word ON qr_vocab_gloss (surah, ayah, word_index);

CREATE INDEX idx_qr_vocab_item_placed ON qr_vocab_item (surah, ayah) WHERE senses_json IS NOT NULL;

CREATE INDEX idx_qr_vocab_item_root ON qr_vocab_item (root, lemma);

CREATE INDEX idx_qr_vocab_item_tier ON qr_vocab_item (surah, tier, ayah);

CREATE INDEX idx_qr_vocab_place_sense ON qr_vocab_place (sense_id);

CREATE INDEX idx_qr_vocab_sense_group ON qr_vocab_sense (group_key, seq);

CREATE INDEX idx_qr_vocab_sense_root ON qr_vocab_sense (root, source);

CREATE INDEX idx_qr_word_translation_ayah ON qr_word_translation(surah, ayah, lang);

CREATE INDEX idx_qra_page  ON qr_ayah(page_number);

CREATE INDEX idx_qra_surah ON qr_ayah(surah);

CREATE INDEX idx_qrac_scope ON "qr_analysis_claim"(scope_id);

CREATE INDEX idx_qrac_type  ON "qr_analysis_claim"(claim_type);

CREATE INDEX idx_qrar_from ON "qr_argument_link"(from_argument_id);

CREATE INDEX idx_qrar_to   ON "qr_argument_link"(to_argument_id);

CREATE INDEX idx_qrarg_surah ON "qr_argument"(surah);

CREATE INDEX idx_qrarg_type  ON "qr_argument"(argument_type);

CREATE INDEX idx_qras_surah ON "qr_analysis_scope"(surah);

CREATE INDEX idx_qras_type  ON "qr_analysis_scope"(scope_type);

CREATE INDEX idx_qrc_from  ON "qr_citation"(from_domain, from_layer, from_id);

CREATE INDEX idx_qrc_root  ON "qr_citation"(root_norm);

CREATE INDEX idx_qrc_toref ON "qr_citation"(to_ref);

CREATE INDEX idx_qrcel_claim    ON "qr_claim_evidence_link"(claim_id);

CREATE INDEX idx_qrcel_evidence ON "qr_claim_evidence_link"(evidence_id);

CREATE INDEX idx_qrcl_parent   ON qr_ss_occ_clause(parent_clause_id);

CREATE INDEX idx_qrcl_sentence ON qr_ss_occ_clause(sentence_id);

CREATE INDEX idx_qrcl_surah    ON qr_ss_occ_clause(surah, ayah_from);

CREATE INDEX idx_qrdc_surah ON "qr_debate_cluster"(surah);

CREATE INDEX idx_qrdc_type  ON "qr_debate_cluster"(cluster_type);

CREATE INDEX idx_qrdl_scope ON "qr_doc_link"(qr_scope_type, qr_scope_id);

CREATE INDEX idx_qrei_type ON "qr_evidence"(evidence_type);

CREATE INDEX idx_qribe_ayah_book
  ON qr_irab_book_entry (surah, ayah_from);

CREATE INDEX idx_qribe_word_linked
  ON qr_irab_book_entry (word_occurrence_id)
  WHERE word_link_status = 'linked';

CREATE INDEX idx_qrid_surah ON "qr_interpretive_difference"(surah, ayah_from);

CREATE INDEX idx_qrl_root ON "qr_lemma"(root);

CREATE INDEX idx_qrlo_lemma      ON "qr_lemma_occurrence"(lemma_id);

CREATE INDEX idx_qrlo_surah_ayah ON "qr_lemma_occurrence"(surah, ayah);

CREATE INDEX idx_qrlo_woid ON "qr_lemma_occurrence"(word_occurrence_id);

CREATE INDEX idx_qrmdl_gid ON qr_morph_display_lemma (gid_lemma);

CREATE UNIQUE INDEX idx_qrmwo_word
  ON qr_morph_word_override (surah_no, ayah_no, word_index, status);

CREATE INDEX idx_qrph_clause ON qr_ss_occ_phrase(clause_id);

CREATE INDEX idx_qrph_surah  ON qr_ss_occ_phrase(surah, ayah);

CREATE INDEX idx_qrpiv_surah ON "qr_surah_structural_pivot"(surah);

CREATE INDEX idx_qrqbq_from ON "qr_quran_bil_quran_link"(from_surah, from_ayah);

CREATE INDEX idx_qrqbq_to   ON "qr_quran_bil_quran_link"(to_surah, to_ayah);

CREATE INDEX idx_qrrr_gid ON qr_root_registry (gid_root);

CREATE INDEX idx_qrsbl_scope ON qr_ss_scope_balagha_link(scope_type, scope_id);

CREATE INDEX idx_qrschp_era    ON "qr_scholar_profile"(era);

CREATE INDEX idx_qrschp_madhab ON "qr_scholar_profile"(madhab);

CREATE INDEX idx_qrschw_scholar ON "qr_scholar_work"(scholar_id);

CREATE INDEX idx_qrscpos_scholar ON "qr_scholar_position"(scholar_id);

CREATE INDEX idx_qrscpos_scope   ON "qr_scholar_position"(surah, ayah_from);

CREATE INDEX idx_qrscr_from ON "qr_ss_scope_link"(from_scope_type, from_scope_id);

CREATE INDEX idx_qrscr_to   ON "qr_ss_scope_link"(to_scope_type, to_scope_id);

CREATE INDEX idx_qrscs_surah ON "qr_surah_coherence_signal"(surah);

CREATE INDEX idx_qrsee_sentence ON qr_ss_ellipsis_event(sentence_id);

CREATE INDEX idx_qrseg_surah ON qr_ss_occ_segment(surah, ayah);

CREATE INDEX idx_qrseg_word  ON qr_ss_occ_segment(word_occurrence_id);

CREATE INDEX idx_qrsen_surah ON qr_ss_occ_sentence(surah, ayah_from);

CREATE INDEX idx_qrsgl_scope ON qr_ss_scope_grammar_link(scope_type, scope_id);

CREATE INDEX idx_qrsmc_surah ON "qr_surah_motif_cluster"(surah);

CREATE INDEX idx_qrsml_scope ON qr_ss_scope_morph_link(scope_type, scope_id);

CREATE INDEX idx_qrsmm_scope ON qr_ss_scope_member_map(scope_type, scope_id);

CREATE INDEX idx_qrsmm_word  ON qr_ss_scope_member_map(word_occurrence_id);

CREATE INDEX idx_qrsn_scope ON "qr_scope_nuance"(scope_id);

CREATE INDEX idx_qrsptl_term ON qr_ss_pattern_term_link (gram_term_ref);

CREATE INDEX idx_qrsq_passage ON "qr_study_question"(passage_id, sort_order);

CREATE INDEX idx_qrsr_surah_a ON "qr_surah_link"(surah_a);

CREATE INDEX idx_qrsr_surah_b ON "qr_surah_link"(surah_b);

CREATE INDEX idx_qrsrs_surah ON "qr_surah_register_shift"(surah);

CREATE INDEX idx_qrssml_gt ON qr_ss_scope_morph_link (gram_term_ref);

CREATE INDEX idx_qrssn_scope ON qr_ss_scope_nuance(scope_type, scope_id);

CREATE INDEX idx_qrssoc_range
  ON qr_ss_occ_clause (surah, ayah_from, ayah_to, clause_order);

CREATE INDEX idx_qrssos_class ON qr_ss_occ_sentence (gt_sentence_class);

CREATE INDEX idx_qrssos_kalam ON qr_ss_occ_sentence (gt_kalam_kind);

CREATE INDEX idx_qrssos_range
  ON qr_ss_occ_sentence (surah, ayah_from, ayah_to);

CREATE INDEX idx_qrssp_range
  ON "qr_surah_study_passage"(surah, ayah_from, ayah_to);

CREATE INDEX idx_qrssp_surah
  ON "qr_surah_study_passage"(surah, passage_no);

CREATE INDEX idx_qrssr_scope ON qr_ss_scope_reading(scope_type, scope_id);

CREATE INDEX idx_qrssr_surah ON "qr_surah_structure_reading"(surah);

CREATE INDEX idx_qrsss_passage_order
  ON "qr_surah_study_step"(passage_id, step_no);

CREATE INDEX idx_qrsst_parent
  ON "qr_surah_study_task"(parent_task_id, step_no);

CREATE INDEX idx_qrsst_passage_type
  ON "qr_surah_study_task"(passage_id, task_type, step_no);

CREATE UNIQUE INDEX idx_qrsst_root_type_unique
  ON "qr_surah_study_task"(passage_id, task_type)
  WHERE parent_task_id IS NULL;

CREATE INDEX idx_qrsstjc_passage
  ON "qr_surah_study_task_chunk"(passage_id, task_id, chunk_index);

CREATE INDEX idx_qrsstn_gt ON qr_ss_tree_node (gram_term_ref);

CREATE INDEX idx_qrssu_surah ON "qr_surah_structure_unit"(surah);

CREATE INDEX idx_qrst_surah  ON "qr_scope_topic"(surah);

CREATE INDEX idx_qrst_topic  ON "qr_scope_topic"(topic_id);

CREATE INDEX idx_qrste_tree ON qr_ss_tree_edge(tree_id);

CREATE INDEX idx_qrstf_surah ON "qr_surah_topic_flow"(surah);

CREATE INDEX idx_qrstn_parent ON qr_ss_tree_node(parent_node_id);

CREATE INDEX idx_qrstn_tree   ON qr_ss_tree_node(tree_id);

CREATE INDEX idx_qrsyn_dep   ON "qr_ss_syntax_link"(dep_word_id);

CREATE INDEX idx_qrsyn_head  ON "qr_ss_syntax_link"(head_word_id);

CREATE INDEX idx_qrsyn_surah ON "qr_ss_syntax_link"(surah, ayah);

CREATE INDEX idx_qrte_scholar ON "qr_tafsir_entry"(scholar_id);

CREATE INDEX idx_qrte_surah   ON "qr_tafsir_entry"(surah, ayah_from);

CREATE INDEX idx_qrte_surah_range
  ON qr_tafsir_entry (surah, ayah_from, ayah_to);

CREATE INDEX idx_qrtp_source_surah ON "qr_translation_passage"(source_id, surah);

CREATE INDEX idx_qrtr_source_surah ON "qr_translation"(source_id, surah);

CREATE INDEX idx_qrtr_surah_ayah ON qr_translation(surah, ayah);

CREATE INDEX idx_qrwo_derivation  ON qr_word_occurrence (gt_derivation_type);

CREATE INDEX idx_qrwo_form_roman  ON qr_word_occurrence (form_roman);

CREATE INDEX idx_qrwo_gid_lemma ON qr_word_occurrence (gid_lemma);

CREATE INDEX idx_qrwo_gid_root  ON qr_word_occurrence (gid_root);

CREATE INDEX idx_qrwo_lemma      ON "qr_word_occurrence"(lemma);

CREATE INDEX idx_qrwo_lemma_ref ON "qr_word_occurrence"(lemma_ref);

CREATE INDEX idx_qrwo_promoted_grid
  ON qr_word_occurrence (surah, ayah, word_index) WHERE is_promoted = 1;

CREATE INDEX idx_qrwo_root       ON "qr_word_occurrence"(root);

CREATE INDEX idx_qrwo_root_lemma  ON qr_word_occurrence (stem_root_ar, stem_lemma_ar);

CREATE INDEX idx_qrwo_root_lemma_cov ON qr_word_occurrence(root, lemma);

CREATE INDEX idx_qrwo_stem_pos ON qr_word_occurrence (stem_pos);

CREATE INDEX idx_qrwo_surah_ayah ON "qr_word_occurrence"(surah, ayah);

CREATE INDEX idx_qrwo_surah_ayah_word
  ON qr_word_occurrence (surah, ayah, word_index);

CREATE INDEX idx_tafsir_block_ayah        ON "qr_tafsir_book_display_block" (surah_no, ayah_no);

CREATE INDEX idx_tafsir_block_ayah_key    ON "qr_tafsir_book_display_block" (ayah_key);

CREATE INDEX idx_tafsir_block_ayah_scholar
  ON "qr_tafsir_book_display_block" (surah_no, ayah_no, scholar_id, display_order);

CREATE INDEX idx_tafsir_block_entry       ON "qr_tafsir_book_display_block" (source_tafsir_entry_id);

CREATE INDEX idx_tafsir_block_group       ON "qr_tafsir_book_display_block" (ayah_group_key);

CREATE INDEX idx_tafsir_block_grouped     ON "qr_tafsir_book_display_block" (surah_no, is_grouped);

CREATE INDEX idx_tafsir_block_madhab_era  ON "qr_tafsir_book_display_block" (madhab, era);

CREATE INDEX idx_tafsir_block_review      ON "qr_tafsir_book_display_block" (review_status);

CREATE INDEX idx_tafsir_block_scholar     ON "qr_tafsir_book_display_block" (scholar_id, surah_no);

CREATE INDEX idx_tafsir_block_slug        ON "qr_tafsir_book_display_block" (source_slug);

CREATE INDEX idx_tafsir_block_source      ON "qr_tafsir_book_display_block" (source_id);

CREATE INDEX idx_tafsir_block_surah       ON "qr_tafsir_book_display_block" (surah_no);

CREATE INDEX idx_tafsir_block_type        ON "qr_tafsir_book_display_block" (block_type);

CREATE INDEX idx_tafsir_block_work        ON "qr_tafsir_book_display_block" (work_id, surah_no);

CREATE INDEX idx_tafsir_display_sources_era     ON "qr_tafsir_book_display_source" (era);

CREATE INDEX idx_tafsir_display_sources_madhab  ON "qr_tafsir_book_display_source" (madhab);

CREATE INDEX idx_tafsir_display_sources_order   ON "qr_tafsir_book_display_source" (display_order);

CREATE INDEX idx_tafsir_link_to        ON "qr_tafsir_book_display_link" (to_block_id, link_kind);

CREATE INDEX idx_tafsir_link_to_typed  ON "qr_tafsir_book_display_link" (to_typed_ref);

CREATE INDEX idx_tafsir_note_ayah    ON "qr_tafsir_book_display_note" (surah_no, ayah_no);

CREATE INDEX idx_tafsir_note_block   ON "qr_tafsir_book_display_note" (block_id);

CREATE INDEX idx_tafsir_note_group   ON "qr_tafsir_book_display_note" (ayah_group_key);

CREATE INDEX idx_tafsir_note_kind    ON "qr_tafsir_book_display_note" (note_kind);

CREATE INDEX idx_tafsir_note_scholar ON "qr_tafsir_book_display_note" (scholar_id);

CREATE INDEX idx_tafsir_ref_ayah   ON "qr_tafsir_book_display_ref" (surah_no, ayah_no);

CREATE INDEX idx_tafsir_ref_block  ON "qr_tafsir_book_display_ref" (block_id);

CREATE INDEX idx_tafsir_ref_group  ON "qr_tafsir_book_display_ref" (ayah_group_key);

CREATE INDEX idx_tafsir_ref_typed  ON "qr_tafsir_book_display_ref" (typed_ref);

CREATE INDEX idx_tafsir_tag_value_norm
  ON "qr_tafsir_book_display_tag" (tag_kind, tag_value_norm);

CREATE INDEX idx_wsl_ayah ON qr_word_sense_link(surah_no, ayah_no, word_index);

CREATE INDEX idx_wsl_sense ON qr_word_sense_link(al_sense_id);

CREATE INDEX idx_wsl_word ON qr_word_sense_link(word_occ_id, display_order);

CREATE INDEX ix_nazm_att_surah ON qr_nazm_theme_attestation(surah, ayah_from);

CREATE INDEX ix_nazm_member_surah ON qr_nazm_group_member(surah);

CREATE INDEX ix_pts_tafsir ON "qr_scholar_passage_section"(tafsir_id, section_ord);

CREATE INDEX ix_ptt_term ON "qr_scholar_passage_term"(term_ref);

CREATE INDEX ix_qrreg_uid ON qr_root_registry(root_uid);

CREATE INDEX ix_qwo_root_uid ON "qr_word_occurrence"(root_uid);

CREATE INDEX ix_spx_reading ON qr_scholar_passage_xref(reading_id, section_id);

CREATE INDEX ix_wt_ayah ON qr_word_term(surah, ayah, word_index);

CREATE INDEX ix_wt_cat ON qr_word_term(category_key, tier);

CREATE INDEX ix_wt_term ON qr_word_term(gram_term_ref);

CREATE INDEX ix_wt_word ON qr_word_term(word_ref);

CREATE INDEX qr_root_raw_root ON qr_root_raw(root_uid, source_code);

CREATE UNIQUE INDEX uq_iraab_block_natural
  ON "qr_irab_book_display_block" (source_chunk_id, source_entry_id, block_type, display_order);

CREATE UNIQUE INDEX uq_iraab_link_natural
  ON "qr_irab_book_display_link" (from_block_id, to_block_id, link_kind);

CREATE UNIQUE INDEX uq_iraab_tag_natural
  ON "qr_irab_book_display_tag" (block_id, tag_kind, tag_value);

CREATE UNIQUE INDEX uq_tafsir_block_natural
  ON "qr_tafsir_book_display_block" (source_tafsir_entry_id, block_type, display_order, paragraph_index);

CREATE UNIQUE INDEX uq_tafsir_link_natural
  ON "qr_tafsir_book_display_link" (from_block_id, to_block_id, link_kind);

CREATE UNIQUE INDEX uq_tafsir_tag_natural
  ON "qr_tafsir_book_display_tag" (block_id, tag_kind, tag_value);

CREATE UNIQUE INDEX ux_gram_term_uid ON ar_ling_gram_term(uid);

CREATE UNIQUE INDEX ux_qr_irab_entry_dedupe
  ON "qr_irab_book_entry"(source_slug, source_chunk_id, entry_order, target_text_bare, source_quote_hash);


-- ── Triggers (562) ───────────────────────────────────────────────

CREATE TRIGGER trg_cv_analysis_i AFTER INSERT ON qr_passage_analysis BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_passage_analysis' WHERE id=1; END;

CREATE TRIGGER trg_cv_analysis_u AFTER UPDATE ON qr_passage_analysis BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_passage_analysis' WHERE id=1; END;

CREATE TRIGGER trg_cv_flow_i AFTER INSERT ON qr_surah_topic_flow BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_surah_topic_flow' WHERE id=1; END;

CREATE TRIGGER trg_cv_passage_d AFTER DELETE ON qr_surah_study_passage BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_surah_study_passage' WHERE id=1; END;

CREATE TRIGGER trg_cv_passage_i AFTER INSERT ON qr_surah_study_passage BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_surah_study_passage' WHERE id=1; END;

CREATE TRIGGER trg_cv_passage_u AFTER UPDATE ON qr_surah_study_passage BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_surah_study_passage' WHERE id=1; END;

CREATE TRIGGER trg_cv_reading_d AFTER DELETE ON qr_ss_scope_reading BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_ss_scope_reading' WHERE id=1; END;

CREATE TRIGGER trg_cv_reading_i AFTER INSERT ON qr_ss_scope_reading BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_ss_scope_reading' WHERE id=1; END;

CREATE TRIGGER trg_cv_reading_u AFTER UPDATE ON qr_ss_scope_reading BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_ss_scope_reading' WHERE id=1; END;

CREATE TRIGGER trg_cv_sent_d AFTER DELETE ON qr_ss_occ_sentence BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_ss_occ_sentence' WHERE id=1; END;

CREATE TRIGGER trg_cv_sent_i AFTER INSERT ON qr_ss_occ_sentence BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_ss_occ_sentence' WHERE id=1; END;

CREATE TRIGGER trg_cv_sent_u AFTER UPDATE ON qr_ss_occ_sentence BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_ss_occ_sentence' WHERE id=1; END;

CREATE TRIGGER trg_cv_step_i AFTER INSERT ON qr_surah_study_step BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_surah_study_step' WHERE id=1; END;

CREATE TRIGGER trg_cv_step_u AFTER UPDATE ON qr_surah_study_step BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_surah_study_step' WHERE id=1; END;

CREATE TRIGGER trg_cv_task_i AFTER INSERT ON qr_surah_study_task BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_surah_study_task' WHERE id=1; END;

CREATE TRIGGER trg_cv_task_u AFTER UPDATE ON qr_surah_study_task BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_surah_study_task' WHERE id=1; END;

CREATE TRIGGER trg_cv_treenode_d AFTER DELETE ON qr_ss_tree_node BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_ss_tree_node' WHERE id=1; END;

CREATE TRIGGER trg_cv_treenode_i AFTER INSERT ON qr_ss_tree_node BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_ss_tree_node' WHERE id=1; END;

CREATE TRIGGER trg_cv_treenode_u AFTER UPDATE ON qr_ss_tree_node BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_ss_tree_node' WHERE id=1; END;

CREATE TRIGGER trg_cv_tunit_i AFTER INSERT ON qr_ss_translation_unit BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_ss_translation_unit' WHERE id=1; END;

CREATE TRIGGER trg_cv_tunit_u AFTER UPDATE ON qr_ss_translation_unit BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_ss_translation_unit' WHERE id=1; END;

CREATE TRIGGER trg_cv_unit_d AFTER DELETE ON qr_surah_structure_unit BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_surah_structure_unit' WHERE id=1; END;

CREATE TRIGGER trg_cv_unit_i AFTER INSERT ON qr_surah_structure_unit BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_surah_structure_unit' WHERE id=1; END;

CREATE TRIGGER trg_cv_unit_u AFTER UPDATE ON qr_surah_structure_unit BEGIN UPDATE qr_corpus_version SET version='qr-'||strftime('%Y-%m-%dT%H:%M:%SZ','now'), built_at=datetime('now'), updated_at=datetime('now'), note='auto:qr_surah_structure_unit' WHERE id=1; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_category_d AFTER DELETE ON ar_ling_gram_category BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_category_i AFTER INSERT ON ar_ling_gram_category BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_category_u AFTER UPDATE ON ar_ling_gram_category BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_d AFTER DELETE ON ar_ling_gram_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_i AFTER INSERT ON ar_ling_gram_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_source_d AFTER DELETE ON ar_ling_gram_term_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_source_i AFTER INSERT ON ar_ling_gram_term_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_source_u AFTER UPDATE ON ar_ling_gram_term_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_u AFTER UPDATE ON ar_ling_gram_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_core_concept_d AFTER DELETE ON core_concept BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_core_concept_i AFTER INSERT ON core_concept BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_core_concept_u AFTER UPDATE ON core_concept BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_gc_concept_d AFTER DELETE ON gc_concept BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_gc_concept_i AFTER INSERT ON gc_concept BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_gc_concept_u AFTER UPDATE ON gc_concept BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_gc_sync_meta_d AFTER DELETE ON gc_sync_meta BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_gc_sync_meta_i AFTER INSERT ON gc_sync_meta BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_gc_sync_meta_u AFTER UPDATE ON gc_sync_meta BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_gt_sync_meta_d AFTER DELETE ON gt_sync_meta BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_gt_sync_meta_i AFTER INSERT ON gt_sync_meta BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_gt_sync_meta_u AFTER UPDATE ON gt_sync_meta BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_gt_term_d AFTER DELETE ON gt_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_gt_term_i AFTER INSERT ON gt_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_gt_term_u AFTER UPDATE ON gt_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_analysis_claim_d AFTER DELETE ON qr_analysis_claim BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_analysis_claim_i AFTER INSERT ON qr_analysis_claim BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_analysis_claim_u AFTER UPDATE ON qr_analysis_claim BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_analysis_scope_d AFTER DELETE ON qr_analysis_scope BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_analysis_scope_i AFTER INSERT ON qr_analysis_scope BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_analysis_scope_u AFTER UPDATE ON qr_analysis_scope BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_argument_d AFTER DELETE ON qr_argument BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_argument_i AFTER INSERT ON qr_argument BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_argument_link_d AFTER DELETE ON qr_argument_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_argument_link_i AFTER INSERT ON qr_argument_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_argument_link_u AFTER UPDATE ON qr_argument_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_argument_u AFTER UPDATE ON qr_argument BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ayah_d AFTER DELETE ON qr_ayah BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_ayah_i AFTER INSERT ON qr_ayah BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_ayah_u AFTER UPDATE ON qr_ayah BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_citation_d AFTER DELETE ON qr_citation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_citation_i AFTER INSERT ON qr_citation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_citation_u AFTER UPDATE ON qr_citation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_claim_evidence_link_d AFTER DELETE ON qr_claim_evidence_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_claim_evidence_link_i AFTER INSERT ON qr_claim_evidence_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_claim_evidence_link_u AFTER UPDATE ON qr_claim_evidence_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_cross_ref_d AFTER DELETE ON qr_cross_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_cross_ref_i AFTER INSERT ON qr_cross_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_cross_ref_u AFTER UPDATE ON qr_cross_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_cross_type_d AFTER DELETE ON qr_cross_type BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_cross_type_i AFTER INSERT ON qr_cross_type BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_cross_type_u AFTER UPDATE ON qr_cross_type BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_debate_cluster_d AFTER DELETE ON qr_debate_cluster BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_debate_cluster_i AFTER INSERT ON qr_debate_cluster BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_debate_cluster_u AFTER UPDATE ON qr_debate_cluster BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_doc_link_d AFTER DELETE ON qr_doc_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_doc_link_i AFTER INSERT ON qr_doc_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_doc_link_u AFTER UPDATE ON qr_doc_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_evidence_d AFTER DELETE ON qr_evidence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_evidence_i AFTER INSERT ON qr_evidence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_evidence_u AFTER UPDATE ON qr_evidence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_historical_context_d AFTER DELETE ON qr_historical_context BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_historical_context_i AFTER INSERT ON qr_historical_context BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_historical_context_u AFTER UPDATE ON qr_historical_context BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_inquiry_d AFTER DELETE ON qr_inquiry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_inquiry_i AFTER INSERT ON qr_inquiry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_inquiry_position_d AFTER DELETE ON qr_inquiry_position BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_inquiry_position_i AFTER INSERT ON qr_inquiry_position BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_inquiry_position_u AFTER UPDATE ON qr_inquiry_position BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_inquiry_ref_d AFTER DELETE ON qr_inquiry_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_inquiry_ref_i AFTER INSERT ON qr_inquiry_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_inquiry_ref_u AFTER UPDATE ON qr_inquiry_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_inquiry_scope_d AFTER DELETE ON qr_inquiry_scope BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_inquiry_scope_i AFTER INSERT ON qr_inquiry_scope BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_inquiry_scope_kind_d AFTER DELETE ON qr_inquiry_scope_kind BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_inquiry_scope_kind_i AFTER INSERT ON qr_inquiry_scope_kind BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_inquiry_scope_kind_u AFTER UPDATE ON qr_inquiry_scope_kind BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_inquiry_scope_u AFTER UPDATE ON qr_inquiry_scope BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_inquiry_u AFTER UPDATE ON qr_inquiry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_interpretive_difference_d AFTER DELETE ON qr_interpretive_difference BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_interpretive_difference_i AFTER INSERT ON qr_interpretive_difference BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_interpretive_difference_u AFTER UPDATE ON qr_interpretive_difference BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_irab_book_display_block_d AFTER DELETE ON qr_irab_book_display_block BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_book_display_block_i AFTER INSERT ON qr_irab_book_display_block BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_book_display_block_u AFTER UPDATE ON qr_irab_book_display_block BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_book_display_link_d AFTER DELETE ON qr_irab_book_display_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_book_display_link_i AFTER INSERT ON qr_irab_book_display_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_book_display_link_u AFTER UPDATE ON qr_irab_book_display_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_book_display_note_d AFTER DELETE ON qr_irab_book_display_note BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_book_display_note_i AFTER INSERT ON qr_irab_book_display_note BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_book_display_note_u AFTER UPDATE ON qr_irab_book_display_note BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_book_display_ref_d AFTER DELETE ON qr_irab_book_display_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_book_display_ref_i AFTER INSERT ON qr_irab_book_display_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_book_display_ref_u AFTER UPDATE ON qr_irab_book_display_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_book_display_source_d AFTER DELETE ON qr_irab_book_display_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_book_display_source_i AFTER INSERT ON qr_irab_book_display_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_book_display_source_u AFTER UPDATE ON qr_irab_book_display_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_book_display_tag_d AFTER DELETE ON qr_irab_book_display_tag BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_book_display_tag_i AFTER INSERT ON qr_irab_book_display_tag BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_book_display_tag_u AFTER UPDATE ON qr_irab_book_display_tag BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_book_entry_d AFTER DELETE ON qr_irab_book_entry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_book_entry_i AFTER INSERT ON qr_irab_book_entry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_book_entry_u AFTER UPDATE ON qr_irab_book_entry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_drill_item_d AFTER DELETE ON qr_irab_drill_item BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_irab_drill_item_i AFTER INSERT ON qr_irab_drill_item BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_irab_extraction_run_d AFTER DELETE ON qr_irab_extraction_run BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_irab_extraction_run_i AFTER INSERT ON qr_irab_extraction_run BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_irab_extraction_run_u AFTER UPDATE ON qr_irab_extraction_run BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_irab_import_error_d AFTER DELETE ON qr_irab_import_error BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_irab_import_error_i AFTER INSERT ON qr_irab_import_error BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_irab_import_error_u AFTER UPDATE ON qr_irab_import_error BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_irab_source_chunk_d AFTER DELETE ON qr_irab_source_chunk BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_source_chunk_i AFTER INSERT ON qr_irab_source_chunk BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_source_chunk_u AFTER UPDATE ON qr_irab_source_chunk BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_source_d AFTER DELETE ON qr_irab_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_source_i AFTER INSERT ON qr_irab_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_irab_source_u AFTER UPDATE ON qr_irab_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_lc_binding_d AFTER DELETE ON qr_lc_binding BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_lc_binding_i AFTER INSERT ON qr_lc_binding BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_lc_binding_u AFTER UPDATE ON qr_lc_binding BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_lc_concept_d AFTER DELETE ON qr_lc_concept BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_lc_concept_i AFTER INSERT ON qr_lc_concept BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_lc_concept_u AFTER UPDATE ON qr_lc_concept BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_lc_discipline_d AFTER DELETE ON qr_lc_discipline BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_lc_discipline_i AFTER INSERT ON qr_lc_discipline BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_lc_discipline_u AFTER UPDATE ON qr_lc_discipline BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_lemma_d AFTER DELETE ON qr_lemma BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_lemma_i AFTER INSERT ON qr_lemma BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_lemma_occurrence_d AFTER DELETE ON qr_lemma_occurrence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_lemma_occurrence_i AFTER INSERT ON qr_lemma_occurrence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_lemma_occurrence_u AFTER UPDATE ON qr_lemma_occurrence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_lemma_ref_resolution_d AFTER DELETE ON qr_lemma_ref_resolution BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_lemma_ref_resolution_i AFTER INSERT ON qr_lemma_ref_resolution BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_lemma_ref_resolution_u AFTER UPDATE ON qr_lemma_ref_resolution BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_lemma_u AFTER UPDATE ON qr_lemma BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_morph_display_block_d AFTER DELETE ON qr_morph_display_block BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_morph_display_block_i AFTER INSERT ON qr_morph_display_block BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_morph_display_block_u AFTER UPDATE ON qr_morph_display_block BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_morph_display_build_d AFTER DELETE ON qr_morph_display_build BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_morph_display_build_i AFTER INSERT ON qr_morph_display_build BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_morph_display_build_u AFTER UPDATE ON qr_morph_display_build BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_morph_display_lemma_d AFTER DELETE ON qr_morph_display_lemma BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_morph_display_lemma_i AFTER INSERT ON qr_morph_display_lemma BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_morph_display_lemma_u AFTER UPDATE ON qr_morph_display_lemma BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_morph_display_media_d AFTER DELETE ON qr_morph_display_media BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_morph_display_media_i AFTER INSERT ON qr_morph_display_media BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_morph_display_media_u AFTER UPDATE ON qr_morph_display_media BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_morph_display_root_d AFTER DELETE ON qr_morph_display_root BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_morph_display_root_i AFTER INSERT ON qr_morph_display_root BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_morph_display_root_u AFTER UPDATE ON qr_morph_display_root BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_morph_display_source_d AFTER DELETE ON qr_morph_display_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_morph_display_source_i AFTER INSERT ON qr_morph_display_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_morph_display_source_u AFTER UPDATE ON qr_morph_display_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_morph_editorial_d AFTER DELETE ON qr_morph_editorial BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_morph_editorial_i AFTER INSERT ON qr_morph_editorial BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_morph_editorial_u AFTER UPDATE ON qr_morph_editorial BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_morph_flag_decomp_d AFTER DELETE ON qr_morph_flag_decomp BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_morph_flag_decomp_i AFTER INSERT ON qr_morph_flag_decomp BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_morph_flag_decomp_u AFTER UPDATE ON qr_morph_flag_decomp BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_morph_form_family_d AFTER DELETE ON qr_morph_form_family BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_morph_form_family_i AFTER INSERT ON qr_morph_form_family BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_morph_form_family_u AFTER UPDATE ON qr_morph_form_family BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_morph_form_tier_d AFTER DELETE ON qr_morph_form_tier BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_morph_form_tier_i AFTER INSERT ON qr_morph_form_tier BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_morph_form_tier_u AFTER UPDATE ON qr_morph_form_tier BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_morph_pos_rule_d AFTER DELETE ON qr_morph_pos_rule BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_morph_pos_rule_i AFTER INSERT ON qr_morph_pos_rule BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_morph_pos_rule_u AFTER UPDATE ON qr_morph_pos_rule BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_morph_word_override_d AFTER DELETE ON qr_morph_word_override BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_morph_word_override_i AFTER INSERT ON qr_morph_word_override BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_morph_word_override_u AFTER UPDATE ON qr_morph_word_override BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_mushaf_layout_line_d AFTER DELETE ON qr_mushaf_layout_line BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_mushaf_layout_line_i AFTER INSERT ON qr_mushaf_layout_line BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_mushaf_layout_line_u AFTER UPDATE ON qr_mushaf_layout_line BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_nazm_group_d AFTER DELETE ON qr_nazm_group BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_nazm_group_i AFTER INSERT ON qr_nazm_group BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_nazm_group_member_d AFTER DELETE ON qr_nazm_group_member BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_nazm_group_member_i AFTER INSERT ON qr_nazm_group_member BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_nazm_group_member_u AFTER UPDATE ON qr_nazm_group_member BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_nazm_group_root_d AFTER DELETE ON qr_nazm_group_root BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_nazm_group_root_i AFTER INSERT ON qr_nazm_group_root BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_nazm_group_u AFTER UPDATE ON qr_nazm_group BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_nazm_link_d AFTER DELETE ON qr_nazm_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_nazm_link_i AFTER INSERT ON qr_nazm_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_nazm_link_u AFTER UPDATE ON qr_nazm_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_nazm_pass_d AFTER DELETE ON qr_nazm_pass BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_nazm_pass_i AFTER INSERT ON qr_nazm_pass BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_nazm_pass_u AFTER UPDATE ON qr_nazm_pass BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_nazm_reading_d AFTER DELETE ON qr_nazm_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_nazm_reading_i AFTER INSERT ON qr_nazm_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_nazm_reading_u AFTER UPDATE ON qr_nazm_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_nazm_theme_attestation_d AFTER DELETE ON qr_nazm_theme_attestation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_nazm_theme_attestation_i AFTER INSERT ON qr_nazm_theme_attestation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_nazm_theme_attestation_u AFTER UPDATE ON qr_nazm_theme_attestation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_nazm_theme_d AFTER DELETE ON qr_nazm_theme BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_nazm_theme_i AFTER INSERT ON qr_nazm_theme BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_nazm_theme_u AFTER UPDATE ON qr_nazm_theme BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_passage_analysis_d AFTER DELETE ON qr_passage_analysis BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_passage_analysis_i AFTER INSERT ON qr_passage_analysis BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_passage_analysis_u AFTER UPDATE ON qr_passage_analysis BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_passage_section_d AFTER DELETE ON qr_passage_section BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_passage_section_i AFTER INSERT ON qr_passage_section BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_passage_section_u AFTER UPDATE ON qr_passage_section BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_quran_bil_quran_link_d AFTER DELETE ON qr_quran_bil_quran_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_quran_bil_quran_link_i AFTER INSERT ON qr_quran_bil_quran_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_quran_bil_quran_link_u AFTER UPDATE ON qr_quran_bil_quran_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_recitation_ayah_i AFTER INSERT ON qr_recitation_ayah BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_recitation_ayah_u AFTER UPDATE ON qr_recitation_ayah BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_recitation_i AFTER INSERT ON qr_recitation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_recitation_u AFTER UPDATE ON qr_recitation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_root_freq_d AFTER DELETE ON qr_root_freq BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_root_freq_i AFTER INSERT ON qr_root_freq BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_root_freq_u AFTER UPDATE ON qr_root_freq BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_root_raw_d AFTER DELETE ON qr_root_raw BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_root_raw_i AFTER INSERT ON qr_root_raw BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_root_raw_u AFTER UPDATE ON qr_root_raw BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_root_registry_d AFTER DELETE ON qr_root_registry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_root_registry_i AFTER INSERT ON qr_root_registry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_root_registry_u AFTER UPDATE ON qr_root_registry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_scholar_method_profile_d AFTER DELETE ON qr_scholar_method_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_method_profile_i AFTER INSERT ON qr_scholar_method_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_method_profile_u AFTER UPDATE ON qr_scholar_method_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_paradigm_link_d AFTER DELETE ON qr_scholar_paradigm_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_paradigm_link_i AFTER INSERT ON qr_scholar_paradigm_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_paradigm_link_u AFTER UPDATE ON qr_scholar_paradigm_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_passage_movement_d AFTER DELETE ON qr_scholar_passage_movement BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_passage_movement_i AFTER INSERT ON qr_scholar_passage_movement BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_passage_movement_u AFTER UPDATE ON qr_scholar_passage_movement BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_passage_reading_d AFTER DELETE ON qr_scholar_passage_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_passage_reading_i AFTER INSERT ON qr_scholar_passage_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_passage_reading_u AFTER UPDATE ON qr_scholar_passage_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_passage_section_d AFTER DELETE ON qr_scholar_passage_section BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_passage_section_i AFTER INSERT ON qr_scholar_passage_section BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_passage_section_u AFTER UPDATE ON qr_scholar_passage_section BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_passage_term_d AFTER DELETE ON qr_scholar_passage_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_passage_term_i AFTER INSERT ON qr_scholar_passage_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_passage_term_u AFTER UPDATE ON qr_scholar_passage_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_passage_xref_d AFTER DELETE ON qr_scholar_passage_xref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_passage_xref_i AFTER INSERT ON qr_scholar_passage_xref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_passage_xref_u AFTER UPDATE ON qr_scholar_passage_xref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_position_d AFTER DELETE ON qr_scholar_position BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_position_i AFTER INSERT ON qr_scholar_position BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_position_u AFTER UPDATE ON qr_scholar_position BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholar_profile_d AFTER DELETE ON qr_scholar_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_scholar_profile_i AFTER INSERT ON qr_scholar_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_scholar_profile_u AFTER UPDATE ON qr_scholar_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_scholar_work_d AFTER DELETE ON qr_scholar_work BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_scholar_work_i AFTER INSERT ON qr_scholar_work BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_scholar_work_u AFTER UPDATE ON qr_scholar_work BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_scholarly_paradigm_d AFTER DELETE ON qr_scholarly_paradigm BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholarly_paradigm_i AFTER INSERT ON qr_scholarly_paradigm BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scholarly_paradigm_u AFTER UPDATE ON qr_scholarly_paradigm BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scope_nuance_d AFTER DELETE ON qr_scope_nuance BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scope_nuance_i AFTER INSERT ON qr_scope_nuance BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scope_nuance_u AFTER UPDATE ON qr_scope_nuance BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scope_topic_d AFTER DELETE ON qr_scope_topic BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scope_topic_i AFTER INSERT ON qr_scope_topic BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_scope_topic_u AFTER UPDATE ON qr_scope_topic BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_src_code_d AFTER DELETE ON qr_src_code BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_src_code_i AFTER INSERT ON qr_src_code BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_src_code_u AFTER UPDATE ON qr_src_code BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_book_note_d AFTER DELETE ON qr_ss_book_note BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_book_note_i AFTER INSERT ON qr_ss_book_note BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_clause_reading_d AFTER DELETE ON qr_ss_clause_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_clause_reading_i AFTER INSERT ON qr_ss_clause_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_discourse_citation_d AFTER DELETE ON qr_ss_discourse_citation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_discourse_citation_i AFTER INSERT ON qr_ss_discourse_citation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_discourse_citation_u AFTER UPDATE ON qr_ss_discourse_citation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_discourse_note_d AFTER DELETE ON qr_ss_discourse_note BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_discourse_note_i AFTER INSERT ON qr_ss_discourse_note BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_discourse_note_u AFTER UPDATE ON qr_ss_discourse_note BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_discourse_source_link_d AFTER DELETE ON qr_ss_discourse_source_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_discourse_source_link_i AFTER INSERT ON qr_ss_discourse_source_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_discourse_source_link_u AFTER UPDATE ON qr_ss_discourse_source_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_ellipsis_event_d AFTER DELETE ON qr_ss_ellipsis_event BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_ellipsis_event_i AFTER INSERT ON qr_ss_ellipsis_event BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_ellipsis_event_u AFTER UPDATE ON qr_ss_ellipsis_event BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_occ_clause_d AFTER DELETE ON qr_ss_occ_clause BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_occ_clause_i AFTER INSERT ON qr_ss_occ_clause BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_occ_clause_u AFTER UPDATE ON qr_ss_occ_clause BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_occ_phrase_d AFTER DELETE ON qr_ss_occ_phrase BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_occ_phrase_i AFTER INSERT ON qr_ss_occ_phrase BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_occ_phrase_u AFTER UPDATE ON qr_ss_occ_phrase BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_occ_segment_d AFTER DELETE ON qr_ss_occ_segment BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_occ_segment_i AFTER INSERT ON qr_ss_occ_segment BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_occ_segment_u AFTER UPDATE ON qr_ss_occ_segment BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_occ_sentence_d AFTER DELETE ON qr_ss_occ_sentence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_occ_sentence_i AFTER INSERT ON qr_ss_occ_sentence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_occ_sentence_u AFTER UPDATE ON qr_ss_occ_sentence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_pattern_register_d AFTER DELETE ON qr_ss_pattern_register BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_pattern_register_i AFTER INSERT ON qr_ss_pattern_register BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_pattern_register_u AFTER UPDATE ON qr_ss_pattern_register BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_pattern_term_link_d AFTER DELETE ON qr_ss_pattern_term_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_pattern_term_link_i AFTER INSERT ON qr_ss_pattern_term_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_pattern_term_link_u AFTER UPDATE ON qr_ss_pattern_term_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_balagha_link_d AFTER DELETE ON qr_ss_scope_balagha_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_balagha_link_i AFTER INSERT ON qr_ss_scope_balagha_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_balagha_link_u AFTER UPDATE ON qr_ss_scope_balagha_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_grammar_link_d AFTER DELETE ON qr_ss_scope_grammar_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_grammar_link_i AFTER INSERT ON qr_ss_scope_grammar_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_grammar_link_u AFTER UPDATE ON qr_ss_scope_grammar_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_link_d AFTER DELETE ON qr_ss_scope_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_link_i AFTER INSERT ON qr_ss_scope_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_link_u AFTER UPDATE ON qr_ss_scope_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_member_map_d AFTER DELETE ON qr_ss_scope_member_map BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_member_map_i AFTER INSERT ON qr_ss_scope_member_map BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_member_map_u AFTER UPDATE ON qr_ss_scope_member_map BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_morph_link_d AFTER DELETE ON qr_ss_scope_morph_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_morph_link_i AFTER INSERT ON qr_ss_scope_morph_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_morph_link_u AFTER UPDATE ON qr_ss_scope_morph_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_nuance_d AFTER DELETE ON qr_ss_scope_nuance BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_nuance_i AFTER INSERT ON qr_ss_scope_nuance BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_nuance_u AFTER UPDATE ON qr_ss_scope_nuance BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_reading_d AFTER DELETE ON qr_ss_scope_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_reading_evidence_link_d AFTER DELETE ON qr_ss_scope_reading_evidence_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_reading_evidence_link_i AFTER INSERT ON qr_ss_scope_reading_evidence_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_reading_evidence_link_u AFTER UPDATE ON qr_ss_scope_reading_evidence_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_reading_i AFTER INSERT ON qr_ss_scope_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_scope_reading_u AFTER UPDATE ON qr_ss_scope_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_source_register_d AFTER DELETE ON qr_ss_source_register BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_source_register_i AFTER INSERT ON qr_ss_source_register BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_source_register_u AFTER UPDATE ON qr_ss_source_register BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_syntax_link_d AFTER DELETE ON qr_ss_syntax_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_syntax_link_i AFTER INSERT ON qr_ss_syntax_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_syntax_link_u AFTER UPDATE ON qr_ss_syntax_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_translation_buildup_d AFTER DELETE ON qr_ss_translation_buildup BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_translation_buildup_i AFTER INSERT ON qr_ss_translation_buildup BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_translation_buildup_u AFTER UPDATE ON qr_ss_translation_buildup BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_translation_decision_d AFTER DELETE ON qr_ss_translation_decision BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_translation_decision_i AFTER INSERT ON qr_ss_translation_decision BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_translation_decision_u AFTER UPDATE ON qr_ss_translation_decision BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_translation_nuance_d AFTER DELETE ON qr_ss_translation_nuance BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_translation_nuance_i AFTER INSERT ON qr_ss_translation_nuance BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_translation_nuance_u AFTER UPDATE ON qr_ss_translation_nuance BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_translation_passage_d AFTER DELETE ON qr_ss_translation_passage BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_translation_passage_i AFTER INSERT ON qr_ss_translation_passage BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_translation_passage_u AFTER UPDATE ON qr_ss_translation_passage BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_translation_unit_d AFTER DELETE ON qr_ss_translation_unit BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_translation_unit_i AFTER INSERT ON qr_ss_translation_unit BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_translation_unit_u AFTER UPDATE ON qr_ss_translation_unit BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_tree_d AFTER DELETE ON qr_ss_tree BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_tree_edge_d AFTER DELETE ON qr_ss_tree_edge BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_tree_edge_i AFTER INSERT ON qr_ss_tree_edge BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_tree_edge_u AFTER UPDATE ON qr_ss_tree_edge BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_tree_i AFTER INSERT ON qr_ss_tree BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_tree_layout_d AFTER DELETE ON qr_ss_tree_layout BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_tree_layout_i AFTER INSERT ON qr_ss_tree_layout BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_tree_layout_u AFTER UPDATE ON qr_ss_tree_layout BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_tree_node_d AFTER DELETE ON qr_ss_tree_node BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_tree_node_i AFTER INSERT ON qr_ss_tree_node BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_tree_node_u AFTER UPDATE ON qr_ss_tree_node BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_tree_u AFTER UPDATE ON qr_ss_tree BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_vocab_register_d AFTER DELETE ON qr_ss_vocab_register BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_vocab_register_i AFTER INSERT ON qr_ss_vocab_register BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_ss_vocab_register_u AFTER UPDATE ON qr_ss_vocab_register BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_study_label_d AFTER DELETE ON qr_study_label BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_study_label_i AFTER INSERT ON qr_study_label BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_study_label_u AFTER UPDATE ON qr_study_label BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_study_question_d AFTER DELETE ON qr_study_question BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_study_question_i AFTER INSERT ON qr_study_question BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_study_question_u AFTER UPDATE ON qr_study_question BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_analysis_d AFTER DELETE ON qr_surah_analysis BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_analysis_i AFTER INSERT ON qr_surah_analysis BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_analysis_u AFTER UPDATE ON qr_surah_analysis BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_atomic_profile_d AFTER DELETE ON qr_surah_atomic_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_atomic_profile_i AFTER INSERT ON qr_surah_atomic_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_atomic_profile_u AFTER UPDATE ON qr_surah_atomic_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_ayah_meta_d AFTER DELETE ON qr_surah_ayah_meta BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_surah_ayah_meta_i AFTER INSERT ON qr_surah_ayah_meta BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_surah_ayah_meta_u AFTER UPDATE ON qr_surah_ayah_meta BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_surah_clause_pattern_d AFTER DELETE ON qr_surah_clause_pattern BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_clause_pattern_i AFTER INSERT ON qr_surah_clause_pattern BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_clause_pattern_u AFTER UPDATE ON qr_surah_clause_pattern BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_closure_d AFTER DELETE ON qr_surah_closure BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_closure_i AFTER INSERT ON qr_surah_closure BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_closure_u AFTER UPDATE ON qr_surah_closure BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_coherence_signal_d AFTER DELETE ON qr_surah_coherence_signal BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_coherence_signal_i AFTER INSERT ON qr_surah_coherence_signal BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_coherence_signal_u AFTER UPDATE ON qr_surah_coherence_signal BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_d AFTER DELETE ON qr_surah BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_surah_diamond_pattern_d AFTER DELETE ON qr_surah_diamond_pattern BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_diamond_pattern_i AFTER INSERT ON qr_surah_diamond_pattern BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_diamond_pattern_u AFTER UPDATE ON qr_surah_diamond_pattern BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_ellipsis_pattern_d AFTER DELETE ON qr_surah_ellipsis_pattern BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_ellipsis_pattern_i AFTER INSERT ON qr_surah_ellipsis_pattern BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_ellipsis_pattern_u AFTER UPDATE ON qr_surah_ellipsis_pattern BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_i AFTER INSERT ON qr_surah BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_surah_info_i AFTER INSERT ON qr_surah_info BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_surah_layer_d AFTER DELETE ON qr_surah_layer BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_layer_i AFTER INSERT ON qr_surah_layer BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_layer_u AFTER UPDATE ON qr_surah_layer BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_link_d AFTER DELETE ON qr_surah_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_link_i AFTER INSERT ON qr_surah_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_link_u AFTER UPDATE ON qr_surah_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_motif_cluster_d AFTER DELETE ON qr_surah_motif_cluster BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_motif_cluster_i AFTER INSERT ON qr_surah_motif_cluster BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_motif_cluster_u AFTER UPDATE ON qr_surah_motif_cluster BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_opening_d AFTER DELETE ON qr_surah_opening BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_opening_i AFTER INSERT ON qr_surah_opening BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_opening_u AFTER UPDATE ON qr_surah_opening BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_passage_proposal_d AFTER DELETE ON qr_surah_passage_proposal BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_passage_proposal_i AFTER INSERT ON qr_surah_passage_proposal BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_passage_proposal_u AFTER UPDATE ON qr_surah_passage_proposal BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_profile_d AFTER DELETE ON qr_surah_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_profile_i AFTER INSERT ON qr_surah_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_profile_u AFTER UPDATE ON qr_surah_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_reception_d AFTER DELETE ON qr_surah_reception BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_reception_i AFTER INSERT ON qr_surah_reception BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_reception_u AFTER UPDATE ON qr_surah_reception BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_register_shift_d AFTER DELETE ON qr_surah_register_shift BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_register_shift_i AFTER INSERT ON qr_surah_register_shift BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_register_shift_u AFTER UPDATE ON qr_surah_register_shift BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_revelation_rank_d AFTER DELETE ON qr_surah_revelation_rank BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_revelation_rank_i AFTER INSERT ON qr_surah_revelation_rank BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_revelation_rank_u AFTER UPDATE ON qr_surah_revelation_rank BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_rhetoric_profile_d AFTER DELETE ON qr_surah_rhetoric_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_rhetoric_profile_i AFTER INSERT ON qr_surah_rhetoric_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_rhetoric_profile_u AFTER UPDATE ON qr_surah_rhetoric_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_sequence_pattern_d AFTER DELETE ON qr_surah_sequence_pattern BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_sequence_pattern_i AFTER INSERT ON qr_surah_sequence_pattern BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_sequence_pattern_u AFTER UPDATE ON qr_surah_sequence_pattern BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_structural_pivot_d AFTER DELETE ON qr_surah_structural_pivot BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_structural_pivot_i AFTER INSERT ON qr_surah_structural_pivot BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_structural_pivot_u AFTER UPDATE ON qr_surah_structural_pivot BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_structure_link_d AFTER DELETE ON qr_surah_structure_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_structure_link_i AFTER INSERT ON qr_surah_structure_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_structure_link_u AFTER UPDATE ON qr_surah_structure_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_structure_reading_d AFTER DELETE ON qr_surah_structure_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_structure_reading_i AFTER INSERT ON qr_surah_structure_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_structure_reading_u AFTER UPDATE ON qr_surah_structure_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_structure_unit_d AFTER DELETE ON qr_surah_structure_unit BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_structure_unit_i AFTER INSERT ON qr_surah_structure_unit BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_structure_unit_u AFTER UPDATE ON qr_surah_structure_unit BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_study_passage_d AFTER DELETE ON qr_surah_study_passage BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_study_passage_i AFTER INSERT ON qr_surah_study_passage BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_study_passage_u AFTER UPDATE ON qr_surah_study_passage BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_study_step_d AFTER DELETE ON qr_surah_study_step BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_study_step_i AFTER INSERT ON qr_surah_study_step BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_study_step_u AFTER UPDATE ON qr_surah_study_step BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_study_task_chunk_d AFTER DELETE ON qr_surah_study_task_chunk BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_study_task_chunk_i AFTER INSERT ON qr_surah_study_task_chunk BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_study_task_chunk_u AFTER UPDATE ON qr_surah_study_task_chunk BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_study_task_d AFTER DELETE ON qr_surah_study_task BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_study_task_i AFTER INSERT ON qr_surah_study_task BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_study_task_u AFTER UPDATE ON qr_surah_study_task BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_symmetry_pattern_d AFTER DELETE ON qr_surah_symmetry_pattern BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_symmetry_pattern_i AFTER INSERT ON qr_surah_symmetry_pattern BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_symmetry_pattern_u AFTER UPDATE ON qr_surah_symmetry_pattern BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_tafsir_chunk_d AFTER DELETE ON qr_surah_tafsir_chunk BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_tafsir_chunk_i AFTER INSERT ON qr_surah_tafsir_chunk BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_tafsir_chunk_u AFTER UPDATE ON qr_surah_tafsir_chunk BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_tafsir_hadith_d AFTER DELETE ON qr_surah_tafsir_hadith BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_tafsir_hadith_i AFTER INSERT ON qr_surah_tafsir_hadith BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_tafsir_hadith_u AFTER UPDATE ON qr_surah_tafsir_hadith BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_tafsir_reading_d AFTER DELETE ON qr_surah_tafsir_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_tafsir_reading_i AFTER INSERT ON qr_surah_tafsir_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_tafsir_reading_u AFTER UPDATE ON qr_surah_tafsir_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_tafsir_term_d AFTER DELETE ON qr_surah_tafsir_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_tafsir_term_i AFTER INSERT ON qr_surah_tafsir_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_tafsir_term_u AFTER UPDATE ON qr_surah_tafsir_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_tafsir_theme_d AFTER DELETE ON qr_surah_tafsir_theme BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_tafsir_theme_i AFTER INSERT ON qr_surah_tafsir_theme BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_tafsir_theme_u AFTER UPDATE ON qr_surah_tafsir_theme BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_tafsir_xref_d AFTER DELETE ON qr_surah_tafsir_xref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_tafsir_xref_i AFTER INSERT ON qr_surah_tafsir_xref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_tafsir_xref_u AFTER UPDATE ON qr_surah_tafsir_xref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_theme_profile_d AFTER DELETE ON qr_surah_theme_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_theme_profile_i AFTER INSERT ON qr_surah_theme_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_theme_profile_u AFTER UPDATE ON qr_surah_theme_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_theology_profile_d AFTER DELETE ON qr_surah_theology_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_theology_profile_i AFTER INSERT ON qr_surah_theology_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_theology_profile_u AFTER UPDATE ON qr_surah_theology_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_topic_flow_d AFTER DELETE ON qr_surah_topic_flow BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_topic_flow_i AFTER INSERT ON qr_surah_topic_flow BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_topic_flow_u AFTER UPDATE ON qr_surah_topic_flow BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_u AFTER UPDATE ON qr_surah BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_surah_worldview_profile_d AFTER DELETE ON qr_surah_worldview_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_worldview_profile_i AFTER INSERT ON qr_surah_worldview_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_surah_worldview_profile_u AFTER UPDATE ON qr_surah_worldview_profile BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_audio_d AFTER DELETE ON qr_tafsir_audio BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_audio_i AFTER INSERT ON qr_tafsir_audio BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_audio_segment_d AFTER DELETE ON qr_tafsir_audio_segment BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_audio_segment_i AFTER INSERT ON qr_tafsir_audio_segment BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_audio_segment_u AFTER UPDATE ON qr_tafsir_audio_segment BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_audio_u AFTER UPDATE ON qr_tafsir_audio BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_book_display_block_d AFTER DELETE ON qr_tafsir_book_display_block BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_book_display_block_i AFTER INSERT ON qr_tafsir_book_display_block BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_book_display_block_u AFTER UPDATE ON qr_tafsir_book_display_block BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_book_display_link_d AFTER DELETE ON qr_tafsir_book_display_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_book_display_link_i AFTER INSERT ON qr_tafsir_book_display_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_book_display_link_u AFTER UPDATE ON qr_tafsir_book_display_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_book_display_note_d AFTER DELETE ON qr_tafsir_book_display_note BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_book_display_note_i AFTER INSERT ON qr_tafsir_book_display_note BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_book_display_note_u AFTER UPDATE ON qr_tafsir_book_display_note BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_book_display_ref_d AFTER DELETE ON qr_tafsir_book_display_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_book_display_ref_i AFTER INSERT ON qr_tafsir_book_display_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_book_display_ref_u AFTER UPDATE ON qr_tafsir_book_display_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_book_display_source_d AFTER DELETE ON qr_tafsir_book_display_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_book_display_source_i AFTER INSERT ON qr_tafsir_book_display_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_book_display_source_u AFTER UPDATE ON qr_tafsir_book_display_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_book_display_tag_d AFTER DELETE ON qr_tafsir_book_display_tag BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_book_display_tag_i AFTER INSERT ON qr_tafsir_book_display_tag BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_book_display_tag_u AFTER UPDATE ON qr_tafsir_book_display_tag BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_en_i AFTER INSERT ON qr_tafsir_en BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_entry_d AFTER DELETE ON qr_tafsir_entry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_entry_i AFTER INSERT ON qr_tafsir_entry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_entry_u AFTER UPDATE ON qr_tafsir_entry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_read_page_d AFTER DELETE ON qr_tafsir_read_page BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_read_page_i AFTER INSERT ON qr_tafsir_read_page BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_read_page_u AFTER UPDATE ON qr_tafsir_read_page BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_sura_preface_d AFTER DELETE ON qr_tafsir_sura_preface BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_sura_preface_i AFTER INSERT ON qr_tafsir_sura_preface BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_tafsir_sura_preface_u AFTER UPDATE ON qr_tafsir_sura_preface BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_topic_registry_d AFTER DELETE ON qr_topic_registry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_topic_registry_i AFTER INSERT ON qr_topic_registry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_topic_registry_u AFTER UPDATE ON qr_topic_registry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_translation_d AFTER DELETE ON qr_translation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_translation_feature_d AFTER DELETE ON qr_translation_feature BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_translation_feature_i AFTER INSERT ON qr_translation_feature BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_translation_feature_u AFTER UPDATE ON qr_translation_feature BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_translation_i AFTER INSERT ON qr_translation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_translation_passage_d AFTER DELETE ON qr_translation_passage BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_translation_passage_i AFTER INSERT ON qr_translation_passage BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_translation_passage_u AFTER UPDATE ON qr_translation_passage BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_translation_source_d AFTER DELETE ON qr_translation_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_translation_source_i AFTER INSERT ON qr_translation_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_translation_source_u AFTER UPDATE ON qr_translation_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_translation_u AFTER UPDATE ON qr_translation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_word_occurrence_d AFTER DELETE ON qr_word_occurrence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_word_occurrence_i AFTER INSERT ON qr_word_occurrence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_word_occurrence_u AFTER UPDATE ON qr_word_occurrence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_word_sense_link_d AFTER DELETE ON qr_word_sense_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_word_sense_link_i AFTER INSERT ON qr_word_sense_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_word_sense_link_u AFTER UPDATE ON qr_word_sense_link BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_word_term_d AFTER DELETE ON qr_word_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_word_term_i AFTER INSERT ON qr_word_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_word_term_u AFTER UPDATE ON qr_word_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'rest'; END;

CREATE TRIGGER trg_kcv_qr_word_translation_i AFTER INSERT ON qr_word_translation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;

CREATE TRIGGER trg_kcv_qr_word_translation_u AFTER UPDATE ON qr_word_translation BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'books'; END;
