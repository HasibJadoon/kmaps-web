DROP TABLE IF EXISTS ar_qr_vocab_reviews;
DROP TABLE IF EXISTS ar_qr_vocab_cards;
DROP TABLE IF EXISTS ar_qr_vocab_progress;
DROP TABLE IF EXISTS ar_qr_vocab_decks;

CREATE INDEX IF NOT EXISTS idx_ar_srs_decks_type ON ar_srs_decks(core_user_ref, deck_type);
CREATE INDEX IF NOT EXISTS idx_ar_srs_cards_restype ON ar_srs_cards(deck_id, resource_type);
