-- 0042_ar_intake_domains.sql
--
-- Three domains, three pipelines. The intake stays the one inbox where things are logged and
-- triaged (status: logged → queued, or parked / rejected). A queued item is ROUTED to one or more
-- domains — Arabic (AR), Qurʾān (QR), Worldview (WV) — and each domain runs its own pipeline in its
-- own database, with its own stages:
--   AR  ar_intake_pipeline  (here)          → ends in ar_acquisition_ref / ar_acq_audio / scenes
--   QR  qr_intake_pipeline  (km_quran)      → ends in qr_tafsir_audio, cut to the book's pages
--   WV  wv_intake_pipeline  (km_worldview)  → ends in wv_sources + units, its lenses built
-- The route is the inbox's decision (to_ar / to_qr / to_wv); the stage is the domain's. The old
-- single `route` column (ar | wv | both) is superseded and no longer read.

ALTER TABLE ar_intake_item ADD COLUMN to_ar INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ar_intake_item ADD COLUMN to_qr INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ar_intake_item ADD COLUMN to_wv INTEGER NOT NULL DEFAULT 0;

UPDATE ar_intake_item SET to_ar = (route IN ('ar', 'both')), to_wv = (route IN ('wv', 'both'));
-- Qurʾānic commentary and Qurʾānic-sciences series go to the Qurʾān pipeline, not Arabic learning
UPDATE ar_intake_item SET to_qr = 1, to_ar = 0
 WHERE title_ar LIKE '%تفسير%' OR title_ar LIKE '%التحرير والتنوير%' OR title_ar LIKE '%جامع البيان%'
    OR title_ar LIKE '%الجلالين%' OR title_ar LIKE '%لمسات بيانية%' OR title_ar LIKE '%إعراب القرآن%'
    OR title_ar LIKE '%مشكل القرآن%' OR title_ar LIKE '%الشاطبية%';
-- what a playlist or channel holds goes where it goes
UPDATE ar_intake_item SET
  to_ar = (SELECT p.to_ar FROM ar_intake_item p WHERE p.id = ar_intake_item.parent_id),
  to_qr = (SELECT p.to_qr FROM ar_intake_item p WHERE p.id = ar_intake_item.parent_id),
  to_wv = (SELECT p.to_wv FROM ar_intake_item p WHERE p.id = ar_intake_item.parent_id)
 WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ar_intake_domains ON ar_intake_item(to_ar, to_qr, to_wv, status);

-- The Arabic pipeline: one row per top-level item routed to AR and queued.
CREATE TABLE IF NOT EXISTS ar_intake_pipeline (
  intake_id   TEXT PRIMARY KEY REFERENCES ar_intake_item(id),
  stage       TEXT NOT NULL DEFAULT 'queued',   -- ar_practice_label scope 'pipeline_ar'
  target_ref  TEXT,                             -- the work it became: ar_acquisition_ref.id
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ar_intake_pipeline_stage ON ar_intake_pipeline(stage);
INSERT OR IGNORE INTO ar_intake_pipeline (intake_id, stage, target_ref)
SELECT id, 'queued', acq_ref_id FROM ar_intake_item WHERE parent_id IS NULL AND to_ar = 1 AND status = 'queued';

-- The inbox's own states are triage only; the stages belong to each domain's pipeline now.
DELETE FROM ar_practice_label WHERE scope = 'intake_status' AND key IN ('scraping', 'captured', 'cleaning', 'aligned', 'live');
UPDATE ar_practice_label SET detail = 'Checked and routed: each domain it goes to has it in its pipeline'
 WHERE scope = 'intake_status' AND key = 'queued';
DELETE FROM ar_practice_label WHERE scope = 'intake_route';
DELETE FROM ar_practice_label WHERE scope = 'intake' AND key = 'route';

INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('intake_domain', 'ar', 'Arabic',    'العَرَبِيَّة',          'Language learning: episodes become units on the path',            'character.book.closed.ar', '#5DA9E9', 1, NULL, 1),
 ('intake_domain', 'qr', 'Qurʾān',    'القُرْآن',            'Tafsīr and Qurʾānic sciences: tied to the book and the āyāt',      'book.closed',              '#2A9D8F', 2, NULL, 2),
 ('intake_domain', 'wv', 'Worldview', 'الرُّؤْيَةُ الكَوْنِيَّة',  'Works that hold a worldview: filed as sources, lenses built',      'globe.europe.africa',      '#B388EB', 3, NULL, 3),
 ('pipeline_ar', 'queued',  'Queued',  'فِي الطَّابُور', 'Waiting its turn',                                          'list.number',        '#5DA9E9', 1, NULL, 1),
 ('pipeline_ar', 'fetched', 'Fetched', 'مَجْلُوب',     'Audio and the automatic transcript are in (ar_acq_audio)',   'arrow.down.circle',  '#F2A65A', 2, NULL, 2),
 ('pipeline_ar', 'cleaned', 'Cleaned', 'مُنَقَّح',      'Transcript corrected and voweled',                           'pencil.and.outline', '#B388EB', 3, NULL, 3),
 ('pipeline_ar', 'aligned', 'Aligned', 'مُحَاذًى',     'Text and audio line up, line by line',                       'text.alignleft',     '#81B29A', 4, NULL, 4),
 ('pipeline_ar', 'scened',  'Scened',  'مُقَسَّم',      'Split into scenes with their words (ar_text_unit)',          'film.stack',         '#E07A5F', 5, NULL, 5),
 ('pipeline_ar', 'live',    'Live',    'مُتَاح',       'On the path: preview, watch, drill, check',                  'checkmark.seal',     '#2A9D8F', 6, NULL, 6),
 ('intake', 'domains',  'Goes to',  'الوِجْهَة',   'Which domains take it on', NULL, NULL, NULL, NULL, 21),
 ('intake', 'pipelines','Pipelines','المَسَارَات', 'Each domain''s pipeline, stage by stage', 'square.stack.3d.up', NULL, NULL, NULL, 23),
 ('intake', 'stage',    'Stage',    'المَرْحَلَة',  NULL, NULL, NULL, NULL, NULL, 24),
 ('intake', 'strand_count', '{total} · {queued} queued · {logged} new', '{total} · {queued} فِي الطَّابُور · {logged} جَدِيد', NULL, NULL, NULL, NULL, NULL, 19),
 ('intake', 'unroute_busy', 'Already under way', 'جَارٍ العَمَلُ عَلَيْه', 'This domain has started on it; set its stage back to Queued first', NULL, NULL, NULL, NULL, 25);
