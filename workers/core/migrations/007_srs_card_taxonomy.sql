-- 007_srs_card_taxonomy.sql
--
-- The card taxonomy: what a card *teaches*, as its own dimension.
--
-- resource_type already says what the resource IS (an ayah, a root, a lemma).
-- It cannot say what the card teaches ABOUT it — one ayah yields a translation
-- card, an idiom card, and a theology-concept card, and "scope by surah and
-- type" needs those distinguishable. So:
--
--   card_kind      what the card teaches: translation | idiom | expression |
--                  concept | vocabulary | structure | ... (per-module lists
--                  live in the worker's taxonomy, served to clients)
--   concept_domain the discipline, when kind = concept: theology | psychology |
--                  sociology | law | ethics | eschatology | spirituality | ...
--
-- Both are plain TEXT, not CHECK-constrained: the taxonomy is data the worker
-- serves, and a new domain must never need a migration.

ALTER TABLE core_srs_card ADD COLUMN card_kind TEXT;
ALTER TABLE core_srs_card ADD COLUMN concept_domain TEXT;

-- The library submission table predates this; card_kind already exists there.
ALTER TABLE core_srs_library_card ADD COLUMN concept_domain TEXT;

-- The review queue filters by surah + kind + domain within a user's cards.
CREATE INDEX IF NOT EXISTS idx_srs_card_kind
  ON core_srs_card (user_ref, module, card_kind, concept_domain);
