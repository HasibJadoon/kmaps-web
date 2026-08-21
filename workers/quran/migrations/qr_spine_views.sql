-- The two spines, as views.
--
-- Lexical:  Qurʾān → root → lemma → word occurrence
-- Textual:  Qurʾān → surah → passage → sentence → clause → phrase → word,
--           each scope carrying canonical naḥw / balāgha / iʿrāb terms
--
-- They meet at one coordinate — (surah, ayah, word_index) — and v_word_term
-- is that meeting made queryable.

DROP VIEW IF EXISTS v_word_term;
DROP VIEW IF EXISTS v_ss_scope_term;
DROP VIEW IF EXISTS v_ss_scope_span;
DROP VIEW IF EXISTS v_root_lemma_word;

-- ── Lexical spine ────────────────────────────────────────────────────────
--
-- Grouping is by lemma_ref, never by the lemma string: the surface form
-- over-splits. كتب has 9 distinct lemma strings but 7 lemma_refs — كِتَٰب 259
-- plus an unvocalised "كتاب" tagged with a lowercase pos is one lemma of 260,
-- and كَاتِب tagged N, ADJ and V is one lemma of 6. 42 root+lemma_ref pairs
-- across the Qurʾān have this split, so it is systematic, not a كتب quirk.
CREATE VIEW v_root_lemma_word AS
SELECT w.root, w.root_uid, w.lemma_ref, w.lemma AS lemma_surface,
       w.id AS word_occ_id, w.surah, w.ayah, w.word_index,
       w.word_text, w.pos, w.morphology_tag,
       w.surah || ':' || w.ayah AS ayah_key
  FROM qr_word_occurrence w;

-- ── Textual spine: every scope reduced to one span ───────────────────────
--
-- A sentence, a clause, a phrase and a word are four grains of the same
-- thing: a stretch of the mushaf. Normalising them to one span is what lets a
-- term attached at ANY grain be resolved down to the words it covers.
-- word_start/word_end are NULL on the one sentence that lacks them; a NULL
-- start means the span is the whole ayah range.
CREATE VIEW v_ss_scope_span AS
  SELECT 'sentence' AS scope_type, id AS scope_id, surah,
         ayah_from, ayah_to, word_start_index AS word_start, word_end_index AS word_end
    FROM qr_ss_occ_sentence
  UNION ALL
  SELECT 'clause', id, surah, ayah_from, ayah_to, word_start_index, word_end_index
    FROM qr_ss_occ_clause
  UNION ALL
  SELECT 'phrase', id, surah, ayah, ayah, word_start_index, word_end_index
    FROM qr_ss_occ_phrase
  UNION ALL
  SELECT 'word', id, surah, ayah, ayah, word_index, word_index
    FROM qr_word_occurrence;

-- ── Textual spine: every link reduced to one canonical term ──────────────
--
-- Three link tables, one shape. The term is always a namespaced canonical id
-- —  GT:balagha_maani:ijaz_hadhf, GT:nawasikh:inna_wa_akhawatuha,
-- AL:nahw:mudaf_ilayh — so family and key are split out here and never parsed
-- again downstream.
CREATE VIEW v_ss_scope_term AS
  SELECT scope_type, scope_id, 'balagha' AS discipline, lx_balagha_ref AS term_ref,
         balagha_category AS category, rhetorical_effect AS note, gloss_json
    FROM qr_ss_scope_balagha_link
  UNION ALL
  SELECT scope_type, scope_id, 'nahw', lx_grammar_ref, NULL, application_note, gloss_json
    FROM qr_ss_scope_grammar_link
  UNION ALL
  SELECT scope_type, scope_id, 'irab', lx_morph_ref, syntactic_function, irab_position, NULL
    FROM qr_ss_scope_morph_link;

-- ── The join ─────────────────────────────────────────────────────────────
--
-- One row per (word, term). A term attached at sentence scope lands on every
-- word of that sentence; a term attached at word scope lands on exactly one.
-- `attachment` says which, because the two are NOT the same claim: a balāgha
-- device on a sentence is about the sentence, and the words are only where it
-- can be seen.
CREATE VIEW v_word_term AS
SELECT w.root, w.root_uid, w.lemma_ref, w.lemma AS lemma_surface,
       w.id AS word_occ_id, w.surah, w.ayah, w.word_index, w.word_text,
       t.discipline, t.term_ref, t.category, t.note,
       t.scope_type AS attachment, t.scope_id
  FROM v_ss_scope_term t
  JOIN v_ss_scope_span s
    ON s.scope_type = t.scope_type AND s.scope_id = t.scope_id
  JOIN qr_word_occurrence w
    ON w.surah = s.surah
   AND w.ayah BETWEEN s.ayah_from AND s.ayah_to
   AND (s.word_start IS NULL OR w.word_index BETWEEN s.word_start AND s.word_end);
