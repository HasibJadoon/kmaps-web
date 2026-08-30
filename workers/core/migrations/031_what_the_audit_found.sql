-- ─── Constraints the empty tables can still afford ───────────────────────────
--
-- Every table touched here holds zero rows today: core_bank_attempt,
-- core_bank_response, core_bank_profile. That is the whole reason to do this
-- now. A UNIQUE constraint added before the first session costs nothing; added
-- after it, it costs a data migration and an argument about which duplicate to
-- keep.
--
-- Additive only — no table is rebuilt here. The one change that DOES need a
-- rebuild (core_srs_card's uniqueness key, which today has no user_ref while
-- DECK:QR holds three people's cards) is deliberately left to its own
-- migration, because it has 269 live rows and 1,125 reviews hanging off it.

-- ── An answer happens at a time ──────────────────────────────────────────────
--
-- There was no timestamp on a response at all, which is why the elapsed time
-- had to be taken from the client: the server had nothing to measure from.
-- With this, latency is the gap between when the person became free to look at
-- the question — the attempt starting, or their previous answer landing — and
-- now. Both ends are the server's.
ALTER TABLE core_bank_response ADD COLUMN created_at TEXT
  NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'));

-- ── One answer per item per attempt ──────────────────────────────────────────
--
-- Without this the same item can be POSTed a hundred times in one attempt:
-- points accumulate, the item's own times_shown/times_correct inflate, and the
-- shared scorecard is farmable by anybody who can write a loop.
--
-- core_quiz_answer got this right on the day it was written —
-- UNIQUE (session_ref, question_ref, user_ref), migration 022. The newer table
-- lost the constraint the older one had.
CREATE UNIQUE INDEX IF NOT EXISTS ux_bank_response_once
  ON core_bank_response (attempt_ref, item_ref);

-- ── The scan that reads a quiz pack ──────────────────────────────────────────
--
-- A quiz round has no units, so its items are found by "belongs to this pack
-- and to no unit" — a NOT EXISTS against core_bank_unit_item. The primary key
-- is (unit_ref, item_ref), so item_ref is not a prefix of anything and that
-- subquery scans the whole membership table once per candidate item.
-- EXPLAIN QUERY PLAN confirmed: SCAN ui USING COVERING INDEX.
--
-- It is also the index D1 needs on every delete of an item, since
-- core_bank_unit_item.item_ref is a foreign key with ON DELETE CASCADE and
-- foreign_keys is ON.
CREATE INDEX IF NOT EXISTS ix_bank_unit_item_item
  ON core_bank_unit_item (item_ref);

-- ── The other child sides of a foreign key ───────────────────────────────────
--
-- Same reason: with enforcement on, deleting a parent scans the child table
-- unless the referencing column is indexed. Each of these is a RESTRICT, so
-- the scan happens on every attempted delete, successful or not.
CREATE INDEX IF NOT EXISTS ix_bank_unit_parent
  ON core_bank_unit (parent_ref);
CREATE INDEX IF NOT EXISTS ix_bank_attempt_unit
  ON core_bank_attempt (unit_ref);
CREATE INDEX IF NOT EXISTS ix_bank_import_pack
  ON core_bank_import (pack_ref);

-- ── A learner's own cards, without reading everyone else's ───────────────────
--
-- The path query matches on module and filters user_ref afterwards, because
-- core_srs_card_res (module, resource_ref) hands it the GROUP BY ordering for
-- free. With one learner that is invisible; with a household it reads every
-- other person's cards on every path load.
CREATE INDEX IF NOT EXISTS ix_srs_card_user_module_res
  ON core_srs_card (user_ref, module, resource_ref);

-- ── One spelling for one step ────────────────────────────────────────────────
--
-- cyb_process_step is the registry: the value is `sentence_structure`. Eleven
-- generated questions say `structure`, which matches nothing, so they are
-- invisible to every picker built on the registry.
--
-- Migration 024 declined to put a CHECK on this column, reasoning that a copy
-- of the vocabulary here would be a second place to keep in step. That was
-- right about the cost and wrong about the risk: the drift arrived four
-- migrations later. The CHECK is not added here because this table is being
-- retired into core_bank_item, which already CHECKs its own vocabulary.
UPDATE core_quiz_question SET step_key = 'sentence_structure'
 WHERE step_key = 'structure';
