-- Schema for km_arabic.
-- Generated from remote Cloudflare D1 sqlite_schema with data excluded, 2026-10-02.
-- Internal D1 bookkeeping tables and FTS5 shadow tables are omitted.
-- Regenerate with scripts/regen_schemas.py — do not hand-edit.

-- ── Tables (69) ──────────────────────────────────────────────────

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
, author TEXT, capture_status TEXT NOT NULL DEFAULT 'not_started', parent_ref TEXT REFERENCES ar_acquisition_ref(id), notion_ref TEXT, category_ref TEXT REFERENCES ar_acq_category(id), platform TEXT, verse_form TEXT, page_template TEXT);

CREATE TABLE ar_common_word (
  bare TEXT PRIMARY KEY, kind TEXT NOT NULL, lemma TEXT, quran_freq INTEGER
);

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

CREATE TABLE ar_daily_dialogue (
  id          TEXT PRIMARY KEY,               
  theme_id    TEXT NOT NULL REFERENCES ar_daily_theme(id) ON DELETE CASCADE,
  title_ar    TEXT NOT NULL,                  
  title_en    TEXT,
  setting_ar  TEXT,                           
  image_key   TEXT,                           
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_daily_dialogue_turn (
  id          TEXT PRIMARY KEY,               
  dialogue_id TEXT NOT NULL REFERENCES ar_daily_dialogue(id) ON DELETE CASCADE,
  speaker_ar  TEXT NOT NULL,                  
  text_ar     TEXT NOT NULL,                  
  gloss_en    TEXT NOT NULL,
  word_id     TEXT REFERENCES ar_daily_word(id),  
  audio_key   TEXT,                           
  sort_order  INTEGER NOT NULL DEFAULT 0
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
  created_at      TEXT NOT NULL DEFAULT (datetime('now')), image_key TEXT,
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

CREATE TABLE ar_grammar_sentence (
  id          TEXT PRIMARY KEY,     
  kind        TEXT NOT NULL,        
  text_ar     TEXT NOT NULL,        
  qr_ref      TEXT,                 
  term_id     TEXT,                 
  lesson_id   TEXT,                 
  origin      TEXT NOT NULL,        
  source_slug TEXT,                 
  chunk_id    TEXT,                 
  bab_id      TEXT,
  volume_no   INTEGER,
  page_no     INTEGER,
  word_count  INTEGER NOT NULL,
  depth       INTEGER,              
  level       INTEGER NOT NULL,     
  rnd         INTEGER NOT NULL      
, bab_title_ar TEXT, bab_order INTEGER, context_ar TEXT);

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

CREATE TABLE ar_learner_level (
  user_id TEXT NOT NULL, band TEXT NOT NULL, score INTEGER NOT NULL, placed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, band)
);

CREATE TABLE ar_learner_unit (
  user_id     TEXT NOT NULL,
  unit_id     TEXT NOT NULL,
  band        TEXT NOT NULL,                 -- basic | middle | advanced
  stage       TEXT NOT NULL DEFAULT 'preview',  -- preview | watch | drill | check | done
  scenes_json TEXT NOT NULL DEFAULT '[]',    -- scene numbers drilled
  best_score  INTEGER,                       -- the unit check, in percent
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')), watched_json TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY (user_id, unit_id)
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

CREATE TABLE ar_lexeme_passage (
  ref TEXT NOT NULL, rank INTEGER NOT NULL, kind TEXT NOT NULL,      -- text | audio
  work_id TEXT, unit_id TEXT, title TEXT, level TEXT, text_ar TEXT NOT NULL,
  hit_from INTEGER, hit_to INTEGER,                                    -- the lexeme's words in text_ar
  object_key TEXT, start_sec REAL, end_sec REAL,                       -- audio: the stretch to play
  PRIMARY KEY (ref, rank)
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

CREATE TABLE ar_pool_word_fix (
  pool       TEXT NOT NULL,              
  line_id    TEXT NOT NULL,
  tok        INTEGER NOT NULL,           
  old_ar     TEXT NOT NULL,
  new_ar     TEXT,
  reason     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (pool, line_id, tok)
);

CREATE TABLE ar_practice_label (
  scope     TEXT NOT NULL,     -- skill | scene_skill | kind | prompt | bucket | scene_tier | quran_tier | pos
  key       TEXT NOT NULL,
  label     TEXT NOT NULL,
  label_ar  TEXT,
  detail    TEXT,              -- a skill's tagline
  icon      TEXT,
  color     TEXT,
  min_value INTEGER,           -- quran_tier: the fewest Qurʾān occurrences for the tier
  extra_json TEXT,             -- skill: {source}
  sort      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (scope, key)
);

CREATE TABLE ar_practice_pool (
  id          TEXT PRIMARY KEY,       -- the segment's id
  band        TEXT NOT NULL,          -- basic | middle | advanced
  level       TEXT,                   -- the work's CEFR level
  audio_id    TEXT NOT NULL,
  work_id     TEXT,
  work_title  TEXT,
  object_key  TEXT NOT NULL,
  start_sec   REAL NOT NULL,
  end_sec     REAL NOT NULL,
  text_ar     TEXT NOT NULL,
  words_json  TEXT NOT NULL,          -- [[start,end], …] one per word of text_ar
  word_count  INTEGER NOT NULL,
  rnd         INTEGER NOT NULL        -- a random key, for cheap random draws
, text_en TEXT, gloss_json TEXT, blanks_json TEXT);

CREATE TABLE ar_read_pool (
  id TEXT PRIMARY KEY,            -- <unit id>#<n>
  band TEXT NOT NULL,             -- basic | middle | advanced (the work's level)
  work_id TEXT NOT NULL, work_title TEXT, unit_id TEXT NOT NULL,
  text_ar TEXT NOT NULL, word_count INTEGER NOT NULL
, object_key TEXT, start_sec REAL, end_sec REAL, words_json TEXT, blanks_json TEXT, grade INTEGER);

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

CREATE TABLE ar_room (
  id          TEXT PRIMARY KEY,
  title_en    TEXT NOT NULL,
  title_ar    TEXT NOT NULL,
  tagline     TEXT,
  color       TEXT NOT NULL,
  icon        TEXT NOT NULL,          -- an SF Symbol name
  layout      TEXT NOT NULL,          -- collections | shelf | centuries | daily
  sort_order  INTEGER NOT NULL,
  rules_json  TEXT NOT NULL DEFAULT '{}',   -- {"series":[…], "shapes":[…], "genres":[…], "fallback":true}
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_scene_feature_term (
  unit_id     TEXT NOT NULL,             
  scene_no    INTEGER NOT NULL,
  feature_idx INTEGER NOT NULL,          
  term_ar     TEXT NOT NULL,             
  term_id     TEXT NOT NULL,             
  match_kind  TEXT NOT NULL,             
  PRIMARY KEY (unit_id, scene_no, feature_idx, term_id)
);

CREATE TABLE ar_scene_lexeme (
  unit_id TEXT NOT NULL, scene_no INTEGER NOT NULL, line INTEGER NOT NULL,
  span_from INTEGER NOT NULL, span_to INTEGER NOT NULL, ref TEXT NOT NULL, kind TEXT NOT NULL,
  PRIMARY KEY (unit_id, scene_no, line, span_from, ref)
);

CREATE TABLE ar_scene_vocab (
  unit_id    TEXT NOT NULL,
  scene_no   INTEGER NOT NULL,
  vocab_json TEXT,          -- [{line, word, lemma, gloss, distractors:[3], note}]
  gist_json  TEXT,          -- {q, options:[4], answer}
  updated_at TEXT NOT NULL DEFAULT (datetime('now')), expressions_json TEXT, features_json TEXT,
  PRIMARY KEY (unit_id, scene_no)
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
  created_at   TEXT NOT NULL DEFAULT (datetime('now')), script_json TEXT,
  UNIQUE (acq_ref_id, seq)
);

CREATE VIRTUAL TABLE ar_text_unit_fts USING fts5(
  text_ar,
  title_ar,
  content='ar_text_unit',
  content_rowid='rowid',
  tokenize="unicode61 remove_diacritics 2"
);

CREATE TABLE ar_tts_clip (
  text_hash    TEXT PRIMARY KEY,
  text_ar      TEXT NOT NULL,          
  spoken_ar    TEXT,                   
  voice        TEXT NOT NULL DEFAULT 'silma',
  object_key   TEXT NOT NULL,          
  duration_sec REAL NOT NULL,
  words_json   TEXT NOT NULL,
  match_rate   REAL,                   
  source       TEXT,                   
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_tts_request (
  text_hash    TEXT PRIMARY KEY,
  text_ar      TEXT NOT NULL,
  source       TEXT,
  requested_at TEXT NOT NULL DEFAULT (datetime('now')),
  status       TEXT NOT NULL DEFAULT 'pending'   
);

CREATE TABLE ar_word_freq (
  bare TEXT PRIMARY KEY,
  n    INTEGER NOT NULL
);

CREATE TABLE kmaps_cache_version (
  family     TEXT PRIMARY KEY,
  version    TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE zz_script_stage (id TEXT PRIMARY KEY, audio_id TEXT NOT NULL, draft TEXT NOT NULL DEFAULT '', updated_at TEXT DEFAULT (datetime('now')));


-- ── Views (2) ────────────────────────────────────────────────────

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


-- ── Indexes (65) ─────────────────────────────────────────────────

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

CREATE INDEX idx_ar_daily_dialogue_theme    ON ar_daily_dialogue(theme_id, sort_order);

CREATE INDEX idx_ar_daily_dialogue_turn_dlg ON ar_daily_dialogue_turn(dialogue_id, sort_order);

CREATE INDEX idx_ar_daily_sentence_theme ON ar_daily_sentence(theme_id, sort_order);

CREATE INDEX idx_ar_daily_sentence_word  ON ar_daily_sentence(word_id);

CREATE INDEX idx_ar_daily_theme_day      ON ar_daily_theme(day_index, is_published);

CREATE INDEX idx_ar_daily_word_theme     ON ar_daily_word(theme_id, sort_order);

CREATE INDEX idx_ar_exercises_grammar ON ar_exercises(grammar_id);

CREATE INDEX idx_ar_exercises_lesson ON ar_exercises(lesson_id);

CREATE INDEX idx_ar_exercises_unit ON ar_exercises(unit_id);

CREATE INDEX idx_ar_gn_track ON ar_grammar_node(track_id);

CREATE INDEX idx_ar_grammar_sentence_bab ON ar_grammar_sentence(source_slug, bab_order);

CREATE INDEX idx_ar_grammar_sentence_lesson ON ar_grammar_sentence(lesson_id);

CREATE INDEX idx_ar_grammar_sentence_level ON ar_grammar_sentence(level, rnd);

CREATE INDEX idx_ar_grammar_sentence_page ON ar_grammar_sentence(source_slug, volume_no, page_no);

CREATE INDEX idx_ar_grammar_sentence_term ON ar_grammar_sentence(term_id, level);

CREATE INDEX idx_ar_grammar_type ON ar_grammar(grammar_type, level);

CREATE INDEX idx_ar_learner_unit_user ON ar_learner_unit(user_id, band);

CREATE INDEX idx_ar_les_level ON "ar_curriculum_lesson"(level);

CREATE INDEX idx_ar_les_type  ON "ar_curriculum_lesson"(lesson_type);

CREATE INDEX idx_ar_les_unit  ON "ar_curriculum_lesson"(unit_id);

CREATE INDEX idx_ar_lt_type ON "ar_curriculum_track"(track_type);

CREATE INDEX idx_ar_mp_skill ON "ar_learn_mastery"(skill);

CREATE INDEX idx_ar_mp_user  ON "ar_learn_mastery"(core_user_ref);

CREATE INDEX idx_ar_pp_band ON ar_practice_pool (band, rnd);

CREATE INDEX idx_ar_pp_band_en ON ar_practice_pool (band, (text_en IS NOT NULL), rnd);

CREATE INDEX idx_ar_practice_pool_band_wc ON ar_practice_pool(band, word_count, rnd);

CREATE INDEX idx_ar_read_pool_band ON ar_read_pool(band);

CREATE INDEX idx_ar_read_pool_grade ON ar_read_pool(grade, object_key);

CREATE INDEX idx_ar_sc_domain ON "ar_curriculum_scenario"(domain_id);

CREATE INDEX idx_ar_scene_feature_term ON ar_scene_feature_term(term_id);

CREATE INDEX idx_ar_scene_lexeme_ref ON ar_scene_lexeme(ref);

CREATE INDEX idx_ar_seg_audio ON ar_acq_audio_segment(audio_id, start_sec);

CREATE INDEX idx_ar_tc_task ON "ar_learn_task_completion"(task_id);

CREATE INDEX idx_ar_tc_user ON "ar_learn_task_completion"(core_user_ref);

CREATE INDEX idx_ar_text_page ON ar_text_unit(acq_ref_id, page_no);

CREATE INDEX idx_ar_text_work ON ar_text_unit(acq_ref_id, seq);

CREATE INDEX idx_ar_tts_request_status ON ar_tts_request(status);

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


-- ── Triggers (142) ───────────────────────────────────────────────

CREATE TRIGGER ar_text_unit_ad AFTER DELETE ON ar_text_unit BEGIN
  INSERT INTO ar_text_unit_fts(ar_text_unit_fts, rowid, text_ar, title_ar)
  VALUES ('delete', old.rowid, old.text_ar, old.title_ar);
END;

CREATE TRIGGER ar_text_unit_ai AFTER INSERT ON ar_text_unit BEGIN
  INSERT INTO ar_text_unit_fts(rowid, text_ar, title_ar)
  VALUES (new.rowid, new.text_ar, new.title_ar);
END;

CREATE TRIGGER ar_text_unit_au AFTER UPDATE ON ar_text_unit
WHEN old.text_ar IS NOT new.text_ar OR old.title_ar IS NOT new.title_ar
BEGIN
  INSERT INTO ar_text_unit_fts(ar_text_unit_fts, rowid, text_ar, title_ar)
  VALUES ('delete', old.rowid, old.text_ar, old.title_ar);
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

CREATE TRIGGER trg_kcv_ar_acq_audio_d AFTER DELETE ON ar_acq_audio BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_acq_audio_i AFTER INSERT ON ar_acq_audio BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_acq_audio_segment_d AFTER DELETE ON ar_acq_audio_segment BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_acq_audio_segment_i AFTER INSERT ON ar_acq_audio_segment BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_acq_audio_segment_u AFTER UPDATE ON ar_acq_audio_segment BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_acq_audio_u AFTER UPDATE ON ar_acq_audio BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_acq_capture_d AFTER DELETE ON ar_acq_capture BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_acq_capture_i AFTER INSERT ON ar_acq_capture BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_acq_capture_u AFTER UPDATE ON ar_acq_capture BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_acq_category_d AFTER DELETE ON ar_acq_category BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_acq_category_i AFTER INSERT ON ar_acq_category BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_acq_category_u AFTER UPDATE ON ar_acq_category BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_acq_entry_d AFTER DELETE ON ar_acq_entry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_acq_entry_i AFTER INSERT ON ar_acq_entry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_acq_entry_u AFTER UPDATE ON ar_acq_entry BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_acq_item_d AFTER DELETE ON ar_acq_item BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_acq_item_i AFTER INSERT ON ar_acq_item BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_acq_item_u AFTER UPDATE ON ar_acq_item BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_acq_type_d AFTER DELETE ON ar_acq_type BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_acq_type_i AFTER INSERT ON ar_acq_type BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_acq_type_u AFTER UPDATE ON ar_acq_type BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_acquisition_ref_d AFTER DELETE ON ar_acquisition_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_acquisition_ref_i AFTER INSERT ON ar_acquisition_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_acquisition_ref_u AFTER UPDATE ON ar_acquisition_ref BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_container_d AFTER DELETE ON ar_curriculum_container BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_container_i AFTER INSERT ON ar_curriculum_container BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_container_u AFTER UPDATE ON ar_curriculum_container BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_container_unit_d AFTER DELETE ON ar_curriculum_container_unit BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_container_unit_i AFTER INSERT ON ar_curriculum_container_unit BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_container_unit_task_d AFTER DELETE ON ar_curriculum_container_unit_task BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_container_unit_task_i AFTER INSERT ON ar_curriculum_container_unit_task BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_container_unit_task_u AFTER UPDATE ON ar_curriculum_container_unit_task BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_container_unit_u AFTER UPDATE ON ar_curriculum_container_unit BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_d AFTER DELETE ON ar_curriculum BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_domain_d AFTER DELETE ON ar_curriculum_domain BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_domain_i AFTER INSERT ON ar_curriculum_domain BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_domain_phrase_d AFTER DELETE ON ar_curriculum_domain_phrase BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_domain_phrase_i AFTER INSERT ON ar_curriculum_domain_phrase BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_domain_phrase_u AFTER UPDATE ON ar_curriculum_domain_phrase BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_domain_u AFTER UPDATE ON ar_curriculum_domain BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_i AFTER INSERT ON ar_curriculum BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_lesson_d AFTER DELETE ON ar_curriculum_lesson BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_lesson_i AFTER INSERT ON ar_curriculum_lesson BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_lesson_u AFTER UPDATE ON ar_curriculum_lesson BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_scenario_d AFTER DELETE ON ar_curriculum_scenario BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_scenario_i AFTER INSERT ON ar_curriculum_scenario BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_scenario_u AFTER UPDATE ON ar_curriculum_scenario BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_track_d AFTER DELETE ON ar_curriculum_track BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_track_i AFTER INSERT ON ar_curriculum_track BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_track_u AFTER UPDATE ON ar_curriculum_track BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_u AFTER UPDATE ON ar_curriculum BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_unit_concept_map_d AFTER DELETE ON ar_curriculum_unit_concept_map BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_unit_concept_map_i AFTER INSERT ON ar_curriculum_unit_concept_map BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_unit_concept_map_u AFTER UPDATE ON ar_curriculum_unit_concept_map BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_unit_d AFTER DELETE ON ar_curriculum_unit BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_unit_i AFTER INSERT ON ar_curriculum_unit BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_unit_lemma_map_d AFTER DELETE ON ar_curriculum_unit_lemma_map BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_unit_lemma_map_i AFTER INSERT ON ar_curriculum_unit_lemma_map BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_unit_lemma_map_u AFTER UPDATE ON ar_curriculum_unit_lemma_map BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_curriculum_unit_u AFTER UPDATE ON ar_curriculum_unit BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_daily_dialogue_d AFTER DELETE ON ar_daily_dialogue BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_daily_dialogue_i AFTER INSERT ON ar_daily_dialogue BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_daily_dialogue_turn_d AFTER DELETE ON ar_daily_dialogue_turn BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_daily_dialogue_turn_i AFTER INSERT ON ar_daily_dialogue_turn BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_daily_dialogue_turn_u AFTER UPDATE ON ar_daily_dialogue_turn BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_daily_dialogue_u AFTER UPDATE ON ar_daily_dialogue BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_daily_passage_d AFTER DELETE ON ar_daily_passage BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_daily_passage_i AFTER INSERT ON ar_daily_passage BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_daily_passage_u AFTER UPDATE ON ar_daily_passage BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_daily_sentence_d AFTER DELETE ON ar_daily_sentence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_daily_sentence_i AFTER INSERT ON ar_daily_sentence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_daily_sentence_u AFTER UPDATE ON ar_daily_sentence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_daily_theme_d AFTER DELETE ON ar_daily_theme BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_daily_theme_i AFTER INSERT ON ar_daily_theme BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_daily_theme_u AFTER UPDATE ON ar_daily_theme BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_daily_word_d AFTER DELETE ON ar_daily_word BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_daily_word_i AFTER INSERT ON ar_daily_word BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_daily_word_u AFTER UPDATE ON ar_daily_word BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_discipline_d AFTER DELETE ON ar_discipline BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_discipline_i AFTER INSERT ON ar_discipline BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_discipline_u AFTER UPDATE ON ar_discipline BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_exercises_d AFTER DELETE ON ar_exercises BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_exercises_i AFTER INSERT ON ar_exercises BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_exercises_u AFTER UPDATE ON ar_exercises BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_grammar_d AFTER DELETE ON ar_grammar BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_grammar_example_d AFTER DELETE ON ar_grammar_example BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_grammar_example_i AFTER INSERT ON ar_grammar_example BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_grammar_example_u AFTER UPDATE ON ar_grammar_example BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_grammar_i AFTER INSERT ON ar_grammar BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_grammar_node_d AFTER DELETE ON ar_grammar_node BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_grammar_node_i AFTER INSERT ON ar_grammar_node BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_grammar_node_u AFTER UPDATE ON ar_grammar_node BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_grammar_sentence_d AFTER DELETE ON ar_grammar_sentence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_grammar_sentence_i AFTER INSERT ON ar_grammar_sentence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_grammar_sentence_u AFTER UPDATE ON ar_grammar_sentence BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_grammar_u AFTER UPDATE ON ar_grammar BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_learning_source_d AFTER DELETE ON ar_learning_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_learning_source_i AFTER INSERT ON ar_learning_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_learning_source_u AFTER UPDATE ON ar_learning_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_lesson_d AFTER DELETE ON ar_lesson BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_lesson_i AFTER INSERT ON ar_lesson BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_lesson_media_d AFTER DELETE ON ar_lesson_media BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_lesson_media_i AFTER INSERT ON ar_lesson_media BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_lesson_media_u AFTER UPDATE ON ar_lesson_media BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_lesson_reading_d AFTER DELETE ON ar_lesson_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_lesson_reading_i AFTER INSERT ON ar_lesson_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_lesson_reading_u AFTER UPDATE ON ar_lesson_reading BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_lesson_term_d AFTER DELETE ON ar_lesson_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_lesson_term_i AFTER INSERT ON ar_lesson_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_lesson_term_u AFTER UPDATE ON ar_lesson_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_lesson_u AFTER UPDATE ON ar_lesson BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_lexeme_passage_i AFTER INSERT ON ar_lexeme_passage BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_d AFTER DELETE ON ar_ling_gram_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_i AFTER INSERT ON ar_ling_gram_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_ling_gram_term_u AFTER UPDATE ON ar_ling_gram_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_node_gram_term_d AFTER DELETE ON ar_node_gram_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_node_gram_term_i AFTER INSERT ON ar_node_gram_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_node_gram_term_u AFTER UPDATE ON ar_node_gram_term BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_node_source_d AFTER DELETE ON ar_node_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_node_source_i AFTER INSERT ON ar_node_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_node_source_u AFTER UPDATE ON ar_node_source BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_practice_label_d AFTER DELETE ON ar_practice_label BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_practice_label_i AFTER INSERT ON ar_practice_label BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_practice_label_u AFTER UPDATE ON ar_practice_label BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_room_d AFTER DELETE ON ar_room BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_room_i AFTER INSERT ON ar_room BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_room_u AFTER UPDATE ON ar_room BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_scene_lexeme_i AFTER INSERT ON ar_scene_lexeme BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_scene_vocab_i AFTER INSERT ON ar_scene_vocab BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_scene_vocab_u AFTER UPDATE ON ar_scene_vocab BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_teaching_variant_d AFTER DELETE ON ar_teaching_variant BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_teaching_variant_i AFTER INSERT ON ar_teaching_variant BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_teaching_variant_u AFTER UPDATE ON ar_teaching_variant BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_text_unit_d AFTER DELETE ON ar_text_unit BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_text_unit_i AFTER INSERT ON ar_text_unit BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

CREATE TRIGGER trg_kcv_ar_text_unit_u AFTER UPDATE ON ar_text_unit BEGIN UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content'; END;

-- 0039: the intake queue
CREATE TABLE ar_intake_item (
  id           TEXT PRIMARY KEY,                 -- IN:<platform>:<external id>
  parent_id    TEXT REFERENCES ar_intake_item(id),
  kind         TEXT NOT NULL,                    -- channel | playlist | video | short | audiobook | podcast | book | page
  url          TEXT NOT NULL UNIQUE,
  platform     TEXT NOT NULL DEFAULT 'youtube',
  external_id  TEXT,
  title_ar     TEXT,
  title_en     TEXT,
  channel      TEXT,
  seq          INTEGER,                          -- its place in its playlist
  duration_sec INTEGER,
  item_count   INTEGER,                          -- a playlist's or channel's episodes
  register     TEXT NOT NULL DEFAULT 'fusha_muasira'
               CHECK (register IN ('fusha_turath', 'fusha_muasira')),   -- Arabic only, classical or fuṣḥā: nothing else is taken
  genre_ref    TEXT,                             -- AG:qissa, AG:adab, AG:shiar … as ar_acquisition_ref
  strand       TEXT NOT NULL DEFAULT 'lugha',    -- ar_practice_label scope 'intake_strand'
  level        TEXT NOT NULL DEFAULT 'middle',   -- ar_practice_label scope 'intake_level'
  priority     INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status       TEXT NOT NULL DEFAULT 'logged',   -- ar_practice_label scope 'intake_status'
  acq_ref_id   TEXT REFERENCES ar_acquisition_ref(id),
  note         TEXT,
  added_by     TEXT,
  meta_json    TEXT NOT NULL DEFAULT '{}',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_ar_intake_parent ON ar_intake_item(parent_id, seq);
CREATE INDEX idx_ar_intake_queue  ON ar_intake_item(status, strand, level, priority DESC);

CREATE VIEW ar_intake_queue_v AS
SELECT i.*,
       st.min_value AS strand_step,
       lv.min_value AS level_step,
       s.min_value AS status_step,
       (SELECT COUNT(1) FROM ar_intake_item c WHERE c.parent_id = i.id) AS child_count
  FROM ar_intake_item i
  JOIN ar_practice_label st ON st.scope = 'intake_strand' AND st.key = i.strand
  JOIN ar_practice_label lv ON lv.scope = 'intake_level'  AND lv.key = i.level
  JOIN ar_practice_label s  ON s.scope = 'intake_status' AND s.key = i.status
 WHERE i.parent_id IS NULL
   AND json_extract(s.extra_json, '$.active') = 1
 ORDER BY lv.min_value, i.priority DESC, s.min_value DESC, i.created_at;

CREATE TABLE ar_intake_pipeline (
  intake_id   TEXT PRIMARY KEY REFERENCES ar_intake_item(id),
  stage       TEXT NOT NULL DEFAULT 'queued',
  target_ref  TEXT,
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
