-- ─── qr_word_term · classical terms on Qurʾānic words ───────────────────────
--
-- The bridge already exists on the term: `ar_ling_gram_term.qac_flag` says which
-- QAC flag means this term, and `qac_scope` says where in the tag to look. 79 of
-- the 399 terms carry it. `qr_gram_term_ref` mirrors the dictionary into this
-- database. What has never existed is the table that puts a term on a WORD.
--
-- Without it, all 77,424 words carry QAC's own flat tags and nothing classical:
-- ٱلْمُبِينِ is `POS:ADJ|ACT|PCPL|(IV)` and not اسم الفاعل من الرباعي.
--
-- Three tiers, and the tier is recorded on every row, because they are not
-- equally trustworthy and a reader is owed the difference:
--
--   qac     a flag QAC itself states. Mechanical, reproducible, no judgement.
--   rule    derived from QAC plus the lexicon by a NAMED rule, e.g. a noun with
--           no participle or maṣdar flag is jāmid. Reviewable and reversible.
--   sourced a grammarian says so about this word. The only tier that can carry
--           صيغة المبالغة or الصفة المشبّهة, because QAC does not tag them and no
--           pattern reliably yields them — غفّار and كَتّاب share a wazn and only
--           one is an intensive.
--
-- Tier `sourced` is the work that genuinely goes sūra by sūra. The other two are
-- corpus-wide passes that need no ordering at all.

CREATE TABLE IF NOT EXISTS qr_word_term (
  id             TEXT PRIMARY KEY,
  word_ref       TEXT NOT NULL REFERENCES "qr_word_occurrence"(id),
  surah          INTEGER NOT NULL,
  ayah           INTEGER NOT NULL,
  word_index     INTEGER NOT NULL,

  gram_term_ref  TEXT NOT NULL,              -- GT:derivation_type:mubalagha
  category_key   TEXT NOT NULL,              -- denormalised, so a reader can filter

  tier           TEXT NOT NULL CHECK (tier IN ('qac','rule','sourced')),
  basis          TEXT NOT NULL DEFAULT 'derived' CHECK (basis IN ('attested','derived')),

  rule_id        TEXT,                       -- required when tier = 'rule'
  source_slug    TEXT,                       -- required when basis = 'attested'
  source_ref     TEXT,
  confidence     TEXT NOT NULL DEFAULT 'high',
  note_ar TEXT, note_en TEXT, note_ur TEXT,

  state          TEXT NOT NULL DEFAULT 'live' CHECK (state IN ('live','draft','retired')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (word_ref, gram_term_ref),
  CHECK (tier <> 'rule'    OR rule_id     IS NOT NULL),
  CHECK (basis <> 'attested' OR source_ref IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS ix_wt_word  ON qr_word_term(word_ref);
CREATE INDEX IF NOT EXISTS ix_wt_ayah  ON qr_word_term(surah, ayah, word_index);
CREATE INDEX IF NOT EXISTS ix_wt_term  ON qr_word_term(gram_term_ref);
CREATE INDEX IF NOT EXISTS ix_wt_cat   ON qr_word_term(category_key, tier);

-- ─── the rules tier 'rule' may cite ─────────────────────────────────────────
-- Named, so a binding can be re-derived, argued with, or withdrawn wholesale.
CREATE TABLE IF NOT EXISTS qr_word_term_rule (
  id            TEXT PRIMARY KEY,
  gram_term_ref TEXT NOT NULL,
  statement_en  TEXT NOT NULL,
  statement_ar  TEXT,
  caveat_en     TEXT,                        -- where the rule is known to fail
  status        TEXT NOT NULL DEFAULT 'live'
);

INSERT OR REPLACE INTO qr_word_term_rule (id, gram_term_ref, statement_en, statement_ar, caveat_en) VALUES
 ('WTR:jumud:fil',      'GT:jumud:fil',
  'A word QAC tags POS:V is a verb.',
  'ما وسمه المصحف فعلًا فهو فعل', NULL),
 ('WTR:jumud:mushtaqq', 'GT:jumud:mushtaqq',
  'A noun or adjective carrying ACT|PCPL, PASS|PCPL or VN is derived.',
  'الاسم الحامل لوسم اسم الفاعل أو المفعول أو المصدر مشتقٌّ',
  'Reaches only the three categories QAC tags. An intensive or quasi-participle '
  || 'is equally derived and will be missed here — it needs tier ''sourced''.'),
 ('WTR:jumud:jamid',    'GT:jumud:jamid',
  'A noun with no derivational flag and no root is treated as primitive.',
  'الاسم الذي لا وسم اشتقاق له ولا جذر يُعدّ جامدًا',
  'Under-reports: a derived noun QAC does not flag falls here wrongly. Requiring '
  || 'the root to be absent as well keeps the error small and one-directional.');
