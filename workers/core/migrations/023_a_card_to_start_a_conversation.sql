CREATE TABLE IF NOT EXISTS core_talk_deck (
  id          TEXT PRIMARY KEY,
  owner_ref   TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,

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

  depth      INTEGER NOT NULL DEFAULT 1 CHECK (depth BETWEEN 1 AND 3),
  tags       TEXT,
  seq        INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE INDEX IF NOT EXISTS ix_talk_card_deck ON core_talk_card (deck_ref, depth, seq);
CREATE INDEX IF NOT EXISTS ix_talk_deck_owner ON core_talk_deck (owner_ref);
