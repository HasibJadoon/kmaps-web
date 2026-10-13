-- 0039_ar_intake.sql
--
-- The intake queue: anything found that could help the climb from listening to reading tafsīr —
-- a channel, a playlist, one video, an audiobook, a podcast — logged before it is scraped.
-- An item is tagged with a strand and a level (ar_practice_label scopes 'intake_strand',
-- 'intake_level') and moves through the pipeline (scope 'intake_status'): logged → queued → scraping → captured → cleaning →
-- aligned → live. Once captured it points at the work it became (acq_ref_id) and the rest of
-- the pipeline is the work's own (ar_acquisition_ref, ar_acq_audio).
--
-- Only Arabic, and only classical or modern fuṣḥā, is taken: the register CHECK refuses anything
-- else, so a dialect drama or an English explainer cannot enter the queue at all.
--
-- The order of the queue is data too: level first (easy feeds hard), then priority (5 = most),
-- then how far along it is, then when it was logged. ar_intake_queue_v reads it in that order.

CREATE TABLE IF NOT EXISTS ar_intake_item (
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
CREATE INDEX IF NOT EXISTS idx_ar_intake_parent ON ar_intake_item(parent_id, seq);
CREATE INDEX IF NOT EXISTS idx_ar_intake_queue  ON ar_intake_item(status, strand, level, priority DESC);

-- Two tags place an item. Its strand is what it builds; its level is how hard it is. The queue
-- runs each strand easiest-first, so a strand's easy items feed its harder ones. min_value is the
-- order; extra_json.examples says what belongs there.
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('intake_strand', 'lugha',   'Language',             'اللُّغَة',            'From hearing clear fuṣḥā to grammar, balāgha and the lexicon',          'character.book.closed.ar', '#5DA9E9', 1, '{"examples":"حكايات عالمية, بالبلدي الفصيح"}', 1),
 ('intake_strand', 'history', 'Early Islamic history','التَّارِيخُ الإِسْلَامِيّ', 'The Prophet''s life, the Companions, the early caliphates — setting, manners, how people spoke', 'building.columns', '#E07A5F', 2, '{"examples":"الإمام البخاري, مجالس هارون الرشيد"}', 2),
 ('intake_strand', 'adab',    'Poetry and literature','الشِّعْرُ وَالأَدَب',     'The poems and prose the commentators quote',                              'text.quote',            '#B388EB', 3, '{"examples":"ترانيم عربية, وحي القصيد"}', 3),
 ('intake_strand', 'quran',   'Qurʾān and tafsīr',    'القُرْآنُ وَالتَّفْسِير',   'The goal: reading classical tafsīr with ease',                             'book.closed',           '#2A9D8F', 4, '{"examples":"لمسات بيانية"}', 4);

INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('intake_level', 'easy',     'Easy',           'سَهْل',     'Slow, clear, everyday words — cartoons and children''s drama',            'circle',             '#81B29A', 1, NULL, 1),
 ('intake_level', 'middle',   'Middle',         'مُتَوَسِّط',  'Narration and drama at natural speed',                                    'circle.lefthalf.filled', '#F2CC8F', 2, NULL, 2),
 ('intake_level', 'advanced', 'Advanced',       'مُتَقَدِّم',  'Classical register: poetry explained, turāth dramatised, lectures',        'circle.fill',        '#E07A5F', 3, NULL, 3),
 ('intake_level', 'super',    'Super-advanced', 'مُتَمَكِّن',  'Classical texts themselves, read and explained without simplifying',      'star.circle.fill',   '#B388EB', 4, NULL, 4);

-- The two registers the intake takes.
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('intake_register', 'fusha_turath',  'Classical', 'فُصْحَى التُّرَاث',  'The Arabic of the classical books and poetry',        'scroll',     '#D8B657', 1, NULL, 1),
 ('intake_register', 'fusha_muasira', 'Fuṣḥā',     'الفُصْحَى المُعَاصِرَة', 'Modern standard Arabic: dubbing, narration, lectures', 'text.bubble', '#5DA9E9', 2, NULL, 2);

-- The pipeline. extra_json.active marks the states the queue still works on.
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('intake_status', 'logged',   'Logged',    'مُسَجَّل',   'Found and noted — not yet looked at',                       'tray.and.arrow.down',   '#8D99AE', 1, '{"active":true}', 1),
 ('intake_status', 'queued',   'Queued',    'فِي الطَّابُور', 'Checked: worth taking — waiting its turn',                 'list.number',           '#5DA9E9', 2, '{"active":true}', 2),
 ('intake_status', 'scraping', 'Scraping',  'يُجْمَع',    'Its episodes and details are being listed',                 'arrow.down.circle',     '#F2A65A', 3, '{"active":true}', 3),
 ('intake_status', 'captured', 'Captured',  'مَحْفُوظ',   'Audio and the automatic transcript are in',                 'waveform',              '#F2CC8F', 4, '{"active":true}', 4),
 ('intake_status', 'cleaning', 'Cleaning',  'يُنَقَّح',    'The transcript is being corrected and voweled',             'pencil.and.outline',    '#B388EB', 5, '{"active":true}', 5),
 ('intake_status', 'aligned',  'Aligned',   'مُحَاذًى',   'Text and audio line up, line by line',                     'text.alignleft',        '#81B29A', 6, '{"active":true}', 6),
 ('intake_status', 'live',     'Live',      'مُتَاح',     'On the path: preview, watch, drill, check',                 'checkmark.seal',        '#2A9D8F', 7, '{"active":false}', 7),
 ('intake_status', 'parked',   'Parked',    'مُؤَجَّل',   'Good, but not now',                                         'pause.circle',          '#8D99AE', 8, '{"active":false}', 8),
 ('intake_status', 'rejected', 'Not for us','مَرْفُوض',   'Not classical or fuṣḥā Arabic, poor audio, or off the goal',                     'xmark.circle',          '#C0392B', 9, '{"active":false}', 9);

-- The words the intake screens show.
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('intake', 'title',       'Intake',                    'الوَارِد',          'Everything found for the climb from listening to tafsīr', 'tray.full', '#D8B657', NULL, NULL, 1),
 ('intake', 'next_up',     'Next up',                   'التَّالِي',          'What the pipeline takes next — easiest level, highest priority first', NULL, NULL, 12, NULL, 2),
 ('intake', 'log_new',     'Log something new',         'سَجِّلْ جَدِيدًا',     'Paste a link: a video, playlist, channel or book', 'plus.circle', NULL, NULL, NULL, 3),
 ('intake', 'url',         'Link',                      'الرَّابِط',          NULL, NULL, NULL, NULL, NULL, 4),
 ('intake', 'note',        'Why it is good',            'لِمَاذَا',           NULL, NULL, NULL, NULL, NULL, 5),
 ('intake', 'priority',    'Priority',                  'الأَوْلَوِيَّة',      '5 is most', NULL, NULL, NULL, NULL, 6),
 ('intake', 'strand',      'Strand',                    'المَسَار',          NULL, NULL, NULL, NULL, NULL, 7),
 ('intake', 'level',       'Level',                     'المُسْتَوَى',        NULL, NULL, NULL, NULL, NULL, 7),
 ('intake', 'status',      'Status',                    'الحَالَة',          NULL, NULL, NULL, NULL, NULL, 8),
 ('intake', 'save',        'Log it',                    'سَجِّل',            NULL, NULL, NULL, NULL, NULL, 9),
 ('intake', 'episodes',    '{n} episodes',              '{n} حَلْقَة',        NULL, NULL, NULL, NULL, NULL, 10),
 ('intake', 'all',         'All',                       'الكُلّ',            NULL, NULL, NULL, NULL, NULL, 11),
 ('intake', 'search',      'Search the intake',         'ابْحَثْ فِي الوَارِد',  NULL, NULL, NULL, NULL, NULL, 12),
 ('intake', 'empty',       'Nothing here yet',          'لَا شَيْءَ بَعْد',      NULL, NULL, NULL, NULL, NULL, 13),
 ('intake', 'open_source', 'Open on YouTube',           'افْتَحْ',            NULL, 'arrow.up.right.square', NULL, NULL, NULL, 14),
 ('intake', 'register',    'Register',                  'السِّجِلّ',          'Classical or fuṣḥā only', NULL, NULL, NULL, NULL, 16),
 ('intake', 'duplicate',   'Already logged',            'مُسَجَّلٌ مِنْ قَبْل',  'This link is in the intake already', NULL, NULL, NULL, NULL, 15);

-- The queue in the order the pipeline takes it: top-level items still being worked on.
DROP VIEW IF EXISTS ar_intake_queue_v;
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
