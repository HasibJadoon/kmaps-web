-- qr_187 — tafsīr translation practice: the owner translates a tafsīr text sentence by sentence; each attempt is logged with its
-- corrections, and the words / grammar points the owner is weak on are kept in one register that grows with every attempt.
-- Reuses: qr_surah_study_passage (passage_id), qr_tafsir_book_display_block (block_id = the verbatim source), km_core
-- core_study_session (session_id = the sitting). Later: weak items with enough misses are authored into the drill bank (cyb_drill)
-- and reviewed through core_srs_card — nothing is drilled from here on the fly.

CREATE TABLE IF NOT EXISTS qr_tafsir_practice_attempt (
  id            TEXT PRIMARY KEY,                       -- TPA:<source_slug>:<surah>:<from>-<to>:<seq>:<n>
  user_ref      TEXT NOT NULL,                          -- CORE:<ulid> (km_core user)
  session_id    TEXT,                                   -- km_core core_study_session.id
  passage_id    TEXT,                                   -- qr_surah_study_passage.id
  surah         INTEGER NOT NULL,
  ayah_from     INTEGER NOT NULL,
  ayah_to       INTEGER NOT NULL,
  source_slug   TEXT NOT NULL,                          -- ibn_ashur | razi | alusi | …
  block_id      TEXT,                                   -- qr_tafsir_book_display_block.id the sentence is cut from
  page          TEXT,                                   -- the book's page
  seq           INTEGER NOT NULL,                       -- sentence order within the passage's text of this book
  text_ar       TEXT NOT NULL,                          -- the sentence, verbatim
  my_en         TEXT NOT NULL,                          -- the owner's translation, as written
  model_en      TEXT,                                   -- the corrected translation
  verdict       TEXT NOT NULL CHECK (verdict IN ('right','mostly','partly','wrong')),
  issues_json   TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(issues_json)),  -- [{weak_id, kind, point, note}]
  context_note  TEXT,                                   -- why the scholar says it (one line)
  try_n         INTEGER NOT NULL DEFAULT 1,             -- 1st, 2nd … try at the same sentence
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_qr_tpa_user_passage ON qr_tafsir_practice_attempt (user_ref, passage_id, source_slug, seq);

CREATE TABLE IF NOT EXISTS qr_tafsir_practice_weak (
  id            TEXT PRIMARY KEY,                       -- TPW:<kind>:<key>
  user_ref      TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('word','phrase','grammar','vowel','style')),
  key           TEXT NOT NULL,                          -- the word/phrase as written, or a short grammar slug
  label_ar      TEXT,                                   -- the Arabic shown on a drill (vocalised)
  label_en      TEXT NOT NULL,                          -- what it means / the rule, in plain English
  root_id       TEXT,                                   -- km_arabic_linguistic ar_ling_roots.id (words)
  root          TEXT,                                   -- the root, joined (فرق)
  gram_term_id  TEXT,                                   -- ar_ling_gram_term id (grammar), when known
  contrast_ar   TEXT,                                   -- the near-miss it was confused with (آخِر for آخَر)
  example_ar    TEXT,                                   -- the sentence it was missed in
  first_attempt TEXT,                                   -- qr_tafsir_practice_attempt.id
  miss_n        INTEGER NOT NULL DEFAULT 1,
  hit_n         INTEGER NOT NULL DEFAULT 0,             -- later sentences where it came up and was right
  last_miss_at  TEXT,
  last_hit_at   TEXT,
  status        TEXT NOT NULL DEFAULT 'weak' CHECK (status IN ('weak','improving','known','drilled')),
  drill_id      TEXT,                                   -- km_core cyb_drill id once authored
  note_md       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_ref, kind, key)
);
CREATE INDEX IF NOT EXISTS idx_qr_tpw_user_status ON qr_tafsir_practice_weak (user_ref, status, miss_n);
