---
name: km_root_lemma_headword_card
description: Build a K-Maps WORD card (word.card/v1, NT:kmaps:word:v1) into km_core.core_srs_card at root_lemma_headword scope — the word as it stands in ONE verse, with its meaning range, near-synonyms, antonyms and a fluent rendering. Use whenever the user names a word in a verse (ٱلْكِتَٰبِ at 44:2, a headword at surah:ayah) and asks to build, complete or audit its card; or says "word card", "بطاقة الكلمة", "this word in this verse", "headword card". Do NOT use for root cards (km_root_card) or lemma cards (km_root_lemma_card).
version: 1.3
---

# K-Maps Word Card — `word.card/v1`

Note type **`NT:kmaps:word:v1`** · 11 fields · template `word.card` · deck `DECK:QR` · discipline **DL دلالة**
Scope **`root_lemma_headword`** — the last rung of `root > root_lemma > root_lemma_headword`.
Reference: **`CARD:QR:word:44:2:2:word.card`** (ٱلْكِتَٰبِ at 44:2)

---

## FRONT — the verse, then the word

`VerseAr` · `VerseRef` · `Headword`

**You meet the word in context before being asked what it spans.** Nothing else on the front.

## BACK

`MeaningArc` · `InThisVerse` · `NearSynonyms` · `Antonyms` · `FluentVerse`
Plus `LemmaRef` · `RootRef` — links up the ladder, carrying no content of their own.
Plus `RegistryRefs`.

---

## What this card must NOT carry

No ṣarf chain. No wazn. No government arcs. No form ladder. No root DNA. No taqālīb.
No iʿrāb — that is `310-40-IRAB` on the āyah card.

**A word card that explains how the word is BUILT has drifted out of its scope.**

---

## Two attribution rules

**A farq without an authority is not a farq.** Name who drew the distinction. An unattributed
nuance is an opinion wearing a citation's clothes.

**A ḍidd without an axis is a word pair.** State what the opposition turns on — and bind it:

| `tibaq` | Category | When |
|---|---|---|
| `GT:balagha_badi:tibaq_ijab` | positive antithesis | both terms affirmative — كتب / أغفل |
| `GT:balagha_badi:tibaq_salb` | negative antithesis | one is the negation of the other |
| `GT:balagha_badi:muqabala` | parallel antithesis | two-against-two |

Also mark `status`: `attested` when a lexicographer draws the contrast, `derived` when we do.

---

## `InThisVerse` says what the word DOES here

Never how it parses. For 44:2: sworn BY — the wāw of oath; definite by ٱل, qualified by
ٱلْمُبِين; and on al-Rāghib's reading the oath is by **joined clarifying speech**, not an
inscribed object — which is why it can be sworn by before a single page exists.

## `MeaningArc` is the range HERE, trilingual

`[{ar, en, ur}]` — what the word can span in this position, not everywhere in the Qurʾān.
That breadth belongs to the LEMMA card.

## Discipline

**DL**, added 2026-08-15. The card is entirely dalāla; filing it under SF asserted that a word
card is about how the word is built. False. `ar_ling_reg_sub_layer` had already assigned DL to
13 sub-layers — `cyb_discipline` was the outlier.

---

## Before commit

1. `front_text == '' AND back_text == ''`
2. `fields_json` on the **column**, not nested in `extra_json`
3. field set matches `NT:kmaps:word:v1` exactly — 11, no extras, no gaps
4. every `NearSynonyms` entry has an `auth`
5. every `Antonyms` entry has an `axis` AND a `status` AND a `tibaq` ref
6. `FluentVerse` has `ar`, `en` and `ur`
7. `LemmaRef` and `RootRef` both resolve to live cards
8. every `GT:` ref resolves to a live `ar_ling_gram_term` row

```sql
SELECT DISTINCT value FROM json_tree(
  (SELECT fields_json FROM core_srs_card WHERE id = :card_id))
WHERE value LIKE 'GT:%'
  AND value NOT IN (SELECT id FROM ar_ling_gram_term WHERE status = 'live');
-- must return ZERO rows
```
