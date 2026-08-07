-- 006_srs_library_submissions.sql
--
-- Community cards for the shared SRS library.
--
-- The library was authored content only: cyb_card, no owner, written by whoever
-- builds the passage. Users can now offer their own cards to it, but a shared
-- library is a published surface — a card that appears under a surah for
-- everyone is an editorial claim about that surah. So submissions land pending
-- and only an approver can publish them.
--
-- Enrolled copies stay in core_srs_card as before: this table is the *offer*,
-- never a schedule. Approving does not add the card to anyone's deck; it only
-- makes it visible in the library for people to take.

CREATE TABLE IF NOT EXISTS core_srs_library_card (
  id            TEXT PRIMARY KEY,
  author_ref    TEXT NOT NULL,              -- CORE:ULID → core_users
  module        TEXT NOT NULL,              -- QR | AL | AR | WV | other
  resource_type TEXT NOT NULL,
  resource_ref  TEXT NOT NULL,              -- "44:3", a root, a lemma id
  card_kind     TEXT,                       -- free label, e.g. ss_nahw_rule
  front_text    TEXT NOT NULL,
  back_text     TEXT,
  tags          TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
  review_note   TEXT,
  reviewed_by   TEXT,                       -- CORE:ULID → core_users
  reviewed_at   TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

-- The library reads by module + reference, and always filtered to approved.
CREATE INDEX IF NOT EXISTS idx_srs_lib_lookup
  ON core_srs_library_card (status, module, resource_ref);

-- An author's own submissions, so they can see what is still pending.
CREATE INDEX IF NOT EXISTS idx_srs_lib_author
  ON core_srs_library_card (author_ref, status);

-- The approval queue.
CREATE INDEX IF NOT EXISTS idx_srs_lib_status
  ON core_srs_library_card (status, created_at);

-- One person cannot offer the same card twice to the same reference.
CREATE UNIQUE INDEX IF NOT EXISTS idx_srs_lib_unique
  ON core_srs_library_card (author_ref, resource_ref, front_text);
