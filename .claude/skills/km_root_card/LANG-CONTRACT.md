# Trilingual contract — ar · en · ur, SEPARATE

Applies to **all three card skills**: root, lemma, word.

## The rule

Every human-readable field carries **`ar`, `en` and `ur` as separate keys**.
**Never mix scripts inside one string.**

```json
// WRONG — Arabic buried in an English string
{"w":"خَطَّ","farq":"the traced line (Ibn Sīdah: كَتَبَه خَطَّه)"}

// RIGHT — three keys, one language each
{"w":"خَطَّ",
 "ar":"الخَطُّ آلةُ الضَّمِّ؛ قال ابنُ سِيدَه: كَتَبَه خَطَّه",
 "en":"the traced line, the instrument by which letters are joined",
 "ur":"لکیر: وہ ذریعہ جس سے حروف جڑتے ہیں"}
```

## Why it is not cosmetic

**A mixed string cannot be rendered.** Arabic inside an English run needs its own `dir`, its own
font and its own line-height. One string cannot carry two directions, so the renderer either
breaks the bidi or drops the styling.

**A mixed string cannot be filtered.** An Urdu-only reader cannot be served from a field whose
Urdu is glued to English. The three languages are three audiences, not one field with decoration.

**`ur` goes missing silently.** Arabic and English get written because the sources supply them;
Urdu has to be composed. When there is no `ur` key, nobody notices it is absent — which is how
كتب reached 24/24 bands with Urdu missing from Axes, Furūq and Aḍdād.

## The `ur` is a TELLING, not a translation

Write the Urdu as its own sentence, the way `passage_ar` on a lemma card is its own telling
rather than a rendering of `passage_en`. A word-for-word Urdu calque of the English is worse
than none: it looks complete and teaches nothing.

## Exceptions — fields that are NOT trilingual

- Quoted **verbatim source text** stays in its own language and is not translated in place;
  the gloss goes in the sibling `en`/`ur` keys.
- **Technical identifiers** — `GT:` refs, `form`, `bab`, `tibaq`, `status`, `ref`, counts.
- **Headwords** — `Headword`, `Root`, `w`, `verb`, `masadir[].m` are the Arabic itself.

## Check before commit

```sql
-- any en or ur value containing Arabic script = a mixed string
SELECT DISTINCT j.fullkey, j.value
FROM core_srs_card c, json_tree(c.fields_json) j
WHERE c.id = :card_id
  AND (j.fullkey LIKE '%.en' OR j.fullkey LIKE '%.ur')
  AND j.value GLOB '*[ء-ي]*'
  AND j.fullkey NOT LIKE '%quote%';
-- ur is present wherever ar and en are
SELECT j.fullkey FROM core_srs_card c, json_tree(c.fields_json) j
WHERE c.id = :card_id AND j.fullkey LIKE '%.en'
  AND REPLACE(j.fullkey,'.en','.ur') NOT IN
      (SELECT fullkey FROM json_tree(c.fields_json));
-- both must return ZERO rows
```
