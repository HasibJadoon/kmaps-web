# The 399 terms, and where each is settled

Two things, measured against live D1:

1. **What the registry holds** — all 399 `GT:` terms, in `docs/root-display/data/terms.tsv`
   (`category · term_key · Arabic · English · QAC flag`), the exact contents of
   `ar_ling_gram_term WHERE status='live'`.
2. **Where the books treat each one** — a term→chapter map built by matching term names against
   book tables of contents, not against book text.

---

## 1 · The registry, by category

All 399 are `status='live'`. Only **79** carry a QAC flag; the other 320 are classical
categories QAC has no opinion about.

| category | n | QAC-flagged | what it classifies |
|---|---|---|---|
| `balagha_maani` | 99 | 0 | ʿilm al-maʿānī — predication, restriction, ellipsis, shift |
| `balagha_bayan` | 39 | 0 | simile, metaphor, trope, metonymy and their ʿalāqāt |
| `harf_maani` | 29 | **29** | the particle senses — REM, CIRC, CAUS, EMPH … |
| `form_family` | 28 | 12 | the six Form I bābs, Forms I–XIII, the quadriliterals |
| `balagha_badi` | 26 | 0 | ṭibāq, jinās, tawriya, sajʿ |
| `irab_role` | 25 | 0 | mubtadaʾ, fāʿil, mafʿūl, ḥāl, tamyīz … |
| `pos` | 18 | 15 | noun, verb, particle and their subdivisions |
| `root_type` | 15 | 0 | ṣaḥīḥ, mahmūz, muḍaʿʿaf, mithāl, ajwaf, nāqiṣ, lafīf |
| `kalam_kind` | 14 | 0 | khabar/inshāʾ and the three khabar audiences |
| `derivation_type` | 13 | **3** | maṣdar, the two participles, mubālagha, tafḍīl, āla … |
| `sentence_class` | 13 | 0 | nominal/verbal/conditional sentences |
| `shart_tool` | 12 | 0 | in, man, mā, mahmā, matā, idhā, law, lawlā, ammā |
| `phonotactic` | 8 | 0 | two quiescents, waqf, imāla, hamza-lightening, metathesis |
| `form_tier` | 6 | 0 | mujarrad/mazīd, the mīzān ṣarfī |
| `inflection_class` | 5 | 0 | iʿlāl (qalb/naql/ḥadhf), ibdāl, idghām |
| `mahall` | 5 | 0 | in position of rafʿ/naṣb/jarr/jazm, or none |
| `nawasikh` | 5 | 0 | kāna, inna, ẓanna, kāda, lā al-nāfiya lil-jins |
| `noun_process` | 5 | 0 | taṣghīr, nasab, broken plural, maqṣūr/mamdūd, ziyāda |
| `taddiya_route` | 5 | 0 | how a verb reaches its object |
| `transitivity` | 5 | 0 | lāzim, mutaʿaddin, by particle, ditransitive |
| `case` `mood` `number` `person` `tense` | 3 each | 3,2,3,3,3 | the inflectional axes |
| `jumud` | 3 | 0 | jāmid, mushtaqq, fiʿl |
| `definiteness` `gender` `voice` | 2 each | 2 each | DET/INDEF, M/F, ACT/PASS |

**Correction to an earlier note.** `definiteness` *does* exist — `GT:definiteness:definite`
(مَعْرِفَة, DET) and `:indefinite` (نَكِرَة, INDEF). What is missing is the classical
*sub*-axis: the seven kinds of maʿrifa (مضمر · علم · إشارة · موصول · محلّى بأل · مضاف إلى
معرفة · منادى). The gap is narrower than "no term for definiteness" — it is "the term is
QAC-shaped, and the books' seven kinds have nowhere to sit."

---

## 2 · The TOC map

`ar_ling_gram_term_toc` — **4,503 links, 204 of 399 terms, 134 with a strong match.**

The link is **term → chapter heading**, not term → text chunk. That was the design decision:
`ar_ling_gram_bab` holds 5,422 headings across 25 ingested works, **every one with a page
number**, and a classical book names its subject in its heading. One join over 5,422 headings
answers "where is this settled?" for all 399 terms at once — where a chunk-level link would
mean classifying 21,319 chunks first.

```
match_rank 1  exact     the heading IS the term          → الميزان الصرفي
match_rank 2  prefix    the heading opens with it        → إدغام تاء الافتعال
match_rank 3  contains  the heading mentions it
```

Terms of four normalised characters or fewer (اسم، فعل، حال، خبر) admit ranks 1–2 only.
Without that gate اسم matched 412 headings and فعل 374 — half the corpus.

### Source ranking

`ar_ling_gram_source_toc_rank` orders the books by *how usable their TOC is as an index*,
measured on heading length:

| rank | source | tier | headings ≤25 chars |
|---|---|---|---|
| **0** | **عضيمة · دراسات لأسلوب القرآن** | quranic-index | — (see §3) |
| 1 | الغلاييني · جامع الدروس | pedagogical | 120/130 = **92%** |
| 2 | ابن هشام · قطر الندى | pedagogical | 79/90 = 88% |
| 3 | ابن الحاجب · الشافية | pedagogical | 67/74 = 91% |
| 4 | الرضيّ · شرح الشافية | indexed | 84/102 = 82% |
| 5 | السيوطي · همع الهوامع | indexed | 516/582 = 89% |
| … | | | |
| 24 | العلوي · الطراز | discursive | 233/893 = 26% |
| 25 | المبرد · المقتضب | discursive | 61/348 = **18%** |

The bottom tier's headings are running sentences, not labels. They still match, but they rank
last, so a reader is sent to الغلاييني before المقتضب.

---

## 3 · ʿAḍīma — the source that changes the arithmetic

**محمد عبد الخالق عضيمة · دراسات لأسلوب القرآن الكريم**, via the jamharah.net archive:
`المعجم الصرفي` (389 entries) and `المعجم النحوي` (182), **571 in all**, each a stable URL.
Only the TOC is stored — `ar_ling_gram_external_toc`, with `url` and `id` as generated columns.

It is ranked 0 because it is the only work in reach that is *organised the way this project
needs*: one entry per term, and inside the entry every Qurʾānic instance of it, enumerated with
sūra:āya. It reaches **83 terms, 45 strongly** — and it reaches what the ingested books' headings
do not:

| gap | ʿAḍīma |
|---|---|
| **ممنوع من الصرف** — no `GT:` term exists at all | `لمحات عن دراسة الممنوع من الصرف` + `دراسة الممنوع من الصرف` |
| **جمع سالم ⟷ تكسير** — `number` has S/D/P only | `جمع المذكر السالم` · `جمع المؤنث السالم` · `جمع التكسير` · `الملحق بجمع المذكر` |
| **اسم الجنس / اسم جمع** — no term | `اسم الجمع` · `اسم الجنس الجمعي` · `تثنية الجمع واسم الجمع` |
| **النسب** — term exists, zero examples | `لمحات عن دراسة النسب` + `دراسة النسب`, Qurʾān-exhaustive |
| **`root_type`** — the ingested TOCs reached 2 of 15 | `الفعل المثال` · `الأجوف` · `الناقص` · `المضاعف` · `المهموز` · `اللفيف المقرون/المفروق`, each as a Qurʾānic verb list |
| **the six Form I bābs** | `[باب نصر]` `[باب ضرب]` `[باب علم]` `[باب فتح]` `افعال باب كرم` `[باب حسب]` |
| **وزن → classical label** | ~60 entries titled `المصدر على (فِعْلة)`, `(فُعْل)`, `(فَعَال)`, `(مَفعول)` … keyed **by wazn** |

That last row is the one to act on. `qr_lemma.wazn_ar` is 100% populated — 4,817 lemmas, 465
distinct patterns — and has never been used, because nothing tied a pattern to a classical
label. ʿAḍīma's maṣdar section is that tie, written out pattern by pattern against the Qurʾān.

---

## 4 · What the map does not do

Every row is `state='auto'`. String matching over headings is a first draft and it visibly errs:

- `GT:jumud:fil` (فِعْل) → `فُعُلّ`. A three-letter term inside a wazn. Noise.
- `GT:inflection_class:ibdal` (إبدال) → `إبدال نكرة من معرفة`. That is naḥw *badal*, not ṣarf
  *ibdāl*. Same string, different discipline — the exact trap that put الطراز at the head of
  المبالغة and ابن الأثير at the head of النسب. **Gate on `discipline` before trusting a row.**
- `GT:derivation_type:masdar` → `مصدر المبني للمفعول`, a sub-topic, where
  `لمحات عن دراسة المصادر` is the head entry. Rank ordering picks a leaf over its parent when
  both match exactly.

So the map is a **candidate list to confirm**, not a citation index. The work it saves is real:
finding 4,503 candidate citations by hand was the thing that was not going to happen.

### Still missing entirely

`transitivity` 0/5 and `taddiya_route` 0/5 — no book titles a chapter مُتَعَدٍّ إلى مفعولين.
The books treat it inside `باب الفاعل` and, in ʿAḍīma, as `المتعدى واللازم` and
`الأفعال الناصبة لمفعولين`. Those need a hand-authored alias, not a better matcher.

---

## Files

- `docs/root-display/data/terms.tsv` — all 399 terms
- `workers/ar-linguistics/migrations/0108_map_terms_to_book_tocs.sql` — the ingested-book map
- `workers/ar-linguistics/migrations/0109_register_adima_quranic_term_index.sql` — ʿAḍīma
