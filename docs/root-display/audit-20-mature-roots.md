# Audit — 20 mature roots against the document structure

The `root.doc` shape was designed on بين. This tests it against the twenty roots with the
widest band coverage, every table checked, to find where the structure is بين-shaped rather
than general.

**بين is atypical in both directions, and designing on it alone misleads twice.**

---

## 1 · Can senses sit under a form family?

Asked properly this time, across all 117 tables.

**No table in `km_arabic_linguistic` carries both a sense column and a form column.** A
scan of every `ar_ling_*` table for `%sense%` against `%form%|%bab%|%wazn%|%pattern%`
returns nothing. There is no direct link and never was.

**But an indirect path exists and is sound.** `ar_ling_root_sense.scope_level` takes the
value `lemma`, and its `scope_key` is a lemma id:

```
sense (scope_level='lemma') → ar_ling_root_lemma → verb_form → form family
```

236 lemma-scoped senses across 34 roots, and **every one of the 236 keys resolves to a real
lemma** — the join is clean. What it does not do is reach a form very often:

| root | lemma-scoped senses | resolve to a lemma | land on a form | forms reached |
|---|---|---|---|---|
| كتب | 41 | 41 | **18** | I · III · VIII |
| كشف | 29 | 29 | **11** | I |
| **بين** | 10 | 10 | **0** | — |
| نذر | 8 | 8 | 0 | — |
| رسل | 7 | 7 | 1 | IV |
| حيي | 6 | 6 | 2 | IV · X |
| اتي | 6 | 6 | 3 | I · IV |
| سمع | 5 | 5 | 3 | I · VIII |
| فرق | 5 | 5 | 1 | I |
| سمو | 4 | 4 | 0 | — |

**121 lemma-scoped senses; 39 reach a form.** The other 82 hang on nouns, and `verb_form`
is populated only on verbs.

**Verdict.** `forms[].senses[]` is worth adding — it is a real join, not an invention — but
it will be empty for most roots and **empty for بين**, the root the page was built on. Root-scope
senses (684 rows over 254 roots) stay the primary inventory. A design that moved senses *under*
forms wholesale would empty the sense section for the flagship root.

This also settles the arc question from the other direction: the page's forms-on-a-pole
reading remains an inference, and the producer is right to leave `forms[].arc` null.

## 2 · الصرف الصغير — 2 of 20

| has paradigm rows | roots |
|---|---|
| yes | **بين (7) · بطش (6)** |
| no | the other **18** |

`ar_ling_root_form_paradigm` is the only carrier holding the muḍāriʿ. `ar_ling_root_form_template`
(517 rows) covers `root_type = 'sound'` only, and carries no weak pattern at all — so it cannot
supply a hollow, defective or assimilated root.

**This is the single largest gap for a classical presentation.** The ṣarf ṣaghīr is the most
recognisably traditional thing on the page and exists for two of the twenty most developed
roots. Everything else falls back to past + maṣdar + participles, with no present tense.

## 3 · Where بين misleads

**It is not the sense-richest root.** كشف has **42** labelled senses to بين's 13.

**It is nearly empty of expressions.** I reported بين's single `tabir` row as a finding; against
the cohort it is the anomaly, not the norm:

| root | expressions |
|---|---|
| اخذ | **58** |
| اتي | **50** |
| رسل | 24 |
| علو · سمع | 20 |
| كشف | 18 |
| حيي | 16 |
| عود | 13 |
| … | |
| **بين** | **1** |

So the Constructions section is well-founded across the corpus and starved for exactly the root
the page renders. The four idioms shown on the بين page still have no rows behind them.

**It leads on attestations** — 106, against رسل 86, نذر 83, كشف 56, كتب 55. And **علو has 0**
despite 12 labelled senses and 20 arcs, so a sense section keyed on witnesses renders empty there.

## 4 · Every table, across the cohort

Sections present for only a minority — each must be absent, not empty:

| layer | roots with any | of 20 |
|---|---|---|
| lexicon entries | 20 | **all** |
| labelled senses | 20 | **all** |
| sense arcs | 20 | **all** |
| forms (masmu) | 20 | **all** |
| aṣl statements | 18 | most |
| iʿlāl bindings *(new)* | 12 | most |
| expressions | 13 | most |
| government | 14 | most |
| scholarship | 9 | under half |
| aḍdād | 8 | under half |
| development stages | 10 | half |
| **semantic field** | **3** | بين · كتب · بطش |
| **memlets** | **3** | بين · نذر · كتب |
| **silsila** | **2** | بين · نذر |
| **paradigms** | **2** | بين · بطش |

The `ar_ling_root_lemma_ilal_apply` bindings added in `0107` land across **12 of the 20** —
غشو 17, علو 17, بين 10, حيي 9, اتي 7, سمو 7, عود 7, كتب 4, اخذ 4, and three more. That
carrier generalises; `silsila`, the layer's other carrier, is بين and نذر only.

## 5 · What this changes in the document

1. **Add `forms[].senses[]`** — the lemma-scoped join, where it resolves. Expect it empty on
   most roots and on بين. Do not move root-scope senses under forms.
2. **`sarf_saghir` must be null-tolerant everywhere.** Two roots in twenty have one; the page
   cannot assume a present tense exists.
3. **Keep `forms[].arc` null.** Nothing found here changes that.
4. **The completeness gradient is the design problem, not an edge case.** Five layers exist for
   three roots or fewer. A page that renders a heading per layer will be mostly headings.
5. **Re-test on كشف and اخذ, not بين.** كشف for senses (42), اخذ for expressions (58). بين
   is the wrong yardstick for both.
