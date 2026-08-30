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
