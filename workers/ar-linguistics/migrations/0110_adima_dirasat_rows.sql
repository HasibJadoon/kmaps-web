-- km_arabic_linguistic · 0110 · ʿUḍayma's Dirāsāt as rows
--
-- Muḥammad ʿAbd al-Khāliq ʿUḍayma, Dirāsāt li-uslūb al-Qurʾān al-karīm (adima_dirasat,
-- ar_ling_gram_chunk book 5264: 2,599 ṣarf pages, 4,400 naḥw pages) is a complete Qurʾānic
-- grammar and morphology: under each heading — «الفعل الرباعي المجرد», «(فاعل) للمشاركة»,
-- «أفعل المتعدي لاثنين», «(إذ) بدل من المفعول به» — it lists every Qurʾānic word the heading
-- covers, the āyah quoted, its reference «[١٠٠: ٩]», and its own observations
-- («ذكر منه الماضي فقط … مبنيًا للمفعول في الموضعين»).
--
-- The pages are text. These tables are the same pages as rows, parsed by
-- kmaps-web/scripts/parse-adima.py (re-run it to rebuild; the rows are derived, the chunks
-- stay the record):
--
--   ar_ling_adima_entry — one row per Qurʾānic citation: the heading path (chapter › section ›
--     head word), the pattern the chapter studies and the meaning the heading names (bound to
--     GT form_family / sigha_maani terms where they match), the āyah (surah, ayah, the other
--     places it lists), the quote, and the word of the āyah the citation is about
--     (word_index in qr_word_occurrence) where it could be told.
--   ar_ling_adima_note — ʿUḍayma's own observations on a head word or heading (not the books
--     he quotes); drill_ar is the one sentence of it short and self-standing enough to drill.
--
-- quote_match is the share of the quote's words found in the āyah the reference names: a
-- misread reference shows as a low share, and the drills take only rows at 0.6 or above.
CREATE TABLE IF NOT EXISTS ar_ling_adima_entry (
  id              TEXT PRIMARY KEY,          -- ADM:<chunk id>:<n>
  discipline      TEXT NOT NULL,             -- NH | SF
  chunk_id        TEXT NOT NULL,             -- ar_ling_gram_chunk.id: the page it is read from
  volume_no       INTEGER,
  page_no         INTEGER,
  seq             INTEGER NOT NULL,          -- book order
  chapter_ar      TEXT,                      -- the study it belongs to («دراسة (افتعل)»)
  section_ar      TEXT,                      -- the heading it is listed under
  head_ar         TEXT,                      -- the word or sub-heading above it
  pattern_ar      TEXT,                      -- the verb pattern the chapter studies (ṣarf)
  pattern_term_id TEXT,                      -- GT:form_family:*
  meaning_ar      TEXT,                      -- the meaning the heading names
  meaning_term_id TEXT,                      -- GT:sigha_maani:* where it is one
  section_term_id TEXT,                      -- a GT term the heading names
  quote_ar        TEXT NOT NULL,
  surah           INTEGER NOT NULL,
  ayah            INTEGER NOT NULL,
  refs_json       TEXT,                      -- every place it lists: [[s, a], …]
  word_index      INTEGER,                   -- qr_word_occurrence.word_index of the word it is about
  word_ar         TEXT,
  quote_match     REAL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_adima_entry_pattern ON ar_ling_adima_entry(discipline, pattern_term_id);
CREATE INDEX IF NOT EXISTS ix_adima_entry_meaning ON ar_ling_adima_entry(meaning_term_id);
CREATE INDEX IF NOT EXISTS ix_adima_entry_term    ON ar_ling_adima_entry(section_term_id);
CREATE INDEX IF NOT EXISTS ix_adima_entry_ayah    ON ar_ling_adima_entry(surah, ayah);
CREATE INDEX IF NOT EXISTS ix_adima_entry_section ON ar_ling_adima_entry(discipline, chapter_ar, section_ar);

CREATE TABLE IF NOT EXISTS ar_ling_adima_note (
  id              TEXT PRIMARY KEY,          -- ADN:<n>
  discipline      TEXT NOT NULL,
  chunk_id        TEXT NOT NULL,
  volume_no       INTEGER,
  page_no         INTEGER,
  chapter_ar      TEXT,
  section_ar      TEXT,
  head_ar         TEXT,
  pattern_ar      TEXT,
  pattern_term_id TEXT,
  meaning_ar      TEXT,
  meaning_term_id TEXT,
  section_term_id TEXT,
  note_ar         TEXT NOT NULL,             -- his observation, as he writes it
  drill_ar        TEXT,                      -- its one drillable sentence, or NULL
  about_readings  INTEGER NOT NULL DEFAULT 0 -- it speaks of the readings (the seven, the shādhdh)
);
CREATE INDEX IF NOT EXISTS ix_adima_note_drill ON ar_ling_adima_note(discipline, chapter_ar) WHERE drill_ar IS NOT NULL;
