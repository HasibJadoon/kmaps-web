-- Schema for km_arabic.
-- Generated from remote Cloudflare D1 sqlite_schema with data excluded, 2026-09-09.
-- Internal D1 bookkeeping tables and FTS5 shadow tables are omitted.
-- Regenerate with scripts/regen_schemas.py — do not hand-edit.

-- ── Tables (49) ────────────────────────────────────────────────────

CREATE TABLE ar_acq_audio (
  id            TEXT PRIMARY KEY,
  entry_ar_no   INTEGER,
  acq_ref_id    TEXT REFERENCES ar_acquisition_ref(id),
  capture_id    TEXT REFERENCES ar_acq_capture(id),
  category_ref  TEXT REFERENCES ar_acq_category(id),
  bucket        TEXT NOT NULL DEFAULT 'km-arabic-audio',
  object_key    TEXT NOT NULL UNIQUE,
  title_ar      TEXT,
  title_en      TEXT,
  speaker       TEXT,
  platform      TEXT,
  source_url    TEXT,
  mime_type     TEXT,
  duration_sec  REAL,
  size_bytes    INTEGER,
  sample_rate   INTEGER,
  register      TEXT,
  dialect       TEXT,
  transcript_state TEXT NOT NULL DEFAULT 'none',
  transcript_ref   TEXT,
  aligned       INTEGER NOT NULL DEFAULT 0,
  srs_usable    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'live',
  meta_json     TEXT NOT NULL DEFAULT '{}',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
, etag TEXT, sha256 TEXT);

CREATE VIRTUAL TABLE ar_acq_audio_fts USING fts5(
  text_ar,
  text_en,
  content = 'ar_acq_audio_segment',
  content_rowid = 'rowid',
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TABLE ar_acq_audio_segment (
  id          TEXT PRIMARY KEY,
  audio_id    TEXT NOT NULL REFERENCES ar_acq_audio(id),
  seq         INTEGER NOT NULL,
  start_sec   REAL NOT NULL,
  end_sec     REAL NOT NULL,
  speaker     TEXT,
  text_ar     TEXT NOT NULL,
  text_en     TEXT,
  confidence  REAL,
  is_reviewed INTEGER NOT NULL DEFAULT 0,
  item_ref    TEXT REFERENCES ar_acq_item(id),
  meta_json   TEXT NOT NULL DEFAULT '{}',
  UNIQUE (audio_id, seq)
);

CREATE TABLE ar_acq_capture (
  id            TEXT PRIMARY KEY,
  captured_at   TEXT NOT NULL DEFAULT (datetime('now')),
  channel       TEXT NOT NULL DEFAULT 'text',
  origin        TEXT,
  origin_url    TEXT,
  notion_ref    TEXT,
  raw_text      TEXT,
  media_ref     TEXT,
  acq_ref_id    TEXT REFERENCES ar_acquisition_ref(id),
  context_note  TEXT,
  language      TEXT NOT NULL DEFAULT 'ar',
  register      TEXT,
  dialect       TEXT,
  status        TEXT NOT NULL DEFAULT 'inbox',
  item_count    INTEGER NOT NULL DEFAULT 0,
  core_user_ref TEXT,
  meta_json     TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE ar_acq_category (
  id            TEXT PRIMARY KEY,
  ar_no         INTEGER NOT NULL UNIQUE,
  name_en       TEXT NOT NULL,
  name_ar       TEXT NOT NULL,
  notion_ref    TEXT,
  notion_type   TEXT,
  notion_status TEXT,
  medium        TEXT,
  register      TEXT,
  note_ar       TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'live',
  meta_json     TEXT NOT NULL DEFAULT '{}',
  synced_at     TEXT NOT NULL DEFAULT (datetime('now'))
, origin TEXT NOT NULL DEFAULT 'notion', platform TEXT);

CREATE TABLE ar_acq_entry (
  id             TEXT PRIMARY KEY,
  ar_no          INTEGER UNIQUE,
  name           TEXT,
  type_json      TEXT NOT NULL DEFAULT '[]',
  author         TEXT,
  status         TEXT,
  parent_ar_no   INTEGER,
  category_ref   TEXT REFERENCES ar_acq_category(id),
  notion_page_id TEXT NOT NULL UNIQUE,
  notion_url     TEXT,
  created_time   TEXT,
  has_body       INTEGER NOT NULL DEFAULT 0,
  acq_ref_id     TEXT REFERENCES ar_acquisition_ref(id),
  mined_state    TEXT NOT NULL DEFAULT 'raw',
  item_count     INTEGER NOT NULL DEFAULT 0,
  meta_json      TEXT NOT NULL DEFAULT '{}',
  synced_at      TEXT NOT NULL DEFAULT (datetime('now'))
, entry_level TEXT NOT NULL DEFAULT 'item');

CREATE TABLE ar_acq_item (
  id            TEXT PRIMARY KEY,
  capture_id    TEXT REFERENCES ar_acq_capture(id),
  acq_ref_id    TEXT REFERENCES ar_acquisition_ref(id),
  item_type     TEXT NOT NULL,
  text_ar       TEXT NOT NULL,
  vocalised_ar  TEXT,
  literal_en    TEXT,
  gloss_en      TEXT,
  gloss_ur      TEXT,
  usage_ar      TEXT,
  example_ar    TEXT,
  register      TEXT,
  dialect       TEXT,
  frequency     TEXT,
  lemma_ar      TEXT,
  root_ar       TEXT,
  al_lemma_ref  TEXT,
  al_root_ref   TEXT,
  theme_tags_json TEXT NOT NULL DEFAULT '[]',
  srs_state     TEXT NOT NULL DEFAULT 'queued',
  srs_card_ref  TEXT,
  srs_db        TEXT NOT NULL DEFAULT 'km_core',
  status        TEXT NOT NULL DEFAULT 'live',
  captured_at   TEXT NOT NULL DEFAULT (datetime('now')),
  meta_json     TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE ar_acq_type (
  id         TEXT PRIMARY KEY,
  name_en    TEXT NOT NULL UNIQUE,
  name_ar    TEXT NOT NULL,
  medium     TEXT,
  register   TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE ar_acquisition_ref (
  id             TEXT PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  title_ar       TEXT NOT NULL,
  title_en       TEXT,
  subtitle_ar    TEXT,
  genre_ref      TEXT NOT NULL,
  medium         TEXT NOT NULL,
  register       TEXT,
  dialect        TEXT,
  level          TEXT,
  track_id       TEXT REFERENCES ar_curriculum_track(id),
  content_db     TEXT NOT NULL DEFAULT 'km_content',
  cm_source_ref  TEXT,
  acq_ref        TEXT,
  text_db        TEXT,
  text_table     TEXT,
  text_source_ref TEXT,
  wv_source_ref  TEXT,
  wv_topic_ref   TEXT,
  unit_count     INTEGER,
  has_script     INTEGER NOT NULL DEFAULT 0,
  audio_state    TEXT NOT NULL DEFAULT 'none',
  lemma_targets_json TEXT NOT NULL DEFAULT '[]',
  root_targets_json  TEXT NOT NULL DEFAULT '[]',
  note_ar        TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'live',
  meta_json      TEXT NOT NULL DEFAULT '{}',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
, author TEXT, capture_status TEXT NOT NULL DEFAULT 'not_started', parent_ref TEXT REFERENCES ar_acquisition_ref(id), notion_ref TEXT, category_ref TEXT REFERENCES ar_acq_category(id), platform TEXT, verse_form TEXT);

CREATE TABLE "ar_curriculum" (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  discipline      TEXT NOT NULL DEFAULT 'nahw',
    
  level           TEXT,                           
  track_id        TEXT,
  container_id    TEXT,
  description_md  TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')), spine TEXT, html_doc TEXT, artifact_path TEXT, html_sha256 TEXT, html_bytes INTEGER,
  FOREIGN KEY (track_id)    REFERENCES "ar_curriculum_track"(id),
  FOREIGN KEY (container_id) REFERENCES "ar_curriculum_container"(id)
);

CREATE TABLE "ar_curriculum_container" (
  id              TEXT PRIMARY KEY,               
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  container_type  TEXT NOT NULL DEFAULT 'course',
    
  track_id        TEXT,
  level           TEXT,                           
  description_md  TEXT,
  cover_ref       TEXT,                           
  source_ref      TEXT,                           
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_published    INTEGER NOT NULL DEFAULT 0,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')), uid TEXT, al_discipline_uid TEXT, discipline TEXT,
  FOREIGN KEY (track_id) REFERENCES "ar_curriculum_track"(id)
);

CREATE TABLE "ar_curriculum_container_unit" (
  id              TEXT PRIMARY KEY,
  container_id    TEXT NOT NULL,
  parent_id       TEXT,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  unit_type       TEXT NOT NULL DEFAULT 'lesson',
    
  unit_index      INTEGER NOT NULL DEFAULT 0,
  description_md  TEXT,
  estimated_mins  INTEGER,
  skill_focus     TEXT,                           
  al_concept_refs TEXT,                           
  qr_scope_ref    TEXT,                           
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')), uid TEXT, al_group_ref TEXT, al_group_uid TEXT, source_db TEXT NOT NULL DEFAULT 'km_arabic_linguistic', gn_node_id TEXT,
  FOREIGN KEY (container_id) REFERENCES "ar_curriculum_container"(id),
  FOREIGN KEY (parent_id)    REFERENCES "ar_curriculum_container_unit"(id)
);

CREATE TABLE "ar_curriculum_container_unit_task" (
  id              TEXT PRIMARY KEY,
  unit_id         TEXT NOT NULL,
  parent_task_id  TEXT,
  title           TEXT NOT NULL,
  task_type       TEXT NOT NULL DEFAULT 'read',
    
    
  task_index      INTEGER NOT NULL DEFAULT 0,
  step_no         INTEGER,
  description_md  TEXT,
  estimated_mins  INTEGER,
  al_concept_ref  TEXT,                           
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (unit_id)        REFERENCES "ar_curriculum_container_unit"(id),
  FOREIGN KEY (parent_task_id) REFERENCES "ar_curriculum_container_unit_task"(id)
);

CREATE TABLE "ar_curriculum_domain" (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  title_ar    TEXT,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "ar_curriculum_domain_phrase" (
  id TEXT PRIMARY KEY, domain_id TEXT NOT NULL, arabic TEXT NOT NULL, transliteration TEXT,
  meaning_en TEXT NOT NULL, usage_context TEXT, level TEXT, al_lemma_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (domain_id) REFERENCES "ar_curriculum_domain"(id));

CREATE TABLE "ar_curriculum_lesson" (
  id              TEXT PRIMARY KEY,               
  unit_id         TEXT,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  lesson_type     TEXT NOT NULL DEFAULT 'instruction',
    
  level           TEXT,
  skill_focus     TEXT,                           
  content_md      TEXT NOT NULL,
  vocab_ids_json  TEXT,                           
  grammar_ids_json TEXT,                          
  qr_scope_ref    TEXT,
  estimated_mins  INTEGER,
  is_published    INTEGER NOT NULL DEFAULT 0,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (unit_id) REFERENCES "ar_curriculum_container_unit"(id)
);

CREATE TABLE "ar_curriculum_scenario" (
  id              TEXT PRIMARY KEY,
  domain_id       TEXT NOT NULL,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  scenario_type   TEXT NOT NULL DEFAULT 'dialogue',
    
  level           TEXT,
  description_md  TEXT,
  vocab_set_json  TEXT,                           
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (domain_id) REFERENCES "ar_curriculum_domain"(id)
);

CREATE TABLE "ar_curriculum_track" (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  title_ar        TEXT,
  track_type      TEXT NOT NULL DEFAULT 'classical',
    
  cefr_from       TEXT,                           
  cefr_to         TEXT,
  description_md  TEXT,
  prerequisites_json TEXT,                        
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_public       INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
, uid TEXT, discipline TEXT, level TEXT);

CREATE TABLE "ar_curriculum_unit" (
  id              TEXT PRIMARY KEY,
  curriculum_id   TEXT NOT NULL,
  parent_id       TEXT,
  title           TEXT NOT NULL,
  al_concept_ref  TEXT,                           
  unit_index      INTEGER NOT NULL DEFAULT 0,
  description_md  TEXT,
  examples_json   TEXT,                           
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (curriculum_id) REFERENCES "ar_curriculum"(id),
  FOREIGN KEY (parent_id)     REFERENCES "ar_curriculum_unit"(id)
);

CREATE TABLE "ar_curriculum_unit_concept_map" (
  id TEXT PRIMARY KEY, unit_id TEXT NOT NULL, al_term_ref TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), al_term_uid TEXT, source_db TEXT NOT NULL DEFAULT 'km_arabic_linguistic', role TEXT NOT NULL DEFAULT 'focus',
  FOREIGN KEY (unit_id) REFERENCES "ar_curriculum_container_unit"(id), UNIQUE (unit_id, al_term_ref));

CREATE TABLE "ar_curriculum_unit_lemma_map" (
  id TEXT PRIMARY KEY, unit_id TEXT NOT NULL, al_lemma_ref TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0, is_key_word INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (unit_id) REFERENCES "ar_curriculum_container_unit"(id), UNIQUE (unit_id, al_lemma_ref));

CREATE TABLE ar_daily_delivery (
  id           TEXT PRIMARY KEY,
  user_ref     TEXT NOT NULL,                 
  theme_id     TEXT NOT NULL REFERENCES ar_daily_theme(id) ON DELETE CASCADE,
  due_on       TEXT NOT NULL,                 
  delivered_at TEXT,
  completed_at TEXT,
  state        TEXT NOT NULL DEFAULT 'pending'
                 CHECK (state IN ('pending','delivered','done','skipped')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_ref, theme_id)
);

CREATE TABLE ar_daily_passage (
  id          TEXT PRIMARY KEY,
  theme_id    TEXT NOT NULL UNIQUE REFERENCES ar_daily_theme(id) ON DELETE CASCADE,
  title_ar    TEXT NOT NULL,
  text_ar     TEXT NOT NULL,                  
  gloss_en    TEXT NOT NULL,
  word_count  INTEGER NOT NULL DEFAULT 0,
  audio_key   TEXT,                           
  audio_secs  REAL,                           
                                              
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_daily_sentence (
  id              TEXT PRIMARY KEY,
  theme_id        TEXT NOT NULL REFERENCES ar_daily_theme(id) ON DELETE CASCADE,
  word_id         TEXT REFERENCES ar_daily_word(id) ON DELETE CASCADE,
  text_ar         TEXT NOT NULL,              
  gloss_en        TEXT NOT NULL,
  number_used     TEXT NOT NULL DEFAULT 'plural'
                    CHECK (number_used IN ('singular','dual','plural')),
  grammar_note_en TEXT,                       
  audio_key       TEXT,                       
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_daily_theme (
  id           TEXT PRIMARY KEY,              
  slug         TEXT NOT NULL UNIQUE,
  title_ar     TEXT NOT NULL,
  title_en     TEXT NOT NULL,
  domain_id    TEXT REFERENCES ar_curriculum_domain(id),
  level        TEXT NOT NULL DEFAULT 'A2',
  day_index    INTEGER NOT NULL UNIQUE,       
  focus_note   TEXT,                          
  is_published INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_daily_word (
  id              TEXT PRIMARY KEY,           
  theme_id        TEXT NOT NULL REFERENCES ar_daily_theme(id) ON DELETE CASCADE,
  singular_ar     TEXT NOT NULL,              
  plural_ar       TEXT NOT NULL,              
  gloss_en        TEXT NOT NULL,
  plural_kind     TEXT NOT NULL
                    CHECK (plural_kind IN ('taksir','salim_m','salim_f')),
  gender          TEXT NOT NULL CHECK (gender IN ('m','f')),
  pattern_ar      TEXT,                       
  is_diptote      INTEGER NOT NULL DEFAULT 0, 
  al_root_ref     TEXT,                       
  al_lemma_ref    TEXT,
  
  
  
  
  audio_key_sg    TEXT,
  audio_key_pl    TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (theme_id, singular_ar)
);

CREATE TABLE ar_discipline (
  code        TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name_ar     TEXT NOT NULL,
  name_en     TEXT NOT NULL,
  name_ur     TEXT,
  tagline_en  TEXT,
  root_node_id TEXT,
  container_id TEXT,
  accent      TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_exercises ( id TEXT PRIMARY KEY, lesson_id TEXT, unit_id TEXT, exercise_type TEXT NOT NULL DEFAULT 'mcq', prompt_ar TEXT, prompt_en TEXT, options_json TEXT, answer_json TEXT, explanation_md TEXT, vocab_id TEXT, grammar_id TEXT, al_concept_ref TEXT, qr_scope_ref TEXT, level TEXT, skill_focus TEXT, difficulty INTEGER NOT NULL DEFAULT 3, meta_json TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (lesson_id) REFERENCES ar_curriculum_lesson(id), FOREIGN KEY (unit_id) REFERENCES ar_curriculum_container_unit(id), FOREIGN KEY (grammar_id) REFERENCES ar_grammar(id) );

CREATE TABLE ar_grammar ( id TEXT PRIMARY KEY, title TEXT NOT NULL, title_ar TEXT, al_nahw_ref TEXT, al_morph_ref TEXT, grammar_type TEXT NOT NULL DEFAULT 'nahw', level TEXT, explanation_md TEXT NOT NULL, examples_json TEXT, rule_summary TEXT, qr_scope_ref TEXT, meta_json TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')) );

CREATE TABLE ar_grammar_example (
  id            TEXT PRIMARY KEY,
  node_id       TEXT REFERENCES ar_grammar_node(id),
  grammar_id    TEXT REFERENCES ar_grammar(id),
  example_ar    TEXT NOT NULL,
  gloss_en      TEXT,
  gloss_ur      TEXT,
  example_kind  TEXT NOT NULL DEFAULT 'quran',
  qr_ref        TEXT,
  source_ref    TEXT,
  mudaf         TEXT,
  mudaf_ilayh   TEXT,
  idafa_type    TEXT,
  purity        TEXT,
  effect        TEXT,
  analysis_ar   TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  meta_json     TEXT
);

CREATE TABLE ar_grammar_node (
  id             TEXT PRIMARY KEY,
  parent_id      TEXT REFERENCES ar_grammar_node(id),
  discipline     TEXT NOT NULL,
  node_type      TEXT NOT NULL DEFAULT 'bab',
  name_ar        TEXT NOT NULL,
  name_en        TEXT,
  name_ur        TEXT,
  definition_ar  TEXT,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  depth          INTEGER NOT NULL DEFAULT 0,
  path           TEXT,
  grammar_id     TEXT REFERENCES ar_grammar(id),
  unit_id        TEXT,
  al_refs_json   TEXT,
  status         TEXT NOT NULL DEFAULT 'skeleton',
  meta_json      TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
, teach_order INTEGER, difficulty INTEGER, prereq_json TEXT, track_id TEXT REFERENCES ar_curriculum_track(id));

CREATE TABLE "ar_learn_exposure_log" (
  id             TEXT PRIMARY KEY,
  core_user_ref  TEXT NOT NULL,
  lemma_ar       TEXT NOT NULL,
  memlet_key     TEXT,
  item_id        TEXT,
  surface        TEXT NOT NULL,
  qr_ref         TEXT,
  outcome        TEXT,
  latency_ms     INTEGER,
  shown_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "ar_learn_mastery" (
  id              TEXT PRIMARY KEY,
  core_user_ref   TEXT NOT NULL,
  track_id        TEXT,
  skill           TEXT NOT NULL,
    
  mastery_score   REAL NOT NULL DEFAULT 0,        
  items_mastered  INTEGER NOT NULL DEFAULT 0,
  items_learning  INTEGER NOT NULL DEFAULT 0,
  last_assessed_at TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (track_id) REFERENCES "ar_curriculum_track"(id),
  UNIQUE (core_user_ref, track_id, skill)
);

CREATE TABLE "ar_learn_memlet_mastery" (
  id             TEXT PRIMARY KEY,
  core_user_ref  TEXT NOT NULL,
  lemma_ar       TEXT NOT NULL,
  memlet_key     TEXT NOT NULL,
  exposures      INTEGER NOT NULL DEFAULT 0,
  correct        INTEGER NOT NULL DEFAULT 0,
  encoding_score REAL NOT NULL DEFAULT 0,
  last_seen_at   TEXT,
  UNIQUE (core_user_ref, lemma_ar, memlet_key)
);

CREATE TABLE "ar_learn_task_completion" (
  id              TEXT PRIMARY KEY,
  task_id         TEXT NOT NULL,
  core_user_ref   TEXT NOT NULL,
  completed_at    TEXT NOT NULL DEFAULT (datetime('now')),
  time_spent_mins INTEGER,
  notes           TEXT,
  FOREIGN KEY (task_id) REFERENCES "ar_curriculum_container_unit_task"(id),
  UNIQUE (task_id, core_user_ref)
);

CREATE TABLE "ar_learn_track_profile" (
  id              TEXT PRIMARY KEY,
  core_user_ref   TEXT NOT NULL,                  
  track_id        TEXT NOT NULL,
  current_level   TEXT,                           
  started_at      TEXT NOT NULL DEFAULT (datetime('now')),
  last_activity_at TEXT,
  total_xp        INTEGER NOT NULL DEFAULT 0,
  meta_json       TEXT,
  FOREIGN KEY (track_id) REFERENCES "ar_curriculum_track"(id),
  UNIQUE (core_user_ref, track_id)
);

CREATE TABLE "ar_learn_unit_progress" (
  id                TEXT PRIMARY KEY,
  unit_id           TEXT NOT NULL,
  core_user_ref     TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'not_started',
    
  progress_pct      REAL NOT NULL DEFAULT 0,      
  last_activity_at  TEXT,
  completed_at      TEXT,
  meta_json         TEXT,
  FOREIGN KEY (unit_id) REFERENCES "ar_curriculum_container_unit"(id),
  UNIQUE (unit_id, core_user_ref)
);

CREATE TABLE ar_learning_source (
  id            TEXT PRIMARY KEY,
  source_kind   TEXT NOT NULL,
  title_ar      TEXT,
  title_en      TEXT,
  author_ar     TEXT,
  author_en     TEXT,
  death_year    TEXT,
  url           TEXT,
  platform      TEXT,
  edition       TEXT,
  locator       TEXT,
  lang          TEXT,
  discipline    TEXT,
  authority     TEXT NOT NULL DEFAULT 'secondary',
  al_source_slug TEXT,
  notes_md      TEXT,
  meta_json     TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_lesson (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES ar_lesson(id),
  spine TEXT NOT NULL,
  bab_id TEXT,
  discipline TEXT,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  depth INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  volume_no INTEGER,
  page_start INTEGER,
  page_count INTEGER,
  accent TEXT,
  node_id TEXT,
  status TEXT NOT NULL DEFAULT 'live',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
, external_url TEXT, mirrors_id TEXT);

CREATE TABLE ar_lesson_media (
  id            TEXT PRIMARY KEY,
  lesson_id     TEXT NOT NULL REFERENCES ar_lesson(id) ON DELETE CASCADE,
  source_id     TEXT NOT NULL REFERENCES ar_learning_source(id),
  media_kind    TEXT NOT NULL DEFAULT 'video',
  relation      TEXT NOT NULL DEFAULT 'primary',
  start_seconds INTEGER NOT NULL DEFAULT -1,
  end_seconds   INTEGER,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  label_ar      TEXT,
  note_ar       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (lesson_id, source_id, start_seconds)
);

CREATE TABLE ar_lesson_reading (
  lesson_id TEXT NOT NULL,
  source_slug TEXT NOT NULL,
  bab_id TEXT NOT NULL,
  title_ar TEXT,
  volume_no INTEGER,
  page_start INTEGER,
  term_id TEXT,
  kind TEXT NOT NULL DEFAULT 'classical',
  PRIMARY KEY (lesson_id, bab_id)
);

CREATE TABLE ar_lesson_term (
  lesson_id TEXT NOT NULL,
  term_id TEXT NOT NULL,
  origin TEXT NOT NULL DEFAULT 'toc',
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (lesson_id, term_id)
);

CREATE TABLE ar_ling_gram_term (
  id TEXT PRIMARY KEY,
  category_key TEXT NOT NULL,
  term_key TEXT NOT NULL,
  parent_term_id TEXT,
  term_order INTEGER NOT NULL DEFAULT 0,
  name_ar TEXT NOT NULL, name_en TEXT, name_ur TEXT,
  short_ar TEXT, short_en TEXT, short_ur TEXT,
  definition_ar TEXT, definition_en TEXT, definition_ur TEXT,
  badge_color TEXT, icon TEXT,
  status TEXT NOT NULL DEFAULT 'live',
  discipline TEXT,
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
, aliases_json TEXT, name_bare TEXT);

CREATE TABLE ar_node_gram_term (
  node_id   TEXT NOT NULL,
  term_id   TEXT NOT NULL,
  relation  TEXT NOT NULL DEFAULT 'teaches',
  sort_order INTEGER NOT NULL DEFAULT 0,
  note_ar   TEXT,
  state     TEXT NOT NULL DEFAULT 'confirmed',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (node_id, term_id, relation)
);

CREATE TABLE ar_node_source (
  node_id     TEXT NOT NULL,
  source_id   TEXT NOT NULL REFERENCES ar_learning_source(id),
  locator     TEXT,
  role        TEXT NOT NULL DEFAULT 'reference',
  timestamp_s INTEGER,
  note_ar     TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (node_id, source_id, role)
);

CREATE TABLE ar_reading_state (
  user_id         TEXT NOT NULL,
  work_id         TEXT NOT NULL REFERENCES ar_acquisition_ref(id),
  status          TEXT NOT NULL DEFAULT 'reading',   
  progress_seq    INTEGER,                           
  favourite       INTEGER NOT NULL DEFAULT 0,
  bookmarks_json  TEXT NOT NULL DEFAULT '[]',        
  highlights_json TEXT NOT NULL DEFAULT '[]',        
  opened_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, work_id)
);

CREATE TABLE ar_teaching_variant (
  id          TEXT PRIMARY KEY,
  node_id     TEXT NOT NULL REFERENCES ar_grammar_node(id),
  audience    TEXT NOT NULL,
  lang        TEXT NOT NULL DEFAULT 'en',
  title       TEXT,
  body_md     TEXT NOT NULL,
  duration_min INTEGER,
  age_from    INTEGER,
  source_ids_json TEXT,
  example_ids_json TEXT,
  status      TEXT NOT NULL DEFAULT 'draft',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_text_unit (
  id           TEXT PRIMARY KEY,              -- ARTX:<book_id>:<seq>
  acq_ref_id   TEXT NOT NULL REFERENCES ar_acquisition_ref(id),
  seq          INTEGER NOT NULL,              -- reading order within the work
  part_no      INTEGER,                       -- volume, where the edition has one
  page_no      INTEGER,                       -- printed page, for citation
  title_ar     TEXT,                          -- chapter heading, when this page opens one
  text_ar      TEXT NOT NULL,                 -- vocalised where the source vocalises
  char_count   INTEGER NOT NULL DEFAULT 0,
  word_count   INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'live',
  meta_json    TEXT NOT NULL DEFAULT '{}',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (acq_ref_id, seq)
);

CREATE VIRTUAL TABLE ar_text_unit_fts USING fts5(
  text_ar,
  title_ar,
  content='ar_text_unit',
  content_rowid='rowid',
  tokenize="unicode61 remove_diacritics 2"
);

-- ── Views (2) ─────────────────────────────────────────────────────

CREATE VIEW ar_v_audio AS
SELECT
  a.id            AS audio_id,
  a.bucket,
  a.object_key,
  a.title_ar,
  a.title_en,
  a.speaker,
  a.platform,
  a.duration_sec,
  a.register,
  a.dialect,
  a.transcript_state,
  a.aligned,
  a.srs_usable,
  c.id            AS category_ref,
  c.name_ar       AS category_ar,
  c.name_en       AS category_en,
  r.id            AS acq_ref_id,
  r.title_ar      AS ref_title_ar,
  (SELECT COUNT(*) FROM ar_acq_audio_segment s WHERE s.audio_id = a.id) AS segment_count,
  a.status
FROM ar_acq_audio a
LEFT JOIN ar_acq_category c   ON c.id = a.category_ref
LEFT JOIN ar_acquisition_ref r ON r.id = a.acq_ref_id
WHERE a.status = 'live';

CREATE VIEW ar_v_wv_reference AS
SELECT
  r.id            AS acq_ref_id,
  r.title_ar,
  r.title_en,
  c.name_ar       AS category_ar,
  c.name_en       AS category_en,
  r.genre_ref,
  r.register,
  r.level,
  r.wv_source_ref,
  r.wv_topic_ref,
  r.text_db,
  r.text_table,
  r.text_source_ref,
  r.unit_count,
  r.has_script,
  r.status
FROM ar_acquisition_ref r
LEFT JOIN ar_acq_category c ON c.id = r.category_ref
WHERE r.wv_source_ref IS NOT NULL OR r.text_db = 'km_worldview';

-- ── Indexes (49) ───────────────────────────────────────────────────

CREATE INDEX idx_ar_audio_cat ON ar_acq_audio(category_ref);

CREATE INDEX idx_ar_audio_state ON ar_acq_audio(transcript_state, srs_usable);

CREATE INDEX idx_ar_con_track ON "ar_curriculum_container"(track_id);

CREATE INDEX idx_ar_con_type  ON "ar_curriculum_container"(container_type);

CREATE INDEX idx_ar_cu_container ON "ar_curriculum_container_unit"(container_id);

CREATE INDEX idx_ar_cu_parent    ON "ar_curriculum_container_unit"(parent_id);

CREATE INDEX idx_ar_cu_type      ON "ar_curriculum_container_unit"(unit_type);

CREATE INDEX idx_ar_cun_curr ON "ar_curriculum_unit"(curriculum_id);

CREATE INDEX idx_ar_cut_unit ON "ar_curriculum_container_unit_task"(unit_id);

CREATE INDEX idx_ar_daily_delivery_due   ON ar_daily_delivery(user_ref, due_on, state);

CREATE INDEX idx_ar_daily_sentence_theme ON ar_daily_sentence(theme_id, sort_order);

CREATE INDEX idx_ar_daily_sentence_word  ON ar_daily_sentence(word_id);

CREATE INDEX idx_ar_daily_theme_day      ON ar_daily_theme(day_index, is_published);

CREATE INDEX idx_ar_daily_word_theme     ON ar_daily_word(theme_id, sort_order);

CREATE INDEX idx_ar_exercises_grammar ON ar_exercises(grammar_id);

CREATE INDEX idx_ar_exercises_lesson ON ar_exercises(lesson_id);

CREATE INDEX idx_ar_exercises_unit ON ar_exercises(unit_id);

CREATE INDEX idx_ar_gn_track ON ar_grammar_node(track_id);

CREATE INDEX idx_ar_grammar_type ON ar_grammar(grammar_type, level);

CREATE INDEX idx_ar_les_level ON "ar_curriculum_lesson"(level);

CREATE INDEX idx_ar_les_type  ON "ar_curriculum_lesson"(lesson_type);

CREATE INDEX idx_ar_les_unit  ON "ar_curriculum_lesson"(unit_id);

CREATE INDEX idx_ar_lt_type ON "ar_curriculum_track"(track_type);

CREATE INDEX idx_ar_mp_skill ON "ar_learn_mastery"(skill);

CREATE INDEX idx_ar_mp_user  ON "ar_learn_mastery"(core_user_ref);

CREATE INDEX idx_ar_sc_domain ON "ar_curriculum_scenario"(domain_id);

CREATE INDEX idx_ar_seg_audio ON ar_acq_audio_segment(audio_id, start_sec);

CREATE INDEX idx_ar_tc_task ON "ar_learn_task_completion"(task_id);

CREATE INDEX idx_ar_tc_user ON "ar_learn_task_completion"(core_user_ref);

CREATE INDEX idx_ar_text_page ON ar_text_unit(acq_ref_id, page_no);

CREATE INDEX idx_ar_text_work ON ar_text_unit(acq_ref_id, seq);

CREATE INDEX idx_ar_up_status ON "ar_learn_unit_progress"(status);

CREATE INDEX idx_ar_up_unit   ON "ar_learn_unit_progress"(unit_id);

CREATE INDEX idx_ar_up_user   ON "ar_learn_unit_progress"(core_user_ref);

CREATE INDEX idx_ar_utp_track ON "ar_learn_track_profile"(track_id);

CREATE INDEX idx_ar_utp_user  ON "ar_learn_track_profile"(core_user_ref);

CREATE INDEX idx_cc_discipline ON ar_curriculum_container (discipline, sort_order);

CREATE INDEX idx_ccu_container ON ar_curriculum_container_unit (container_id, parent_id, unit_index);

CREATE INDEX idx_ccu_node ON ar_curriculum_container_unit (gn_node_id);

CREATE INDEX idx_gn_disc_parent ON ar_grammar_node (discipline, parent_id, sort_order);

CREATE INDEX idx_gn_parent ON ar_grammar_node (parent_id, sort_order);

CREATE INDEX idx_gn_path ON ar_grammar_node (path);

CREATE INDEX idx_gn_unit ON ar_grammar_node (unit_id);

CREATE INDEX idx_ls_discipline ON ar_learning_source (discipline, source_kind);

CREATE INDEX idx_node_gram_term_term ON ar_node_gram_term(term_id);

CREATE INDEX idx_ns_source ON ar_node_source (source_id);

CREATE INDEX ix_ar_reading_state_user ON ar_reading_state(user_id, updated_at DESC);

CREATE INDEX ix_lesson_media_lesson ON ar_lesson_media(lesson_id, sort_order);

CREATE INDEX ix_lesson_media_source ON ar_lesson_media(source_id);

-- ── Triggers (5) ──────────────────────────────────────────────────

CREATE TRIGGER ar_text_unit_ad AFTER DELETE ON ar_text_unit BEGIN
  INSERT INTO ar_text_unit_fts(ar_text_unit_fts, rowid, text_ar, title_ar)
  VALUES ('delete', old.rowid, old.text_ar, old.title_ar);
END;

CREATE TRIGGER ar_text_unit_ai AFTER INSERT ON ar_text_unit BEGIN
  INSERT INTO ar_text_unit_fts(rowid, text_ar, title_ar)
  VALUES (new.rowid, new.text_ar, new.title_ar);
END;

CREATE TRIGGER trg_ar_seg_ad AFTER DELETE ON ar_acq_audio_segment BEGIN
  INSERT INTO ar_acq_audio_fts(ar_acq_audio_fts, rowid, text_ar, text_en) VALUES ('delete', old.rowid, old.text_ar, old.text_en);
END;

CREATE TRIGGER trg_ar_seg_ai AFTER INSERT ON ar_acq_audio_segment BEGIN
  INSERT INTO ar_acq_audio_fts(rowid, text_ar, text_en) VALUES (new.rowid, new.text_ar, new.text_en);
END;

CREATE TRIGGER trg_ar_seg_au AFTER UPDATE ON ar_acq_audio_segment BEGIN
  INSERT INTO ar_acq_audio_fts(ar_acq_audio_fts, rowid, text_ar, text_en) VALUES ('delete', old.rowid, old.text_ar, old.text_en);
  INSERT INTO ar_acq_audio_fts(rowid, text_ar, text_en) VALUES (new.rowid, new.text_ar, new.text_en);
END;
