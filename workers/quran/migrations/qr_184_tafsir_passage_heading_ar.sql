-- Each editor's passage carries its topic in Arabic (owner, 2026-11-04: "transition narration heading … topic statement
-- Arabic headings"): set under the English heading, and said by the Arabic narration as it turns to the passage
-- (its time there is qr_tafsir_passage_audio_ar.times_json "h<seq_from>"). Authored in kmaps-resources
-- data/tafsir/<passage>_headings_ar.json.
ALTER TABLE qr_tafsir_passage_heading ADD COLUMN heading_ar TEXT;
