---
name: kmaps-worldview-builder
description: >-
  Record what a worldview says about a concept in K-Maps / km_worldview, so several worldviews can
  be set against each other on the same concept with each side carrying its own sources. Covers the
  global concept registry (CN: ids in core_concept, mirrored into km_quran and km_worldview), the
  worldviews themselves (wv_traditions — Islam, Christianity, Judaism, late antiquity, philosophy,
  sociology, psychology, law, feminism, liberalism, Marxism, modernity, postmodernism, the
  Enlightenment, secular naturalism), positions (wv_value_positions) and their joinable sources
  (wv_value_position_source). Use whenever the user wants to build, record, contrast or compare
  worldview positions — e.g. "what does each worldview say about tawhid", "add the Christian
  position on covenant", "contrast the Quranic reading against the secular one", "worldview tab",
  "build wvs sura by sura", "wv positions", "compare traditions on justice". Ground every position
  in a real source row — never invent a citation, a page, or a tradition's view.
---

# K-Maps Worldview Builder

Record **one worldview's position on one concept**, with its sources, so the same concept can be
asked of every other worldview and the answers set side by side.

The reader is a father teaching a son: the value is not a library of opinions but *seeing where the
readings actually part, and on what*.

Read the reference as you need it:
- `references/wv-schema-and-ids.md` — every table that matters, what is populated and what is
  scaffolding, the id namespaces, the cross-database seams, and the D1 gotchas. **Read before
  touching km_worldview.**

## The golden rules

1. **The concept is a `CN:` id, never a string.** `core_concept` in km_core is the registry of
   record, mirrored identically into km_quran and km_worldview so no read crosses a service
   boundary. A position binds by `concept_ref`. This is the whole point: a concept written as a
   local string is a concept that cannot be compared, which is exactly the state the corpus was in
   — `wv_nodes.data_json.concept_id = "WCN003"` was scoped to one `graph_id`, so the same concept in
   another passage was a different, unrelatable id.
   **If the concept does not exist, author it into all three databases** — never write a bare label.

2. **A worldview is a row in `wv_traditions`, never a string.** `claim_side: "secular_reading"` in a
   JSON blob cannot carry sources, thinkers, or internal disagreement. A row can. There are 17
   traditions seeded; `tradition_type` has no CHECK, so a discipline, an ideology, an era and a
   scripture are all admissible — the only question is whether the thing holds a position.

3. **Every position carries a joinable source.** `wv_value_position_source`, not the
   `evidence_refs` JSON column beside it. Two worldviews compared means two source lists read
   together; if they are blobs, that is two parses instead of a join. For a Qurʾānic position the
   passage IS the citation and the row is written automatically from the scope. For anything else,
   give `source_id` + `source_unit_id` + a real `locator` — the form already in use is
   `p.15 / Fig 1.1`.

4. **Never state a tradition's position from general knowledge.** This is the rule that matters
   most and the easiest to break, because every one of these traditions is something a model has
   read a great deal about. A position is a claim that *this tradition holds this*, and it needs a
   source that says so. If there is no source in the corpus, say so and leave the cell empty. An
   empty cell is a true statement about what has been read; a plausible cell is a fabrication that
   will be believed.

5. **Frameworks are not positions.** A claim about *the reading itself* — "a secular framework
   brackets the miraculous" — describes the lens, not a position within the contrast. The al-Rūm
   graph has 7 of these tagged `framework` and they were deliberately left out of the lift. Giving
   them a `tradition_id` makes the comparison lie about how many worldviews have spoken.

6. **Ranges are columns, not strings.** `surah`, `ayah_from`, `ayah_to`, beside the human-readable
   `qr_scope_ref`. Three formats once coexisted — `30:2-6`, `QR:39`, `QR:S:39` — and none could be
   joined, so "what touches 30:4" was unanswerable. Never add a fourth.

## How it fills — sūra by sūra, as a by-product of reading

The corpus is not filled by a campaign. It fills because someone reading a passage records what the
text says, once, and moves on.

**On a passage** — `GET /wv/positions/passage/{surah}/{from}-{to}` returns two things: the positions
already recorded, and the **concepts the passage touches**, each showing how many worldviews have
spoken on it. The reader picks a concept rather than inventing one. That difference — a list versus
a blank field — is most of why this fills at all.

**Recording one** — `POST /wv/positions` with `concept_ref`, `tradition_id`, `position_text`, and
the scope. The source row is written from the scope automatically. A position may be one sentence;
a sentence with a source beats an essay without one.

**The contrast** — `GET /wv/positions/concept/{CN:...}` returns every worldview that has spoken on
that concept. That query is one `SELECT` precisely because the id is global.

A useful order: build the Qurʾānic side while reading, and let the other traditions accumulate from
the reading of *their* sources — Said, Arjana, Hallaq and the Masnavī are already in `wv_sources`
with units and page locators. A contrast with one side filled is not a failure; it is a question
with an answer waiting.

## Where the shape is already proven

Sūrat al-Rūm 30:2–6 is the worked example: 11 Qurʾānic positions against 10 secular ones, 27
counter-claims as real `rebuts` edges, every position sourced to the passage. It began as strings
inside `data_json` and was lifted in migration 024. Read it before building a new one —

```sql
SELECT t.title AS worldview, p.position_title AS concept, p.position_text
  FROM wv_value_positions p JOIN wv_traditions t ON t.id = p.tradition_id
 WHERE p.surah = 30 ORDER BY p.position_title, t.title;
```

If a new passage cannot be asked that question afterwards, it was not built.

## What NOT to trust in this database

The schema is far larger than the data and much of it is scaffolding. **99 of 146 `wv_*` tables are
empty.** Before building on a table, count it.

- The comparative-religion engine — `wv_covenant_frameworks`, `wv_revelation_models`,
  `wv_salvation_redemption_models`, `wv_abrahamic_morality_matrices` and ~26 more — is **entirely
  empty**. Well-designed and never used. Do not fill these instead of `wv_value_positions`; that is
  how two vocabularies happen.
- `wv_claims` has 5 rows and every attribution column is NULL. `wv_claim_evidence_links` has 0, so
  no claim is attached to any of the 6 evidence items.
- `wv_source_chunks` is scaffolding: `is_embedded = 0` and `qdrant_id` NULL on all 35. Five of eight
  sources have no body text — `"body_text":"pending_pdf_ingest"`. **Nothing may assume retrieval.**
- `wv_node_edges` carries 94 relation types over 303 edges, including `derives_from` vs
  `derived_from` and `related_to` vs `relates_to`. A traversal filtering on type silently drops
  edges. Use `rebuts` for a counter-position; it was added by 024 and is the only argument edge with
  a controlled meaning.
- `core_concept_binding` lives in **km_core alone** and is deliberately not mirrored — it is the
  index that knows where a concept is expressed, and three copies of it would defeat that. A worker
  reading its own database resolves concepts by label, not through the binding.
