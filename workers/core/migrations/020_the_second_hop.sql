-- The second hop — carriers that hang off a scope, not off the node
--
-- A passage node's ref reaches any carrier keyed on the passage. It reaches
-- nothing keyed on a *part* of the passage, and that is most of the syntactic
-- apparatus: `qr_ss_scope_*` bind on (scope_type, scope_id), the tree tables
-- bind on the tree, the discourse tables bind on the note. Fifty-six bindings
-- sat at `bind_kind = 'unset'` because the bridge had no way to say "reached
-- through a scope" — so `qr_ss_tree` was unreadable and the sentence detail had
-- nowhere to come from.
--
-- `bind_kind = 'scope'` says exactly that. Two shapes:
--
--   * the table carries a discriminator — one row set serves words, clauses and
--     sentences alike — so `bind_via` names that column and the request's scope
--     type is matched against it;
--   * the table serves one kind of scope only, so `bind_via` is null and
--     `scope_kind` names the scope it answers to.
--
-- A scope-bound carrier is never read from a node's own ref: there is no value
-- on the node that means "sentence 7 of this passage". The engine and the node
-- reader both skip `scope`, and the scope endpoint is the only way in.
--
-- ── Applying this ────────────────────────────────────────────────────────────
--
-- `bind_kind` carried a CHECK of ('text','id','none','unset'), so widening the
-- vocabulary means rebuilding the table — SQLite cannot alter a constraint.
-- Run these one statement at a time; D1 rejects a file that mixes DDL with
-- UPDATEs, and returns `D1_RESET_DO` rather than naming the reason.
--
--   1. CREATE TABLE cyb_carrier_binding_new (… CHECK (bind_kind IN
--        ('text','id','none','unset','scope')) …)  -- otherwise identical
--   2. INSERT INTO cyb_carrier_binding_new SELECT * FROM cyb_carrier_binding;
--   3. DROP TABLE cyb_carrier_binding;
--   4. ALTER TABLE cyb_carrier_binding_new RENAME TO cyb_carrier_binding;
--
-- Step 4 validates every view in the database, so it fails while any view is
-- broken. Ten were already dead — `cyb_due`, `cyb_root_study`, `cyb_ss_study`,
-- `cyb_root_retention`, `cyb_ss_retention`, `cyb_ss_surah_review`,
-- `cyb_stage_study`, `cyb_source_board`, `cyb_source_coverage`,
-- `cyb_source_fetch` — all reading `cyb_card` or `cyb_source`, dropped when
-- staging was retired. They were dropped rather than repaired: nothing selects
-- from them and the tables they read are gone for good.
--
-- Three live ones (`v_cyb_binding_broken`, `v_cyb_binding_unresolved`,
-- `v_cyb_process_doc`) name `cyb_carrier_binding` itself, which does not exist
-- between steps 3 and 4. Drop them before the rename and recreate them after;
-- their definitions are unchanged.

-- ── Tables with their own discriminator ──────────────────────────────────────
-- One row set, several scope types: 620 morph links are words, 47 grammar links
-- are sentences, and the request says which is wanted.

UPDATE cyb_carrier_binding
   SET bind_kind = 'scope', bind_col = 'scope_id', bind_via = 'scope_type'
 WHERE status = 'live' AND domain = 'quran'
   AND table_name IN ('qr_ss_scope_morph_link', 'qr_ss_scope_grammar_link',
                      'qr_ss_scope_balagha_link', 'qr_ss_scope_nuance',
                      'qr_ss_scope_reading', 'qr_ss_scope_member_map',
                      'qr_ss_discourse_note');

-- `qr_ss_scope_link` names both ends of a relation; a scope's own links are the
-- ones it is the source of.
UPDATE cyb_carrier_binding
   SET bind_kind = 'scope', bind_col = 'from_scope_id', bind_via = 'from_scope_type'
 WHERE status = 'live' AND domain = 'quran' AND table_name = 'qr_ss_scope_link';

-- ── Tables that answer one scope ─────────────────────────────────────────────
-- `scope_kind` carries which. These were all filed under 'sentence' whatever
-- they actually hang off, which is why a tree node claimed to be sentence-scoped
-- while binding on a tree.

UPDATE cyb_carrier_binding
   SET bind_kind = 'scope', bind_col = 'sentence_id', bind_via = NULL,
       scope_kind = 'sentence'
 WHERE status = 'live' AND domain = 'quran'
   AND table_name IN ('qr_ss_tree', 'qr_ss_ellipsis_event');

UPDATE cyb_carrier_binding
   SET bind_kind = 'scope', bind_col = 'tree_id', bind_via = NULL,
       scope_kind = 'tree'
 WHERE status = 'live' AND domain = 'quran'
   AND table_name IN ('qr_ss_tree_node', 'qr_ss_tree_edge', 'qr_ss_tree_layout');

UPDATE cyb_carrier_binding
   SET bind_kind = 'scope', bind_col = 'translation_unit_id', bind_via = NULL,
       scope_kind = 'translation_unit'
 WHERE status = 'live' AND domain = 'quran'
   AND table_name = 'qr_ss_translation_nuance';

UPDATE cyb_carrier_binding
   SET bind_kind = 'scope', bind_col = 'note_id', bind_via = NULL,
       scope_kind = 'discourse_note'
 WHERE status = 'live' AND domain = 'quran'
   AND table_name IN ('qr_ss_discourse_citation', 'qr_ss_discourse_source_link');

UPDATE cyb_carrier_binding
   SET bind_kind = 'scope', bind_col = 'reading_id', bind_via = NULL,
       scope_kind = 'scope_reading'
 WHERE status = 'live' AND domain = 'quran'
   AND table_name = 'qr_ss_scope_reading_evidence_link';

-- ── The words themselves ─────────────────────────────────────────────────────
-- `qr_ss_scope_morph_link` gives a word's parse and nothing of the word: no
-- surface, no position. An iʿrāb page with the parses and not the words is not
-- a page. `qr_word_occurrence` was bound once, at surah scope for vocabulary;
-- this binds it a second time at word scope, so one request for a sentence's
-- words returns both the surfaces and the parses.

INSERT OR IGNORE INTO cyb_carrier_binding
  (uid, domain, lane, layer_uid, band_uid, band_code, scope_kind,
   db_name, table_name, bind_col, bind_kind, bind_via, role, bind_note)
VALUES
  ('BIND:ss:300-40-JISR:qr_word_occurrence', 'quran', 'quran', 'quran:ss',
   'BND:ss:300-40-JISR', '300-40-JISR', 'word', 'km_quran',
   'qr_word_occurrence', 'id', 'scope', NULL, 'carrier',
   'the word surfaces the parses hang off');
