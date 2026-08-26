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

---

## 7 · النسب worked through end to end

النسب is the one term on the list that is *already in the registry* and still unusable. It is
worth walking because it shows exactly what "in the registry" is and is not worth.

### What we hold

```
GT:noun_process:nasab · النسب · "the relative adjective (nisba)" · status live
definition_ar  الشافية — ياء مشددة مكسور ما قبلها
definition_en  —        definition_ur —        qac_flag —        examples 0
```

One Arabic line lifted from al-Shāfiya, no gloss in either other language, no QAC flag, and
**zero rows in `ar_ling_gram_term_example`**. A reader clicking the badge gets a name.

### What the books hold — and the same trap as المبالغة

485 chunks, but they are not one conversation:

| source | discipline | chunks | of which name ياء النسب |
|---|---|---|---|
| الرضيّ · شرح الشافية | **SF** | 116 | 42 |
| ركن الدين · شرح الشافية | SF | 69 | 6 |
| ابن يعيش · شرح المفصّل | SF | 54 | 9 |
| **ابن الأثير · المثل السائر** | **BL** | **31** | **0** |
| **السكاكي · مفتاح العلوم** | **BL** | 28 | 4 |
| ابن يعيش · شرح المفصّل | NH | 26 | 6 |
| الغلاييني · جامع الدروس | SF | 21 | 4 |
| القزويني · الإيضاح | **BL** | 12 | 0 |

The balāgha rows use النسب for **attribution/predication** — الإسناد's neighbour, nothing to do
with the suffix. Ibn al-Athīr's 31 chunks name ياء النسب zero times. Ingest on `discipline='SF'`,
not on the string. Same rule that saved المبالغة from الطراز.

**Cite الرضيّ · شرح الشافية.** 116 chunks and 42 explicit — it is the ṣarf authority here as it
is on wazn.

### Why it cannot be a rule — three separate failures

Tested against all 4,817 Qurʾānic lemmas:

1. **The surface over-generates.** 43 lemmas end in shadda-yāʾ; **13 of them are فَعِيل** —
   عَلِيّ (11) · تَقِيّ (4) · شَقِيّ (4) · سَمِيّ (2) · نَجِيّ (2) · سَوِيّ (5). Those are
   ṣifa mushabbaha. Two more are broken plurals wearing the same ending: عِصِيّ (فُعُول) and
   جِثِيّ. A third of the catch is wrong.

2. **The surface under-generates, on orthography.** أُمِّىّ — six occurrences, the nisba every
   student meets first — is stored with **alif maqṣūra ى**, not yāʾ. Every `LIKE '%ي%'` test
   misses it silently. Normalise ى/ي before any surface rule, anywhere.

3. **`wazn_ar` does not rescue it.** It is 100% populated and mechanically derived, so it
   inherits the confusion rather than resolving it:

   | lemma | stored wazn | the classical answer |
   |---|---|---|
   | نَصْرَانِيّ | فَعْلَانِيّ | نسبة to نَصْران |
   | يَهُودِيّ | **يَفُعلِيّ** | نسبة to يَهُود — the yāʾ read as a prefix letter |
   | رَبَّٰنِيِّن | فَعَّٰنِيِّن | نسبة to رَبّ + ان |
   | أُمِّىّ | فُعِّىّ | نسبة to أُمّ |
   | جَٰهِلِيَّة | فَٰعِلِيَّة | مصدر صناعي on a nisba |

   Not one row says *nisba*. The wazn column tells you the shape, never the process.

4. **QAC has no flag for it.** Nothing to promote at tier `qac`.

### The verdict

النسب is **tier `sourced` only** — no `rule` path exists. That is affordable, because the
genuine Qurʾānic set is roughly a dozen lemmas: نَصْرَانِيّ 15 · عَرَبِيّ 11 · يَهُودِيّ 9 ·
أُمِّىّ 6 · حَوَارِيُّون 5 · جَاهِلِيَّة 4 · رَبَّٰنِيِّن 3 · سِخْرِيّ 2 · إِنسِيّ 1. Enumerate
them by hand against al-Raḍī, cite the page, and the term is finished — for every root, forever.

**The general lesson.** A term is not usable because it is declared. It is usable when it has a
gloss a reader can read, a citation, and either a rule or an enumerated list. Of the 399 terms,
النسب is at the better end — it has an Arabic definition — and it still fails all three tests.
Auditing the other 398 the same way is the real size of the tagging job.
