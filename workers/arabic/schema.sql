-- Schema for km_arabic.
-- Generated from remote Cloudflare D1 sqlite_schema with data excluded, 2026-07-25.
-- Internal D1 bookkeeping tables and FTS5 shadow tables are omitted.
-- Regenerate with scripts/regen_schemas.py — do not hand-edit.

-- ── Tables (26) ────────────────────────────────────────────────────

CREATE TABLE "ar_class" (
  id              TEXT PRIMARY KEY,
  slug            TEXT UNIQUE,
  title           TEXT NOT NULL,
  description_md  TEXT,
  class_type      TEXT NOT NULL DEFAULT 'course',
    
  container_id    TEXT,                           
  curriculum_id   TEXT,                           
  teacher_ref     TEXT NOT NULL,                  
  core_ws_ref     TEXT NOT NULL,                  
  status          TEXT NOT NULL DEFAULT 'draft',
    
  start_date      TEXT,
  end_date        TEXT,
  max_enrolments  INTEGER,
  visibility      TEXT NOT NULL DEFAULT 'workspace',
    
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (container_id)  REFERENCES "ar_curriculum_container"(id),
  FOREIGN KEY (curriculum_id) REFERENCES "ar_curriculum"(id)
);

CREATE TABLE "ar_class_assignment" (
  id              TEXT PRIMARY KEY,
  class_id        TEXT NOT NULL,
  title           TEXT NOT NULL,
  instructions_md TEXT,
  resource_refs   TEXT,                           
  due_date        TEXT,
  weight          REAL NOT NULL DEFAULT 1.0,
  status          TEXT NOT NULL DEFAULT 'open',   
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (class_id) REFERENCES "ar_class"(id)
);

CREATE TABLE "ar_class_assignment_submission" (
  id              TEXT PRIMARY KEY,
  assignment_id   TEXT NOT NULL,
  student_ref     TEXT NOT NULL,                  
  submission_type TEXT NOT NULL DEFAULT 'text',
    
  content_md      TEXT,
  cm_doc_ref      TEXT,                           
  score           REAL,
  feedback_md     TEXT,
  graded_by_ref   TEXT,
  status          TEXT NOT NULL DEFAULT 'submitted',
    
  submitted_at    TEXT NOT NULL DEFAULT (datetime('now')),
  graded_at       TEXT,
  FOREIGN KEY (assignment_id) REFERENCES "ar_class_assignment"(id),
  UNIQUE (assignment_id, student_ref)
);

CREATE TABLE "ar_class_enrolment" (
  id              TEXT PRIMARY KEY,
  class_id        TEXT NOT NULL,
  student_ref     TEXT NOT NULL,                  
  role            TEXT NOT NULL DEFAULT 'student',
    
  status          TEXT NOT NULL DEFAULT 'active',
    
  enrolled_at     TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at    TEXT,
  meta_json       TEXT,
  FOREIGN KEY (class_id) REFERENCES "ar_class"(id),
  UNIQUE (class_id, student_ref)
);

CREATE TABLE "ar_class_resource" (
  id              TEXT PRIMARY KEY,
  class_id        TEXT NOT NULL,
  resource_ref    TEXT NOT NULL,                  
  resource_type   TEXT NOT NULL,
    
  resource_label  TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_required     INTEGER NOT NULL DEFAULT 1,
  added_by_ref    TEXT,                           
  added_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (class_id) REFERENCES "ar_class"(id),
  UNIQUE (class_id, resource_ref)
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
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
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
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
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
);

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
  sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (unit_id) REFERENCES "ar_curriculum_container_unit"(id), UNIQUE (unit_id, al_term_ref));

CREATE TABLE "ar_curriculum_unit_lemma_map" (
  id TEXT PRIMARY KEY, unit_id TEXT NOT NULL, al_lemma_ref TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0, is_key_word INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (unit_id) REFERENCES "ar_curriculum_container_unit"(id), UNIQUE (unit_id, al_lemma_ref));

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

CREATE TABLE "ar_learn_srs_card" (
  id              TEXT PRIMARY KEY,               
  deck_id         TEXT NOT NULL,
  core_user_ref   TEXT NOT NULL,
  resource_ref    TEXT NOT NULL,                  
  resource_type   TEXT NOT NULL,
    
  
  stability       REAL NOT NULL DEFAULT 1.0,      
  difficulty      REAL NOT NULL DEFAULT 0.3,      
  elapsed_days    INTEGER NOT NULL DEFAULT 0,
  scheduled_days  INTEGER NOT NULL DEFAULT 1,
  reps            INTEGER NOT NULL DEFAULT 0,
  lapses          INTEGER NOT NULL DEFAULT 0,
  card_state      TEXT NOT NULL DEFAULT 'new',
    
  last_review_at  TEXT,
  next_review_at  TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')), card_template TEXT NOT NULL DEFAULT 'freeform', front_text TEXT NOT NULL DEFAULT '', back_text TEXT NOT NULL DEFAULT '', extra_json TEXT, tags TEXT, suspended INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (deck_id) REFERENCES "ar_learn_srs_deck"(id),
  UNIQUE (deck_id, resource_ref)
);

CREATE TABLE "ar_learn_srs_deck" (
  id              TEXT PRIMARY KEY,
  core_user_ref   TEXT NOT NULL,
  core_ws_ref     TEXT,
  title           TEXT NOT NULL,
  deck_type       TEXT NOT NULL DEFAULT 'vocabulary',
    
  description     TEXT,
  card_count      INTEGER NOT NULL DEFAULT 0,
  is_shared       INTEGER NOT NULL DEFAULT 0,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "ar_learn_srs_review" (
  id              TEXT PRIMARY KEY,
  card_id         TEXT NOT NULL,
  core_user_ref   TEXT NOT NULL,
  rating          INTEGER NOT NULL,               
  
  stability_after REAL,
  difficulty_after REAL,
  scheduled_days_after INTEGER,
  state_after     TEXT,
  review_duration_secs INTEGER,
  reviewed_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (card_id) REFERENCES "ar_learn_srs_card"(id)
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

-- ── Indexes (43) ───────────────────────────────────────────────────

CREATE INDEX idx_ar_asub_assign  ON "ar_class_assignment_submission"(assignment_id);

CREATE INDEX idx_ar_asub_student ON "ar_class_assignment_submission"(student_ref);

CREATE INDEX idx_ar_ca_class  ON "ar_class_assignment"(class_id);

CREATE INDEX idx_ar_ca_due    ON "ar_class_assignment"(due_date);

CREATE INDEX idx_ar_ca_status ON "ar_class_assignment"(status);

CREATE INDEX idx_ar_ce_class   ON "ar_class_enrolment"(class_id);

CREATE INDEX idx_ar_ce_status  ON "ar_class_enrolment"(status);

CREATE INDEX idx_ar_ce_student ON "ar_class_enrolment"(student_ref);

CREATE INDEX idx_ar_cl_status  ON "ar_class"(status);

CREATE INDEX idx_ar_cl_teacher ON "ar_class"(teacher_ref);

CREATE INDEX idx_ar_cl_ws      ON "ar_class"(core_ws_ref);

CREATE INDEX idx_ar_con_track ON "ar_curriculum_container"(track_id);

CREATE INDEX idx_ar_con_type  ON "ar_curriculum_container"(container_type);

CREATE INDEX idx_ar_cr_class    ON "ar_class_resource"(class_id);

CREATE INDEX idx_ar_cr_resource ON "ar_class_resource"(resource_ref);

CREATE INDEX idx_ar_cu_container ON "ar_curriculum_container_unit"(container_id);

CREATE INDEX idx_ar_cu_parent    ON "ar_curriculum_container_unit"(parent_id);

CREATE INDEX idx_ar_cu_type      ON "ar_curriculum_container_unit"(unit_type);

CREATE INDEX idx_ar_cun_curr ON "ar_curriculum_unit"(curriculum_id);

CREATE INDEX idx_ar_cut_unit ON "ar_curriculum_container_unit_task"(unit_id);

CREATE INDEX idx_ar_les_level ON "ar_curriculum_lesson"(level);

CREATE INDEX idx_ar_les_type  ON "ar_curriculum_lesson"(lesson_type);

CREATE INDEX idx_ar_les_unit  ON "ar_curriculum_lesson"(unit_id);

CREATE INDEX idx_ar_lt_type ON "ar_curriculum_track"(track_type);

CREATE INDEX idx_ar_mp_skill ON "ar_learn_mastery"(skill);

CREATE INDEX idx_ar_mp_user  ON "ar_learn_mastery"(core_user_ref);

CREATE INDEX idx_ar_sc_deck   ON "ar_learn_srs_card"(deck_id);

CREATE INDEX idx_ar_sc_domain ON "ar_curriculum_scenario"(domain_id);

CREATE INDEX idx_ar_sc_due ON "ar_learn_srs_card"(core_user_ref, suspended, next_review_at);

CREATE INDEX idx_ar_sc_next   ON "ar_learn_srs_card"(next_review_at);

CREATE INDEX idx_ar_sc_state  ON "ar_learn_srs_card"(card_state);

CREATE INDEX idx_ar_sc_user   ON "ar_learn_srs_card"(core_user_ref);

CREATE INDEX idx_ar_sd_user ON "ar_learn_srs_deck"(core_user_ref);

CREATE INDEX idx_ar_sr_at   ON "ar_learn_srs_review"(reviewed_at);

CREATE INDEX idx_ar_sr_card ON "ar_learn_srs_review"(card_id);

CREATE INDEX idx_ar_sr_user ON "ar_learn_srs_review"(core_user_ref);

CREATE INDEX idx_ar_tc_task ON "ar_learn_task_completion"(task_id);

CREATE INDEX idx_ar_tc_user ON "ar_learn_task_completion"(core_user_ref);

CREATE INDEX idx_ar_up_status ON "ar_learn_unit_progress"(status);

CREATE INDEX idx_ar_up_unit   ON "ar_learn_unit_progress"(unit_id);

CREATE INDEX idx_ar_up_user   ON "ar_learn_unit_progress"(core_user_ref);

CREATE INDEX idx_ar_utp_track ON "ar_learn_track_profile"(track_id);

CREATE INDEX idx_ar_utp_user  ON "ar_learn_track_profile"(core_user_ref);
