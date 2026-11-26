-- qr_195 — owner 2026-11-25: two English lines per sentence — literal (close to the Arabic's own wording and order) and natural
-- (model_en, idiomatic English). Plus model_ur in native Urdu idiom.
ALTER TABLE qr_tafsir_practice_attempt ADD COLUMN model_en_literal TEXT;
