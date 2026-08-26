# Root Presentation — the endpoint JSON

The reference page for بين, section by section, as the JSON that produces it.

One rule throughout: **the page is a render of the spec, not a document of its own.**
Every § below is a `DsSection` already declared in the registry, carried by a real table.
Nothing here is a new store.

## The calls

```
GET /al/ds/root/:root                    §hdr §1 §2 §3 §10   20 sections, live
GET /al/ds/root/:root?scope=lemma        §4 §7 §8            7 sections, live
GET /al/ds/lemma/:lemma                  one lemma of the above        ← new
GET /qr/lexicon/roots/:root/words        §5                            ← new
GET /qr/tafsir/ayah/:s/:a?root=:root     §6                  exists, needs root filter
GET /core/srs/review?root=:root          §9                  exists
```

`§5`, `§6` and `§9` are separate calls on purpose: AL cannot read `km_quran` or
`km_core`, and must not. The client overlays. See `routes/ds.ts:16`.

---

## §hdr — the header · `00-CORE` → `hero`

```json
{
  "chapter": "identity", "code": "00-CORE", "band": "00",
  "title": "Core identity", "state": "filled", "total_rows": 1,
  "carriers": ["ar_ling_roots", "ar_ling_root_dna"],
  "blocks": [{
    "kind": "hero",
    "mark":  { "text": "ب ي ن", "script": "ar" },
    "ar":    { "text": "بُعْدُ الشيءِ وانكشافُه", "script": "ar" },
    "en":    { "text": "the remoteness of a thing and its disclosure", "script": "latin" },
    "ur":    { "text": "کسی چیز کی دُوری اور اُس کا انکشاف", "script": "urdu" },
    "facts": [
      { "label": "type",           "value": { "text": "أجوف يائي", "script": "ar" } },
      { "label": "soundness",      "value": { "text": "hollow-yāʾ",  "script": "latin" } },
      { "label": "in the muṣḥaf",  "value": { "text": "522×",        "script": "latin" } }
    ]
  }]
}
```

`522` is **derived from `qr_word_occurrence`, never restated from a stored column.**
`ar_ling_roots.frequency_quran` says 522 and the old projection said 523; the occurrence
count is the authority and the other two are downstream of it.

The header's other counts — *13 Qurʾānic words, 5 verb forms, 14 lexicons* — are
`summary` fields the client computes from the sections it already has. They are not
separate reads.

---

## §1 — the core meaning · `12-ASL` → `card_list`

Four real rows. Each is one `DsRecord`.

```json
{
  "chapter": "meaning", "code": "12-ASL", "state": "filled", "total_rows": 4,
  "carriers": ["ar_ling_root_asl"],
  "blocks": [{
    "kind": "card_list",
    "title": "One origin, two faces",
    "records": [
      {
        "id": "asl:maqayis",
        "ar": { "text": "أصلٌ واحد، وهو بُعْدُ الشّيءِ وانكشافُه", "script": "ar" },
        "badges": [{ "label": "primary", "value": "aṣl", "tone": "strong" }],
        "provenance": {
          "source": "maqayis_lugha", "is_synthesis": false,
          "ref": "مقاييس اللغة", "page": "v.1 p.33",
          "confidence": "high", "authority": "Ibn Fāris", "death_hijri": 395
        }
      },
      {
        "id": "asl:raghib",
        "ar": { "text": "بَيْن موضوع للخلالة بين الشيئين ووسطهما، ولمّا اعتبر فيه معنى الانفصال والظهور استعمل في كلّ واحد منفردا", "script": "ar" },
        "en": { "text": "بَين is coined for the interval, the space and midpoint between two things. Because that space implies both separation and exposure, the word came to carry either sense on its own.", "script": "latin" },
        "provenance": {
          "source": "raghib_mufradat", "is_synthesis": false,
          "ref": "المفردات", "page": "v.1 p.156",
          "confidence": "low", "authority": null, "death_hijri": null
        }
      }
    ]
  }]
}
```

**Three gaps this section exposes, and they are not cosmetic.**

1. `death_hijri` is populated on **one row of four** (Ibn Fāris, 395). The page prints
   `d. 502 AH` for al-Rāghib and `d. 393 AH` for al-Jawharī — those come from a source
   registry, not from `ar_ling_root_asl`. The builder must join the lexicon source table
   for author and death year, or the dates on the page are unsourced.
2. `authority_en` is NULL on three of four. Same join.
3. **`confidence` is `low` on the three rows the page labels `verbatim`.** The page is
   currently claiming more than the record does. Either the confidence values are stale
   and should be raised deliberately, or the badge must read what the row says. Do not
   render `verbatim` over a `low`.

---

## §2 — the contronym · `30-KIN` → `card_list`

`ar_ling_root_didd` carries `generated_by` and `confidence`. **That pair is what separates
al-Khalīl's attested pair from the K-Maps inference** — the page's `.pill.att` vs
`.pill.inf` is not a styling choice, it is this column.

```json
{
  "chapter": "relations", "code": "30-KIN", "state": "filled",
  "carriers": ["ar_ling_root_didd"],
  "blocks": [{
    "kind": "card_list",
    "records": [
      {
        "id": "didd:firaq-wasl",
        "ar": { "text": "الفِراق ⟷ الوَصْل", "script": "ar" },
        "en": { "text": "separation against union", "script": "latin" },
        "badges": [
          { "label": "kind",  "value": "aḍdād",        "tone": "strong" },
          { "label": "basis", "value": "attested",     "tone": "ok" }
        ],
        "provenance": {
          "source": "kitab_al_ayn", "is_synthesis": false,
          "ref": "كتاب العين", "page": "3151", "confidence": "high"
        }
      },
      {
        "id": "didd:bana-depart-appear",
        "ar": { "text": "بانَ (فارَقَ) ⟷ بانَ (ظَهَرَ)", "script": "ar" },
        "badges": [{ "label": "basis", "value": "inferred", "tone": "warn" }],
        "provenance": {
          "source": "kmaps_sense_map", "is_synthesis": true, "confidence": "medium"
        }
      }
    ]
  }]
}
```

`is_synthesis: true` **must** render visibly apart, not in a tooltip. A page that shows a
K-Maps inference beside al-Khalīl in the same weight teaches something the tradition
does not say.

---

## §3 — senses and the arc · `14-SENSE` + `16-TAT`

Two sections, two kinds.

```json
[
  {
    "chapter": "meaning", "code": "14-SENSE", "state": "filled", "total_rows": 41,
    "carriers": ["ar_ling_root_sense"],
    "blocks": [{
      "kind": "card_list",
      "hint": "13 of 41",
      "records": [{
        "id": "sense:firaq",
        "ar": { "text": "البَيْنُ: الفِراقُ والانفصالُ", "script": "ar" },
        "en": { "text": "parting, separation", "script": "latin" },
        "ur": { "text": "جدائی", "script": "urdu" },
        "badges": [{ "label": "core", "value": "yes", "tone": "strong" }],
        "facts": [{ "label": "shāhid", "value": { "text": "البَيْنونةُ: مصدرُ بانَ يَبِينُ", "script": "ar" } }],
        "provenance": { "source": "kitab_al_ayn", "is_synthesis": false, "ref": "كتاب العين" }
      }],
      "overflow_count": 28
    }]
  },
  {
    "chapter": "meaning", "code": "16-TAT", "state": "filled", "total_rows": 4,
    "carriers": ["ar_ling_root_tatawwur"],
    "blocks": [{
      "kind": "chain",
      "title": "Semantic development",
      "summary": { "text": "From the body to the argument.", "script": "latin" },
      "nodes": [
        { "id": "st:1", "title": { "text": "الفَصْلُ المحسوس", "script": "ar" },
          "subtitle": "concrete parting",
          "detail": "A camel's foreleg away from her flank; a bowstring off its grip." },
        { "id": "st:4", "title": { "text": "البرهانُ القاطع", "script": "ar" },
          "subtitle": "decisive proof",
          "detail": "What is clear can be used to prove. Hence البَيِّنة.",
          "terminal": true }
      ]
    }]
  }
]
```

**`overflow_count` is load-bearing.** بين has 41 sense rows; the page shows 13 because the
other 28 are per-source restatements and belong under each source, not in a flat list.
`total_rows: 41` with `overflow_count: 28` states that honestly. A page that silently
showed 13 would read as "this root has 13 senses".

---

## §4 — the ṣarf ladder · `22-BAB` + `26-ATTEST` → `chain`

**This is the section that is currently wrong, and the one to fix first.**

`ar_ling_root_form_masmu` holds 7 real forms for بين — I, II, III, IV, V, VI, X — with
`verb_ar`, both participles, and a `masdar_json` carrying per-maṣdar `status`.

```json
{
  "chapter": "family", "code": "26-ATTEST", "state": "filled", "total_rows": 7,
  "carriers": ["ar_ling_root_form_masmu", "ar_ling_root_lemma_form_map"],
  "blocks": [{
    "kind": "chain",
    "title": "Seven forms",
    "nodes": [
      {
        "id": "form:I",
        "title":    { "text": "بانَ", "script": "ar" },
        "subtitle": "Form I · bāb ḍaraba",
        "detail":   "انفصل وبَعُد؛ اتّضح وظهر (وهو من الأضداد)",
        "facts": [
          { "label": "maṣādir",   "value": { "text": "بَيْن · بَيْنونة · بُيون", "script": "ar" } },
          { "label": "ism fāʿil", "value": { "text": "بَائِن", "script": "ar" } },
          { "label": "maf'ūl",    "value": { "text": "غير مستعمل — لازم فقط", "script": "ar" } },
          { "label": "in the muṣḥaf", "value": { "text": "0 finite", "script": "latin" } }
        ],
        "badges": [{ "label": "basis", "value": "curated", "tone": "plain" }]
      },
      {
        "id": "form:IV",
        "title":    { "text": "أَبَانَ", "script": "ar" },
        "subtitle": "Form IV · ifʿāl",
        "facts": [
          { "label": "maṣdar",    "value": { "text": "إِبَانَة", "script": "ar" } },
          { "label": "ism fāʿil", "value": { "text": "مُبِين", "script": "ar" } },
          { "label": "in the muṣḥaf", "value": { "text": "119 participle · 1 finite", "script": "latin" } }
        ],
        "badges": [{ "label": "basis", "value": "qac", "tone": "ok" }]
      }
    ]
  }]
}
```

### The correctness rule

Group **strictly** by `ar_ling_root_lemma_form_map.form_roman` + `derivation_type`, joined
`ar_ling_roots.buckwalter = form_map.root_bw` (both in `DB_AL` — no cross-database read).
**Never by matching the lemma surface string.** Surface matching is what put `يُبِينُ` (IV)
and `بَيَّنُ` (II) inside Form I in the old projection.

A lemma with no `form_map` row goes to an explicit `"form not yet determined"` node.
Never a guess.

### What the QAC map actually says for بين

```
II  35 + 3 AP  ·  IV 119 AP + 1  ·  V 17  ·  X 1 AP + 1
```

**No Form I.** بانَ is lexically real — it is right there in `26-ATTEST` and in the
government layer — but it does not occur finite in the Qurʾān. The two sources are
answering different questions and the ladder must not merge them:

- `26-ATTEST` (`form_masmu`) = **what the language builds** → 7 forms, including I, III, VI.
- `form_map` (QAC) = **what the Qurʾān uses** → 4 forms.

The page's "5 verb forms" header count comes from neither cleanly. State which question
the count answers, or drop it.

### Gaps in `form_masmu` for بين

- `meaning_en` is **NULL on all 7 rows**; only `meaning_ar` is filled. The page shows
  English for every form. Either backfill, or the English is the compiler's and must be
  marked as such.
- `voice_attested_json` is `[]` on all 7.
- `source_ref` is NULL on all 7; `source_slug` is `kmaps_synth` for I, III, VI and
  `qac_morphology` for II, IV, V, X. So three of the seven forms are **synthesis**, and
  `is_curated=1` marks them. That must reach the badge — a reader should see which rungs
  are attested and which K-Maps assembled.

---

## §5 — in the Qurʾān · `GET /qr/lexicon/roots/:root/words`

Not AL. This is the `quran` chapter, declared in `CHAPTERS` and currently empty because
no AL band can fill it.

```json
{
  "root": "بين", "total_occurrences": 522, "distinct_lemmas": 13,
  "words": [
    { "lemma_ref": "QR:lemma:bayn", "lemma_ar": "بَيْن",
      "form_roman": null, "derivation_type": null, "pos": "noun",
      "count": 266,
      "first": { "surah": 2, "ayah": 68 },
      "locus": { "surah": 2, "ayah": 68,
                 "text": "عَوَانٌ بَيْنَ ذَٰلِكَ", "highlight": [1, 1] } },
    { "lemma_ref": "QR:lemma:mubin", "lemma_ar": "مُبِين",
      "form_roman": "IV", "derivation_type": "active_participle", "pos": "adj",
      "count": 119,
      "locus": { "surah": 44, "ayah": 2, "text": "وَٱلْكِتَٰبِ ٱلْمُبِينِ", "highlight": [1, 1] } }
  ]
}
```

Read from `qr_word_occurrence` on `lemma_ref` — **72,504 of 77,424 rows carry it**.
Do **not** read from `ar_ling_lemma_arc_example`, which holds 21 rows in total and cannot
support this section for any root.

`lemma_ref` is the navigation key into `/al/ds/lemma/:lemma`.

**Verified against `qr_word_occurrence`.** This section is the one part of the page that
already reconciles exactly:

```
بَيْن 266 · مُّبِين 119 · بَيِّنَة 71 · بَيَّنُ 35 · تَبَيَّنَ 17
مُّبَيِّنَٰت 3 · مُّبَيِّنَة 3 · بَيَان 3
يُبِينُ 1 · مُسْتَبِين 1 · تِبْيَٰن 1 · تَسْتَبِينَ 1 · بَيِّن 1
                                          13 lemmas · 522 tokens
```

Both header figures — *522 occurrences* and *13 Qurʾānic words* — fall out of this one
query. Neither needs a stored column, and the 523 in the old projection was drift.

---

## §6 — the case in point · `GET /qr/tafsir/ayah/44/2?root=بين`

`qr_tafsir_book_display_block` — 41,056 blocks, āyah-keyed and FTS-indexed. Eight works.

```json
{
  "kind": "prose_blocks",
  "title": "Is the Book clear, or does it make clear?",
  "blocks": [
    { "id": "tafsir:ibn-atiyya:44:2", "role": "narration", "depth": 0,
      "text": { "text": "يُحتمل أن يكون من الفعلِ المتعدّي… ويُحتمل أن يكون من غيرِ المتعدّي", "script": "ar" },
      "translation": { "text": "It may be from the transitive verb; or from the intransitive. He declines to choose.", "script": "latin" },
      "provenance": { "source": "ibn_atiyya_muharrar", "is_synthesis": false,
                      "ref": "المحرر الوجيز", "confidence": "high" } },
    { "id": "kmaps:verdict:44:2", "role": "aside", "depth": 1,
      "text": { "text": "The grammar admits both. The context at 44:2 is an oath…", "script": "latin" },
      "provenance": { "source": "kmaps_synthesis", "is_synthesis": true } }
  ]
}
```

The verdict paragraph is **`is_synthesis: true`**. It is the compiler's reading standing
against Ibn ʿĀshūr, and it must not be set in the same weight as the five mufassirūn above it.

---

## §7 §8 — furūq and idioms · `80-KIN` `82-EXPR` → `card_list`

Both are lemma-scope, both live, and `82-EXPR` holds **2,370 rows** corpus-wide.
`ar_ling_root_lemma_tabir` already carries `expression_ar/en/ur`, `construction_ar/en/ur`,
`preposition_ar`, `surah`, `ayah`, `ayah_translation_en/ur` — the whole §8 shape.

```json
{
  "chapter": "usage", "code": "82-EXPR", "state": "filled",
  "carriers": ["ar_ling_root_lemma_tabir"],
  "blocks": [{
    "kind": "card_list",
    "records": [{
      "id": "tabir:bayna-yaday",
      "ar": { "text": "بَيْنَ يَدَيْ", "script": "ar" },
      "en": { "text": "before, in the presence of — literally between the two hands", "script": "latin" },
      "facts": [
        { "label": "preposition", "value": { "text": "—", "script": "latin" } },
        { "label": "locus",       "value": { "text": "34:12", "script": "latin" } }
      ],
      "provenance": { "source": "lisan", "is_synthesis": false, "ref": "لسان العرب" }
    }]
  }]
}
```

Group `82-EXPR` by `preposition_ar` — that is the axis a reader navigates idioms on.

---

## §9 — review · `GET /core/srs/review?root=بين`

The page's six questions are **not a new store**. They are the existing cards, rendered in
their card form.

```json
{
  "root": "بين",
  "cards": [{
    "id": "CARD:root:byn:asl",
    "resource_type": "root", "card_template": "root.card",
    "note_type_id": "NT:kmaps:root:v1",
    "front_text": "Ibn Fāris gives one origin for a root that looks like it has two opposite meanings. What is it?",
    "back_text":  "بُعْدُ الشيءِ وانكشافُه — the remoteness of a thing and its disclosure…",
    "card_state": "review", "stability": 8.4, "difficulty": 5.1,
    "reps": 3, "lapses": 0, "next_review_at": "2026-09-23T10:59:19.357Z"
  }]
}
```

### The retention rule

`core_srs_review.card_id` is `ON DELETE CASCADE`. `core_srs_card` is
`UNIQUE (deck_id, resource_ref, card_template)`.

Live: **1,125 reviews across 62 cards** — 28 in `review` (avg stability 8.4 d), 34
`learning`, 206 `new`.

- Rendering a card on the root page is a **read**. Nothing here rebuilds a card.
- Any change to `resource_ref`, `card_template` or `deck_id` mints a new row and cascades
  the history away. `UPDATE` in place, never delete-and-reinsert.
- Study mode is a **toggle over these same panels** — the card and the reference are one
  content set at two settings. That is the only way 13 lemmas ever get 13 cards.

---

## §10 — sources · `010-SRC` + `50-META` → `ledger`

```json
{
  "chapter": "sources", "code": "010-SRC", "state": "filled", "total_rows": 14,
  "blocks": [{
    "kind": "ledger",
    "records": [{
      "id": "src:maqayis",
      "ar": { "text": "مقاييس اللغة", "script": "ar" },
      "en": { "text": "Ibn Fāris — the single-aṣl statement", "script": "latin" },
      "facts": [
        { "label": "died", "value": { "text": "395 AH", "script": "latin" } },
        { "label": "locus", "value": { "text": "v.1 p.33", "script": "latin" } }
      ]
    }]
  }]
}
```

Ordered by `death_hijri` — the `byDeathHijri` helper in `workers/shared/src/shaping.ts`
already does this and is used by `12-ASL` and `19-ATT`.

**The lexicon does not enter the root document.** Summary only — slug, author, death year,
page, one line, a route out. Full verbatim text lives on the lexicon surface. Putting Lane,
Lisān, Tāj and Mufradāt at length inside the root row is what made the old projection
enormous.

---

## Two display rules

**Absent sections do not render.** عبد has no idioms and no Sinai entry and must show no
empty headings. `DsState` decides this — and `unknown` is not `empty`. `unknown` means no
audited carrier binds the layer, so nothing was ever read; drawing it as `empty` claims a
measurement nobody took. `24-ILAL` is `carrier_state: 'unkeyable'` in the registry and must
keep reporting `unknown`.

**Derived claims are marked in the reader's face.** `DsProvenance.is_synthesis` is the
column that does it, on every block kind that carries provenance.

---

## Breadth

This page is بين — 27 bands, 287 rows, the deepest root in the corpus. The distribution:

| bands filled | roots |
|---|---|
| 20+ | 6 |
| 10–19 | 472 |
| 5–9 | **1,153** |
| 2–4 | 11 |

**A layout verified only on بين will render 1,153 roots as a scaffold of empty headings.**
Test against a 5-band root before the design is called done.
