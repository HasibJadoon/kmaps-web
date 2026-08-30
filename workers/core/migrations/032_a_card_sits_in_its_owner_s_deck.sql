DELETE FROM core_srs_card
 WHERE user_ref NOT IN (SELECT id FROM core_users);

DROP TRIGGER IF EXISTS trg_srs_card_deck_owner_ins;
CREATE TRIGGER trg_srs_card_deck_owner_ins
BEFORE INSERT ON core_srs_card
FOR EACH ROW
WHEN (SELECT user_ref FROM core_srs_deck WHERE id = NEW.deck_id) IS NOT NULL
 AND (SELECT user_ref FROM core_srs_deck WHERE id = NEW.deck_id) <> NEW.user_ref
BEGIN
  SELECT RAISE(ABORT,
    'a card must go in its own owner''s deck — use deckForModule to find or create one');
END;

DROP TRIGGER IF EXISTS trg_srs_card_deck_owner_upd;
CREATE TRIGGER trg_srs_card_deck_owner_upd
BEFORE UPDATE OF deck_id, user_ref ON core_srs_card
FOR EACH ROW
WHEN (SELECT user_ref FROM core_srs_deck WHERE id = NEW.deck_id) IS NOT NULL
 AND (SELECT user_ref FROM core_srs_deck WHERE id = NEW.deck_id) <> NEW.user_ref
BEGIN
  SELECT RAISE(ABORT,
    'a card must stay in its own owner''s deck');
END;
