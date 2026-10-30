-- Owner, 2026-10-30: "I cannot see series Muʿāwiya, Ḥasan and others, just ʿUmar". 0070 archived every Notion work
-- without a reconstructed scene script, which took the series away with the raw imports. The series proper come back —
-- their episodes and recordings — with the captions they have, and the series scene clips (AR-1030, AR-1120; owner:
-- "All series scenes"). The other shelves stay archived.
UPDATE ar_acquisition_ref
   SET status = 'live', meta_json = json_remove(meta_json, '$.archived')
 WHERE json_extract(meta_json, '$.archived.reason') = 'notion-incomplete'
   AND json_extract(meta_json, '$.ar_no') IN (
     SELECT ar_no FROM ar_acq_entry
      WHERE parent_ar_no IN ('AR-550','AR-585','AR-620','AR-795','AR-830','AR-865','AR-910','AR-1226','AR-1257','AR-1030','AR-1120'));

UPDATE ar_acq_audio
   SET status = 'live', meta_json = json_remove(meta_json, '$.archived')
 WHERE json_extract(meta_json, '$.archived.reason') = 'notion-incomplete'
   AND acq_ref_id IN (
     SELECT r.id FROM ar_acquisition_ref r JOIN ar_acq_entry e ON e.ar_no = json_extract(r.meta_json, '$.ar_no')
      WHERE e.parent_ar_no IN ('AR-550','AR-585','AR-620','AR-795','AR-830','AR-865','AR-910','AR-1226','AR-1257','AR-1030','AR-1120'));

UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE family = 'content';
