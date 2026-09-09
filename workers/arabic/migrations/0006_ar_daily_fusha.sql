-- Daily Fuṣḥā — a themed dose a day: ten singular/plural pairs, a sentence for
-- each, and one short passage that puts them back together.
--
-- Why not ar_curriculum_domain_phrase (which is empty, and was the obvious
-- home): it holds a phrase and a meaning and nothing else. There is nowhere to
-- put the plural, the kind of plural it is, or the gender that the agreement
-- turns on — and that pairing is the whole lesson. A word list you can only
-- read in one number teaches recognition, not fuṣḥā.
--
-- Nothing here schedules review. That is km_core's job (core_srs_card, module
-- 'AR', resource_type 'vocabulary'|'passage'), which is the single scheduler
-- across every module. These tables say only what exists and which day it is
-- meant to land on.
--
-- No transliteration column anywhere, deliberately: Latin letters are what
-- keeps a mid-tier reader mid-tier, because the eye takes them first.

-- ── the day's subject ────────────────────────────────────────────────────
CREATE TABLE ar_daily_theme (
  id           TEXT PRIMARY KEY,              -- 'ARDT:<slug>'
  slug         TEXT NOT NULL UNIQUE,
  title_ar     TEXT NOT NULL,
  title_en     TEXT NOT NULL,
  domain_id    TEXT REFERENCES ar_curriculum_domain(id),
  level        TEXT NOT NULL DEFAULT 'A2',
  day_index    INTEGER NOT NULL UNIQUE,       -- position in the drip, 1-based
  focus_note   TEXT,                          -- the grammar the day quietly teaches
  is_published INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── the pair ─────────────────────────────────────────────────────────────
-- `plural_kind` and `pattern_ar` are the point of the table: ten broken
-- plurals learned as ten unrelated facts is ten facts, but learned as أَفْعَال
-- against مَفَاعِيل against فُعُول it is three patterns and a handful of
-- exceptions.
CREATE TABLE ar_daily_word (
  id              TEXT PRIMARY KEY,           -- 'ARDW:<theme slug>:<n>'
  theme_id        TEXT NOT NULL REFERENCES ar_daily_theme(id) ON DELETE CASCADE,
  singular_ar     TEXT NOT NULL,              -- vocalised
  plural_ar       TEXT NOT NULL,              -- vocalised
  gloss_en        TEXT NOT NULL,
  plural_kind     TEXT NOT NULL
                    CHECK (plural_kind IN ('taksir','salim_m','salim_f')),
  gender          TEXT NOT NULL CHECK (gender IN ('m','f')),
  pattern_ar      TEXT,                       -- wazn of the plural, e.g. 'فُعُول'
  is_diptote      INTEGER NOT NULL DEFAULT 0, -- ممنوع من الصرف: no tanwīn, fatḥa for jarr
  al_root_ref     TEXT,                       -- 'AL:<root>' into km_arabic_linguistic
  al_lemma_ref    TEXT,
  -- Two recordings, not one: hearing the singular and then the plural said
  -- aloud is how the pattern lands, and a single clip of both cannot be
  -- replayed one side at a time. Keys into the km-arabic-audio bucket, served
  -- by the existing anonymous GET /ar/audio/:key+.
  audio_key_sg    TEXT,
  audio_key_pl    TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (theme_id, singular_ar)
);

-- ── the word in a sentence ───────────────────────────────────────────────
CREATE TABLE ar_daily_sentence (
  id              TEXT PRIMARY KEY,
  theme_id        TEXT NOT NULL REFERENCES ar_daily_theme(id) ON DELETE CASCADE,
  word_id         TEXT REFERENCES ar_daily_word(id) ON DELETE CASCADE,
  text_ar         TEXT NOT NULL,              -- fully vocalised
  gloss_en        TEXT NOT NULL,
  number_used     TEXT NOT NULL DEFAULT 'plural'
                    CHECK (number_used IN ('singular','dual','plural')),
  grammar_note_en TEXT,                       -- why this ending, when it is not obvious
  audio_key       TEXT,                       -- km-arabic-audio, via /ar/audio/:key+
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── the passage ──────────────────────────────────────────────────────────
-- One per theme: the day's words back in continuous prose, which is where
-- vocabulary either holds or does not.
CREATE TABLE ar_daily_passage (
  id          TEXT PRIMARY KEY,
  theme_id    TEXT NOT NULL UNIQUE REFERENCES ar_daily_theme(id) ON DELETE CASCADE,
  title_ar    TEXT NOT NULL,
  text_ar     TEXT NOT NULL,                  -- fully vocalised
  gloss_en    TEXT NOT NULL,
  word_count  INTEGER NOT NULL DEFAULT 0,
  audio_key   TEXT,                           -- the passage read aloud
  audio_secs  REAL,                           -- known before the first byte, so the
                                              -- transport draws its track correctly
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── the drip ─────────────────────────────────────────────────────────────
-- Per reader, so the same published themes can run at different paces for
-- different people without duplicating a single word of content.
CREATE TABLE ar_daily_delivery (
  id           TEXT PRIMARY KEY,
  user_ref     TEXT NOT NULL,                 -- 'CORE:<user_id>'
  theme_id     TEXT NOT NULL REFERENCES ar_daily_theme(id) ON DELETE CASCADE,
  due_on       TEXT NOT NULL,                 -- YYYY-MM-DD, the reader's day
  delivered_at TEXT,
  completed_at TEXT,
  state        TEXT NOT NULL DEFAULT 'pending'
                 CHECK (state IN ('pending','delivered','done','skipped')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_ref, theme_id)
);

CREATE INDEX idx_ar_daily_word_theme     ON ar_daily_word(theme_id, sort_order);
CREATE INDEX idx_ar_daily_sentence_theme ON ar_daily_sentence(theme_id, sort_order);
CREATE INDEX idx_ar_daily_sentence_word  ON ar_daily_sentence(word_id);
CREATE INDEX idx_ar_daily_delivery_due   ON ar_daily_delivery(user_ref, due_on, state);
CREATE INDEX idx_ar_daily_theme_day      ON ar_daily_theme(day_index, is_published);
