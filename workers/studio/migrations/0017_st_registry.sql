-- One Studio, the registry (owner 2026-11-26: "one Studio, data driven, full generic — all labels and everything from db
-- tables"; "UI/UX and workflow everything data driven"). Everything the apps show that is not an episode's own content
-- is a row here: words, colours, fonts, icons, domains, shows, the sprint workflow and its stages, the checklist
-- definitions, and every screen's sections in order. The apps render a closed set of section kinds and nothing else.
-- Written only by kmaps-resources scripts/studio/studio.py (registry sync, from docs/studio/registry/*.yaml).

CREATE TABLE IF NOT EXISTS st_label (            -- every word of UI copy
  key     TEXT NOT NULL,                         -- nav.now · stage.filmed · section.study · empty.silent_on_ayah …
  locale  TEXT NOT NULL DEFAULT 'en',
  text    TEXT NOT NULL,
  PRIMARY KEY (key, locale)
);

CREATE TABLE IF NOT EXISTS st_token (            -- the look: colours, fonts, sizes, icons
  key    TEXT PRIMARY KEY,                       -- accent · bg.night · font.body · font.ar · size.ar.min · icon.stage.filmed
  kind   TEXT NOT NULL,                          -- colour | font | size | icon | motion
  value  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS st_domain (           -- Worldview, Qurʾān (replaces st_streams)
  key           TEXT PRIMARY KEY,                -- WV · QR
  label_key     TEXT NOT NULL,
  accent_token  TEXT,
  motif         TEXT,
  seq           INTEGER NOT NULL DEFAULT 0,
  active        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS st_show (             -- the channels: Do Zāwiya, Burhan
  id         TEXT PRIMARY KEY,                   -- SHOW:dozawiya · SHOW:burhan
  label_key  TEXT NOT NULL,
  art_ref    TEXT,                               -- logo / channel art (R2 url or CM ref)
  seq        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS st_workflow (         -- a sprint's flow; one today (WF:sprint:v1), more later as data
  id         TEXT PRIMARY KEY,
  label_key  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS st_stage (            -- planned → research → scenes → ready → filmed → published
  workflow_ref    TEXT NOT NULL REFERENCES st_workflow(id),
  key             TEXT NOT NULL,
  seq             INTEGER NOT NULL,
  label_key       TEXT NOT NULL,
  icon_token      TEXT,
  tone_token      TEXT,
  done_rule_json  TEXT NOT NULL DEFAULT '{}',    -- when this stage counts as done (rules.ts); the stage is never stored
  shows_json      TEXT NOT NULL DEFAULT '[]',    -- the episode page sections this stage lights up
  PRIMARY KEY (workflow_ref, key)
);

CREATE TABLE IF NOT EXISTS st_check (            -- what is checked before a stage is done (results: st_episode_check)
  workflow_ref  TEXT NOT NULL REFERENCES st_workflow(id),
  stage_key     TEXT NOT NULL,
  key           TEXT NOT NULL,                   -- ready.slides_run · ready.room_test …
  seq           INTEGER NOT NULL DEFAULT 0,
  label_key     TEXT NOT NULL,
  PRIMARY KEY (workflow_ref, key)
);

CREATE TABLE IF NOT EXISTS st_view (             -- a screen: VIEW:nav · now · pipeline · series · episode · study · run · publish
  id         TEXT PRIMARY KEY,
  label_key  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS st_view_section (     -- a screen's sections, in order
  view_ref        TEXT NOT NULL REFERENCES st_view(id),
  key             TEXT NOT NULL,
  seq             INTEGER NOT NULL,
  kind            TEXT NOT NULL,                 -- the closed set the apps render (header, stage_strip, episode_list, …)
  label_key       TEXT,
  bind            TEXT,                          -- the view-model field it shows
  when_rule_json  TEXT NOT NULL DEFAULT '{}',    -- shown only when the rule holds
  platforms       TEXT NOT NULL DEFAULT 'all',   -- all | ios | ipad | mac, comma-separated
  layout          TEXT,                          -- list | grid | columns | presenter
  PRIMARY KEY (view_ref, key)
);

CREATE TABLE IF NOT EXISTS st_meta (             -- registry_version: bumped on every apply, the apps' cache key
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);
