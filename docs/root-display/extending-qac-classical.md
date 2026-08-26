# Extending QAC with classical terms

**Goal:** every Qurʾānic word carries the classical terms a grammarian would use to pin it
down — اسم الآلة, صيغة المبالغة, its وزن — each with a stable `GT:` id and a source.

Applied to sūra 44 as proof: **652 term bindings**, no editorial work.

---

## What already existed, and the one thing that did not

The bridge is designed. `ar_ling_gram_term.qac_flag` says which QAC flag means a term and
`qac_scope` says where in the tag to look; `qr_gram_term_ref` mirrors it into `km_quran`.

**79 of 399 terms carry a QAC flag:**

| mapped | category | | unmapped | category |
|---|---|---|---|---|
| 29/29 | `harf_maani` | | 0/99 | `balagha_maani` |
| 15/18 | `pos` | | 0/39 | `balagha_bayan` |
| 12/28 | `form_family` | | 0/26 | `balagha_badi` |
| 3/3 | case · number · person · tense | | 0/25 | `irab_role` |
| 2/2 | gender · voice · definiteness | | 0/15 | `root_type` |
| **3/13** | **`derivation_type`** | | **0/3** | **`jumud`** |

**And nothing applied any of it.** No table in either database bound a `GT:` term to a word
occurrence. `qr_gram_term_ref` is a dictionary (50 rows), `qr_ss_term` a palette (226),
`qr_scholar_passage_term` binds tafsīr passages (111). All 77,424 words carried QAC's flat tags
and nothing classical: ٱلْمُبِينِ was `POS:ADJ|ACT|PCPL|(IV)` and not اسم الفاعل من الرباعي.

`qr_word_term` (migration `0043`) is that table.

## Three tiers, recorded per row

They are not equally trustworthy, so the row says which it is.

| tier | means | needs |
|---|---|---|
| `qac` | a flag QAC itself states | nothing — mechanical, reproducible |
| `rule` | derived from QAC + the lexicon by a **named** rule in `qr_word_term_rule` | review, reversible in one statement |
| `sourced` | a grammarian says so **about this word** | a book, a page |

**Only `sourced` can carry صيغة المبالغة or الصفة المشبّهة.** QAC does not tag them, and no
pattern decides them: **غفّار and كَتّاب share وزن فَعَّال and only one is an intensive.** A wazn
narrows the candidates; it never settles them.

**Tier `sourced` is the work that goes sūra by sūra. The other two are corpus-wide passes that
need no ordering.**

### Sūra 44, tier `qac`, applied

| category | bindings |
|---|---|
| `pos` | 302 |
| `case` | 164 |
| `tense` | 63 |
| `definiteness` | 51 |
| `form_family` | 42 |
| `derivation_type` | 30 |
| | **652** |

Extrapolated corpus-wide that is roughly 100,000 bindings, all mechanical.

---

## The وزن is already there, on every word

**`qr_lemma.wazn_ar` is populated on all 4,817 lemmas — 465 distinct patterns.** Nothing has
ever read it.

This is the key to the ten categories QAC cannot tag. The wazn produces a **candidate**:

| wazn | candidate | settled by |
|---|---|---|
| فَعَّال · فَعُول · فَعِيل · مِفْعَال | صيغة المبالغة | a source — the pattern is shared with plain nouns |
| فَعِيل · فَعِل · أَفْعَل (colour/defect) | الصفة المشبّهة | a source |
| أَفْعَل + من | اسم التفضيل | mostly the construction, so a rule can propose it |
| مَفْعَل · مَفْعِل | اسم الزمان / المكان | a source — the two share the pattern |
| مِفْعَل · مِفْعَال · مِفْعَلَة | اسم الآلة | a source |
| مَفْعَل | المصدر الميمي | a source |
| فَعْلَة | اسم المرة | context |
| فِعْلَة | اسم الهيئة | context |

So the pipeline is **wazn × QAC flags → candidate → book citation confirms**, and the candidate
is a `draft` row until the citation arrives. That is honest and it is fast: the candidate set for
any sūra can be generated in one pass.

---

## Which book answers which term

Searched across all **21,319 chunks**:

| term | chunks | leading books |
|---|---|---|
| **وزن / أوزان** | **1,577** | الرضيّ · شرح الشافية 214 · ركن الدين 172 · الغلاييني 143 · ابن يعيش 131 |
| مشتق / جامد | 433 | السيوطي 65 · ابن يعيش 64 · الغلاييني 47 · ركن الدين 22 |
| المبالغة | 273 | **see the warning below** |
| الصفة المشبّهة | 45 | الغلاييني 12 · الرضيّ 12 · السكاكي 7 · ابن يعيش 6 |
| اسم التفضيل | 44 | الغلاييني 30 · ابن يعيش 20 · الرضيّ 18 |
| اسم الزمان/المكان/الآلة | 19 | ابن يعيش 4 · الغلاييني 3 · الرضيّ 3 |
| المصدر الميمي | 7 | thin |
| اسم المرة / الهيئة | 2 | **almost absent** |

**A trap worth naming.** المبالغة returns 273 chunks, but the two biggest holders are
**al-ʿAlawī's Ṭirāz (69)** and **al-Jurjānī's Asrār al-Balāgha (36)** — *balāgha* works, where
مبالغة is **hyperbole, the rhetorical figure**, not صيغة المبالغة the morphological pattern.
A naive search conflates them. The morphological sense is in **Ibn Yaʿīsh (43)** and the
Shāfiya commentaries. Any ingest must filter by discipline, not by string.

## اسم الذات does not appear — not once

Searched all 21,319 chunks:

| term | hits |
|---|---|
| **اسم الذات / أسماء الذات** | **0** |
| اسم المعنى | 2 |
| اسم جنس | 57 |
| العلم | 295 |
| الصيغة | 76 |
| البناء | 582 |

**The ism-dhāt framing is not the vocabulary these books use.** The classical axis in the ṣarf
tradition is **جامد ⟷ مشتق** — 433 chunks — and that is exactly what `GT:jumud:` already
declares. The registry is right and the framing should follow it: `GT:jumud:jamid` is the term,
and *"primitive / underived noun"* its gloss. اسم الذات can stay as a search alias; it should
not be a term id.

---

## What is still missing

**The grammar corpus is unlinked.** `ar_ling_gram_chunk` has `bab_id`, `source_slug`, `page_no`
— and no term reference. 20M characters beside 399 terms, with **25 term-examples** joining
them. Until a `chunk → GT term` link exists, tier `sourced` has no lookup and every citation is
hand-found.

That link is the highest-leverage remaining task in this whole area, and it is what turns
1,577 wazn chunks and 433 jumud chunks from a library into an index.

**Also missing:** 29 `harf_maani` terms are mapped in `ar_ling_gram_term` but absent from the
`qr_gram_term_ref` mirror (50 of 79), so particle senses cannot yet be applied in `km_quran`.
Re-sync the mirror before the next pass.

---

## Order of work

1. **Re-sync `qr_gram_term_ref`** — 50 → 79 terms. Unblocks particle senses.
2. **Run tier `qac` over all 114 sūras.** ~100k bindings, mechanical, no review.
3. **Add the three `jumud` rules as tier `rule`.** Already written into `qr_word_term_rule`,
   with their caveats stated — the jāmid rule under-reports and says so.
4. **Generate wazn candidates as `draft`** for the ten unmapped categories. Fast, and it makes
   the editorial queue visible.
5. **Link `ar_ling_gram_chunk` to terms.** The unlock.
6. **Then sūra by sūra**, promoting candidates to `sourced` with a citation — starting with 44,
   which already has its tier-1 bindings.
