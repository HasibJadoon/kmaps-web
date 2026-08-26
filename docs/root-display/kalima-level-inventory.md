# The kalima-level inventory — every word-level term the books use

Measured across **21,319 chunks** of 25 classical works, then checked against the **399**
registry terms. The question: *what does a grammarian need to say to pin down one word, and can
we say it?*

---

## 1 · What the books discuss, measured

### The noun

| term | chunks | in registry |
|---|---|---|
| **معرفة** | **944** | **✗** |
| **نكرة** | **752** | **✗** |
| المؤنث | 560 | ✓ `gender` |
| المثنى / التثنية | 558 | ✓ `number` |
| النسب | 485 | ✓ `noun_process` |
| المذكر | 431 | ✓ `gender` |
| التصغير | 416 | ✓ `noun_process` |
| **المبني** | **295** | **✗** |
| جمع التكسير | 244 | ✓ `noun_process` |
| **ممنوع من الصرف / لا ينصرف** | **177** | **✗** |
| المقصور | 172 | ~ (one term, paired with الممدود) |
| **المعرب** | **158** | **✗** |
| الممدود | 145 | ~ |
| المنقوص | 92 | **✗** |
| **اسم الجنس / اسم جمع** | **70** | **✗** |
| **جمع المذكر السالم** | **20** | **✗** |

### The verb

| term | chunks | in registry |
|---|---|---|
| الثلاثي | 495 | ✓ `form_tier` |
| الرباعي | 264 | ✓ `form_tier` |
| اللازم | 229 | ✓ `transitivity` |
| المزيد | 213 | ✓ `form_tier` |
| المضاعف | 179 | ✓ `root_type` |
| المجرد | 171 | ✓ `form_tier` |
| المتعدي | 123 | ✓ `transitivity` |
| المجهول | 83 | ✓ `voice` |
| الجامد من الأفعال | 32 | **✗** |

### Root shape · morphophonology

| term | chunks | in registry |
|---|---|---|
| الإدغام | 457 | ✓ `inflection_class` |
| الصحيح | 434 | ✓ `root_type` |
| المعتل | 418 | ✓ `root_type` |
| المثال | 369 | ✓ `root_type` |
| الإعلال | 319 | ✓ `inflection_class` |
| الإبدال | 170 | ✓ `inflection_class` |
| الناقص | 103 | ✓ `root_type` |
| الأجوف | 67 | ✓ `root_type` |
| المهموز | 36 | ✓ `root_type` |
| اللفيف | 4 | ✓ `root_type` |

### Derivation

| term | chunks | in registry | QAC |
|---|---|---|---|
| **وزن / أوزان** | **1,577** | ✓ `form_tier` (الميزان الصرفي) | ✗ — but on every lemma |
| مشتق / جامد | 433 | ✓ `jumud` | ✗ |
| المبالغة | 273 | ✓ `derivation_type` | ✗ |
| الصفة المشبّهة | 45 | ✓ | ✗ |
| اسم التفضيل | 44 | ✓ | ✗ |
| اسم الزمان / المكان / الآلة | 19 | ✓ | ✗ |
| المصدر الميمي | 7 | ✓ | ✗ |
| اسم المرة / الهيئة | 2 | ✓ | ✗ |

---

## 2 · Five axes the books use and the registry does not have

Of 399 terms, **zero** cover these:

| # | axis | chunks | why it matters at word level |
|---|---|---|---|
| 1 | **معرفة ⟷ نكرة** | **1,696** | The single most-discussed word-level classification in the corpus. The registry has only QAC's `DET`/`INDEF`, which is a *prefix* fact — not the classical axis with its seven kinds (مضمر · علم · إشارة · موصول · محلّى بأل · مضاف إلى معرفة · منادى). |
| 2 | **مبني ⟷ معرب** | **453** | Whether a word inflects at all. `mahall` describes an iʿrāb *position*; nothing says the word is built. |
| 3 | **ممنوع من الصرف** | **177** | Diptote. Decides whether a noun takes tanwīn and kasra — visible on the page, and unsayable. |
| 4 | **جمع سالم ⟷ جمع تكسير** | 264 | `number` has S/D/P only. The two plurals behave differently and the books separate them. |
| 5 | **اسم الجنس / اسم جمع** | 70 | Collective vs plural — a real distinction for words like شجر, قوم. |

Plus **المنقوص** has no term while المقصور والممدود share one.

## 3 · The correction to the framing

**اسم الذات does not occur once** in 21,319 chunks. اسم المعنى occurs twice. The axis these
books use is **جامد ⟷ مشتق** — 433 chunks — which `GT:jumud:` already declares correctly.

Keep اسم الذات as a search alias; it should not be a term id.

## 4 · What to add — proposed ids

```
GT:definiteness:maarifa            معرفة
GT:definiteness:nakira             نكرة
GT:maarifa_kind:mudmar             المضمر
GT:maarifa_kind:alam               العَلَم
GT:maarifa_kind:ishara             اسم الإشارة
GT:maarifa_kind:mawsul             الموصول
GT:maarifa_kind:bi_al              المحلّى بأل
GT:maarifa_kind:mudaf              المضاف إلى معرفة
GT:maarifa_kind:munada             المنادى المقصود

GT:inflect_state:mabni             مبني
GT:inflect_state:murab             معرب

GT:sarf_state:munsarif             منصرف
GT:sarf_state:mamnu_min_al_sarf    ممنوع من الصرف

GT:plural_kind:salim_m             جمع المذكر السالم
GT:plural_kind:salim_f             جمع المؤنث السالم
GT:plural_kind:taksir              جمع التكسير
GT:plural_kind:ism_jam             اسم الجمع
GT:plural_kind:jins_jami           اسم الجنس الجمعي

GT:noun_process:manqus             المنقوص      (split from المقصور والممدود)
GT:jumud:jamid_fil                 الفعل الجامد
```

**Twenty-one terms**, taking the registry from 399 to 420 and closing every measured gap.

## 5 · Which of these QAC can fill

| axis | QAC | how |
|---|---|---|
| معرفة/نكرة | **partly** | `INDEF` flag and the `Al+` prefix segment give definite vs indefinite; the seven *kinds* need `pos` (PRON, PN, DEM, REL) plus a rule |
| مبني/معرب | **partly** | particles and pronouns are built by definition; verbs and nouns need a rule |
| ممنوع من الصرف | **inferable** | a noun with no `INDEF` flag that still takes a case flag is a strong candidate — a rule, confirmed by a book |
| جمع سالم/تكسير | **inferable** | `MP`/`FP` plus the surface ending (ون/ين/ات) against the lemma — a rule |
| اسم الجنس | **✗** | lexical; needs a source |

So four of the five are reachable at tier `rule`, and one needs tier `sourced` — which is the
same three-tier shape already built in `qr_word_term`.

## 6 · Where each is settled

For tier `sourced`, the book to cite:

| axis | book | chunks |
|---|---|---|
| وزن | **الرضيّ · شرح الشافية** 214 · ركن الدين 172 · الغلاييني 143 |
| جامد/مشتق | **السيوطي · همع الهوامع** 65 · ابن يعيش 64 · الغلاييني 47 |
| صيغة المبالغة | **ابن يعيش · شرح المفصّل** 43 — *not* الطراز (69) or أسرار البلاغة (36), which mean hyperbole |
| الصفة المشبّهة | الغلاييني 12 · الرضيّ 12 |
| اسم التفضيل | **الغلاييني** 30 · ابن يعيش 20 · الرضيّ 18 |
| معرفة/نكرة · مبني/معرب · ممنوع من الصرف | الغلاييني · ابن يعيش · السيوطي |

**الغلاييني · جامع الدروس العربية** is the single most useful book for word-level definitions —
it is the modern pedagogical synthesis and leads on tafḍīl, ṣifa mushabbaha and jumud. **الرضيّ ·
شرح الشافية** leads on wazn and is the ṣarf authority.

---

## What is still blocking

The chunk→term link. 20M characters, 399 terms, **25 examples** joining them. Every citation
above was found by string search, not by lookup — which is fine for an audit of twenty terms and
impossible for tagging 77,424 words.
