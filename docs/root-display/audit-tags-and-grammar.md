# Audit — the word-tag surface, the grammar corpus, and what a sense row is

Three questions, and they turn out to be one question.

---

# 1 · QAC gives three derivation categories. The registry declares thirteen.

`qr_word_occurrence` is fully parsed and in good order: **77,424 words**, `morphology_tag` and
`morphology_tag_json` on **100%**, lemma on 96%, root on 65% (particles have none, correctly).
The JSON carries the full segmentation — prefixes, stem, features, `lemma_ar`, `root_ar` — so
nothing needs re-parsing.

The complete flag vocabulary is **45 values**:

| axis | flags |
|---|---|
| **derivation** | `ACT` · `PASS` · `PCPL` · `VN` |
| verb form | `(II)`–`(X)`, plus `(XII)` 13× and `(IX)` 11× |
| tense / mood | `PERF` · `IMPF` · `IMPV` |
| person | 1S 1P · 2MS 2MP 2FS 2FP 2MD 2D · 3MS 3MP 3FS 3FP 3MD 3FD 3D |
| gender / number | M F · MS MP MD · FS FP FD · P |
| case | `NOM` `ACC` `GEN` |
| definiteness | `INDEF` |

Which yields exactly **three** derivation categories:

| QAC | classical |
|---|---|
| `ACT` + `PCPL` | اسم الفاعل |
| `PASS` + `PCPL` | اسم المفعول |
| `VN` | المصدر |

`GT:derivation_type:` declares **thirteen**. So ten are unreachable from QAC:

**صيغة المبالغة · الصفة المشبّهة · اسم التفضيل · اسم الزمان · اسم المكان · اسم الآلة ·
اسم المرة · اسم الهيئة · المصدر الميمي · مصدر بمعنى المفعول**

And `GT:jumud:` — **جامد vs مُشتقّ**, the ism-dhāt distinction — is not tagged by QAC at all.

**This is the honest answer to "audit that side deeply": QAC cannot supply the classical
taxonomy, and no amount of reading it harder will produce غفّار as a mubālagha.** It tags غفّار
`POS:N` and stops. The three views' `type.derivation` field can be filled for participles and
maṣādir and for nothing else, from this source.

Two smaller defects: **45 rows have no `pos`**, and **44 rows carry lowercase `noun`/`verb`**
among the 34 uppercase QAC tags — non-QAC values in a QAC column.

---

# 2 · The ten missing categories are already in the building

`ar_ling_gram_chunk` holds **21,319 chunks across 25 classical works, ~20 million characters**,
organised into **5,422 chapters** (`ar_ling_gram_bab`):

| work | chunks | chars |
|---|---|---|
| ابن يعيش · شرح المفصّل | 2,500 | 3.4M |
| سيبويه · الكتاب | 1,982 | 1.5M |
| السيوطي · همع الهوامع | 1,720 | 2.0M |
| الرضيّ · شرح الشافية | 1,542 | 1.6M |
| المبرّد · المقتضب | 1,442 | 1.1M |
| ابن جنّي · الخصائص | 1,357 | 1.2M |
| ركن الدين · شرح الشافية | 1,183 | 0.7M |
| ابن هشام · مغني اللبيب | 906 | 1.0M |
| … 17 more | | |

**The ṣarf texts that define the missing ten are all here** — Ibn al-Ḥājib's *Shāfiya* with al-Raḍī's
and Rukn al-Dīn's commentaries, Ibn ʿUṣfūr's *Mumtiʿ*, al-Thamānīnī's *Sharḥ al-Taṣrīf*, Ibn
Mālik's *Lāmiyyat al-Afʿāl*, Ibn Jinnī's *Munṣif*. صيغة المبالغة and الصفة المشبّهة are defined,
exemplified and argued over in exactly these books.

**But nothing connects them to anything.**

| link | rows |
|---|---|
| `ar_ling_gram_term` | 399 |
| `ar_ling_gram_term_example` | **25** |
| `ar_ling_gram_term_relation` | **14** |
| chunk → term | **no column** |

`ar_ling_gram_chunk` has `bab_id`, `source_slug`, `page_no`, `heading_norm` — and no term
reference. So twenty million characters of grammar sit beside 399 named terms with twenty-five
examples between them.

**And not one chunk has an English or Urdu translation.** `translation_en` and `translation_ur`
are empty across all 21,319.

Separately, `km_quran` holds **139,842 iʿrāb blocks across 6 books** — *larger than the tafsīr
corpus* (41,056 / 8) and untouched by anything in this branch.

---

# 3 · What a sense row is

The two contracts, restated precisely:

| | بين | كشف |
|---|---|---|
| `scope_level` | `root` on all 13 | `lemma` on 24 of 32 live |
| `label_ar` | a sense name — `فِراق`, `ظُهور` | an arc — `سَرْوٌ ← رفعُ الغطاء ← المغطَّى هو المكروه` |
| | | a naḥw note — `الفاعلُ ← عملُه عملَ فعلِه` |
| | | a reading count — `أربعةُ أوجهٍ في كاشِفة` |

One table, three different kinds of row, told apart only by reading the Arabic.

## The decision

**A sense is a meaning the root or lemma carries. It is not a derivation of that meaning, and
not an observation about it.** Three row kinds, three homes:

| kind | test | belongs in |
|---|---|---|
| **sense** | can complete *"the word means ___"* | `ar_ling_root_sense` |
| **arc** | contains `←`, or names a path between senses | `ar_ling_sense_arc` + `_step` — which already exist and are correctly shaped |
| **note** | an observation about a word: iʿrāb, a variant count, a mufassir's remark | a new `ar_ling_root_lemma_note`, or the existing tafsīr/iʿrāb carriers |

The mechanical part of the split is easy and safe: **`label_ar LIKE '%←%'` is an arc**, and the
arc carrier is already built and populated for other roots. The rest needs an editor.

**Do not** widen the sense reader to cope. A renderer that prints arrows in a sense heading is
not a display bug being worked around — it is the table's contract being violated, and coping
makes the violation permanent.

## Why this is one question, not three

The reason كشف's rows became arcs-in-labels is that **there was nowhere else to put a derivation
observation about a lemma** — `lemma_arc` holds 14 rows corpus-wide and 0 for كشف. The reason
the derivation taxonomy is thin is that **QAC does not carry it and the books that do are
unlinked**. Both are the same shape of problem: a well-built carrier exists, and the ingest had
no route into it, so the material went into whatever column was nearest.

---

# What to do, in order

1. **Split `ar_ling_root_sense` on the arrow.** Mechanical, reversible, and it makes كشف
   renderable. ~9 rows for كشف, unknown corpus-wide — measure first.
2. **Normalise the 44 lowercase `pos` values** in `qr_word_occurrence`. Two-minute fix.
3. **Fill `type.derivation` from QAC where QAC can answer it** — participles and maṣādir, which
   is 4,199 words — and leave it null elsewhere rather than guessing a mubālagha from a wazn.
4. **Link `ar_ling_gram_chunk` to `ar_ling_gram_term`.** This is the large one and the one that
   unlocks the other ten categories. A `term_id` on the chunk, or a join table with a locator,
   turns 20M characters from a library into a lookup.
5. **The 139,842 iʿrāb blocks are unexamined.** Before any more grammar work, find out what is
   in them — they may already answer questions being asked of the ṣarf books.
