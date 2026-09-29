-- Sentences from the books — the classical library, the dīwāns, the proverbs and maqāmāt — for
-- drills without a recording: a hard word blanked in a sentence as its author wrote it.
-- Built by kmaps-resources scripts/book-audio/load_shells.py as each book is loaded.
CREATE TABLE IF NOT EXISTS ar_read_pool (
  id TEXT PRIMARY KEY,            -- <unit id>#<n>
  band TEXT NOT NULL,             -- basic | middle | advanced (the work's level)
  work_id TEXT NOT NULL, work_title TEXT, unit_id TEXT NOT NULL,
  text_ar TEXT NOT NULL, word_count INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ar_read_pool_band ON ar_read_pool(band);
INSERT OR REPLACE INTO ar_practice_label (scope, key, label, label_ar, detail, icon, color, extra_json, sort) VALUES
 ('skill', 'read', 'Read & fill', 'اِقْرَأْ وَأَكْمِلْ', 'A sentence from the classical books — find the word its author chose', 'book.pages', '#C9A227', '{"source":"read"}', 8),
 ('kind', 'read', 'Read, then pick the missing word', 'اِقْرَأْ ثُمَّ اخْتَرِ الكَلِمَةَ النَّاقِصَة', NULL, NULL, NULL, NULL, 23);
