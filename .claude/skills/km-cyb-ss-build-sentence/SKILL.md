---
name: km-cyb-ss-build-sentence
description: >-
  Complete one-sentence sentence-structure build cycle for K-Maps, driven by the cyb control plane.
  Takes ONE sentence node (CYB:quran:{s}:{a}-{b}:ss:{s}:{a}:s{n}) and runs four rounds in a single
  pass: (1) every registered iʿrāb book, one by one, classified as parses / defers / silent, with
  verbatim evidence; (2) every registered tafsīr book from D1 for that sentence, mined for balāgha,
  siyāq, munāsaba and ellipsis; (3) every grammar and balāgha term resolved to a GT: id in
  ar_ling_gram_term and bound to its source book; (4) the derived translation fold with a decision
  row per divergence. Then ticks cyb_sensor and asserts the sentence closes at 9/9 bands. Use for
  "build sentence X:Y fully", "all books in one go", "complete cycle", "cyb ss build", "one round
  all iʿrāb books", "fill all gaps and nuances for this sentence". Never fabricate a citation —
  deferral and silence are recorded outcomes, not gaps.
---

# K-Maps · Cybernetic SS Sentence Build (complete cycle)

One **sentence**, all books, one pass, ticked. The unit is the sentence node, never the āyah.
This skill assumes `kmaps-ss-builder` for schema detail; it governs the **order and completeness**
of a full build cycle.

**Databases**
`km_quran` `8dbd5053-c9b8-4dd0-9e45-1d66d3a58fba` · `km_arabic_linguistic` `192f4792-deb3-4f2e-9204-532cf484ecd2` · `km_core` `afe84ce7-04dd-45a1-99ac-f42ca53276d2`

## Round 0 — preconditions (fail fast)

```sql
-- 1. spans present? without them, leaf anchoring is undecidable on repeated tokens
SELECT id, word_start_index, word_end_index, is_virtual FROM qr_ss_occ_sentence WHERE id=:sent;
-- 2. tree anchored? every leaf must be anchored | segment | virtual
SELECT anchor_state, COUNT(*) FROM qr_ss_node_anchor WHERE sentence_id=:sent GROUP BY 1;
-- 3. node registered in the control plane?
SELECT id, meta_json FROM cyb_node WHERE target_ref=:sent AND piece_kind='sentence';  -- km_core
```
`unexpanded` or `unanchored` leaves ⇒ stop and finish `310-30` first. `is_virtual=1` ⇒ the sentence
is muqaddar; record the elision and exit — it is never scored.

## Round 1 — ALL iʿrāb books, one by one

Read the roster first, never a hardcoded list:

```sql
SELECT source_slug, source_role, source_order, locator_json
  FROM qr_ss_source_register WHERE band_code='310-40-IRAB' ORDER BY source_order;
```

Then pull **with the group-head range predicate**, not equality — several books file the whole
opening under one entry spanning many āyāt, and `ayah_from = :ayah` silently misses them:

```sql
SELECT source_slug, ayah_from, ayah_to, target_text_ar, grammar_role_ar, mahal_ar, entry_order,
       COALESCE(irab_text_ar, irab_text) txt
  FROM qr_irab_book_entry
 WHERE surah=:s AND ayah_from<=:a AND ayah_to>=:a
 ORDER BY source_slug, entry_order;
```

**Classify every registered book into exactly one of three states. All three are outcomes.**

| state | test | what to write |
|---|---|---|
| **parses** | a local iʿrāb statement exists | `qr_evidence` (verbatim AR + EN paraphrase) → `qr_ss_scope_reading` → `qr_ss_scope_reading_evidence_link` |
| **defers** | says تقدم / القول في نظائره تقدم / references another sūra | one `cross_reference` reading naming the target, cited to the deferring books |
| **silent** | no entry covers this āyah at all | named in the census reading; **no** evidence row |

Verify silence rather than assuming it:
`SELECT source_slug, MIN(ayah_from), MAX(ayah_to), COUNT(*) FROM qr_irab_book_entry WHERE surah=:s GROUP BY 1;`
(al-ʿUkbarī's Tibyān, for example, has no entry in al-Dukhān before 44:3 — that is silence, not deferral.)

Close the round with a **census reading** stating how many of the registered sources parse, defer,
and are silent. The band's source coverage then lives on the row instead of being re-derived.

One `qr_ss_scope_reading` per distinct position — never merge two books into one row when they
differ, and never split one book across rows. Set `is_minority` / `is_contested` honestly, and
`paradigm_ref` ∈ {jumhur, minority, synthesis, deferral}.

## Round 2 — ALL tafsīr books

```sql
SELECT source_slug, book_title_ar, author_en, death_ah, source_role
  FROM qr_ss_source_register WHERE band_code='310-70-SIYAQ' ORDER BY source_order;

SELECT id, work_id, scholar_id, ayah_from, ayah_to, content_ar
  FROM qr_tafsir_entry
 WHERE surah=:s AND ayah_from<=:a AND ayah_to>=:a ORDER BY work_id;
```

Same range predicate — tafsīr entries routinely span 1–10 āyāt. Mine each entry for four things
and file them in different bands:

- **balāgha** → `qr_ss_scope_balagha_link`, `lx_balagha_ref` = a `GT:balagha_*` id (`310-60`)
- **munāsaba / discourse force** → `qr_ss_scope_nuance` (`310-70`)
- **ellipsis / taqdīr** → `qr_ss_ellipsis_event` (`310-70`)
- **inter-sentential relation** → `qr_ss_scope_link` (`310-75`), with `source_basis`

A balāgha claim you inferred rather than read is legitimate — but say so in `note_md`, and expect
`provenance` to score below 1 until a source states it. Go back to the tafsīr for the grounding
before settling for the inference; al-Ālūsī's munāsaba paragraphs in particular carry explicit
statements about why an opening lands the way it does.

Every citation gets `qr_ss_discourse_citation` + `qr_ss_discourse_source_link`.

## Round 3 — every term resolved AND sourced

Two distinct obligations. Both are required.

**3a — resolve.** Every `lx_grammar_ref` and `lx_balagha_ref` must be a real `ar_ling_gram_term.id`
on the `GT:{category_key}:{term_key}` namespace. The SS-local `LX:` vocabulary is retired.

```sql
-- km_quran: must return zero
SELECT id, lx_grammar_ref FROM qr_ss_scope_grammar_link WHERE lx_grammar_ref NOT LIKE 'GT:%';
SELECT id, lx_balagha_ref FROM qr_ss_scope_balagha_link WHERE lx_balagha_ref NOT LIKE 'GT:%';
```

If the construction has no term, **create it before using it** — trilingual `name_*` and
`definition_*`, correct `discipline` (NH/SF/BL), and `parent_term_id` when it is a subtype
(`GT:pos:laqad` under `GT:pos:lam_qasam`; `GT:balagha_maani:ijaz_hadhf_qissa` under `ijaz_hadhf`).
Never collapse a finer distinction into a coarser parent just to make the ref resolve.

**3b — source.** Every term this sentence uses must be bound to at least one of the 25 registered
grammar books:

```sql
-- km_arabic_linguistic
SELECT t.id, t.name_en, t.discipline,
       (SELECT COUNT(*) FROM ar_ling_gram_term_source s WHERE s.term_id=t.id) srcs
  FROM ar_ling_gram_term t WHERE t.id IN (:terms_used_by_this_sentence);

INSERT OR REPLACE INTO ar_ling_gram_term_source (term_id, source_slug, page_ref) VALUES (...);
```

Find the book chapter that defines the term in `ar_ling_gram_chunk` (21,319 chunks, 25 books, fully
discipline-tagged) and bind it:

```sql
SELECT source_slug, bab_id, page_no, substr(text_ar,1,400)
  FROM ar_ling_gram_chunk
 WHERE discipline=:disc AND (heading_norm LIKE :term OR text_ar LIKE :term)
 ORDER BY source_slug LIMIT 20;
```

Use `310-50-NAHW`'s 8 books for NH terms and `310-60-BALAGHA`'s 12 for BL. **The 18 ṣarf books are
out of scope** — they belong to the word tier behind `300-40-JISR`.

This is the round most likely to be skipped and the one that matters most: as of the last audit only
295 `gram_term_source` rows existed against 21,319 mined chunks. A term that resolves but is not
sourced is a name without an authority.

## Round 4 — derived translation

Literal = grammar-only fold over the tree. Fluent = grammar ⊕ balāgha fold. **Every divergence
between them gets a `qr_ss_translation_decision`** naming its `driver_kind` + `driver_ref`.

Record what the rendering *loses*, not only what it carries: an elided Arabic verb that English
must supply, a participle that flattens into an adjective, a deferred jawāb that a dash has to
hold open. `synthesis_md` on the unit is where controlled loss is stated plainly.

## Round 5 — tick and assert

Write `cyb_sensor` rows (`axis='build'`, `node_id` = the **sentence** node) for all nine
sentence-scoped bands × `presence` / `coverage` / `provenance` / `trilingual`, then:

```sql
SELECT band_code, band_score, band_state FROM cyb_ss_build WHERE node_id=:node ORDER BY band_ord;
SELECT * FROM cyb_ss_board WHERE node_id=:node;
```

**Exit criteria — all four, or the cycle is not complete:**

1. `cyb_ss_board.build_pct = 100`, `bands_done = 9`
2. `SELECT COUNT(*) FROM qr_ss_vocab_violations` = 0
3. `SELECT COUNT(*) FROM qr_ss_gaps WHERE scope_id LIKE :sent||'%'` = 0
4. every registered source for every band is accounted for as parses / defers / silent

Do not raise a score by editing a sensor. Fix the row the sensor reads, then re-tick.

## The nine bands, in build order

`310-10-JUMLA` → `310-20-TARKIB` → `310-30-SHAJARA` (**gate**) → `310-40-IRAB` →
`310-50-NAHW` · `310-60-BALAGHA` · `310-70-SIYAQ` · `310-75-RABT` → `310-80-TARJAMA`

`320-10-INSHA` is passage-scoped: run it once after every sentence in the passage closes, never
per sentence.

## Two traps this cycle exists to prevent

**Equality on `ayah_from`.** Group-head entries span ranges; `=` misses them and the book looks
silent when it is speaking. Always `ayah_from<=:a AND ayah_to>=:a`.

**Treating absence as one thing.** Parses, defers, and silent are three different states with three
different write patterns. Collapsing them makes a band read `empty` when the tradition deliberately
located the discussion elsewhere — and makes it read `covered` when a book was never consulted.
