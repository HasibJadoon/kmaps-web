-- Story films as production projects (owner, 2026-11-03: "all images can go to R2, we can download locally, so all scenes and
-- the project keep working once fully completed, and we can use them for new ones"; "flag any with issues").
-- One row per story, one per shot (a spoken line and the picture/clip made for it). The script, the exact picture prompt and
-- seed, who is drawn, the review's status and issues are data here; the bytes (pictures, later clips) live in R2
-- km-studio-overlay keyed story/<sha256>, the same content-addressed way as the overlay renderer. Written by
-- kmaps-resources scripts/series/publish_story_project.py; the app reads it and adds flags.
CREATE TABLE IF NOT EXISTS st_story (
  id          TEXT PRIMARY KEY,                -- the story id in kmaps-resources data (park-by-the-lake)
  code        TEXT,                            -- the project code its files are named by (PARK → PARK_SC01_SH03)
  title_en    TEXT NOT NULL,
  title_ar    TEXT,
  synopsis    TEXT,
  style       TEXT,                            -- the picture style line every prompt starts with
  notes_json  TEXT NOT NULL DEFAULT '{}',      -- {"script": [...], "voice": [...], "animation": [...]} review notes
  reviewed_at TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS st_story_shot (
  story_id     TEXT NOT NULL REFERENCES st_story(id),
  stem         TEXT NOT NULL,                  -- p<page> or p<page>l<line>: the picture's name
  page_no      INTEGER NOT NULL,
  line_no      INTEGER NOT NULL,
  scene_en     TEXT,
  speaker      TEXT NOT NULL,
  text_ar      TEXT NOT NULL,
  text_en      TEXT NOT NULL,
  prompt       TEXT,                           -- exactly what the picture was drawn from
  seed         INTEGER,
  people_json  TEXT NOT NULL DEFAULT '[]',     -- the cast ids drawn
  image_sha    TEXT,                           -- R2 story/<sha256> (png)
  clip_sha     TEXT,                           -- R2 story/<sha256> (mp4), once animated
  status       TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'redrawing', 'fix')),
  issues_json  TEXT NOT NULL DEFAULT '[]',     -- [{"text": "...", "by": "review" | <user ref>, "at": "..."}]
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (story_id, stem)
);

CREATE INDEX IF NOT EXISTS idx_st_story_shot_order ON st_story_shot (story_id, page_no, line_no);
