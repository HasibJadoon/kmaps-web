INSERT OR IGNORE INTO ar_ling_root_scholarship (
  id, source_id, source_slug, source_native_id, root_id, root_norm,
  reading_kind, title_en, body_md, body_plain, page_no, status
)
SELECT
  'SCH:' || c.root_norm || ':' || c.source_slug || ':' || substr(c.id, 1, 8),
  s.id,
  c.source_slug,
  c.source_native_id,
  c.root_id,
  c.root_norm,
  COALESCE(c.claim_type, 'general'),
  c.gloss_en,
  COALESCE(json_extract(c.payload_json, '$.text.ar'), c.quote_ar),
  c.quote_ar,
  c.page_no,
  'draft'
FROM ar_ling_stg_claim c
JOIN ar_ling_source s ON s.slug = c.source_slug
WHERE c.sub_code = '52-SCHOL';
