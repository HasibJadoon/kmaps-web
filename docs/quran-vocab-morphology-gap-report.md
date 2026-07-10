# Qurʾān Vocabulary & Morphology — Gap Report

> Live D1 fill-state audited **2026-07-10**, compared against the master doc's
> targets and defect register (D1–D33). This tells you what is **done**, what is
> **seeded but thin**, and what remains **authoring work**.
> Companion: `quran-vocab-morphology-architecture.md`.

## Headline

The **schema build is essentially complete** — every table the master doc and
runbook call for now exists in production D1, including the tables that were
"missing" or "0 rows" at the 2026-07-09 audit. What remains is **content**, and
it splits cleanly into three buckets:

1. **Done / green** — structural fixes and pure derivations.
2. **Pilot-only** — the per-word authoring layer, proven on one word, not yet scaled.
3. **Irreducible authoring** — root cores, verb government, near-synonym review.

## Fill-state by table (live counts)

### km_quran

| table | rows | target | state |
|---|---|---|---|
| `qr_word_occurrences` | 77,427 | 77,427 | ✅ complete, tagged |
| `qr_lemmas` | 4,817 | 4,817 | ✅ |
| `qr_lemmas.wazn_ar` NULLs | **0** | 0 | ✅ **Gate 3 / D17 satisfied** |
| `qr_lemma_occurrences` | 72,507 | ~77k | ⚠ ~5k tokens unmapped |
| `qr_morph_display_sources` | 27 | ~8+ | ✅ |
| `qr_morph_display_roots` | 4 | 1,642 | 🟡 pilot (بين, نزل, كتب, نذر) |
| `qr_morph_display_lemmas` | 27 | 4,817 | 🟡 pilot (D-doc said table didn't exist — now built) |
| `qr_morph_display_words` | 24 | per-passage | 🟡 pilot |
| `qr_morph_display_blocks` | 93 | grows | 🟡 pilot (4 roots × ~12 + lemma/context) |
| `qr_morph_display_media` | 5 | grows | 🟡 pilot |
| `qr_morph_form_families` | **21** | 21 | ✅ **D16 fixed** (XI, XII, رباعي added) |
| `qr_morph_form_tiers` | **4** | 4 | ✅ **D22 fixed** (رباعي tiers added) |

### km_arabic_linguistic

| table | rows | target | state |
|---|---|---|---|
| `ar_ling_roots` | 24,653 | — | ✅ (186 dupes merged; was 24,838) |
| `ar_ling_roots.root_normalized` NULLs | **0** | 0 | ✅ **D31 fixed** + `ux_roots_norm` unique index |
| `ar_ling_roots.meaning_core_en` (Qurʾānic) | **38 / 1,642** | 1,642 | 🔴 **the biggest authoring gap** (1,604 to go) |
| `ar_ling_morphology` | 963 | ~1,400 | 🟡 derived, partial |
| `ar_ling_lemma_morphology` | 12,431 | derivable | ✅ derived (was 0) |
| `ar_ling_tokens` | 128,211 | ~128k | ✅ **derived** (was 0) |
| `ar_ling_lemma_root_links` | 9,280 | 4,817+ | ✅ (corpus closed) |
| `ar_ling_form_paradigms` | 1,735 | ~4,000 | 🟡 (was 5) |
| `ar_ling_conjugation_templates` | 517 | ~2,500 | 🟡 re-keyed, partial (was 13) |
| `ar_ling_inflection_rules` | **24** | ~24 | ✅ **D7 fixed** (authored, was 0) |
| `ar_ling_verb_government` | **26** | ~2,500 | 🔴 **irreducible** — barely begun (was 15) |
| `ar_ling_word_sums` | **1** | 4,817 | 🔴 pilot only (منذر) |
| `ar_ling_gram_categories` | 24 | 24 | ✅ |
| `ar_ling_gram_terms` | 245 | ~218 | ✅ (exceeds target) |
| `ar_ling_gram_term_relations` | 14 | grows | 🟡 |
| `ar_ling_gram_term_examples` | 25 | grows | 🟡 |
| `ar_ling_memlet_kinds` | 14 | 14 | ✅ |
| `ar_ling_memlets` | 11 | ~38,500 | 🟡 pilot (1 lemma) |
| `ar_ling_question_kinds` | 11 | 11 | ✅ |
| `ar_ling_question_items` | 5 | ~24,000 | 🟡 pilot |
| `ar_ling_question_distractors` | 20 | grows | 🟡 pilot |
| `ar_ling_context_passages` | 3 | grows | 🟡 pilot |
| `ar_ling_root_antonyms` | 12 | ~1,642 | 🔴 authored |
| `ar_ling_root_scholarship` | 12 | ~324 | 🟡 ingestible (Sinai reach) |
| `ar_ling_root_sense_axes` | 6 | 1,642×6 | 🟡 pilot (1 root) [D9 core built] |
| `ar_ling_root_development_stages` | 4 | grows | 🟡 pilot (1 root) [D9 core built] |
| `ar_ling_root_vocab` | 56 | grows | 🟡 |
| `ar_ling_near_synonym_sets` | 746 (**744 draft**) | — | 🔴 **D23 unchanged** — review to promote |
| `ar_ling_near_synonym_members` | 3,269 | — | 🟡 nuance notes thin (many NULL) |
| `ar_ling_expressions` | 2,204 | — | ⚠ **OCR-noisy**, needs cleaning before display |
| `ar_ling_collocations` | **0** | — | 🔴 empty |
| `ar_ling_senses` | 8 | grows | 🔴 nearly empty |
| `ar_ling_lemma_difficulty` | 4,817 | 4,817 | ✅ **materialised** |

## Defect register — current status

| # | defect | status 2026-07-10 |
|---|---|---|
| D7 | `inflection_rules` = 0 | ✅ resolved (24 rows) |
| D9 | `usage_map`/`development` had no core | ✅ tables built (`root_sense_axes`, `root_development_stages`) |
| D14 | core morphology tables empty | ✅ resolved (morphology/tokens/lemma_morphology derived) |
| D16 | form_families missing XI/XII/رباعي | ✅ resolved (21 rows) |
| D17 | `qr_lemmas.wazn_ar` incomplete | ✅ resolved (0 NULLs) |
| D22 | no رباعي tier | ✅ resolved (4 tiers) |
| D30 | `lemma_bare` collides with root | ✅ resolved (`MDL:{bare}#{id[:8]}`) |
| D31 | `root_normalized` non-unique / NULL | ✅ resolved (0 NULLs, unique index) |
| D5 | نزل had no parent root row | ✅ resolved (`MDR:نزل` + 12 blocks) |
| D21 | 417 roots have no Maqāyīs upstream | 🟡 fallback ladder designed; `core_basis` not yet on every row |
| D23 | near-synonym sets 744/746 draft | 🔴 open — human review to promote |
| — | `meaning_core_en` 38/1,642 | 🔴 open — the largest single authoring task |
| — | `verb_government` 26/~2,500 | 🔴 open — the irreducible authoring |
| — | `word_sums` / memlets / questions | 🟡 pilot-proven, ready to scale |
| — | `ar_ling_expressions` OCR quality | ⚠ new — needs a cleaning pass |
| — | `ar_ling_collocations` empty | 🔴 open — derive from corpus co-occurrence |

## What to do next (in order)

1. **Scale the root core.** Author/ingest `meaning_core_en` for the remaining 1,604 Qurʾānic roots (with the D21 four-tier fallback ladder and `core_basis` recorded per row). Everything downstream reads it.
2. **Author `verb_government`** per attested `(root, form)` pair — the one truly irreducible layer (~2,500 rows). Start with the ~1,642 Form-I governments.
3. **Promote near-synonyms** out of `draft` so `kindred`/`furuq` can cite them (D23).
4. **Scale the projection layer** — `word_sums`, `qr_morph_display_lemmas`, memlets, question items — now that the pilot word (منذر) proved the pipeline. These are derivations, not authoring.
5. **Clean `ar_ling_expressions`** OCR text and **populate `ar_ling_collocations`** from corpus co-occurrence.
