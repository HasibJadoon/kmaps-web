-- ─── A card sits in its own owner's deck ─────────────────────────────────────
--
-- `core_srs_card` is UNIQUE (deck_id, resource_ref, card_template) — with no
-- user_ref. Read alone that says two people cannot both hold a card on 44:9,
-- and the audit flagged it as blocking the second learner in a household.
--
-- It is safe, but only because of something the constraint does not say.
-- `deckForModule` (routes/srs.ts:461) looks up a deck by (user_ref, deck_type)
-- and creates one when there is none, so every card-creating path puts a card
-- in a deck belonging to that same person. Per-user decks make a per-deck key
-- a per-user key. The invariant is real; it was simply nowhere written down and
-- nothing enforced it.
--
-- Rewriting the constraint would mean rebuilding the table, and with
-- foreign_keys ON a DROP of core_srs_card performs an implicit DELETE that
-- cascades — into 1,125 rows of real review history, five years of it imported
-- from Anki. That is not a risk worth taking to restate a rule the code
-- already follows. Write the rule down and enforce it instead.

-- ── The three rows that break it ─────────────────────────────────────────────
--
-- Test debris: two cards under a CORE: id that matches no user, and one under
-- the bare string 'hasib', which is not even a ref. All three sit in someone
-- else's deck, all three have zero reviews, and no FK ever caught them because
-- no user_ref column in this database has a foreign key.
DELETE FROM core_srs_card
 WHERE user_ref NOT IN (SELECT id FROM core_users);

-- ── The rule, enforced ───────────────────────────────────────────────────────
--
-- A trigger rather than a CHECK: the condition spans two tables, and SQLite's
-- CHECK cannot. Written for insert and for update, because moving a card
-- between decks is the other way to break it.
--
-- The failure message is the sentence somebody will read at 1am, so it says
-- what to do rather than what happened.
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
