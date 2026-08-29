-- ─── A card to start a conversation ───────────────────────────────────────────
--
-- The third app: a deck you put on the table with family or friends, draw from,
-- and talk. No scoring, no schedule, no right answer — which is exactly why it
-- is not the SRS and not the quiz. A prompt that made the room talk for twenty
-- minutes is a good card; there is nothing to grade about it.
--
-- `depth` is the one piece of structure worth keeping: a deck that opens with
-- the hardest question in it does not get played twice. 1 is light, 3 is the
-- one you ask after midnight.
--
-- The decks are the user's own. Nothing is seeded from any published set — a
-- deck someone bought is theirs, not ours to copy.

CREATE TABLE IF NOT EXISTS core_talk_deck (
  id          TEXT PRIMARY KEY,
  owner_ref   TEXT NOT NULL,                      -- CORE:ULID → core_users
  title       TEXT NOT NULL,
  description TEXT,
  -- Who it is for. The same question is a different question across a dinner
  -- table and a long drive with one friend.
  audience    TEXT NOT NULL DEFAULT 'friends'
                CHECK (audience IN ('family','friends','couples','kids','work','mixed')),
  language    TEXT NOT NULL DEFAULT 'en',
  is_shared   INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS core_talk_card (
  id         TEXT PRIMARY KEY,
  deck_ref   TEXT NOT NULL REFERENCES core_talk_deck(id) ON DELETE CASCADE,
  prompt     TEXT NOT NULL,
  -- 1 light · 2 real · 3 the one you ask last.
  depth      INTEGER NOT NULL DEFAULT 1 CHECK (depth BETWEEN 1 AND 3),
  tags       TEXT,
  seq        INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE INDEX IF NOT EXISTS ix_talk_card_deck ON core_talk_card (deck_ref, depth, seq);
CREATE INDEX IF NOT EXISTS ix_talk_deck_owner ON core_talk_deck (owner_ref);
