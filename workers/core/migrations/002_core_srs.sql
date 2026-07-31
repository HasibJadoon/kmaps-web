-- ─── 002 · the one central SRS ───────────────────────────────────────────────
--
-- Every subject is drilled by one scheduler, out of one store, into one log.
--
-- The card state used to live in `ar_learn_srs_card` in km_arabic while the
-- enrollment index lived here in `core_srs_registry`. That split made the
-- *Arabic* database the home of the Qurʾān's and the Worldview's cards, which is
-- backwards, and it meant no single query could answer "what is due" across
-- subjects — the only question an SRS exists to answer.
--
-- So the cards come here, beside the registry. A card is anchored by
-- (module, resource_type, resource_ref), exactly as the registry already is, so
-- an Arabic root, a Qurʾān āyah and a Worldview concept are the same kind of
-- row. A new surface earns a new `card_template`, never a new table.
--
-- The columns are FSRS-native. The scheduler this replaces was SM-2 filling
-- FSRS-named columns — `stability` held the interval, `difficulty` held the
-- ease factor — so the names stay and the meanings are now real:
--
--   stability  — days until recall probability falls to 90%
--   difficulty — 1…10, how much the card resists gaining stability
--
-- `core_srs_review` is append-only and is the record. A card is only the latest
-- projection of it, which is what makes changing the algorithm a replay rather
-- than a migration, and what a per-user weight fit trains on.
--
-- Nothing needs migrating: ar_learn_srs_card, ar_learn_srs_deck and
-- ar_learn_srs_review are all empty.

-- ── Decks ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS core_srs_deck (
  id            TEXT PRIMARY KEY,
  user_ref      TEXT NOT NULL,
  workspace_id  TEXT,
  title         TEXT NOT NULL,
  deck_type     TEXT NOT NULL DEFAULT 'mixed',
  description   TEXT,
  is_shared     INTEGER NOT NULL DEFAULT 0,
  meta_json     TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS core_srs_deck_user ON core_srs_deck(user_ref);

-- ── Cards ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS core_srs_card (
  id             TEXT PRIMARY KEY,
  deck_id        TEXT NOT NULL REFERENCES core_srs_deck(id) ON DELETE CASCADE,
  user_ref       TEXT NOT NULL,

  -- What the card is about. The same anchor the registry uses, so every
  -- subject attaches the same way.
  module         TEXT NOT NULL CHECK (module IN ('AR','AL','QR','WV','other')),
  resource_type  TEXT NOT NULL CHECK (resource_type IN
                   ('vocabulary','grammar','root','lemma','word','ayah','passage','concept','other')),
  resource_ref   TEXT NOT NULL,
  card_template  TEXT NOT NULL DEFAULT 'freeform',
  front_text     TEXT NOT NULL DEFAULT '',
  back_text      TEXT NOT NULL DEFAULT '',
  extra_json     TEXT,
  tags           TEXT,
  suspended      INTEGER NOT NULL DEFAULT 0,

  -- FSRS state.
  stability      REAL,
  difficulty     REAL,
  card_state     TEXT NOT NULL DEFAULT 'new'
                   CHECK (card_state IN ('new','learning','review','relearning')),
  learning_step  INTEGER NOT NULL DEFAULT 0,
  reps           INTEGER NOT NULL DEFAULT 0,
  lapses         INTEGER NOT NULL DEFAULT 0,
  elapsed_days   INTEGER NOT NULL DEFAULT 0,
  scheduled_days INTEGER NOT NULL DEFAULT 0,
  last_review_at TEXT,
  next_review_at TEXT,

  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (deck_id, resource_ref, card_template)
);
-- The due query is the hot path and crosses subjects, so it is indexed on the
-- pair it actually filters by.
CREATE INDEX IF NOT EXISTS core_srs_card_due  ON core_srs_card(user_ref, next_review_at);
CREATE INDEX IF NOT EXISTS core_srs_card_deck ON core_srs_card(deck_id);
CREATE INDEX IF NOT EXISTS core_srs_card_res  ON core_srs_card(module, resource_ref);

-- ── The log ──────────────────────────────────────────────────────────────────
-- Append-only. Every grade lands here before the card is touched.
CREATE TABLE IF NOT EXISTS core_srs_review (
  id                   TEXT PRIMARY KEY,
  card_id              TEXT NOT NULL REFERENCES core_srs_card(id) ON DELETE CASCADE,
  user_ref             TEXT NOT NULL,
  rating               INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 4),
  state_before         TEXT,
  stability_after      REAL,
  difficulty_after     REAL,
  elapsed_days         INTEGER,
  scheduled_days_after INTEGER,
  state_after          TEXT,
  review_duration_secs INTEGER,
  reviewed_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS core_srs_review_card ON core_srs_review(card_id, reviewed_at);
CREATE INDEX IF NOT EXISTS core_srs_review_user ON core_srs_review(user_ref, reviewed_at);

-- ── Per-user scheduler parameters ────────────────────────────────────────────
-- FSRS ships weights averaged over many people; its advantage comes from
-- fitting them to one person's forgetting. A fit is stored here with the
-- evidence that justified it, so a bad fit can be explained and rolled back.
--
-- `weights_json` is whatever the installed ts-fsrs expects — 21 numbers under
-- FSRS-6. The length is not constrained here on purpose: the library validates
-- it and falls back to its own defaults, so an upgrade that changes the vector
-- cannot be blocked by a CHECK written against an older version. Decay is not a
-- column for the same reason; under FSRS-6 it is one of the weights.
CREATE TABLE IF NOT EXISTS core_srs_params (
  user_ref          TEXT PRIMARY KEY,
  weights_json      TEXT NOT NULL,
  desired_retention REAL NOT NULL DEFAULT 0.9,
  maximum_interval  INTEGER NOT NULL DEFAULT 36500,
  learning_steps    TEXT NOT NULL DEFAULT '["1m","10m"]',
  relearning_steps  TEXT NOT NULL DEFAULT '["10m"]',
  fitted_at         TEXT,
  fitted_reviews    INTEGER NOT NULL DEFAULT 0,
  log_loss_before   REAL,
  log_loss_after    REAL,
  note              TEXT,
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- The registry keeps its job: which user is learning which resource, in which
-- module. `card_ref` now points at a row in this database rather than across
-- into km_arabic.
