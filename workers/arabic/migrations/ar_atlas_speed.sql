-- The atlas home read 11.6M rows (owner, 2026-10-25: "why arabic atlas take time to load"): each work's audio was
-- found by scanning every audio row. Index both keys the lookup uses.
CREATE INDEX IF NOT EXISTS idx_ar_audio_ref ON ar_acq_audio(acq_ref_id, status);
CREATE INDEX IF NOT EXISTS idx_ar_audio_title ON ar_acq_audio(title_ar, status);
