-- Core identity reads the root's identity, not the books it appears in.
--
-- بين's Core identity read 91 rows. One of them — its row in ar_ling_roots —
-- was its identity. The other 90 were 52 lexicon entry sections, 27 question-
-- bank rows, 8 source chunks and 3 book pages: material that belongs to
-- Sources, to Memlets, to the books. The screen said so out loud and nobody
-- heard it, because the header chip read "2 tables" while the reading below
-- counted five.
--
-- Those are the registry's two halves disagreeing. `ar_ling_reg_sub_layer`
-- DECLARES which tables carry a sub-layer (00-CORE declares exactly
-- ar_ling_roots and ar_ling_root_lugha); `ar_ling_reg_table_map` BINDS tables
-- to sub-layers for reading. 74 of the 76 declared tables agree. But 67 more
-- were bound with nothing declaring them, and 00-CORE — first in the list —
-- collected 29 of them.
--
-- The rule this settles: a table carries a sub-layer because that sub-layer
-- declares it. Undeclared is not a default home; it is a table nobody has
-- placed yet, and it must not be counted anywhere.

-- ── 1. The two outright disagreements: the declaration wins ──────────────────
UPDATE ar_ling_reg_table_map SET sub_code = '72-MEM'
 WHERE table_name = 'ar_ling_learn_memory_hook';   -- 72-MEM already declares it
UPDATE ar_ling_reg_table_map SET sub_code = '22-BAB'
 WHERE table_name = 'ar_ling_root_form_family';    -- 22-BAB already declares it

-- ── 2. The eight undeclared direct carriers ─────────────────────────────────
-- Each was silently counted by whichever band it had been dropped into. Four
-- sat in 00-CORE. They move to the band whose subject they actually are, and
-- that band declares them, so binding and declaration now say the same thing.

-- Lexicon pages, entry sections and source chunks are source material.
UPDATE ar_ling_reg_table_map SET sub_code = '010-SRC'
 WHERE table_name IN ('ar_ling_lexicon_book_page',
                      'ar_ling_lexicon_entry_section',
                      'ar_ling_source_chunk');
UPDATE ar_ling_reg_sub_layer
   SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_lexicon_book_page')
 WHERE sub_code = '010-SRC' AND tables_json NOT LIKE '%ar_ling_lexicon_book_page%';
UPDATE ar_ling_reg_sub_layer
   SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_lexicon_entry_section')
 WHERE sub_code = '010-SRC' AND tables_json NOT LIKE '%ar_ling_lexicon_entry_section%';
UPDATE ar_ling_reg_sub_layer
   SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_source_chunk')
 WHERE sub_code = '010-SRC' AND tables_json NOT LIKE '%ar_ling_source_chunk%';

-- The question bank hangs off the memlets it drills.
UPDATE ar_ling_reg_table_map SET sub_code = '72-MEM'
 WHERE table_name = 'ar_ling_learn_question';
UPDATE ar_ling_reg_sub_layer
   SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_learn_question')
 WHERE sub_code = '72-MEM' AND tables_json NOT LIKE '%ar_ling_learn_question%';

-- These three were already bound to the right band; only the declaration was
-- missing, which is what let them count without being placed.
UPDATE ar_ling_reg_sub_layer
   SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_learn_lemma')
 WHERE sub_code = '70-VOCAB' AND tables_json NOT LIKE '%ar_ling_learn_lemma%';
UPDATE ar_ling_reg_sub_layer
   SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_root_lemma_link')
 WHERE sub_code = '40-LINK' AND tables_json NOT LIKE '%ar_ling_root_lemma_link%';
UPDATE ar_ling_reg_sub_layer
   SET tables_json = json_insert(tables_json, '$[#]', 'ar_ling_source_citation')
 WHERE sub_code = '40-LINK' AND tables_json NOT LIKE '%ar_ling_source_citation%';

-- ar_ling_lemma_arc stays bound to 20-GOV and undeclared: it is a lemma-scope
-- arc, and whether that belongs with Government or with the sense arcs (17-ARC)
-- is a content decision, not a registry one. The view below keeps it visible
-- until someone makes it, rather than letting it quietly count.

-- ── 3. The rule, as a check ─────────────────────────────────────────────────
-- A direct carrier no sub-layer declares is a table nobody has placed. It must
-- surface here rather than defaulting into whichever band it was dropped in.
DROP VIEW IF EXISTS v_ar_ling_carrier_undeclared;
CREATE VIEW v_ar_ling_carrier_undeclared AS
SELECT m.table_name, m.sub_code, m.root_bind, m.root_bind_col
  FROM ar_ling_reg_table_map m
 WHERE m.role = 'carrier' AND m.root_bind = 'direct'
   AND NOT EXISTS (SELECT 1 FROM ar_ling_reg_sub_layer s
                    WHERE s.sub_code = m.sub_code
                      AND s.tables_json LIKE '%"' || m.table_name || '"%');
