# Reference build — كتب, cold to compiled

Node `CYB:quran:44:1-9:root:كتب` · uid `cb303790920fa750c588a8f5fd` · anchor 44:2

## What the loop produced

| | |
|---|---|
| Bands | **24 / 24**, build 100%, content 100%, `compiled` |
| Senses | **8 → 45** across 13 sources, 9 lexica |
| Forms | 3 → **8**, with 13 maṣādir (10 attested, 3 qiyāsī) |
| Government | 13 → **19** across 8 forms, 3 transitivity classes |
| Arc | **9 rungs, 4 concrete**, 14 attestations |
| Cards | root 22/22 · lemma 17/17 · word 11/11 |
| Doc | `DOC:AL:root:كتب:reasoning`, 23 blocks, 5 anchors |

## The witnesses, chronologically — each doing a different job

| | | Job | New |
|---|---|---|---|
| al-Khalīl | 170 | **enacts** — opens at the stitch, writing appears fourth | +6 |
| Ibn Durayd | 321 | **states the aṣl** — 74 years before Ibn Fāris | +3 |
| al-Jawharī | 393 | **transmits & adjudicates** | +5 |
| Ibn Fāris | 395 | **licenses** each sense with its own proof | +2 |
| al-Rāghib | 502 | **narrows** to hide-and-hide, **extends** past script | +4 |
| al-Zamakhsharī | 538 | the ṣakk quittance | +1 |
| Ibn Manẓūr | 711 | **argues legally** | +5 |
| al-Fayyūmī | 770 | **dates** a usage | +3 |
| al-Zabīdī | 1205 | **explains** it sociologically | +2 |
| Lane | — | **structures** — files joining as a separate head | +2 |
| Mir | — | **subdivides** — the ʿalā/lām polarity | +3 |
| Sinai | 2023 | celestial vs earthly | +1 |

## Six instrument defects this build found

These are the most valuable output. The data can be rebuilt; a defect found and not recorded
will be re-encountered.

1. **Band registry drift** — `cyb_root_band` had four invented codes contradicting
   `ar_ling_reg_sub_layer`, two of them colliding with real numbers.
2. **Carrier keying** — three bands read absent while their data existed: `82-EXPR` keys on
   `root_ar`, `80-KIN` needs a join through `lemma_id`, `06-TAQL` on `permutation`.
3. **Registry-as-measurement** — I claimed `ar_ling_sense_arc` was empty across all 24,528 roots,
   four times, from a `row_count_at_audit` I had written by assumption. It holds 164 arcs.
4. **Face location** — the root card rendered blank: content was at `extra_json.fields_json`,
   the renderer reads the `fields_json` **column**.
5. **Aḍdād overclaimed** — I entered four as attested; only two are. Lane, Lisān and Tāj give
   **no ḍidd at all** for this root, and the aḍdād genre is absent from the corpus.
6. **Urdu missing silently** — the card reached 24/24 with no `ur` key on Axes, Furūq or Aḍdād.
   Arabic and English come from sources; Urdu must be composed, so its absence leaves no hole.

## Two honest gaps left open

- **`30-KIN` at `watch`** — 2 attested aḍdād, 2 derived. Corpus gap, not a build gap.
- **`maqayis_lugha` sarf_family has `forms: 0`** in a 7,066-char valid v2 block. Ibn Fāris
  organises by aṣl, not paradigm — so this may be correct, or a parse that dropped its forms.
  The checklist cannot currently tell those apart.
