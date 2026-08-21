-- Schema for km_arabic.
-- Generated from remote Cloudflare D1 sqlite_schema with data excluded, 2026-08-21.
-- Internal D1 bookkeeping tables and FTS5 shadow tables are omitted.
-- Regenerate with scripts/regen_schemas.py — do not hand-edit.

-- ── Tables (20) ──────────────────────────────────────────────────

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
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
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
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')), uid TEXT, al_discipline_uid TEXT,
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
  created_at      TEXT NOT NULL DEFAULT (datetime('now')), uid TEXT, al_group_ref TEXT, al_group_uid TEXT, source_db TEXT NOT NULL DEFAULT 'km_arabic_linguistic',
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
, uid TEXT);

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

CREATE TABLE ar_exercises ( id TEXT PRIMARY KEY, lesson_id TEXT, unit_id TEXT, exercise_type TEXT NOT NULL DEFAULT 'mcq', prompt_ar TEXT, prompt_en TEXT, options_json TEXT, answer_json TEXT, explanation_md TEXT, vocab_id TEXT, grammar_id TEXT, al_concept_ref TEXT, qr_scope_ref TEXT, level TEXT, skill_focus TEXT, difficulty INTEGER NOT NULL DEFAULT 3, meta_json TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (lesson_id) REFERENCES ar_curriculum_lesson(id), FOREIGN KEY (unit_id) REFERENCES ar_curriculum_container_unit(id), FOREIGN KEY (grammar_id) REFERENCES ar_grammar(id) );

CREATE TABLE ar_grammar ( id TEXT PRIMARY KEY, title TEXT NOT NULL, title_ar TEXT, al_nahw_ref TEXT, al_morph_ref TEXT, grammar_type TEXT NOT NULL DEFAULT 'nahw', level TEXT, explanation_md TEXT NOT NULL, examples_json TEXT, rule_summary TEXT, qr_scope_ref TEXT, meta_json TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')) );

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


-- ── Indexes (25) ─────────────────────────────────────────────────

CREATE INDEX idx_ar_con_track ON "ar_curriculum_container"(track_id);

CREATE INDEX idx_ar_con_type  ON "ar_curriculum_container"(container_type);

CREATE INDEX idx_ar_cu_container ON "ar_curriculum_container_unit"(container_id);

CREATE INDEX idx_ar_cu_parent    ON "ar_curriculum_container_unit"(parent_id);

CREATE INDEX idx_ar_cu_type      ON "ar_curriculum_container_unit"(unit_type);

CREATE INDEX idx_ar_cun_curr ON "ar_curriculum_unit"(curriculum_id);

CREATE INDEX idx_ar_cut_unit ON "ar_curriculum_container_unit_task"(unit_id);

CREATE INDEX idx_ar_exercises_grammar ON ar_exercises(grammar_id);

CREATE INDEX idx_ar_exercises_lesson ON ar_exercises(lesson_id);

CREATE INDEX idx_ar_exercises_unit ON ar_exercises(unit_id);

CREATE INDEX idx_ar_grammar_type ON ar_grammar(grammar_type, level);

CREATE INDEX idx_ar_les_level ON "ar_curriculum_lesson"(level);

CREATE INDEX idx_ar_les_type  ON "ar_curriculum_lesson"(lesson_type);

CREATE INDEX idx_ar_les_unit  ON "ar_curriculum_lesson"(unit_id);

CREATE INDEX idx_ar_lt_type ON "ar_curriculum_track"(track_type);

CREATE INDEX idx_ar_mp_skill ON "ar_learn_mastery"(skill);

CREATE INDEX idx_ar_mp_user  ON "ar_learn_mastery"(core_user_ref);

CREATE INDEX idx_ar_sc_domain ON "ar_curriculum_scenario"(domain_id);

CREATE INDEX idx_ar_tc_task ON "ar_learn_task_completion"(task_id);

CREATE INDEX idx_ar_tc_user ON "ar_learn_task_completion"(core_user_ref);

CREATE INDEX idx_ar_up_status ON "ar_learn_unit_progress"(status);

CREATE INDEX idx_ar_up_unit   ON "ar_learn_unit_progress"(unit_id);

CREATE INDEX idx_ar_up_user   ON "ar_learn_unit_progress"(core_user_ref);

CREATE INDEX idx_ar_utp_track ON "ar_learn_track_profile"(track_id);

CREATE INDEX idx_ar_utp_user  ON "ar_learn_track_profile"(core_user_ref);
