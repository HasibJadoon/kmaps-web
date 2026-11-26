-- qr_190 — study priority for weak points (owner 2026-11-25: frequent tafsīr phrases and translation rules learnt first).
-- corpus_n = tafsīr blocks (qr_tafsir_block_norm_fts, all books) holding the item; is_rule = a translation rule that applies
-- everywhere; priority 1 (highest) … 3, computed by kmaps-resources/scripts/quran/tafsir_practice.py rank.
ALTER TABLE qr_tafsir_practice_weak ADD COLUMN corpus_query TEXT;
ALTER TABLE qr_tafsir_practice_weak ADD COLUMN corpus_n INTEGER;
ALTER TABLE qr_tafsir_practice_weak ADD COLUMN is_rule INTEGER NOT NULL DEFAULT 0;
ALTER TABLE qr_tafsir_practice_weak ADD COLUMN priority INTEGER NOT NULL DEFAULT 2;
