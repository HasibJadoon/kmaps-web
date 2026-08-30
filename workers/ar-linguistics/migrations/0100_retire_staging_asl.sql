INSERT OR IGNORE INTO ar_ling_root_asl (
  id, root_norm, root_id, statement_ar, statement_en, statement_ur,
  source_slug, source_id, page_ref, volume_no, note_md, confidence, status
)
SELECT
  'ASL:' || c.root_norm || ':' || c.source_slug,
  c.root_norm,
  c.root_id,
  COALESCE(c.quote_ar, json_extract(c.payload_json, '$.text.ar')),
  COALESCE(json_extract(c.payload_json, '$.text.en'), c.gloss_en),
  COALESCE(json_extract(c.payload_json, '$.text.ur'), c.gloss_ur),
  c.source_slug,
  c.source_native_id,
  CASE WHEN c.page_no IS NULL THEN NULL ELSE CAST(c.page_no AS TEXT) END,
  c.volume_no,
  c.reviewer_note_md,
  CASE c.confidence WHEN 'attested' THEN 'high' WHEN 'proposed' THEN 'medium' ELSE 'low' END,
  'draft'
FROM ar_ling_stg_claim c
WHERE c.sub_code = '12-ASL'
  AND COALESCE(c.quote_ar, json_extract(c.payload_json, '$.text.ar')) IS NOT NULL;
