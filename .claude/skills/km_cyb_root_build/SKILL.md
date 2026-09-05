---
name: km_cyb_root_build
description: Drive one Arabic root from cold to compiled through the K-Maps cybernetic loop — sense all 24 live bands, raise disturbances, queue jobs in prerequisite order, delegate to the worker skills, re-sense, then emit the three cards (root, lemma, word) and the per-root reasoning document. Use whenever the user names a root and asks to build it fully, or says "build the root", "all layers", "next root", "take it to compiled", "cyb build", "run the loop", "root end to end", or asks for a root's cards and doc together. This skill OWNS the root; it builds nothing itself. Do NOT use for a single band or a single card — call the worker skill directly for those.
version: 1.0
---

# K-Maps Cybernetic Root Build — the orchestrator

Node **`CYB:quran:{surah}:{from}-{to}:root:{root}`** · 24 live bands · 2 `na`
Reference: **`CYB:quran:44:1-9:root:كتب`** — 24/24, build 100%, content 100%, compiled.

**This skill builds nothing.** It measures, orders, delegates, re-measures, and emits.
Every actual write is done by a worker skill.

---

## The five workers

| Skill | Owns | Feeds bands |
|---|---|---|
| `kmaps-lexicon-builder` | mining sources into `ar_ling_*` | 12-ASL · 14-SENSE · 30-KIN · 32-FIELD · 52-SCHOL · 70-VOCAB · 72-MEM |
| `km_root_forms_build` | `sarf_family` blocks, v2, 11-source roster | 22-BAB · 26-ATTEST · 20-GOV |
| `km_root_card` | `root.card/v1` | — reads |
| `km_root_lemma_card` | `lemma.card/v9` | — reads |
| `km_root_lemma_headword_card` | `word.card/v1` | — reads |

The three card skills **read** bands. They never write carriers. If a card is thin, the fix is
upstream in a band, not in the card.

---

## Stage 1 · SENSE — count carriers, never caches

```sql
SELECT b.band_ord, b.band_code, b.name_en, s.reading, s.expected, s.health, b.gate_mode
FROM cyb_sensor s JOIN cyb_root_band b ON b.band_code = s.band_code
WHERE s.node_id = :node AND s.metric = 'presence' ORDER BY b.band_ord;
```

**Three carriers do NOT key on `root_norm`.** Assuming they do produced three false "absent"
readings in one session:

| Band | Carrier | Key |
|---|---|---|
| `82-EXPR` | `ar_ling_root_lemma_tabir` | **`root_ar`** |
| `80-KIN` | `ar_ling_root_lemma_furuq_member` | **JOIN `ar_ling_root_lemma` on `lemma_id`, filter `root_id`** |
| `06-TAQL` | `ar_ling_root_taqalib` | **`permutation` / `group_key`** |

**Never read `ar_ling_reg_table_map.row_count_at_audit` as a measurement.** It is a cache. A
value written there by assumption and read back as evidence produced a false "empty across all
24,528 roots" claim that survived four repetitions. **An empty reading is a claim about the
sensor until the carrier has been checked directly.**

## Stage 2 · DIAGNOSE — distinguish three kinds of empty

- **local gap** — carrier has rows for other roots, none for this one → buildable now
- **corpus gap** — the source genre is not ingested → raise a disturbance, do not fake it
  (e.g. `30-KIN`: no aḍdād work among the 12 lexica, so only passing contrasts are available)
- **not applicable** — set `status='na'` with a reason, never leave a permanent zero
  (`24-ILAL` is a global rule table with no root key; `29-CORR` has no taṣwīb source)

## Stage 3 · ORDER — walk the prereq graph

`prereq_json` on `cyb_root_band` is the dependency graph. Queue in `band_ord` within it.

```
00-CORE → 03-ASWAT · 06-TAQL · 10-DNA
10-DNA  → 12-ASL · 14-SENSE · 22-BAB
14-SENSE→ 15-AXIS → 16-TAT → 17-ARC → 18-STEP → 19-ATT      (strictly sequential)
14-SENSE→ 20-GOV → 82-EXPR · 30-KIN · 32-FIELD · 52-SCHOL · 70-VOCAB → 72-MEM · 80-KIN
22-BAB  → 26-ATTEST
```

**`15-AXIS` is the lever.** Weight 1.0, but the sole gate on 6.0 more, and the one band needing
only a decision — the senses are already mined.

Seven bands are `gate_mode=block`: `10-DNA` · `12-ASL` · `14-SENSE` · `17-ARC` · `19-ATT` ·
`70-VOCAB` · `80-KIN`. A blocked gate stops the root, not just the band.

## Stage 4 · ACTUATE — one job, one skill, one band

```sql
INSERT INTO cyb_job (id, node_id, op, band_code, source_slug, actuator, skill, readiness, error_val)
VALUES ('CYB:JOB:'||:root||':'||:band, :node, :op, :band, :src, 'claude', :skill, 'ready', :error);
```

`error_val` = the band's weight × the shortfall. Work the highest error first.

**Read lexica chronologically, oldest first.** It reveals that each lexicographer does a
different job and lets an original claim be told from an inherited one. For كتب: Ibn Durayd 321
states the aṣl **74 years before** Ibn Fāris, who is usually credited.

**Lane requires `text_html`.** `text_plain` truncates at 400 chars — 10,794 vs 400 on one كتب block.

## Stage 5 · RE-SENSE — measure after every actuation

Never mark a band built from the fact that a job ran. Re-count the carrier. Then:

```sql
UPDATE cyb_node SET build_pct = CAST(ROUND(100.0 *
  (SELECT SUM(CASE WHEN s.reading > 0 THEN b.weight ELSE 0 END)
     FROM cyb_sensor s JOIN cyb_root_band b ON b.band_code = s.band_code AND b.status='live'
    WHERE s.node_id = :node AND s.metric = 'presence')
  / (SELECT SUM(weight) FROM cyb_root_band WHERE status='live')) AS INTEGER)
WHERE id = :node;
```

## Stage 6 · CARDS — three, in ladder order

`root` → `root_lemma` → `root_lemma_headword`. Build **root last** if the lemma counts are
needed for `LemmaInventory`; build **word last** if the lemma card supplies its `LemmaRef`.

Each must satisfy its note type **exactly** — no extras, no gaps:

```sql
SELECT c.id,
  (SELECT COUNT(*) FROM json_each(n.fields_json) d
    WHERE json_extract(d.value,'$.name') NOT IN (SELECT key FROM json_each(c.fields_json))) AS missing,
  (SELECT COUNT(*) FROM json_each(c.fields_json) f
    WHERE f.key NOT IN (SELECT json_extract(value,'$.name') FROM json_each(n.fields_json))) AS extra
FROM core_srs_card c JOIN core_srs_note_type n ON n.id = c.note_type_id WHERE c.root_norm = :root;
```

Then the two cross-checks that must agree by **different routes**:
`sum(LemmaInventory[].n) + outside == QuranTotal` on the root card, and
`arc_sum + family_sum == card_total; card_total + outside == root_total` on the lemma card.

## Stage 7 · DOC — one reasoning document per root

`cm_documents` + `cm_blocks` in `km_content`, **anchored** via `cm_resource_links` to: the root,
the āyah, the root card, the cyb node, and band `12-ASL`. **This document IS the 12-ASL content.**

It must carry:
1. the **method** — oldest witness first, and what that reveals
2. the **witness table** — who did what, chronologically
3. the **thesis** in one line
4. the **arc**, with the Arabic of each rung and its authority
5. the **honest gaps** — which bands are `watch`, and why
6. **any instrument defect found while building** — these are the most valuable thing a build
   produces, and they are lost if only the data is written

137 of 141 notes in the doc space are unanchored. **Anchor this one.**

## Stage 8 · TICK — close the loop

```sql
INSERT INTO cyb_tick (id, sensed, drifts, actuated, corrected, summary) VALUES (...);
```

The summary is for a reader six months out. Say what was found, not what was done.

---

## The laws this skill enforces

**Scope ladder.** `root > root_lemma > root_lemma_headword`. A claim sits at exactly one rung.
**Registry.** Bands from `ar_ling_reg_sub_layer`; terms from `ar_ling_gram_term` via `GT:`.
Never invent either — an invented `GT:` id passes silently because nothing joins on it.
**Trilingual.** `ar`, `en`, `ur` as separate keys. Urdu is composed, not sourced, so it goes
missing without leaving a hole — check for it explicitly.
**Attested vs derived.** Mark every ḍidd, every maṣdar. An inference recorded as an attestation
launders our reasoning into the tradition's voice.
**Concrete rungs.** At least one arc rung must be physical. A card whose concrete rungs are
empty asserts a thread it cannot show.

## Definition of done

24/24 bands sensed · `build_state='compiled'` · 3 cards conformant · integrity agreeing by two
routes · 1 anchored document · 1 tick · every `na` band carrying a reason · every `watch` band
carrying a disturbance.
