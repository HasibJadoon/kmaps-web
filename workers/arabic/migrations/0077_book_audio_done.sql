-- Books read aloud in the app (Shamela text + timed audio from kmaps-resources scripts/book-audio) said
-- audio_state 'none', and their intake rows sat 'queued' in ar_intake_pipeline — the stage
-- intake-pipeline/pipeline.py fetches from — so the driver would download them again.
-- 1. A work whose audio is aligned to its text says so.
UPDATE ar_acquisition_ref SET audio_state = 'aligned'
 WHERE audio_state = 'none'
   AND id IN (SELECT DISTINCT acq_ref_id FROM ar_acq_audio WHERE aligned = 1 AND status = 'live');

-- 2. Their intake items are done in the AR pipeline, each pointing at the work it became.
UPDATE ar_intake_pipeline SET stage = 'live', updated_at = datetime('now'),
       target_ref = CASE intake_id
         WHEN 'IN:yt:PLv0a1Mm8pOWhMYd_ESgEPce8hfvFTx-Cn' THEN 'ACQ:SHM:6321'   -- كليلة ودمنة
         WHEN 'IN:yt:PLgoV8VVC2I1A6fBM-4zw5RiFUcFbURl_l' THEN 'ACQ:SHM:3832'   -- البخلاء
         WHEN 'IN:yt:ThcSS6hg-Gk'                        THEN 'ACQ:SHM:4435'   -- صيد الخاطر
         WHEN 'IN:yt:RJLM0v33gFM'                        THEN 'ACQ:SHM:4007'   -- أخبار الحمقى والمغفلين
         WHEN 'IN:yt:PLyQJn2lI4gjOeEFYmj77B8104wEYoY2-9' THEN 'ACQ:SHM:4424'   -- رحلة ابن بطوطة
       END
 WHERE stage = 'queued'
   AND intake_id IN ('IN:yt:PLv0a1Mm8pOWhMYd_ESgEPce8hfvFTx-Cn', 'IN:yt:PLgoV8VVC2I1A6fBM-4zw5RiFUcFbURl_l',
                     'IN:yt:ThcSS6hg-Gk', 'IN:yt:RJLM0v33gFM', 'IN:yt:PLyQJn2lI4gjOeEFYmj77B8104wEYoY2-9');
