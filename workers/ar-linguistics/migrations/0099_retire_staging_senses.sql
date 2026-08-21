-- Retire staging, part 1: 14-SENSE → ar_ling_root_sense.
--
-- 458 sense claims across 229 roots lived only in ar_ling_stg_claim, while the
-- carrier held 430 rows across 56. Dropping staging without this would have
-- lost the senses of 173 roots — real quoted lexicon material, not proposals.
--
-- The claim IS the sense: quote_ar is the witness's own words, payload.text
-- carries the trilingual reading, source_slug says which lexicon it came from.
-- sense_key is derived per root so the carrier's UNIQUE(scope_level, scope_key,
-- sense_key) holds; ids follow the house form SNS:<root>:<sense_key>.
INSERT OR IGNORE INTO ar_ling_root_sense (
  id, root_id, root_norm, scope_level, scope_key, sense_key,
  gloss_ar, gloss_en, gloss_ur, definition_md,
  sort_order, provenance_json, confidence, generated_by, source_slug, status
)
SELECT
  'SNS:' || x.root_norm || ':' || x.sense_key,
  x.root_id,
  x.root_norm,
  'root',
  x.root_norm,
  x.sense_key,
  COALESCE(json_extract(x.payload_json, '$.text.ar'), x.gloss_ar, x.quote_ar),
  COALESCE(json_extract(x.payload_json, '$.text.en'), x.gloss_en),
  COALESCE(json_extract(x.payload_json, '$.text.ur'), x.gloss_ur),
  x.quote_ar,
  x.n,
  json_array(json_object(
    'source_slug', x.source_slug,
    'source_native_id', x.source_native_id,
    'page_no', x.page_no,
    'volume_no', x.volume_no,
    'quote_ar', x.quote_ar,
    'from', 'ar_ling_stg_claim',
    'claim_id', x.id)),
  CASE x.confidence WHEN 'attested' THEN 0.9 WHEN 'proposed' THEN 0.7 ELSE 0.6 END,
  'migration:stg_claim_14_sense',
  x.source_slug,
  'draft'
FROM (
  SELECT c.*,
         ROW_NUMBER() OVER (PARTITION BY c.root_norm ORDER BY c.id) AS n,
         c.source_slug || '-' || ROW_NUMBER() OVER (PARTITION BY c.root_norm ORDER BY c.id) AS sense_key
    FROM ar_ling_stg_claim c
   WHERE c.sub_code = '14-SENSE'
) x;
