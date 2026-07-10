# Morphology Table Naming Convention

> Goal: make every morphology/vocabulary table **cluster together** so the whole
> family is one `LIKE 'ar_ling_morph_%'` away — instead of scattering across the
> alphabet. Grounded in the live table inventory (2026-07-10).

## The rule

A table name is read left-to-right as **grouping keys**. D1/SQLite has no
"schemas" or folders — the name *is* the folder path. So:

```
{domain}_{cluster}_{entity}[_{qualifier}]
   │        │         │          │
   │        │         │          └ optional: link / variant / source / bundle
   │        │         └ the thing: root · lemma · token · wazn · verb_gov …
   │        └ the family keyword you grep on: morph · gram · syn · expr · learn
   └ the DB / worker that owns it (LOAD-BEARING — never drop): qr · ar_ling
```

Two keys are fixed and must not change:

- **`{domain}`** — `qr_` = `km_quran`, `ar_ling_` = `km_arabic_linguistic`. This maps
  a table to the worker/DB that owns it (CLAUDE.md hard boundary). Keep it.
- **`{cluster}`** — the family keyword. This is the piece you were missing. Add it
  as the **second** segment so the whole family sorts and greps together.

## The five cluster keywords

| keyword | what it groups | grep |
|---|---|---|
| **`reg`** | **master data / the register** — closed, seeded vocabularies that describe Arabic itself. **Common layer: lives only in `ar_ling`, read by both apps.** | `ar_ling_reg_%` |
| **`morph`** | roots · lemmas · the QAC bundle · tokens · wazn/ṣarf **instance** data | `ar_ling_morph_%` |
| **`syn`** | near-synonyms / الفروق | `ar_ling_syn_%` |
| **`expr`** | verbal idioms, expressions, collocations | `ar_ling_expr_%` |
| **`learn`** | memlet · question · SRS · exposure (the learning layer) | `ar_ling_learn_%` |

The first split that matters is **register (master data) vs instance (content)**.
`reg` is the closed, authored-once reference layer; everything else is instances
that point at it. On the `km_quran` side the display projection is **already**
clustered as `qr_morph_%` — that half of the job is done. Only `ar_ling_` scatters.

---

## The register (`reg`) — master data, one home, in `ar_ling`

**Rule (L6).** Anything that is a *closed, seeded vocabulary describing Arabic*
— part-of-speech, tense, voice, case, the form families (أبواب/صيغ), the form
tiers (تجرّد/زيادة), wazn patterns, iʿlāl rules, semantic fields — is **master
data**. It is true of the language, not of any one corpus, so it lives **once, in
`km_arabic_linguistic`**, and is the common layer that both the Arabic app and the
Qurʾān app read. **No register table is ever authored in `qr_`.**

**Trilingual is mandatory for two layers: master data AND display tables.**
Both the authored register and the render-ready projection are consumed by the
UI, so every human-readable field MUST exist in all three languages —
**Arabic · English · Urdu** — with none NULL.

- **Register (`reg`) — where a language is authored once.** Convention:
  `name_ar/name_en/name_ur`, `definition_ar/definition_en/definition_ur`,
  `short_ar/short_en/short_ur`, with the name triple `NOT NULL` (as
  `ar_ling_reg_term` / today's `ar_ling_gram_terms` already does).
- **Display tables — where a language is rendered.** Every `_ar` field pairs with
  `_en` and `_ur`: `qr_morph_display_roots.{meaning_core,hook}_*`,
  `qr_morph_display_lemmas.{derived_type,gloss}_*`, `qr_morph_display_words.{gloss,
  pos,derived_type}_*`, `qr_morph_display_blocks.{title,text}_*`, and the memlet
  bodies `ar_ling_learn_memlet.{title,body}_*`. These are already trilingual by
  design — the rule is that a projection **must not drop a language** the register
  supplied.

A row with a missing language is incomplete and never promoted to `status='live'`;
the promotion query checks all three are present.

> Current register gaps closed by migration `0023_vocab_morphology_d1_sync.sql`
> (added the `_ur` columns): `nahw_concepts`, `balagha_concepts`, `sentence_types`,
> `semantic_fields`, `expression_types` previously had no Urdu.
> `qr_morph_form_families` / `qr_morph_form_tiers` carry
> `arabic_name/english_name/urdu_name` — keep Urdu populated when regenerating them.

The register already exists as `ar_ling_gram_terms` (24 categories, 245 terms,
trilingual). Rename it into the `reg` cluster and let it absorb the other
cross-cutting reference tables:

| current | proposed (`reg`) |
|---|---|
| `ar_ling_gram_categories` | `ar_ling_reg_category` |
| `ar_ling_gram_terms` | `ar_ling_reg_term` ← the master dictionary |
| `ar_ling_gram_term_relations` | `ar_ling_reg_term_relation` |
| `ar_ling_gram_term_examples` | `ar_ling_reg_term_example` |
| `ar_ling_gram_term_sources` | `ar_ling_reg_term_source` |
| `ar_ling_inflection_rules` | `ar_ling_reg_inflection_rule` |
| `ar_ling_semantic_fields` | `ar_ling_reg_semantic_field` |
| `ar_ling_sentence_types` · `_clause_types` · `_phrase_types` | `ar_ling_reg_sentence_type` · `…_clause_type` · `…_phrase_type` |
| `ar_ling_nahw_concepts` · `_balagha_concepts` · `_balagha_branches` | fold into `ar_ling_reg_term` (they are register categories) |

> Keep family-local kinds where they are used: `memlet_kinds`, `question_kinds`,
> `expression_types` are reference too, but only their own family reads them, so
> they stay `learn_*` / `expr_*`. The `reg` cluster is for the **cross-cutting**
> vocabulary both DBs consume.

### Families, tiers, and wazn → resolve from the register

These are the three you flagged. They are **register facts**, so their canonical
home is `ar_ling`, and the `qr_` copies become regenerated projections:

| item | canonical (author here) | projection (regenerate, never author) |
|---|---|---|
| form families (I–XII, أبواب) | `ar_ling_reg_term` · category `form_family` | `qr_morph_form_families` (QR-local cache) |
| form tiers (تجرّد/زيادة/رباعي) | `ar_ling_reg_term` · category `form_tier` | `qr_morph_form_tiers` (QR-local cache) |
| wazn pattern vocab (فَعَلَ, مُفْعِل…) | `ar_ling_reg_term` · category `wazn` (or derived from `form_family`+`derivation_type`) | `qr_lemmas.wazn_ar`, `qr_morph_display_lemmas.wazn_ar` |

So the form family/tier vocab need not be separate tables in `ar_ling` at all —
they are **rows in `ar_ling_reg_term`** under their category. The QR tables keep
serving the grid (they must be QR-local — see below) but are marked
`-- projection of ar_ling_reg_term; regenerate, do not author`.

### How `km_quran` reads a register that lives in `ar_ling`

D1 has **no cross-database SQL** (CLAUDE.md — cross-domain goes through Worker
service bindings). So the QR worker cannot `JOIN` the register. Instead:

```
build step (once per root/lemma):
  km-quran-worker  ──service binding──▶  km-ar-linguistics-worker
       │                                   returns register rows
       │                                   (form_family, tier, wazn for this lemma)
       ▼
  bakes them into qr_morph_display_lemmas.{wazn_ar, form_family_id, tier_key}
  and qr_morph_display_roots.family_json   ← render-ready, no runtime join
```

The register is **authored once in `ar_ling_reg_term`**; the QR display copies are
**projections written by the build step**, never edited by hand. That satisfies
L6 (truth in the library) *and* the D1 no-cross-join constraint (render locally).

> Why not one giant `morph` for everything? Because `LIKE 'ar_ling_morph_%'`
> should return the *morphology* tables, not the 2,204-row idiom table or the
> per-user SRS log. Five tight clusters beat one bag. But if you truly want a
> single grep, they all still share the domain prefix, and you can standardise the
> second segment to a fixed five so `WHERE name GLOB 'ar_ling_(morph|gram|syn|expr|learn)_*'`
> enumerates the entire vocabulary domain.

---

## Rename map — `ar_ling_` core morphology → `ar_ling_morph_*`

### Root layer
| current | proposed |
|---|---|
| `ar_ling_roots` | `ar_ling_morph_root` |
| `ar_ling_root_relations` | `ar_ling_morph_root_relation` |
| `ar_ling_root_semantic_fields` | `ar_ling_morph_root_field` |
| `ar_ling_root_variants` | `ar_ling_morph_root_variant` |
| `ar_ling_root_antonyms` | `ar_ling_morph_root_antonym` |
| `ar_ling_root_scholarship` | `ar_ling_morph_root_scholarship` |
| `ar_ling_root_sense_axes` | `ar_ling_morph_root_sense_axis` |
| `ar_ling_root_development_stages` | `ar_ling_morph_root_dev_stage` |
| `ar_ling_root_vocab` | `ar_ling_morph_root_vocab` |

### Lemma layer
| current | proposed |
|---|---|
| `ar_ling_lemmas` | `ar_ling_morph_lemma` |
| `ar_ling_lemma_root_links` | `ar_ling_morph_lemma_root_link` |
| `ar_ling_lemma_morphology` | `ar_ling_morph_lemma_bundle` |
| `ar_ling_lemma_variants` | `ar_ling_morph_lemma_variant` |
| `ar_ling_lemma_registers` | `ar_ling_morph_lemma_register` |
| `ar_ling_lemma_difficulty` | `ar_ling_morph_lemma_difficulty` |

### Ṣarf engine (bundle · token · wazn)
| current | proposed |
|---|---|
| `ar_ling_morphology` | `ar_ling_morph_bundle` |
| `ar_ling_tokens` | `ar_ling_morph_token` |
| `ar_ling_token_lexicon_link` | `ar_ling_morph_token_lex_link` |
| `ar_ling_form_paradigms` | `ar_ling_morph_wazn_paradigm` |
| `ar_ling_conjugation_templates` | `ar_ling_morph_conjugation` |
| `ar_ling_inflection_rules` | `ar_ling_morph_inflection_rule` |
| `ar_ling_verb_government` | `ar_ling_morph_verb_gov` |
| `ar_ling_word_sums` | `ar_ling_morph_word_sum` |

### Sibling clusters (rename to their keyword)
| current | proposed |
|---|---|
| `ar_ling_near_synonym_sets` | `ar_ling_syn_set` |
| `ar_ling_near_synonym_members` | `ar_ling_syn_member` |
| `ar_ling_near_synonym_evidence` | `ar_ling_syn_evidence` |
| `ar_ling_near_synonym_set_sources` | `ar_ling_syn_set_source` |
| `ar_ling_near_synonym_member_sources` | `ar_ling_syn_member_source` |
| `ar_ling_near_synonym_review_queue` | `ar_ling_syn_review_queue` |
| `ar_ling_expressions` | `ar_ling_expr_idiom` |
| `ar_ling_expression_tokens` | `ar_ling_expr_token` |
| `ar_ling_expression_types` | `ar_ling_expr_type` |
| `ar_ling_collocations` | `ar_ling_expr_collocation` |
| `ar_ling_memlet_kinds` | `ar_ling_learn_memlet_kind` |
| `ar_ling_memlets` | `ar_ling_learn_memlet` |
| `ar_ling_memlet_media` | `ar_ling_learn_memlet_media` |
| `ar_ling_memlet_mastery` | `ar_ling_learn_mastery` |
| `ar_ling_question_kinds` | `ar_ling_learn_question_kind` |
| `ar_ling_question_items` | `ar_ling_learn_question_item` |
| `ar_ling_question_distractors` | `ar_ling_learn_distractor` |
| `ar_ling_context_passages` | `ar_ling_learn_context_passage` |
| `ar_ling_exposure_log` | `ar_ling_learn_exposure` |
| `ar_ling_vocab_memory_hooks` | `ar_ling_learn_hook` |

The register tables (`ar_ling_gram_*` + the cross-cutting reference tables)
move into the `reg` cluster — see "The register (`reg`)" section above.

### `km_quran` side (mostly done)
`qr_morph_display_*`, `qr_morph_form_families`, `qr_morph_form_tiers` already
cluster ✅. Optionally align the corpus index tables:
`qr_lemmas → qr_morph_lemma`, `qr_lemma_occurrences → qr_morph_lemma_occurrence`.
**Leave `qr_word_occurrences` alone** — it is the corpus-wide token table used far
beyond morphology; renaming it has a large blast radius for little gain.

---

## Column naming — do the same inside the row

The scatter is also *inside* tables: the root key is spelled `root`,
`root_text`, `root_normalized`, `root_ar`, and `root_norm` across tables; the
normalized column is `_bare` here, `_normalized` there, `_norm` elsewhere.
Standardise to **one** set:

| concept | canonical column | normalized sibling |
|---|---|---|
| root skeleton | `root_ar` (display) / `root_norm` (key) | `root_norm` = `rootNorm(root_ar)` |
| lemma surface | `lemma_ar` | `lemma_norm` = `morphNorm(lemma_ar)` |
| word surface | `surface_ar` | `surface_norm` |
| wazn | `wazn_ar` | — |

Every searchable Arabic column `X` gets a sibling `X_norm` produced by the single
`morphNorm()` in `workers/shared/src/morph-normalize.ts`. Retire `_bare` /
`_normalized` spellings in favour of `_norm`.

---

## Rollout — safe, because renames break code

`ALTER TABLE old RENAME TO new` is cheap in SQLite (keeps data + indexes) but
**breaks every worker query and any view/trigger referencing the old name**. Do
it in three fenced steps, not one:

1. **Migration** — `ALTER TABLE ... RENAME TO ...` for each table, then
   `CREATE VIEW <old_name> AS SELECT * FROM <new_name>;` so existing code keeps
   working during the transition (read-only; writes must move to the new name).
2. **Code** — update repos/routes in each worker to the new names (grep the old
   names; they are the checklist). Update `schema.sql` snapshots + this doc.
3. **Cleanup migration** — `DROP VIEW` the compatibility shims once no code
   references the old names.

Adopt the convention for **all new tables immediately**; migrate existing ones
cluster-by-cluster (start with `morph`, it is the one you asked for). Because D1
is production, run each cluster's rename behind the Gate-0 snapshot from the
master doc.
