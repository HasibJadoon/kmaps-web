# `root.doc` — the reader's document

`GET /al/root-doc/:root` · produced by `workers/ar-linguistics/src/repositories/root-doc.repo.ts`

The display spec (`/al/ds/root/:root`) answers a builder's question — which layers exist, what
do they hold, how far along are they. This answers a reader's: **what is this root, and what
hangs off what.**

## The hierarchy

```
root                      identity · letters · core meaning · counts
├── asl[]                 the origin statements, oldest first
├── senses[]              the labelled inventory only
│   ├── witnesses[]       ≥2 where they exist, oldest first, author + death year
│   └── path              how this sense is reached · nodes[] · attested | ours
├── development[]         the stages, end to end
├── forms[]               ← the spine: a form owns what it governs
│   ├── government[]      transitivity · route · particle · meaning · source
│   ├── masadir[]         each attested | ours
│   ├── arc               null — see gaps
│   └── lemmas[]          ← a lemma belongs to the form that built it
│       └── examples      null — fetched by examples_key, see gaps
├── unassigned[]          lemmas the corpus binds to no form
├── relations             addad · field · taqalib · neighbours
├── sources[]             every work cited, oldest first, with what it was cited for
└── gaps[]                what the document declines to guess, and why
```

Two rules the shape enforces:

- **A lemma never appears loose.** It sits under its form, or in `unassigned` — never in a flat
  list that implies a paradigm nobody assigned.
- **A sense never appears without its evidence.** `witnesses` is part of the sense, not a
  sibling section, and `witness_count` states the true total when only two are carried.

## `gaps` — the document declines to guess

Three things are structurally absent, and each says why rather than rendering as an empty box:

**`forms[].arc` is always null.** The root note type declares `SenseArc.fam` — *"ties each rung
to a FormLadder entry"* — but `ar_ling_sense_arc_step` has no form column and
`ar_ling_root_sense` has none either. Reading a form onto a pole from its government gloss is an
inference. The بين page shows one; the producer does not, because an inference that ships as
data stops being an inference.

**`forms[].lemmas[].examples` is null.** Occurrences live in `km_quran`, which this worker cannot
read and should not. Each lemma carries `examples_key`; a composer fetches and merges. At least
two per lemma where the corpus allows — **and a lemma occurring once cannot have two, and must
say so rather than be padded.**

**`lemmas[].derivation` is null.** The QAC map carries the derivation type and is keyed on the
lemma's Buckwalter, but `ar_ling_root_lemma_form_map.lemma_ar` is NULL corpus-wide and lemmas
store no Buckwalter. There is no join to make until one side gains the other's key.

## Two decisions the producer makes about messy data

**Senses fold; source notes do not.** A root's sense table holds two different things — the
labelled inventory, and one unlabelled note per source. Only the labelled ones become `senses`;
the rest are counted into `counts.source_notes` and left to their sources. Flattening them tells
a reader بين has forty-one meanings when it has thirteen.

**Lemmas deduplicate on `(bare, part_of_speech)`, keeping the non-zero frequency.** بين carries
بَيْن and بَيِّنَة twice each, the second copy at frequency 0 — stale rows, not words. Without
this the Qurʾānic count reads 15 where the muṣḥaf has 13.

## Generic — measured, not asserted

The same queries over four roots of deliberately different shape:

| | بين | كتب | عبد | رجم |
|---|---|---|---|---|
| labelled senses | 13 | 8 | 4 | 5 |
| sense rows behind them | 41 | 50 | 6 | 5 |
| forms | 7 | 8 | 2 | 1 |
| government rows | 7 | **19** | **0** | 1 |
| aṣl statements | 4 | 3 | 2 | 2 |
| development stages | 4 | 6 | 4 | 4 |
| arcs | 5 | 2 | 3 | 3 |
| aḍdād | 2 | 4 | 2 | **0** |
| semantic field | 5 | 9 | **0** | **0** |

What the outliers prove:

- **عبد has no government at all.** Its forms carry no transitivity, so `government` comes back
  `[]` and the meaning falls through to the form carrier. A page must render the form without a
  government line rather than an empty one.
- **كتب has 19 government rows across 8 forms** — more than one per form. Government is a list
  under a form, never a single field.
- **رجم has 5 sense rows and 5 labelled senses** — no source notes at all, so the fold is a
  no-op. The ratio is not a constant: 41→13, 50→8, 5→5.
- **عبد and رجم have no semantic field, رجم no aḍdād.** Those sections are absent, not empty.

## Verification

```bash
curl -s "$API/al/root-doc/بين"  | jq '{senses:(.senses|length), forms:(.forms|length),
    lemmas:([.forms[].lemmas[]]|length), unassigned:(.unassigned|length), gaps:(.gaps|length)}'
curl -s "$API/al/root-doc/عبد"  | jq '.forms[] | {roman, government:(.government|length)}'
```

بين must return 13 senses, 7 forms, 13 lemmas across forms plus unassigned, and no lemma
appearing twice. عبد must return every form with `government: []` and not fail.
