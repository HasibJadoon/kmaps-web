-- Backlog rows for books already read aloud in the app: the book's Shamela text carries timed audio
-- (ar_acq_audio on ACQ:SHM:*, aligned by kmaps-resources scripts/book-audio), so the source is not
-- waiting — كليلة ودمنة (6321), البخلاء (3832), صيد الخاطر (4435), أخبار الحمقى (4007), رحلة ابن بطوطة (4424).
-- The same 'in_app' status as 0075; the TV drama «من وحي البخلاء» is a different source and stays queued.
UPDATE ar_intake_item SET status = 'in_app', updated_at = datetime('now')
 WHERE parent_id IS NULL AND status IN ('logged', 'queued')
   AND id IN ('IN:yt:PLgoV8VVC2I1A6fBM-4zw5RiFUcFbURl_l', 'IN:yt:PLv0a1Mm8pOWhMYd_ESgEPce8hfvFTx-Cn',
              'IN:yt:ThcSS6hg-Gk', 'IN:yt:z80AnLG-eL0', 'IN:yt:PLV2pvap3uE6A13TrSpOpp8G72_Vhs8TiW',
              'IN:yt:RJLM0v33gFM', 'IN:yt:PLyQJn2lI4gjOeEFYmj77B8104wEYoY2-9');
