-- km_content · 002 · the template registry
--
-- Reference data: the shape a K-Maps document is authored in (cm_template) and
-- the worked entries that show that shape filled in (cm_template_sample).
-- Holds nothing about anyone, so the gateway serves it on an unsigned GET.
--
-- Two JSON columns per row, and the distinction matters:
--   *_json      the authored document, verbatim — the contract
--   display_json  the same document already shaped for a screen (sections of
--                 typed blocks). Shaping lives here, never in a view.

CREATE TABLE IF NOT EXISTS cm_template_category (
  category_key  TEXT PRIMARY KEY,
  label_en      TEXT NOT NULL,
  label_ar      TEXT,
  glyph         TEXT NOT NULL DEFAULT '▤',
  blurb         TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cm_template (
  template_key  TEXT PRIMARY KEY,
  category_key  TEXT NOT NULL REFERENCES cm_template_category(category_key) ON DELETE CASCADE,
  title_en      TEXT NOT NULL,
  title_ar      TEXT,
  subtitle      TEXT,
  summary       TEXT,
  glyph         TEXT NOT NULL DEFAULT '▤',
  version       INTEGER NOT NULL DEFAULT 1,
  status        TEXT NOT NULL DEFAULT 'active',   -- active | draft | retired
  spec_json     TEXT NOT NULL,                    -- the template document, verbatim
  display_json  TEXT,                             -- shaped: { hero, sections[] }
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cm_template_sample (
  sample_id     TEXT PRIMARY KEY,
  template_key  TEXT NOT NULL REFERENCES cm_template(template_key) ON DELETE CASCADE,
  title_en      TEXT NOT NULL,
  title_ar      TEXT,
  subtitle      TEXT,
  source_slug   TEXT,                             -- which book this sample is drawn from
  payload_json  TEXT NOT NULL,                    -- the filled entry, verbatim
  display_json  TEXT,                             -- shaped: { hero, sections[] }
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cm_template_category
  ON cm_template(category_key, sort_order);
CREATE INDEX IF NOT EXISTS idx_cm_template_sample_template
  ON cm_template_sample(template_key, sort_order);
