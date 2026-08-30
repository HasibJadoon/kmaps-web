ALTER TABLE core_srs_deck ADD COLUMN parent_id TEXT REFERENCES core_srs_deck(id);
ALTER TABLE core_srs_deck ADD COLUMN slug TEXT;
ALTER TABLE core_srs_deck ADD COLUMN sort_order INTEGER DEFAULT 0;

ALTER TABLE core_srs_deck ADD COLUMN new_per_day INTEGER;
ALTER TABLE core_srs_deck ADD COLUMN review_per_day INTEGER;

ALTER TABLE core_srs_deck ADD COLUMN limit_scope TEXT DEFAULT 'tree';

CREATE INDEX IF NOT EXISTS core_srs_deck_parent ON core_srs_deck(parent_id);
CREATE INDEX IF NOT EXISTS core_srs_deck_slug   ON core_srs_deck(user_ref, slug);

CREATE INDEX IF NOT EXISTS core_srs_review_day  ON core_srs_review(user_ref, reviewed_at);
