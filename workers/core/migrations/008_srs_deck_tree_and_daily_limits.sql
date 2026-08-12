-- Deck nesting and daily limits.
--
-- These columns were added directly to the live database, so this migration
-- records the shape the code now depends on rather than introducing it. It is
-- written to be safe to run against a database that already has them: D1 has
-- no `ADD COLUMN IF NOT EXISTS`, so an already-migrated database will report
-- "duplicate column" on the first statement and stop — that is the intended
-- signal, not a failure to fix by editing the schema by hand again.
--
-- Nesting: a deck may have a parent, so `quran/mufradat` sits under `quran`.
-- `slug` is the stable name for a deck across rebuilds; `sort_order` is the
-- order a collection is meant to be read in, which is not alphabetical.
ALTER TABLE core_srs_deck ADD COLUMN parent_id TEXT REFERENCES core_srs_deck(id);
ALTER TABLE core_srs_deck ADD COLUMN slug TEXT;
ALTER TABLE core_srs_deck ADD COLUMN sort_order INTEGER DEFAULT 0;

-- The two daily caps, kept separate because they bound different things: new
-- cards are the workload you take on, reviews are the debt already owed.
-- Capping them together would let a heavy review day block new material, or a
-- burst of new cards crowd out the reviews that keep everything else alive.
ALTER TABLE core_srs_deck ADD COLUMN new_per_day INTEGER;
ALTER TABLE core_srs_deck ADD COLUMN review_per_day INTEGER;

-- 'tree' — the cap covers this deck and every deck beneath it. Anki's rule,
-- and the reason it is the right one: three children of fifty each would make
-- a parent's fifty mean nothing.
ALTER TABLE core_srs_deck ADD COLUMN limit_scope TEXT DEFAULT 'tree';

CREATE INDEX IF NOT EXISTS core_srs_deck_parent ON core_srs_deck(parent_id);
CREATE INDEX IF NOT EXISTS core_srs_deck_slug   ON core_srs_deck(user_ref, slug);

-- The daily counts are read from the log by (user, day, state_before), which
-- is otherwise a scan of every review ever recorded.
CREATE INDEX IF NOT EXISTS core_srs_review_day  ON core_srs_review(user_ref, reviewed_at);
