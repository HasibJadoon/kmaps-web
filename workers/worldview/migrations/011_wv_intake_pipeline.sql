-- 011_wv_intake_pipeline.sql
--
-- The Worldview pipeline for sources routed here from the intake (km_arabic ar_intake_item, to_wv):
-- classical works read aloud that hold a worldview. One row per routed item, keyed by its typed ref
-- 'AR:<intake id>'; url/title/kind are a snapshot so the pipeline needs nothing from AR. target_ref
-- is the work it reads (wv_sources.id). It ends in wv_source_units / wv_source_chunks and the six
-- lenses (kmaps-wv-lens-build). Stage words are rows (wv_intake_stage), never named in an app.

CREATE TABLE IF NOT EXISTS wv_intake_pipeline (
  intake_ref  TEXT PRIMARY KEY,                -- AR:IN:yt:<id>
  url         TEXT NOT NULL,
  title       TEXT,
  kind        TEXT,
  item_count  INTEGER,
  stage       TEXT NOT NULL DEFAULT 'queued',  -- wv_intake_stage.key
  target_ref  TEXT,                            -- wv_sources.id
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wv_intake_pipeline_stage ON wv_intake_pipeline(stage);

CREATE TABLE IF NOT EXISTS wv_intake_stage (
  key TEXT PRIMARY KEY, label TEXT NOT NULL, label_ar TEXT, detail TEXT, icon TEXT, color TEXT, sort INTEGER NOT NULL
);
INSERT OR REPLACE INTO wv_intake_stage (key, label, label_ar, detail, icon, color, sort) VALUES
 ('queued',      'Queued',      'فِي الطَّابُور', 'Waiting its turn',                                         'list.number',        '#5DA9E9', 1),
 ('fetched',     'Fetched',     'مَجْلُوب',     'Audio and the automatic transcript are in',                 'arrow.down.circle',  '#F2A65A', 2),
 ('transcribed', 'Transcribed', 'مُفَرَّغ',      'The reading as clean text, checked against the book',      'doc.text',           '#B388EB', 3),
 ('chunked',     'Chunked',     'مُجَزَّأ',      'Cut into the work''s units and chunks (wv_source_units)',  'square.split.2x2',   '#E07A5F', 4),
 ('lensed',      'Lensed',      'مَقْرُوءٌ بِالعَدَسَات', 'Its six lenses built: geography to philosophy',    'circle.hexagongrid', '#81B29A', 5),
 ('live',        'Live',        'مُتَاح',       'In the Atlas and the Library, read with its lenses',       'checkmark.seal',     '#2A9D8F', 6);
