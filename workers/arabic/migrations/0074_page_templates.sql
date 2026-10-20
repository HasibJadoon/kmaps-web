-- Page templates: every kind of page the reader can set, as data, and each book assigned one.
--
-- A template is a row of ar_practice_label (scope 'page_template'): its English and Arabic name, a line saying what
-- it is for, an icon, and in extra_json what the app draws it with — `layout` (the reader's engine: verse, song,
-- maqama, proverbs, prose, nights, script) and for verse the `setting` (manuscript, diwan, reader, page). The app
-- knows only the engines; the templates compose them, so a new template is a row, not a release.
--
-- Each work carries its template in ar_acquisition_ref.page_template, assigned here from its kind and verse form;
-- one book is moved to another template by changing that one value.

ALTER TABLE ar_acquisition_ref ADD COLUMN page_template TEXT;

INSERT INTO ar_practice_label (scope, key, label, label_ar, detail, icon, extra_json, sort) VALUES
  ('page_template', 'diwan',          'Printed dīwān',     'ديوان مطبوع',   'Poems set bayt by bayt, as a printed dīwān: the halves balanced, numbers in the margin, the meter named, a fleuron between poems.', 'text.quote',                  '{"layout":"verse","setting":"manuscript"}', 1),
  ('page_template', 'diwan_sharh',    'Dīwān with sharḥ',  'ديوان بشرحه',   'The poem and its commentary: each bayt, and under it the commentator''s note, the word explained in gold.',                           'text.book.closed',            '{"layout":"verse","setting":"diwan"}',      2),
  ('page_template', 'school_poem',    'Reader''s poem',    'نظم مدرسي',     'A poem for learners: paired and numbered on a lit card.',                                                                             'graduationcap',               '{"layout":"verse","setting":"reader"}',     3),
  ('page_template', 'song',           'Song',              'أنشودة',         'Lyrics in stanzas — verse, chorus, bridge — each line with its English, lit line by line with the recording.',                       'music.note',                  '{"layout":"song","setting":"page"}',        4),
  ('page_template', 'maqama',         'Maqāma',            'مقامة',          'Rhymed prose told in episodes: the narrator, the scene, the verse it breaks into.',                                                  'theatermasks',                '{"layout":"maqama"}',                       5),
  ('page_template', 'proverbs',       'Proverbs',          'أمثال',          'Each proverb whole, in a field of its own, with the story it comes from.',                                                           'quote.bubble',                '{"layout":"proverbs"}',                     6),
  ('page_template', 'adab',           'Adab prose',        'نثر أدبي',       'Narrative prose, justified as the editions set it, read for the story.',                                                             'book.closed',                 '{"layout":"prose"}',                        7),
  ('page_template', 'nights',         'The Nights',        'الليالي',        'One night to a page, the frame story and the tale told inside it.',                                                                   'moon.stars',                  '{"layout":"nights"}',                       8),
  ('page_template', 'transcript',     'Episode script',    'نص الحلقة',      'Speech, as an episode is spoken: who says each line, the line, and the recording under it.',                                       'waveform',                    '{"layout":"script"}',                       9),
  ('page_template', 'dialogue',       'Conversation',      'حوار',           'A spoken exchange, turn by turn.',                                                                                                   'bubble.left.and.bubble.right','{"layout":"script"}',                      10)
ON CONFLICT (scope, key) DO UPDATE SET label = excluded.label, label_ar = excluded.label_ar, detail = excluded.detail,
                                       icon = excluded.icon, extra_json = excluded.extra_json, sort = excluded.sort;

UPDATE ar_acquisition_ref SET page_template = CASE
    WHEN json_extract(meta_json, '$.shape') = 'diwan' AND verse_form = 'commented_qasida' THEN 'diwan_sharh'
    WHEN json_extract(meta_json, '$.shape') = 'diwan' AND verse_form = 'nazm'             THEN 'school_poem'
    WHEN json_extract(meta_json, '$.shape') = 'diwan'                                     THEN 'diwan'
    WHEN json_extract(meta_json, '$.shape') = 'lyrics'                                    THEN 'song'
    WHEN json_extract(meta_json, '$.shape') = 'maqama'                                    THEN 'maqama'
    WHEN json_extract(meta_json, '$.shape') = 'amthal'                                    THEN 'proverbs'
    WHEN json_extract(meta_json, '$.shape') = 'nights'                                    THEN 'nights'
    WHEN json_extract(meta_json, '$.shape') = 'series'                                    THEN 'transcript'
    WHEN json_extract(meta_json, '$.shape') = 'dialogue'                                  THEN 'dialogue'
    ELSE 'adab' END
 WHERE page_template IS NULL;

UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content';
