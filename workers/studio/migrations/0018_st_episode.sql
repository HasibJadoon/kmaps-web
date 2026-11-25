-- One Studio, the library: series → arcs → episodes, one episode = one sprint (owner 2026-11-26: "all now on based on
-- episode not on passage"). An episode's stage is never stored: the worker derives it from st_stage.done_rule_json over
-- the episode's own rows (checks, scenes/slides refs, takes, publications). Content (study docs, scenes, decks, people)
-- lives in km_content and is linked by typed refs. Each channel and series has a parallel iCloud folder whose
-- structure is a row too (st_folder_layout), so D1 and iCloud mirror each other. Written only by studio.py.

CREATE TABLE IF NOT EXISTS st_series (
  id              TEXT PRIMARY KEY,              -- SER:dz-qr · SER:dz-wv · SER:bh-ita · SER:bh-qu · SER:bh-films
  show_ref        TEXT NOT NULL REFERENCES st_show(id),
  domain_key      TEXT NOT NULL REFERENCES st_domain(key),
  label_key       TEXT NOT NULL,
  subtitle_key    TEXT,
  workflow_ref    TEXT NOT NULL REFERENCES st_workflow(id),
  boundary_kind   TEXT NOT NULL DEFAULT 'quran_range',   -- quran_range | wv_text
  manager_ref     TEXT,                          -- CM:PN:… (Ali manages Do Zāwiya WV)
  cover_ref       TEXT,
  seq             INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'active' -- active | archived
);

CREATE TABLE IF NOT EXISTS st_arc (              -- a run of episodes inside a series: Ghāfir, then the next sūra
  series_ref  TEXT NOT NULL REFERENCES st_series(id),
  key         TEXT NOT NULL,
  label_key   TEXT NOT NULL,
  seq         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (series_ref, key)
);

CREATE TABLE IF NOT EXISTS st_episode (
  id            TEXT PRIMARY KEY,                -- EP:dz-qr:002
  series_ref    TEXT NOT NULL REFERENCES st_series(id),
  arc_key       TEXT,
  no            INTEGER NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'long',    -- long | short
  parent_ref    TEXT,                            -- a Short points at its long episode
  title_en      TEXT NOT NULL,
  title_ar      TEXT,
  boundary_ref  TEXT,                            -- QR:40:1-5 · WV:…
  scenes_ref    TEXT,                            -- CM:DOC episode doc (scene blocks)
  slides_ref    TEXT,                            -- CM:DOC deck
  folder_path   TEXT,                            -- the episode's iCloud folder, relative to the layout root
  status        TEXT NOT NULL DEFAULT 'active',  -- active | archived (never deleted)
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_st_episode_series ON st_episode(series_ref, no);

CREATE TABLE IF NOT EXISTS st_episode_person (   -- solo = one row; hosts are tags, not levels
  episode_ref  TEXT NOT NULL REFERENCES st_episode(id),
  person_ref   TEXT NOT NULL,                    -- CM:PN:…
  role_key     TEXT NOT NULL,                    -- host | guest | manager
  seq          INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (episode_ref, person_ref, role_key)
);

CREATE TABLE IF NOT EXISTS st_episode_resource ( -- everything that belongs to the episode, grouped
  episode_ref     TEXT NOT NULL REFERENCES st_episode(id),
  group_key       TEXT NOT NULL,                 -- study | tafsir | lexicon | grammar | slides | films | prior
  seq             INTEGER NOT NULL DEFAULT 0,
  ref             TEXT,                          -- CM:DOC / deck slug / episode id
  url             TEXT,                          -- the link the app opens (com.kmaps.app://…, https://youtu.be/…)
  label_override  TEXT,
  local_path      TEXT,                          -- an iCloud file, for the Mac
  size_bytes      INTEGER,
  sha256          TEXT,
  PRIMARY KEY (episode_ref, group_key, seq)
);

CREATE TABLE IF NOT EXISTS st_episode_check (    -- results Claude reports; the apps show them, never tick them
  episode_ref   TEXT NOT NULL REFERENCES st_episode(id),
  check_key     TEXT NOT NULL,
  result        TEXT NOT NULL,                   -- pass | fail | na
  note          TEXT,
  evidence_ref  TEXT,
  reported_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (episode_ref, check_key)
);

CREATE TABLE IF NOT EXISTS st_id_alias (         -- old ids keep working (EP:ghafir:P02 → EP:dz-qr:002, CM:COL:series:…)
  old_id  TEXT PRIMARY KEY,
  new_id  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS st_folder_layout (    -- each channel's and series' iCloud folder, as data
  id                TEXT PRIMARY KEY,
  scope             TEXT NOT NULL,               -- channel | series | local
  owner_ref         TEXT NOT NULL,               -- SHOW:… | SER:…
  root_path         TEXT NOT NULL,               -- e.g. ~/Library/Mobile Documents/com~apple~CloudDocs/km-studio/K-Maps Videos/…
  episode_pattern   TEXT,                        -- EP{nn} {range} · {title}
  subfolders_json   TEXT NOT NULL DEFAULT '[]',  -- ["00_ADMIN","01_SCRIPT","02_FOOTAGE","03_REVIEW","04_EDIT","05_DELIVERY"]
  asset_rules_json  TEXT NOT NULL DEFAULT '{}'   -- which files mean script / footage / cut / delivery / youtube id / thumb
);
