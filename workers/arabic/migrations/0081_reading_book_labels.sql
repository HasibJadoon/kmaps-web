-- 0081_reading_book_labels.sql
--
-- The words of the picture-book reader for the Everyday readings (GET /ar/daily/readings/:slug/book): the cover's kicker for a
-- story and for a dialogue, and the quiet link a reading ends on (to its place's vocabulary hub). The app draws them as sent; with English off it
-- shows the Arabic only. Idempotent; the worker has the same text as its fallback, so nothing breaks before this is applied.
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, min_value, extra_json, sort) VALUES
 ('storybook', 'reading_kicker',    'ARABIC READING',  'قِرَاءَةٌ',       'An everyday reading, a picture on every page', NULL, NULL, NULL, NULL, 20),
 ('storybook', 'reading_kicker_qa', 'ARABIC DIALOGUE', 'حِوَارٌ',         'Two voices, a question and its answer',         NULL, NULL, NULL, NULL, 21),
 ('storybook', 'words_of_place',    'Words of this place', 'كَلِمَاتُ الْمَكَانِ', 'Every word of this place, to search and hear', 'text.book.closed', '#E8C96A', NULL, NULL, 22);
