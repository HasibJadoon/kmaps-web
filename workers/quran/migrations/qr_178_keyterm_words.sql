-- A key term is one, shared by every sūra and the whole Qurʾān (owner, 2026-10-28), and it points at every word
-- it stands in. The words are qr_word_occurrence's own rows — sūra, āyah and word index are read from there, never
-- copied: qr_keyterm_word holds only the link (an expression links its first word and its last).
-- The terms and their scope come from kmaps-resources decks/quran/keyterm-stories/terms.json, the same registry
-- that files their decks; docs/quran/keyterms/term_words.py writes the rows from it. term_key is the key the
-- term's essay, story and study decks carry (CM:DOC:qr:keyterm-{essay,story,study}:<key>).
CREATE TABLE IF NOT EXISTS qr_keyterm (
  term_key   TEXT PRIMARY KEY,
  kind       TEXT NOT NULL CHECK (kind IN ('word', 'expression')),
  head_ar    TEXT NOT NULL,
  label_en   TEXT NOT NULL,
  root       TEXT,                 -- the corpus root; an expression lists its roots in scope_json
  scope_json TEXT NOT NULL,        -- what it counts: {"lemmas": [...]}, {"root": "..."} or {"phrase": [lemma, lemma]}
  total      INTEGER NOT NULL,     -- its usage map's total (docs/quran/keyterms/usage_<key>.json), checked on write
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS qr_keyterm_word (
  term_key    TEXT NOT NULL REFERENCES qr_keyterm(term_key),
  word_ref    TEXT NOT NULL REFERENCES qr_word_occurrence(id),
  word_to_ref TEXT REFERENCES qr_word_occurrence(id),   -- the last word of an expression
  PRIMARY KEY (term_key, word_ref)
);
CREATE INDEX IF NOT EXISTS ix_qr_keyterm_word_word ON qr_keyterm_word (word_ref);
