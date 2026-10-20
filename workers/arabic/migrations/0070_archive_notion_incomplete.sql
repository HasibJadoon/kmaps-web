-- The Notion import was never complete: raw captions, session codes for titles ("BR-8-S32:2-3"), stray lists
-- ("Idioms"). A Notion work is kept only where someone worked it through — a reconstructed scene script (all 163 such
-- works have their scenes and their recording; the Arabic path, series and scenes are built on them). Every other
-- live Notion work is archived, with its recordings, so it leaves the rooms, the shelves, Read and Listening.
--
-- Archived, not deleted, and marked: to bring them back,
--   UPDATE ar_acquisition_ref SET status = 'live', meta_json = json_remove(meta_json, '$.archived')
--    WHERE json_extract(meta_json, '$.archived.reason') = 'notion-incomplete';
--   UPDATE ar_acq_audio SET status = 'live', meta_json = json_remove(meta_json, '$.archived')
--    WHERE json_extract(meta_json, '$.archived.reason') = 'notion-incomplete';

UPDATE ar_acq_audio
   SET status = 'archived',
       meta_json = json_set(COALESCE(meta_json, '{}'), '$.archived',
                            json_object('reason', 'notion-incomplete', 'at', datetime('now')))
 WHERE status = 'live'
   AND acq_ref_id IN (
     SELECT r.id FROM ar_acquisition_ref r
      WHERE r.status = 'live'
        AND json_extract(r.meta_json, '$.ar_no') IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM ar_text_unit t WHERE t.acq_ref_id = r.id AND t.script_json IS NOT NULL));

UPDATE ar_acquisition_ref
   SET status = 'archived',
       meta_json = json_set(COALESCE(meta_json, '{}'), '$.archived',
                            json_object('reason', 'notion-incomplete', 'at', datetime('now')))
 WHERE status = 'live'
   AND json_extract(meta_json, '$.ar_no') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM ar_text_unit t WHERE t.acq_ref_id = ar_acquisition_ref.id AND t.script_json IS NOT NULL);

UPDATE kmaps_cache_version SET version = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = datetime('now') WHERE family = 'content';
