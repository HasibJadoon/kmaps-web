-- صيد الخاطر's recording is already in the app (km_arabic ACQ:SHM:4435, timed to its text), so the WV
-- pipeline has its audio and transcript: 'fetched', not 'queued' — the driver must not download it again.
-- What WV still does with it (arc_audio onto the work's corpus) starts from 'fetched'.
UPDATE wv_intake_pipeline SET stage = 'fetched', updated_at = datetime('now')
 WHERE intake_ref = 'AR:IN:yt:ThcSS6hg-Gk' AND stage = 'queued';
