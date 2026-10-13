-- qr_119_intake_pipeline.sql
--
-- The Qurʾān pipeline for sources routed here from the intake (km_arabic ar_intake_item, to_qr):
-- tafsīr read aloud and Qurʾānic-sciences series. One row per routed item, keyed by its typed ref
-- 'AR:<intake id>'; url/title/kind are a snapshot so the scraper needs nothing from AR. It ends where
-- tafsīr audio already lives: qr_tafsir_audio cut to the book's read pages, with word timing.
-- Stage words are rows (qr_intake_stage), never named in an app.

CREATE TABLE IF NOT EXISTS qr_intake_pipeline (
  intake_ref  TEXT PRIMARY KEY,                -- AR:IN:yt:<id>
  url         TEXT NOT NULL,
  title       TEXT,
  kind        TEXT,
  item_count  INTEGER,
  stage       TEXT NOT NULL DEFAULT 'queued',  -- qr_intake_stage.key
  target_ref  TEXT,                            -- the book it reads: QRTB:<source_slug>
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_qr_intake_pipeline_stage ON qr_intake_pipeline(stage);

CREATE TABLE IF NOT EXISTS qr_intake_stage (
  key TEXT PRIMARY KEY, label TEXT NOT NULL, label_ar TEXT, detail TEXT, icon TEXT, color TEXT, sort INTEGER NOT NULL
);
INSERT OR REPLACE INTO qr_intake_stage (key, label, label_ar, detail, icon, color, sort) VALUES
 ('queued',  'Queued',  'فِي الطَّابُور', 'Waiting its turn',                                                   'list.number',       '#5DA9E9', 1),
 ('fetched', 'Fetched', 'مَجْلُوب',     'Audio and the automatic transcript are in',                           'arrow.down.circle', '#F2A65A', 2),
 ('matched', 'Matched', 'مُطَابَق',     'Tied to its tafsīr book, or to the āyāt it treats',                  'link',              '#B388EB', 3),
 ('paged',   'Paged',   'مُقَسَّمٌ صَفَحَات', 'Cut to the book''s read pages (qr_tafsir_read_page)',           'book.pages',        '#E07A5F', 4),
 ('aligned', 'Aligned', 'مُحَاذًى',     'Word timing against the page text (qr_tafsir_audio_segment)',        'text.alignleft',    '#81B29A', 5),
 ('live',    'Live',    'مُتَاح',       'In the tafsīr reader, heard as it is read',                          'checkmark.seal',    '#2A9D8F', 6);
