ALTER TABLE core_srs_card ADD COLUMN concept_topic TEXT;
UPDATE core_srs_card
   SET concept_topic = concept_domain
 WHERE concept_domain IS NOT NULL AND concept_topic IS NULL;

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

UPDATE core_srs_deck
   SET deck_type = UPPER(slug), updated_at = datetime('now')
 WHERE id IN ('DECK:QR', 'DECK:AL', 'DECK:AR', 'DECK:WV', 'DECK:EN');

INSERT OR IGNORE INTO core_srs_deck
  (id, user_ref, workspace_id, title, deck_type, description, is_shared,
   meta_json, parent_id, slug, sort_order, new_per_day, review_per_day,
   limit_scope)
SELECT 'DECK:EN', user_ref, NULL, 'English Language', 'EN',
       'English language: vocabulary, usage, expression, rhetoric.', 0,
       '{"module":"EN","content_db":"km_content","pillar":5}',
       NULL, 'en', 50, 5, 30, 'tree'
  FROM core_srs_deck WHERE id = 'DECK:QR';

CREATE TABLE bkp_srs_review_20260815     AS SELECT * FROM core_srs_review;
CREATE TABLE bkp_srs_card_surah_20260815 AS SELECT * FROM core_srs_card_surah;
CREATE TABLE bkp_srs_card_concept_20260815 AS SELECT * FROM core_srs_card_concept;
CREATE TABLE bkp_srs_card_20260815       AS SELECT * FROM core_srs_card;
