-- ─── A question is asked of someone ───────────────────────────────────────────
--
-- The deck is not a pile the table draws from. Each person keeps their own, and
-- a card in it is addressed: the wife asks Hasib, Hasib asks Arham, Arham asks
-- Hasib back. Everyone writes theirs during the day and they get played at
-- dinner.
--
-- That is a different object from a conversation prompt nobody owns, and it
-- needs two things the deck did not have: who the question is FOR, and whether
-- it has been asked yet — because a question written on Tuesday and asked on
-- Tuesday should not come back on Wednesday while the ones nobody got to still
-- have not been heard.
ALTER TABLE core_talk_card ADD COLUMN for_name TEXT;
-- The account, when the person is one. `for_name` is what gets drawn either
-- way: a family table has people in it who do not have a login, and a card for
-- them is not less of a card.
ALTER TABLE core_talk_card ADD COLUMN for_ref TEXT;
ALTER TABLE core_talk_card ADD COLUMN asked_at TEXT;

CREATE INDEX IF NOT EXISTS ix_talk_card_for ON core_talk_card (for_name, asked_at);
