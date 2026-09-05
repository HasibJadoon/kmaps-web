---
name: km_root_card
description: Build a K-Maps ROOT card (root.card/v1, NT:kmaps:root:v1) into km_core.core_srs_card for an Arabic root — mining the 24 live root bands in km_arabic_linguistic, assembling the sense arc with attestations, and rendering front/back from the fields_json column. Use whenever the user names a root (كتب, برك, كشف, بين …) and asks to build, complete, audit or render its root card; or says "root card", "بطاقة الجذر", "build the root", "next root", "24 bands", "compile the root". Also use to audit an existing root card against its note type. Do NOT use for lemma cards (km_root_lemma_card) or word cards (km_root_lemma_headword_card).
version: 1.2
---

# K-Maps Root Card — `root.card/v1`

Note type **`NT:kmaps:root:v1`** · **21 fields** · template `root.card` · deck `DECK:QR` · discipline **SF**
Reference card: **`CARD:AL:root:cb303790920fa750c588a8f5fd:root.card`** (كتب — 21/21, compiled, 24/24 bands)

---

## The two laws

**FACE LAW.** `front_text` and `back_text` are **always `''`**. The face renders from the
**`fields_json` COLUMN**. Writing content to `extra_json.fields_json` is a *different location*
and renders a blank card — this defect was live on the كتب card until it was caught by
comparing against a lemma card that rendered correctly.

**SCOPE LAW.** `root > root_lemma > root_lemma_headword`. A claim sits at exactly one rung.
Lemmas are **REFERENCED, never treated**: `LemmaInventory` carries text, pos, count, gloss,
cardRef and nothing else. Any arc, government or ṣarf at lemma level belongs on the LEMMA card.

---

## Two registries, both binding

**BANDS** — `ar_ling_reg_sub_layer`, mirrored in `cyb_root_band`. Band codes come from `sub_code`.
**TERMS** — `ar_ling_gram_term`, reached through the **`GT`** namespace declared in
`ar_ling_reg_ref_namespace`. **Every classification is a `GT:` ref, never a bare string.**

| Field | Category | Example |
|---|---|---|
| `FormLadder[].form` · `.bab` | `form_family` (28) | `GT:form_family:form_i` · `GT:form_family:bab_nasara` |
| `gov[].trans` | `transitivity` (5) | `GT:transitivity:transitive_by_harf` |
| `gov[].route` | `taddiya_route` (5) | `GT:taddiya_route:biharf` |
| `gov[].harfPos` | `pos` (18) | `GT:pos:harf_jarr` |
| `masadir[].deriv` · `ap` · `pp` | `derivation_type` (13) | `GT:derivation_type:masdar` |
| `Soundness.ref` · `.tier` | `root_type` (15) · `form_tier` (6) | `GT:root_type:sound` |

Each term carries a 26-char `uid` — same shape as the Universal Root ID. Carry both.

**If a term is missing, add it to `ar_ling_gram_term` FIRST.** Inventing a `GT:` id on a card is
the same failure as inventing a band code, and worse: nothing joins on it, so it passes silently.

### Two distinctions the term registry forces

**`transitive` is not `transitive_by_harf`.** مُتَعَدٍّ (by naṣb) and مُتَعَدٍّ بِحَرْف are separate
registered terms. For كتب this distinction **is** the burden/benefit polarity — كَتَبَ عَلَى and
كَتَبَ لِ are both `transitive_by_harf`; flattening them to `transitive` erases Mir''s point.

**`taddiya_route` is a second axis, not a synonym for transitivity.**
`binafsihi` · `biharf` · `bitadeef` (Form II gemination) · `bihamza` (Form IV hamza) · `lazim`.
Form II كَتَّبَ and Form IV أكْتَبَ are causativizations of the SAME verb by DIFFERENT routes —
which is why II splits into teach/muster/bind and IV into dictate/tie-shut. Without the route
they look like unrelated coincidences.

---

## Band registry — never invent a band

The canonical layer registry is **`km_arabic_linguistic.ar_ling_reg_sub_layer`** (38 sub-layers,
26 at root/lemma/form scope), mirrored in `km_core.cyb_root_band`. Band codes come from
`sub_code`. **If a band is not in the registry, it does not exist.**

Two bands are legitimately `na` and should not be forced:
- `24-ILAL` — `ar_ling_root_lemma_ilal` is a **global rule registry** with no root or lemma key
- `29-CORR` — no taṣwīb source in the corpus; for a صحيح سالم root there is nothing to correct

---

## Carrier keying — three bands do NOT key on `root_norm`

This produced three false "absent" readings. **An empty reading is a claim about the SENSOR
until the carrier has been checked directly.**

| Band | Carrier | How to key |
|---|---|---|
| `82-EXPR` | `ar_ling_root_lemma_tabir` | **`root_ar` column** |
| `80-KIN` | `ar_ling_root_lemma_furuq_member` | **JOIN `ar_ling_root_lemma` ON `id=lemma_id`, filter `root_id`** |
| `06-TAQL` | `ar_ling_root_taqalib` | **`permutation` / `group_key`** |

And: **never read `ar_ling_reg_table_map.row_count_at_audit` as a measurement.** It is a cache.
Reading a value written there by assumption produced a false "`ar_ling_sense_arc` is empty
across all 24,528 roots" claim that survived four repetitions. It holds 164 arcs / 51 roots.
**Count the carrier.**

---

## FRONT — the ladder is the prompt

`Root` · `Radicals` · `Soundness` · **`FormLadder`** · `VerseAr` · `VerseRef`

The forms are the visible skeleton; **the meaning is what you recall.** Put meanings on the
front and there is nothing left to retrieve.

---

## BACK — ten sections, in this order

`AslStatement` → `DnaThread` → `SenseArc` → `Axes` → `Taqalib` → `Furuq` → `Addad` →
`Field` → `Expressions` → `LemmaInventory`

Aṣl before thread, thread before arc, arc before the axes that describe it, lemmas last
because they are references.

---

## Status flags are load-bearing

| Flag | Values | Render |
|---|---|---|
| `masadir[].s` | `attested` \| `qiyasi` | qiyāsī **muted, superscript °** |
| `Addad[].status` | `attested` \| `derived` | **different colours** |
| `SenseArc[].concrete` | bool | concrete rungs **lit** |

**An inference recorded as an attestation launders your reasoning into the tradition's voice.**
For كتب, Lane/Lisān/Tāj give *no ḍidd at all* and the aḍdād genre is absent from the corpus —
so two of four are `derived` at confidence 0.5–0.55 and the band sits at `watch`, not `ok`.

**The physical rungs are the evidence; the abstract ones are the claim.** A card whose
concrete rungs are dark asserts a thread it cannot show.

`SenseArc[].fam` ties each rung to a `FormLadder` entry so the arc *can* be regrouped by form —
but it renders as **one ladder**, because breaking it hides that the terminal rung answers the first.

---

## AslStatement takes the OLDEST witness

Not the famous one. Read the lexica **chronologically** — it reveals that each lexicographer
does a different job, and lets an original claim be told from an inherited one.

For كتب: Ibn Durayd **321** states وأصلُ الكَتْبِ ضمُّ الشيءِ إلى الشيء — **74 years before
Ibn Fāris**, who is usually credited.

**Rung 1 is the hand, not the principle.** al-Khalīl 170 and al-Rāghib 502 both begin at the
physical act. The aṣl lives in `DnaThread` as what the arc *demonstrates*; the arc begins where
the hand does.

---

## Stages

1. **read_registry** — load `ar_ling_reg_sub_layer`, mirror check against `cyb_root_band`
2. **measure_bands** — count every carrier **directly**, respecting the keying table above
3. **mine_asl** — lexica oldest-first; capture verbatim Arabic + author + death year
4. **build_arc** — rungs with `fam`, `concrete`, and ≥1 verbatim attestation each
5. **inventory_lemmas** — counts from `km_quran.qr_lemma_occurrence`, never estimated
6. **render** — write to the `fields_json` **column**
7. **commit** — run the checks below, then update sensors from `cyb_sensor`

---

## Before commit

1. `front_text == '' AND back_text == ''`
2. `fields_json` on the **column**, not nested in `extra_json`
3. field set matches `NT:kmaps:root:v1` **exactly** — no extras, no gaps
   (`cyb_card_type.required_fields_json` is generated from the note type; check in SQL)
4. `sum(LemmaInventory[].n) + outside == QuranTotal`
5. every `SenseArc` rung has ≥1 verbatim attestation
6. ≥1 rung has `concrete == true`
7. every `Addad[].status` and `masadir[].s` set
8. `BandState` counted from `cyb_sensor` — **never** from the registry cache

9. **every `GT:` ref resolves to a live `ar_ling_gram_term` row** —

```sql
SELECT DISTINCT value FROM json_tree(
  (SELECT fields_json FROM core_srs_card WHERE id = :card_id))
WHERE value LIKE 'GT:%'
  AND value NOT IN (SELECT id FROM ar_ling_gram_term WHERE status = 'live');
-- must return ZERO rows
```

Files: `TEMPLATE-root-v1.md` (fields, Mustache, worked example), `REGISTRY-REFS.md`
(the `GT` namespace and its categories), `QUERIES.sql`.
