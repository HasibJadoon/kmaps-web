-- qr_193 — owner 2026-11-25: "ask me; if I answer correctly then don't add". A frequent item stays a 'candidate' until the
-- owner is quizzed on it: answered right → deleted (and listed as known in the script, never re-seeded); missed → 'active'.
-- Items the owner already missed in practice are 'active' from the start.
ALTER TABLE qr_tafsir_lang_core ADD COLUMN state TEXT NOT NULL DEFAULT 'candidate' CHECK (state IN ('candidate','active'));
