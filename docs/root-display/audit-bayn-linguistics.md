# Audit — بين across `km_arabic_linguistic`

Root `بين` · id `a30d6f8ea317824c7b2d71a0c0` · Buckwalter `byn` · trilateral, `ajwaf_ya`

117 `ar_ling_*` tables. 41 are directly root-keyed; the rest are registries, shared
reference tables, or children reached through a parent. Every count below is measured.

---

## Identity — `ar_ling_roots`

One row, and an unusually complete one: **`meaning_core_ar`, `_en` and `_ur` are all filled.**
Corpus-wide those columns carry 54 / 47 / 10 roots respectively, so بين is in a small minority.
`frequency_quran` = 522, which agrees with `qr_word_occurrence`.

## Meaning

| table | rows | note |
|---|---|---|
| `ar_ling_root_asl` | **4** | 1 of 4 carries a death year; 3 of 4 are `confidence = low` |
| `ar_ling_root_dna` | 1 | |
| `ar_ling_root_sense` | **41** | 13 distinct `sense_key` — the rest are per-source restatements |
| `ar_ling_sense_attestation` | **106** | quotes with locators behind those senses |
| `ar_ling_root_sense_axis` | 3 | |
| `ar_ling_root_tatawwur` | 4 | the four-stage arc |
| `ar_ling_sense_arc` | 5 | |
| `ar_ling_sense_arc_step` | 12 | |
| `ar_ling_root_didd` | 2 | one attested, one ours |
| `ar_ling_root_haql` | 5 | SPEECH primary, then PART · PROOF · TRUTH · PLACE |

**106 attestations is the strongest layer this root has.** The senses are properly witnessed;
what is thin is not the evidence but the English on top of it.

## Form and morphology

| table | rows | note |
|---|---|---|
| `ar_ling_root_form_masmu` | 7 | I II III IV V VI X — `meaning_en` NULL on **all seven** |
| `ar_ling_root_lemma_form_map` | 7 | QAC: II, IV, V, X only |
| `ar_ling_root_sarf_form_index` | 56 | |
| `ar_ling_root_lemma_tadiya` | 7 | government — AR + EN + UR filled on all seven |

The English the form ladder needs is not missing from the database; it is in `tadiya`, not in
`form_masmu`. One join, no backfill.

## Lemma

| table | rows | note |
|---|---|---|
| `ar_ling_root_lemma` | 40 | 15 flagged `is_quran_word` — **but only 13 are real** (below) |
| `ar_ling_root_lemma_link` | 13 | |
| `ar_ling_root_lemma_word_silsila` | 8 | |
| `ar_ling_root_lemma_furuq_member` | 6 | |
| `ar_ling_root_lemma_taswib` | 1 | |
| `ar_ling_root_lemma_tabir` | **1** | and it is āyah-scoped (below) |
| `ar_ling_lemma_arc` | **0** | |
| `ar_ling_root_lemma_word_quran_link` | 0 | |

## Lexicon and sources

| table | rows |
|---|---|
| `ar_ling_lexicon_block` | 206 |
| `ar_ling_source_citation` | 197 |
| `ar_ling_lexicon_quran_ref` | 77 |
| `ar_ling_lexicon_entry_section` | 52 |
| `ar_ling_lexicon_entry` | 15 |
| `ar_ling_source_chunk` | 8 |
| `ar_ling_lexicon_book_page` | 3 |

## Relations

`ar_ling_root_backlink` 12 · `ar_ling_root_relation` 2 · `ar_ling_root_taqalib` 1 of 6 in
group `بني` · `ar_ling_root_lugha` 2 · `ar_ling_root_letter_slot` 3 · `ar_ling_root_naw_sawti` 1

## Scholarship

`ar_ling_root_scholarship` 7 · `ar_ling_root_scholarship_bak_sinai` 1

## Learning

`ar_ling_learn_question` 27 · `ar_ling_learn_memlet` 14 · `ar_ling_learn_vocab` 1 ·
`ar_ling_learn_memory_hook` 0 · `ar_ling_learn_lemma` 0

## Build and display

`ar_ling_root_page_index` 46 · `ar_ling_root_band_fill` 28 · `ar_ling_root_display` **13**

---

# Findings

## 1 · `ar_ling_root_display` holds بين and nothing else

13 rows for بين — and the table has 13 rows in total. **The stored display projection was
built for exactly one root and never for a second.** This is the clearest evidence yet for the
verdict already recorded in `routes/ds.ts:9`, and it should settle the question permanently.

## 2 · Two duplicate lemmas inflate the Qurʾānic count

`is_quran_word = 1` returns 15 rows, but `qr_word_occurrence` finds 13 distinct lemmas. The
gap is not a disagreement between databases — it is **duplicate rows inside AL**:

| lemma | rows | frequencies |
|---|---|---|
| `بَيْن` | 2 | 266 and **0** |
| `بَيِّنَة` | 2 | 71 and **0** |

Both duplicates carry `frequency_quran = 0` and `root_status = 'linked'`. Deduplicate on
`lemma_text_bare` + `part_of_speech`, keeping the row with the non-zero frequency. Until then
any "words in the Qurʾān" count taken from AL reads 15 where the muṣḥaf has 13.

## 3 · Part of speech is wrong on the four commonest words

| lemma | stored | should be |
|---|---|---|
| `بَيْن` (266×) | `other` | noun |
| `بَيِّنَة` (71×) | `other` | noun |
| `مُّبِين` (119×) | `noun` | adjective / active participle |
| `بَيِّن` (1×) | `adjective` | ✓ |

`other` on the two most frequent words of the root is not a classification, it is an absence
wearing one. Note `verb_form` is correct throughout — populated on exactly the four verbs
(II, V, IV, X) and null elsewhere, matching QAC.

## 4 · Constructions has no root-level content at all

`ar_ling_root_lemma_tabir` holds **one** row for بين:

> `أبانَ الَّذِي هو بِمَعْنى بانَ` — Ibn ʿĀshūr, **at 44:10**

That row is āyah-scoped. By the rule that a root page carries loci but not readings of a
verse, it belongs on the word page, not here — which leaves the Constructions section with
**zero** root-level rows.

The four other idioms currently rendered — `بَيْنَ يَدَيْ`, `ذَاتِ بَيْنِكُمْ`,
`عَوَانٌ بَيْنَ ذَٰلِكَ`, `بَيْنَ بَيْنَ` — have no row behind them. They are real Arabic and
well attested in the lexicons, but they are **not in this database**, and a page that shows
them is showing hand-authored content in a section that claims to be sourced.

Two honest options: ingest them as `tabir` rows with their lexicon citations, or drop the
section for بين until they exist. Corpus-wide `tabir` holds 2,370 rows over 408 roots, so the
ingest path is proven — بين simply was not run through it.

## 5 · One layer was switched off; the other is not a carrier at all — **fixed**

Both were reported here as "unkeyable by schema". Half of that was wrong, and chasing it
produced the real cause.

**`ar_ling_root_lemma_ilal`** — 24 rules of iʿlāl and ibdāl, no lemma column. The
catalogue is right to be a catalogue; what was missing was the join. Migration `0107`
adds one:

- each rule now declares the class of word it changes (`bind_weak`, `bind_verb_form`,
  `bind_pos`). **16 of 24 bind**; the other 8 record why not — two are sandhi across a
  word boundary (tajwīd, not a lemma's ṣarf), two fire on a participle or maṣdar and
  need a `form_map`↔lemma bridge, four are keyed on a noun pattern lemmas do not carry.
- `ar_ling_root_lemma_ilal_apply` carries the binding — **2,192 rows over 1,147 Qurʾānic
  lemmas and 629 roots**, every one `claim_basis = 'derived'`: a qiyāsī rule applying to
  its whole class is not a lexicon attesting this word. `surface_before` /
  `surface_after` stay NULL, because an intermediate form must be generated or cited,
  never guessed by a migration.

For بين it yields exactly what a student should see — يُبِينُ takes
`النقل في الإفعال من الأجوف` (**مُبْيِن → مُبِين**) and `حذف همزة أَفْعَلَ في المضارع`;
بَيَّنُ, تَبَيَّنَ and تَسْتَبِينَ take the hollow-verb rules.

**But the binding was never the gate.** `RegistryRepo.subLayers()` selects
`WHERE status = 'live'`, and `24-ILAL` sat at **`status = 'na'`** — retired, presumably
*because* it looked unkeyable. It could not have reached a client however well its
carriers were bound.

And the layer's *other* carrier, **`ar_ling_root_lemma_word_silsila`, was always keyed
and always populated** — 8 rows for بين holding underlying/surface pairs, the operation
deriving one from the other, and a rule quoting Ibn ʿUṣfūr, in all three languages. None
of it was reachable. The layer was not unkeyable; it was switched off.

Live now: `24-ILAL` returns `state: filled`, **18 rows**, both carriers. Lemma scope went
from 7 sections to 8.

**`ar_ling_root_lemma_sarf`** — this half stands. 963 rows of `pos = ACC | AMD | ANS |
CERT | COND`, `pattern = '—'`, every inflectional column NULL. They are QAC tag bundles
for *word occurrences*; a word references a bundle, no root or lemma carries one. It was
filed under `00-CORE` as a carrier with an unset bind, which is what made it look like a
gap. `0107` reclassifies it `role = 'registry'`, `root_bind = 'none'`. Nothing to
backfill — the fix is to stop calling it a lemma carrier.

## 6 · `ar_ling_lemma_arc` is empty for the deepest root in the corpus

Zero rows, against 14 corpus-wide. The lemma card note type `NT:kmaps:lemma:sarf:v9` declares
`Arcs` as **required**, so no lemma card for بين can be completed from data as it stands.

## 7 · A backup table is still live

`ar_ling_root_scholarship_bak_sinai` carries a row for بين alongside the real
`ar_ling_root_scholarship`. A `_bak_` table in the live database is a trap for any builder
that enumerates carriers by name pattern. Drop it or rename it out of the `ar_ling_root_*`
namespace.

---

# What this changes

| # | Action | Where |
|---|---|---|
| 1 | Deduplicate the two zero-frequency lemma rows | `ar_ling_root_lemma` |
| 2 | Fix `part_of_speech` on بَيْن, بَيِّنَة, مُّبِين | `ar_ling_root_lemma` |
| 3 | Read the ladder's English from `tadiya`, not `form_masmu` | builder |
| 4 | Either ingest بين's idioms or drop the section for this root | `ar_ling_root_lemma_tabir` |
| 5 | ~~Keep `24-ILAL` as `unknown`~~ → **done**: join added, layer un-retired | `0107` |
| 6 | Build lemma arcs for بين, or the lemma card cannot complete | `ar_ling_lemma_arc` |
| 7 | Retire `ar_ling_root_scholarship_bak_sinai` | schema |
| 8 | Stop treating `ar_ling_root_display` as a source | builder |
| 9 | ~~Arc steps and attestations report `unknown`~~ → **done**: `0106` applied | `0106` |

Nothing above blocks the root page. Items 1–3 are small and improve what a reader sees
immediately; 4 and 6 decide whether two sections can honestly render for this root.

**Item 5 is done** (`0107`), and carries a lesson worth keeping: a layer reporting
`unknown` may not be missing data at all. Check `ar_ling_reg_sub_layer.status` before
concluding a carrier cannot be bound — `24-ILAL` held eighteen readable rows the whole
time, behind a retired flag.

## 8 · Two more layers were dark, for a third reason — **fixed**

Chasing "the sense arcs are missing" found neither a data gap nor a retired flag, but an
**unapplied migration**.

`18-STEP` (arc steps) and `19-ATT` (attestations) both bind to the root *through* another
table — a step through its arc, an attestation through its sense. `ar_ling_reg_table_map`
recorded those joins as prose in `root_bind_col`:

> `arc_id -> ar_ling_sense_arc.id -> root_norm`

Prose cannot be executed. Migration `0106` had already diagnosed this precisely and added
a machine-readable `root_bind_via_json` beside it — **but it was never applied to
production.** The reader degrades gracefully when the column is absent, so every `via`
carrier was silently dropped and both layers reported `unknown`.

Applied now. `18-STEP` → **filled, 12 rows**; `19-ATT` → **filled, 106 rows**, rendering as
a ledger of who said what. That makes attestations the richest layer بين has, and it was
invisible.

Four `via` rows remain unbound by design (`20-GOV`'s example table, three of `80-KIN`).
`0106` deliberately left them: one is a three-hop path and the others name a column with no
target. They keep reporting `unknown`, which is true.

### `d1_migrations` cannot answer "is it applied?"

The tracker's last entry is **`0061`, 2026-07-24**, while the repo is at `0107` — later
migrations were applied outside it. So the table is not a record of what is live, and a
migration sitting in the repo proves nothing about production. **Probe the schema.**

That is now twice in one audit that a layer reported as a data gap was a plumbing failure:
`24-ILAL` behind a retired flag, `18-STEP` and `19-ATT` behind an unapplied column. Before
treating any `unknown` layer as missing content, check three things — the sub-layer's
`status`, its carriers' `root_bind`, and whether the migration that was supposed to fix it
actually ran.
