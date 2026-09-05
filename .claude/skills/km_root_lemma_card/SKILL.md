---
name: km_root_lemma_card
description: Build a K-Maps LEMMA card (lemma.card/v9, NT:kmaps:lemma:sarf:v9, template lemma.mushtaqq) into km_core.core_srs_card at root_lemma scope — the lemma's chain, its arc across the Qurʾān, and the ṣīgha family its own chain declares. Use whenever the user names a lemma (مُبَٰرَكَة, كِتَٰب, كَشَفَ …) and asks to build, complete, audit or fix its card; or says "lemma card", "v9", "بطاقة اللفظة", "family arcs", "arc_sum", "the family doesn't reconcile". Also use to audit an existing lemma card against the note type. Do NOT use for root cards (km_root_card) or word cards (km_root_lemma_headword_card).
version: 9.3
---

# K-Maps Lemma Card — `lemma.card/v9`

Note type **`NT:kmaps:lemma:sarf:v9`** · **18 fields** · template **`lemma.mushtaqq`**
Deck `DECK:QR` · discipline **SF** · scope **`root_lemma`**

**Reference card: `CARD:AL:lemma:6136730c086fe555263cfaeb40:lemma.mushtaqq` (مُّبَٰرَكَة).**
Read it before building. It is the standard, not an example.
Also conformant: كَشَفَ · كِتَٰب.

---

## 1 · FAMILY — the rule that is always got wrong

**FAMILY = the ṣīgha family the lemma's own `Chain` declares.** The conjugational family of
**ONE verb form**: the verb with its prepositions, its passive, its ism fāʿil, its ism mafʿūl,
its maṣdar. **NOT the other forms of the root.** A form that declares its own chain is
**outside**, and has its own card.

| | مُّبَٰرَكَة | كِتَٰب |
|---|---|---|
| Chain declares | **بارَكَ (فاعَلَ)** | **كَتَبَ (فَعَلَ)** |
| Family | بارَكَ في ×5 · على ×1 · حولَ ×1 · بُورِكَ ×1 · مُبارِك · مُبارَك ×8 = **16** | كَتَبَ ×49 · كُتِبَ · كاتِب ×6 · مَكْتوب ×1 · كِتابِى ×1 = **57** |
| Outside | تَبارَكَ (تَفاعَلَ) ×9 · بَرَكات (jāmid) ×3 = **12** | كاتَبَ ×1 · اكْتَتَبَ ×1 = **2** |
| Reconciles | `4 + 16 = 20` · `20 + 12 = 32` ✓ | `260 + 57 = 317` · `317 + 2 = 319` ✓ |

**The failure this rule prevents.** A first attempt at كِتَٰب set the family to a *maṣdar set* —
كَتْب، كِتابة، كِتْبة — reasoning that كِتاب is a maṣdar so its family is the other maṣādir.
Wrong twice: those are alternative maṣādir of the *same verb*, not a ṣīgha family, and all three
have **zero** Qurʾānic occurrences, so `family_sum` came out 0 and **the reconciliation failed
silently**. Read the Chain. Take exactly what it names.

تَبارَكَ is Form VI, same root, the more famous word — and it is **outside**, because it
declares its own chain.

---

## 2 · Integrity is arithmetic, not assertion

```
arc_sum              == frequency_quran
arc_sum + family_sum == card_total
card_total + outside == root_total
```

Counts from **`km_quran.qr_lemma_occurrence`**, never estimated. `family_sum = 0` is recorded
as 0 **with a note** — never omitted, never padded from outside the family.

---

## 3 · The 18 fields

**FRONT** `Headword` · `Root` · `Wazn` · `Chain` · `Identity` · `FormEffects` · `VerseAr` · `VerseRef`
**BACK** `MeaningRange` · `Arcs` · `FamilyHeading` · `FamilyLine` · `FamilyArcs` · `OutsideFamily` · `SiblingLine` · `Imagery`
**BOUND** `RegistryRefs` · `LangContract`

`front_text` and `back_text` are **always `''`**. The face renders from the **`fields_json`
COLUMN** — content at `extra_json.fields_json` is a different location and renders blank.

### `Chain` licenses everything downstream
`بارَكَ / بارَكَ (في) / بارَكَ (على) / بارَكَ (حولَ) — يُبارِكُ ، بارِكْ ، مُبارَكةً وبِراكًا ، فهو مُبارِك ، والمفعول مُبارَك`
Prepositions bracketed. **Write the Chain first**; the family is whatever it names.

### `FormEffects` says what the FORM does to the MEANING
Not what the word means.
مباركة: *والألفُ في بارَكَ للتعديةِ إلى المكانِ أو الشخص* — the alif is the taʿdiya route, which
is exactly why the family splits by ḥarf.
كِتَٰب: maṣdar of Form I **and** Form III — one wazn, two bābs — which is why ﴿يَبْتَغُونَ
ٱلْكِتَٰبَ﴾ 24:33 means *seeking freedom*, not a book.

### `Arcs` and `FamilyArcs` share one shape
```json
{"construction_ar":"بارَكَ (في)","count":5,
 "arc_ar":"ثبَّتَ الخيرَ ← في المكان ← فأقام فيه ونَما",
 "arc_en":"to settle good inside a place → so that it stays there and grows",
 "examples":[{"ar":"…","ref":"٢١:٧١","en":"…","note":"…"}]}
```

**`note` is where the card earns its keep** — not a gloss, but **what THIS occurrence shows that
the others do not.** From مباركة:

- 21:71 · *فِي puts the good inside the land, not on its people — the land keeps it and others come to it*
- 17:1 · *neither in it nor on anyone — the whole precinct holds it, so the blessing is a ring and not a point*
- 27:8 · *the only passive — at the bush the giver is withheld a moment longer*
- 24:61 · *not a place or a time but a spoken word*

If a `note` could be moved to another example without loss, it is not yet a note.

**Order the family by ḥarf when the ḥarf is the argument.** في inside a land, على onto a person,
حولَ ringing a precinct — one verb, three geometries. That ordering *is* the FormEffects claim,
demonstrated.

`count: 0` is legitimate: the form exists in the language, not in the corpus. Render the zero.

---

## 4 · `Imagery` is a PASSAGE

~150 words of prose with the shawāhid **woven in**; `passage_ar` as **its own telling**, not a
translation; `woven_sources` so every quotation inside is checkable; `shown: 1`.

The مباركة passage is the standard: a camel folds its legs and goes down, and *does not merely
stop: it stays* — then Ṭarafa's couched herd, then البَرْك the chest, مَبْرَك the place,
البِرْكة the pool, then Ibn Fāris's ثبات ولزوم, closing on **when good is called بَرَكة, the
claim is not that it passed through: it came down and it is still there.**

**A picture the card knows and does not show is the same failure as one it never had.**

---

## 5 · SOURCE-BACKED OR NOT WRITTEN

**Every farq, every ḍidd, every arc note comes from a row in D1 — not from reasoning.**

This exists because it was broken: three near-synonyms were written onto a card with al-Rāghib
attributed to each, from plausible reasoning. **None existed as rows.** A fabricated attribution
is worse than a missing one — it cannot be told from a real one by reading the card.

No row → read the lexicon, then create the set with verbatim Arabic and a block ref.
Still nothing → `claim_basis = 'UNSOURCED — do not cite'`, `confidence = 'low'`, so the gap
stays visible instead of being filled by assertion.

**Going to the source usually beats the invention.** The fabricated farq claimed *qurʾān = oral,
kitāb = gathered*. al-Rāghib says **both** turn on gathering — القِراءةُ ضمُّ الحروفِ والكلماتِ
بعضِها إلى بعضٍ **في التَّرتيل** — the difference is *where*. The invention had it backwards.

---

## 6 · `RegistryRefs` — `GT:` refs, never bare strings

`GT` → `km_arabic_linguistic.ar_ling_gram_term.id`, declared in `ar_ling_reg_ref_namespace`.

| Field | Category | مباركة |
|---|---|---|
| wazn | `form_family` | `GT:form_family:form_iii` |
| deriv | `derivation_type` | `GT:derivation_type:passive_participle` |
| jumud | `jumud` | `GT:jumud:mushtaqq` |
| tier | `form_tier` | `GT:form_tier:thulathi_mazeed` |
| root_type | `root_type` | `GT:root_type:sound` |
| family gov | `transitivity` · `taddiya_route` · `pos` | `transitive_by_harf` · `biharf` · `harf_jarr` |

**`jumud` carries a real distinction:** كِتَٰب is **جامد in use, مشتقّ in origin** — a maṣdar
that became an ism ʿayn. Carry both; a single value forces a false choice.

**If a term is missing, add it to `ar_ling_gram_term` first.** Never invent a `GT:` id — nothing
joins on it, so it passes silently.

---

## 7 · `LangContract` — ar · en · ur, SEPARATE

Every human-readable field carries **`ar`, `en` and `ur` as separate keys**. Never mix scripts
in one string: a mixed string cannot be rendered (one string, two directions) and cannot serve
an Urdu-only reader.

**Urdu is composed, not sourced — so it vanishes without leaving a hole.** All three lemma cards
currently carry `state: PARTIAL, gap: ur`. That is honest; marking them compliant would be the
easy fix and the wrong one.

The `ur` is **a telling, not a translation** — its own sentence, as `passage_ar` is its own
telling. A word-for-word calque looks complete and teaches nothing.

Not trilingual: verbatim source quotes, `GT:` refs, counts, `Headword`, `Root`, `Wazn`.

---

## 8 · Extending this note type is a MIGRATION

Adding a field to `NT:kmaps:lemma:sarf:v9` **breaks every existing card** unless they move in
the same transaction. `RegistryRefs` and `LangContract` were added without migrating, and
مُّبَٰرَكَة — the declared reference — silently went 16/16 → 16/18. **A reference card that no
longer conforms is worse than no reference.**

---

## Before commit

1. `front_text == '' AND back_text == ''`
2. `fields_json` on the **column**
3. field set matches the note type **exactly** — 18, no extras, no gaps
4. the three integrity equations reconcile, counted from `qr_lemma_occurrence`
5. every family member in `FamilyLine` is named by the `Chain`
6. every `Arcs` / `FamilyArcs` entry has ≥1 example with `ar` + `ref` + a non-transferable `note`
7. `Imagery.shown == 1`, `woven_sources` non-empty
8. every farq and ḍidd has a `src` pointing at a real row, or is marked UNSOURCED
9. every `GT:` ref resolves to a live `ar_ling_gram_term` row
10. `LangContract.state` is accurate — `PARTIAL` if `ur` is absent, never a false `COMPLETE`

```sql
-- 3 and 10 in one pass
SELECT c.id,
  (SELECT COUNT(*) FROM json_each(n.fields_json) d
    WHERE json_extract(d.value,'$.name') NOT IN (SELECT key FROM json_each(c.fields_json))) AS missing,
  (SELECT COUNT(*) FROM json_each(c.fields_json) f
    WHERE f.key NOT IN (SELECT json_extract(value,'$.name') FROM json_each(n.fields_json))) AS extra,
  json_extract(c.fields_json,'$.LangContract.state') AS lang_state
FROM core_srs_card c JOIN core_srs_note_type n ON n.id = c.note_type_id
WHERE c.note_type_id = 'NT:kmaps:lemma:sarf:v9' AND c.suspended = 0;

-- 9 — must return zero rows (run against km_arabic_linguistic)
SELECT DISTINCT value FROM json_tree(:card_fields_json)
WHERE value LIKE 'GT:%'
  AND value NOT IN (SELECT id FROM ar_ling_gram_term WHERE status = 'live');
```

Files: `FAMILY-RULE.md`, `TEMPLATE-v9.md`, `QUERIES.sql`.
