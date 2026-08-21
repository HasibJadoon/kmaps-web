-- The five pillars: five root decks, and a domain that means one of them.
--
-- These changes were applied directly to the live km_core, so this migration
-- records the shape the code now depends on rather than introducing it. It is
-- written to be safe to re-run except for the first statement: D1 has no
-- `ADD COLUMN IF NOT EXISTS`, so an already-migrated database reports
-- "duplicate column" and stops — that is the intended signal.
--
-- What was wrong:
--
--   1. concept_domain was a junk drawer. 007 introduced it as the discipline
--      of a `concept` card (theology, psychology, …), but in practice the
--      *root* a card came from was written there. 249 cards browsed as 146
--      domains, so grouping by domain said nothing. The root was never at risk
--      — `root_norm` holds it — but the old value is preserved in
--      `concept_topic` anyway, because a handful of cards used it for
--      something else (mushtaqq, jamid, masdar, ayah, expression).
--
--   2. deck_type was supposed to carry the module code — deckForModule() looks
--      a deck up by it — but the five decks were seeded with 'quran',
--      'concept', 'fusha'. So no deck was ever found by module: enrolling a
--      card would have created a *second* Qurʾān deck, and the client, which
--      reads the module off deck_type, filed all five under "Other decks".
--
--   3. There were four root decks. English Language is the fifth pillar.

-- 1. The old free-text domain, kept.
ALTER TABLE core_srs_card ADD COLUMN concept_topic TEXT;
UPDATE core_srs_card
   SET concept_topic = concept_domain
 WHERE concept_domain IS NOT NULL AND concept_topic IS NULL;

-- 2. The domain is now the pillar, derived from the module. The worker writes
--    it on every card write; a client cannot set it.
UPDATE core_srs_card
   SET concept_domain = CASE module
         WHEN 'QR' THEN 'Quran'
         WHEN 'AR' THEN 'Arabic'
         WHEN 'AL' THEN 'Arabic Linguistics'
         WHEN 'WV' THEN 'WorldView'
         WHEN 'EN' THEN 'English Language'
         ELSE concept_domain
       END,
       updated_at = datetime('now');

-- 3. deck_type carries the module code, which is what deckForModule() reads.
UPDATE core_srs_deck
   SET deck_type = UPPER(slug), updated_at = datetime('now')
 WHERE id IN ('DECK:QR', 'DECK:AL', 'DECK:AR', 'DECK:WV', 'DECK:EN');

-- 4. The fifth pillar. Seeded for the owner of the existing tree; a fresh
--    database gets it from deckForModule() on first enrolment.
INSERT OR IGNORE INTO core_srs_deck
  (id, user_ref, workspace_id, title, deck_type, description, is_shared,
   meta_json, parent_id, slug, sort_order, new_per_day, review_per_day,
   limit_scope)
SELECT 'DECK:EN', user_ref, NULL, 'English Language', 'EN',
       'English language: vocabulary, usage, expression, rhetoric.', 0,
       '{"module":"EN","content_db":"km_content","pillar":5}',
       NULL, 'en', 50, 5, 30, 'tree'
  FROM core_srs_deck WHERE id = 'DECK:QR';

-- 5. 'EN' in the module CHECK. This is a table rebuild, and the reason it is
--    written out step by step rather than as a neat recipe is that the neat
--    recipe loses data here: `DROP TABLE core_srs_card` performs an implicit
--    DELETE, which fires ON DELETE CASCADE into core_srs_review (1121 rows of
--    imported Anki history), core_srs_card_surah (4397) and
--    core_srs_card_concept (8). They are copied out first and copied back.
--
--    Applied live on 2026-08-15 in exactly this order, verified after: 249
--    cards, 1121 reviews, 4397 surah links, 8 concepts, 0 orphaned reviews.
--    The bkp_* tables were kept.
--
--    Two things also had to be handled that are not obvious from the recipe:
--    ALTER TABLE ... RENAME re-parses every view in the schema, and ten cyb_*
--    views were *already* broken (they reference cyb_card, cyb_review and
--    cyb_source, none of which exist). They must be dropped before the rename
--    and recreated verbatim after, or the rename fails.

CREATE TABLE bkp_srs_review_20260815     AS SELECT * FROM core_srs_review;
CREATE TABLE bkp_srs_card_surah_20260815 AS SELECT * FROM core_srs_card_surah;
CREATE TABLE bkp_srs_card_concept_20260815 AS SELECT * FROM core_srs_card_concept;
CREATE TABLE bkp_srs_card_20260815       AS SELECT * FROM core_srs_card;

-- core_srs_card_new: the same table with 'EN' in the module CHECK and every
-- column that had been added live (concept_topic included). Then:
--   INSERT INTO core_srs_card_new (…) SELECT … FROM core_srs_card;
--   DROP VIEW cyb_due, cyb_stage_study, cyb_ss_study, cyb_ss_retention,
--             cyb_root_study, cyb_root_retention, cyb_ss_surah_review,
--             cyb_source_fetch, cyb_source_board, cyb_source_coverage;
--   DROP TABLE core_srs_card;
--   ALTER TABLE core_srs_card_new RENAME TO core_srs_card;
--   INSERT INTO core_srs_review      SELECT * FROM bkp_srs_review_20260815;
--   INSERT INTO core_srs_card_surah  SELECT * FROM bkp_srs_card_surah_20260815;
--   INSERT INTO core_srs_card_concept SELECT * FROM bkp_srs_card_concept_20260815;
--   CREATE INDEX core_srs_card_due / _deck / _res / idx_srs_card_kind /
--                ix_card_library_ref;
--   recreate the ten views verbatim.
--
-- The full statements are in schema.sql, which now matches the live database.
