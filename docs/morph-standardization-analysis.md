# Morphology Standardization — Deep Analysis & Final Target

> Answers "why so many tables for the same feature?" with evidence, separates
> **real duplication** from **legitimate layering**, and converges on ONE final
> standardized table set. Row counts are live D1, 2026-07-10.

## ✅ FINAL DECISION (2026-07-10) — standardize by registry, not by rename

**Table names are NOT physically renamed.** All three DBs — `km_arabic`,
`km_quran`, `km_arabic_linguistic` — keep their **original names**, so they are
mutually consistent and no worker code breaks. Standardization is carried by a
**machine-readable registry** in `km_arabic_linguistic`, applied to live D1:

- **`ar_ling_reg_build_layer`** (20 rows) — the layer taxonomy: 3-digit codes
  `000`–`900`, trilingual names, fill order, mode, and the per-layer
  `allowed_source_slugs_json` (L1 provenance whitelist).
- **`ar_ling_reg_table_map`** (247 rows) — every domain table across the 3 DBs
  tagged `(db, table_name, cluster, layer_code, role)`.

Grouping/ordering is a query (`WHERE layer_code='310'`), and a table can be
re-tagged with a one-row `UPDATE` — never a rename. See
`docs/morph-layer-codes.md` and `docs/morph-table-naming-convention.md` (the
cluster names there are the *conceptual* standard the registry encodes, **not**
physical table names).

**What WAS executed on D1 (kept):**
- The **fold** — 7 redundant/empty tables dropped (`nahw_concepts`,
  `balagha_concepts`, `balagha_branches`, `sentence_types` were already present
  in `ar_ling_gram_terms`; `nahw_relations`, `balagha_examples`,
  `rhetorical_relations` were empty), plus `vocab_depth_staging`,
  `vocab_exercises_staging`, `vocab_scholarship`, `collocations`, `clause_types`,
  `phrase_types`.
- The **layer registry** seeded (above).

**What was REVERTED:** the ar_ling_* cluster rename (48 tables → back to original
names); migration `0025` is now a no-op.

*The analysis below is retained as the rationale; treat "rename" recommendations
as the conceptual cluster mapping now encoded in `reg_table_map.cluster`.*

## Why it *looks* like many tables for one feature

Three different things get conflated. Only one of them is a problem.

1. **Layer (canonical vs projection) — NOT duplication, keep it.**
   `ar_ling_morph_root` (truth) → `qr_morph_display_roots` (render-ready copy).
   Two rows for one root is correct: D1 has **no cross-database joins**, so the
   Qurʾān worker must hold a local projection to render without a live call. This
   is the L6 law working as designed.

2. **Granularity (dictionary vs instance vs link) — NOT duplication, keep it.**
   `ar_ling_reg_semantic_field` (the 389-field taxonomy) vs
   `ar_ling_morph_root_field` (which root is in which field, 3 rows) are a
   dictionary and a join table — different jobs, both needed.

3. **Real duplication + dead weight — THIS is the problem, clean it.**
   The same closed vocabulary stored in two places, and staging/empty tables
   never cleaned up. Evidence and fixes below.

## The real duplication (with proof)

### A. Form families / tiers / wazn — one feature, up to 5 homes

| where it lives | rows | verdict |
|---|---|---|
| `ar_ling_gram_terms` category `form_family` | **21** | ✅ **canonical** (the register) |
| `ar_ling_gram_terms` category `form_tier` | **4** | ✅ **canonical** |
| `qr_morph_form_families` | **21** | ❌ **duplicate** → retire, regenerate |
| `qr_morph_form_tiers` | **4** | ❌ **duplicate** → retire, regenerate |
| `qr_lemmas.wazn_ar` | 4,817 | ⚠ denormalized cache (keep as projection) |
| `qr_morph_display_lemmas.wazn_ar` | 27 | ⚠ denormalized cache (keep as projection) |

The register already holds the families and tiers — **identical counts**. The two
`qr_morph_form_*` tables are pure copies. Wazn is a lemma-level value derived from
`(form_family + derivation_type)`; it belongs on the lemma/display row, not as its
own vocabulary table. **Net: one canonical home (`ar_ling_reg_term`), the QR copies
become baked JSON in `qr_morph_display_*`.**

The register is *already* the single dictionary for the whole feature family:

| register category | rows | replaces |
|---|---|---|
| `pos` | 15 | part-of-speech tables |
| `form_family` | 21 | `qr_morph_form_families` |
| `form_tier` | 4 | `qr_morph_form_tiers` |
| `derivation_type` | 9 | scattered enums |
| `root_type` | 11 | scattered enums |
| `inflection_class` | 5 | scattered enums |

### B. Concept tables that should be register rows

| table | rows | verdict |
|---|---|---|
| `ar_ling_nahw_concepts` | 30 | → fold into `ar_ling_reg_term` (category `nahw`/`irab_role`) |
| `ar_ling_balagha_concepts` | 12 | → fold into `ar_ling_reg_term` (categories `balagha_*`) |
| `ar_ling_balagha_branches` | few | → fold (they are register categories) |
| `ar_ling_sentence_types` | ~8 | → fold (category `sentence_class`) |
| `ar_ling_clause_types` | **0** | → drop (empty; fold if ever needed) |
| `ar_ling_phrase_types` | **0** | → drop (empty) |

The master doc already plans this ("migrate the 12 balagha_concepts and 8
sentence_types into the register; don't re-key"). Folding removes 4–6 tables **and
their FTS shadows** and gives every rhetorical/grammatical term ONE trilingual home.

### C. Dead / staging tables — drop

| table | rows | why |
|---|---|---|
| `ar_ling_vocab_depth_staging` | 12 | staging blob; decomposed into real tables (D25) |
| `ar_ling_vocab_exercises_staging` | 12 | superseded by `learn_question_*` (D27) |
| `ar_ling_vocab_scholarship` | **0** | empty; `morph_root_scholarship` is the real one |
| `ar_ling_collocations` | **0** | empty; keep the name as target OR drop until populated |

(Already gone from D1 — no action: `vocab_srs`, `vocab_depth`, `vocab_exercises`,
`vocab_illustrations`, `vocab_diagrams`, `lexicon_morphology`, `projection_cache`.)

### D. Candidates to review (small / overlapping)

| table | rows | note |
|---|---|---|
| `ar_ling_root_vocab` | 56 | Membean hook/anchors — overlaps `qr_morph_display_roots` + `root_dna`. Fold into display or drop. |
| `ar_ling_senses` / `ar_ling_sense_relations` | 8 / 6 | lexicon senses, near-empty. Keep (real model) but flag as thin. |
| `ar_ling_near_synonym_set_sources` + `_member_sources` | — | could merge into one `syn_source` with a `target_kind` column (2→1). Optional. |
| `ar_ling_lemma_registers` | 4,826 | one row/lemma — could be a column on `morph_lemma`. Optional. |

## The pattern to copy: `qr_morph_display_blocks`

One table already stores **18 different "features"** — root_dna, lexicon,
derivations, constellation, attestations, kindred, occurrences, usage_map,
development, master_story, metaphor, synthesis, balagha, sarf, irab, tafsir,
translators — across all three scopes, keyed by `(scope_level, block_type,
block_subtype)`. That is the anti-sprawl model: **new feature = new `block_type`
value, not a new table.** Extend this discipline; don't fight it.

---

## The ONE final standardized set

Target after cleanup + rename. `{domain}_{cluster}_{entity}`.

### `ar_ling_reg_*` — master data (trilingual, common layer)
`reg_category` · `reg_term` (absorbs pos, form_family, form_tier, derivation_type,
root_type, inflection_class, tense, voice, case, mood, **nahw**, **balagha**,
**sentence_class**) · `reg_term_relation` · `reg_term_example` · `reg_term_source`
· `reg_inflection_rule` · `reg_semantic_field`.
**Retire:** `qr_morph_form_families`, `qr_morph_form_tiers`, `ar_ling_nahw_concepts`,
`ar_ling_balagha_concepts`, `ar_ling_balagha_branches`, `ar_ling_sentence_types`,
`ar_ling_clause_types`, `ar_ling_phrase_types`.

### `ar_ling_morph_*` — instance data
root: `morph_root` (+ `_relation`, `_field`, `_variant`, `_antonym`,
`_scholarship`, `_sense_axis`, `_dev_stage`) ·
lemma: `morph_lemma` (+ `_root_link`, `_bundle`, `_variant`, `_register`,
`_difficulty`) ·
ṣarf: `morph_bundle`, `morph_token`, `morph_token_lex_link`, `morph_wazn_paradigm`,
`morph_conjugation`, `morph_verb_gov`, `morph_word_sum`.
**Fold:** `ar_ling_root_vocab` → `qr_morph_display_roots` / `morph_root` columns.

### `ar_ling_syn_*` · `ar_ling_expr_*` · `ar_ling_learn_*`
syn: `syn_set`, `syn_member`, `syn_evidence`, `syn_source` (merge the two
source tables), `syn_review_queue`.
expr: `expr_idiom`, `expr_token`, `expr_type`. (`collocation` only if populated.)
learn: `learn_memlet_kind`, `learn_memlet`, `learn_memlet_media`, `learn_mastery`,
`learn_question_kind`, `learn_question_item`, `learn_distractor`,
`learn_context_passage`, `learn_exposure`, `learn_hook`.
**Drop:** `vocab_depth_staging`, `vocab_exercises_staging`, `vocab_scholarship`.

### `qr_morph_*` — QR display (already clustered)
`qr_morph_display_sources|roots|lemmas|words|blocks|media`.
**Retire** `qr_morph_form_families|tiers` (→ read register via binding, bake JSON).

## Net effect

| | before | after | change |
|---|---|---|---|
| register/reference tables | ~14 scattered | 7 `reg_*` | −7, all trilingual |
| dead/staging/empty | 4 | 0 | −4 |
| form family/tier homes | 3 tables | 1 (register) | −2 |
| QR display | 6 (good) | 6 | 0 |

**~13 fewer tables, one home per feature, one naming scheme.** Then the rename
migration (`0024`) renames a *clean* set instead of freezing today's sprawl.

## Sequence

1. **Fold** nahw/balagha/sentence concepts → `reg_term` (data migration, keep source_refs).
2. **Retire** `qr_morph_form_*` + dead/staging tables (drop after the fold verifies).
3. **Rename** the surviving tables into clusters (migration 0024, with compat views).
4. **Update** worker code to new names; drop compat views.

> Local `schema.sql` snapshots are in sync with live D1 as of 2026-07-10 (read-only
> audit; no DDL was run on D1). Steps 1–3 above are drafted as migrations but NOT
> applied to D1 — they need your go-ahead because dropping/folding is irreversible
> without the Gate-0 snapshot.
