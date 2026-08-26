# Audit — كشف and اخذ

Run because بين proved the wrong yardstick: كشف was the sense-rich outlier, اخذ the
expression-rich one. Testing the document against both **found two bugs in the producer and
one wrong number in my earlier audit.**

| | بين | كشف | اخذ |
|---|---|---|---|
| Qurʾān tokens | 522 | **20** | 273 |
| core meaning ar / en / ur | ✓ ✓ ✓ | **✗ ✗ ✗** | ✓ ✓ ✗ |
| labelled senses | 13 | **42** | 5 |
| — root-scope | 13 | 18 | 5 |
| — lemma-scope | 0 | **24** | 0 |
| forms (masmu) | 7 | **1** | 3 |
| paradigms (ṣarf ṣaghīr) | 7 | **0** | **0** |
| government rows | 7 | 14 | 6 |
| expression **rows** | 1 | 18 | 58 |
| expression **idioms** | 1 | **5** | **8** |

---

## 1 · "اخذ has 58 expressions" was wrong — it has 8

`ar_ling_root_lemma_tabir` stores **one row per (idiom × verse × source page)**, not one per
idiom:

| root | rows | distinct idioms | distinct āyāt | source pages |
|---|---|---|---|---|
| اخذ | 58 | **8** | 51 | 7 |
| كشف | 18 | **5** | 18 | 2 |
| بين | 1 | 1 | 1 | 0 |

اخذ's rows are the same expression `أَخَذَ` repeated against 51 verses, and **duplicated across
pages 35 and 36** — 2:63 appears twice, 2:93 twice. Counting rows reports eight idioms as
fifty-eight.

**Fixed.** The producer now folds on `(expression_ar, preposition_ar)` and hangs the verses
underneath as `citations[]`, deduplicated by āyah. That is also the hierarchy the section
wanted anyway: idiom → where it is cited.

Two further facts about this carrier, corpus-wide: every row comes from a **single source**
(`mir_verbal_idioms`), and **no row has an English or Urdu explanation** — `explanation_en`
and `expression_ur` are empty for all of them. The idiom section is Arabic-plus-āyah only.
The English glosses on the بين page are not from this table.

## 2 · Government is tied to a form on only 20% of rows

`ar_ling_root_lemma_tadiya.verb_form`, corpus-wide:

| value | rows |
|---|---|
| **NULL** | **317** |
| I … X | 74 |
| `I-participle`, `I-participle-fp`, `I-masdar` | 4 |

**80% of government rows name no form at all**, and four of the rest carry a suffixed value the
form carrier never uses. For **اخذ every one of its 6 rows is NULL**, so the government section
under its forms came back empty; for **كشف**, `II · III · VII · X` appear in government while
`form_masmu` holds only Form I — the government carrier knows more forms than the form carrier.

**Fixed, two ways.** Suffixed values normalise onto their form (`I-participle` → `I`, keeping
the derivation as a note). Rows with no form become a root-level `government[]` beside the
forms rather than being silently dropped — which is what my earlier producer did to all six of
اخذ's.

بين passed this test only because it is the rare root whose government rows are cleanly keyed
I–X.

## 3 · كشف's sense table is not a sense inventory

24 of its 42 labelled senses are lemma-scoped, and their labels are not senses:

- `سَرْوٌ ← رفعُ الغطاء ← المغطَّى هو المكروه ← إزالتُه` — an arc, arrows and all, inside `label_ar`
- `الفاعلُ ← عملُه عملَ فعلِه ← الإضافةُ للتخفيف` — a naḥw analysis
- `التنوينُ على الأصلِ والإضافةُ للتخفيف` — a grammatical note
- `أربعةُ أوجهٍ في كاشِفة` — four readings of one word
- `حدُّ المكشوفِ عنه عند الرازي` — a tafsīr point

So `ar_ling_root_sense` holds a **clean labelled inventory for بين and per-lemma analytical
notes for كشف**. Same table, two different contracts. A renderer that prints `label_ar` as a
sense heading produces, for كشف, headings containing arrows and grammatical terminology.

Not fixed — this is an ingest question, not a producer one. The producer cannot tell a sense
from an arc when both arrive in the same column. **Flagged as the highest-value thing to
settle before more roots are built.**

## 4 · The ṣarf ṣaghīr is absent from both

Neither كشف nor اخذ has a paradigm row, so neither has a muḍāriʿ. Both are `sound` roots, so
`ar_ling_root_form_template` — which covers sound roots — could in principle supply one, but
its rows are pattern templates keyed by form and person, not per-root realisations.

Of the twenty mature roots, **two** have paradigms. This remains the largest gap for a
classical presentation.

## 5 · Two smaller things

**كشف has no core meaning at all** — `meaning_core_ar`, `_en` and `_ur` are all NULL, against
بين which has all three. The headline must be derived from the primary aṣl statement, as the
plan already says; for كشف there are 2 aṣl rows to derive it from.

**كشف has 20 Qurʾānic tokens against بين's 522.** A page whose form ladder leads with Qurʾān
counts will look nearly empty for it, while its 42 senses are the richest in the cohort. The
lead figure should not be the token count.

---

## What still needs deciding

1. **The sense/arc contract in `ar_ling_root_sense`** (§3). Blocking for any root built like كشف.
2. **Where idiom English comes from**, given the carrier has none for any root.
3. **Whether `forms[].senses[]` is worth rendering** — for كشف it would carry 11 of 29 under
   Form I; for بين and اخذ, nothing.
