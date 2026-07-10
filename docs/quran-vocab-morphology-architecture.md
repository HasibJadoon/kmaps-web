# Qurʾān Vocabulary & Morphology — Table Architecture

> Deep reference for every table that stores Qurʾānic vocabulary and morphology,
> across **`km_quran`** (corpus) and **`km_arabic_linguistic`** (library).
> Grounded in the **live D1 state audited 2026-07-10**. Worked through three
> words: **بين → مُبِين (Mubeen)**, **نزل → أَنزَلَ (Anzala)**, **كتب → كِتاب (Kitab)**.
>
> Companion files: schema snapshots `workers/quran/schema.sql` +
> `workers/ar-linguistics/schema.sql`; reconciliation migrations
> `workers/quran/migrations/0007_*` + `workers/ar-linguistics/migrations/0023_*`;
> gap analysis `docs/quran-vocab-morphology-gap-report.md`.

---

## 0 · The two databases, and the one rule

Two databases, split by a single question — *is this true of Arabic, or true of the Qurʾān?*

| | `km_arabic_linguistic` (AL) — **the library** | `km_quran` (QR) — **the corpus** |
|---|---|---|
| Holds | what is true of **Arabic**: roots, lemmas, morphology, wazn, government | what is true of the **Qurʾān**: occurrences, frequency, render-ready cards |
| Roots | 24,653 total · **1,642 Qurʾānic** | 1,642 (agrees with AL) |
| Lemmas | 83,703 total | **4,817 Qurʾānic** |
| Words | — | 77,427 occurrences (99.996% morph-tagged) |

> الإفعال (Form IV) is defined by Arabic → **AL**. That أَنزَلَ occurs 183× → **QR**.
> The corpus never re-states a fact about the language; it stores a **typed reference** (`AL:<id>`) and reads across a Worker service binding.

**The storage law (four clauses).** Every row obeys these; they are why there are many tables and not one:

1. **Tier (L2).** A fact lives at exactly one scope: **root** (بين) · **lemma** (مُبِين) · **context** (44:2 word 8). A wazn is a *lemma* fact; an أصل واحد is a *root* fact; an iʿrāb sign is a *context* fact.
2. **Once-only (L4).** A root is built once, a lemma once. Passages **reuse**. The 8th time you meet a نزل word, the root and most lemmas already exist.
3. **Provenance (L1).** Every display row resolves to an upstream row via `(source_slug, source_ref)`, **or** declares `is_synthesis = 1` and names its sources. `source_slug LIKE 'kmaps_%'` **means** authored and is never valid with `is_synthesis = 0`.
4. **Core-first (L5).** Display reads a core table; a core table is never empty while a card claims to describe it.

---

## 1 · Simple data-flow — "Word → reuse the root, or add it"

```
                        ┌─────────────────────────────┐
   a new word from      │  qr_word_occurrences         │   already 99.996% tagged.
   the muṣḥaf, e.g.     │  (surah, ayah, word_index)   │   NOT a parse — a lookup.
   44:3 «أَنزَلْنَاهُ»     │  root='نزل' lemma='أَنزَلَ'    │
                        └──────────────┬──────────────┘
                                       │  root = 'نزل'
                                       ▼
                    ┌──────────────────────────────────┐
                    │  Does the ROOT exist?             │
                    │  SELECT id FROM ar_ling_roots     │
                    │  WHERE root_normalized = 'نزل'    │
                    └───────┬───────────────────┬───────┘
                    YES ►reuse                NO ►BUILD ONCE  (1 of 1,642)
                            │                     │  ar_ling_roots.meaning_core_* ← Maqāyīs
                            │                     │  + satellites: semantic_fields, antonyms,
                            │                     │    scholarship, sense_axes, dev_stages
                            │                     │  → project qr_morph_display_roots (MDR:نزل)
                            │                     │  → 12 root blocks (root_dna, lexicon, …)
                            ▼                     ▼
                    ┌──────────────────────────────────┐
                    │  Does the LEMMA exist?            │
                    │  qr_lemmas WHERE lemma='أَنزَلَ'    │
                    └───────┬───────────────────┬───────┘
                    YES ►reuse                NO ►BUILD ONCE  (1 of 4,817)
                            │                     │  resolve morphology bundle (qac_flags)
                            │                     │  wazn_ar ← (verb_form, derivation_type)
                            │                     │  author verb_government (transitivity+حرف)
                            │                     │  ar_ling_word_sums (جذر+وزن+زوائد+iʿlāl)
                            │                     │  → qr_morph_display_lemmas (MDL:انزل#…)
                            │                     │  → 3 lemma blocks (sarf, master_story…)
                            ▼                     ▼
                    ┌──────────────────────────────────┐
                    │  CONTEXT — always new per verse   │
                    │  qr_morph_display_words (44:3:5)   │
                    │  + context blocks:                 │
                    │    irab · tafsir · balagha · trans │
                    └──────────────────────────────────┘
                                       │
                                       ▼
                    Memlet layer (learning) + SRS (per user)
```

**Amortisation.** 44:1–8 costs ~30 roots + ~45 lemmas. 44:9–16 reuses most of them. Across the muṣḥaf the marginal cost per verse collapses to the context tier: two lookups and one authored sentence.

---

## 2 · Table catalog — every rectangle, with its source

Each table below is a **rectangle**: what it stores · its key · **where its truth comes from** (the provenance rule that governs it). `[AL]` = `km_arabic_linguistic`, `[QR]` = `km_quran`. Row counts are live 2026-07-10.

### 2.1 · Canonical corpus  `[QR]`

```
┌ qr_word_occurrences ─────────────── 77,427 ┐   SOURCE: QAC 0.4 (morphology_tag).
│ one row per word token in the muṣḥaf        │   Natural key: (surah, ayah, word_index).
│ word_text · root · lemma · pos              │   morphology_tag_json holds segments[]/flags/
│ morphology_tag · morphology_tag_json        │   features. This is the ground truth everything reads.
└─────────────────────────────────────────────┘
┌ qr_lemmas ──────────────────────────  4,817 ┐  SOURCE: distinct lemmas of the corpus.
│ lemma_text (UNIQUE) · root · lx_lemma_ref   │  wazn_ar filled 4817/4817 (Gate 3). The join key
│ total_occurrences · wazn_ar                 │  into the form register. lx_lemma_ref → AL lexicon.
└─────────────────────────────────────────────┘
┌ qr_lemma_occurrences ───────────────  72,507 ┐ SOURCE: derived. Maps every lemma to the word
│ lemma_id → (surah, ayah, word_index)        │  tokens that realise it. The reverse of the tag.
└─────────────────────────────────────────────┘
```

### 2.2 · Root layer  `[AL]` core + `[QR]` display

```
┌ ar_ling_roots ─────────── 24,653 (1,642 Qurʾānic) ┐  SOURCE: QAC roots + 13 dictionaries.
│ root_text · root_normalized (UNIQUE, join key)     │  meaning_core_en only 38/1,642 filled —
│ root_type · weak_pattern (1,642/1,642 ✅)          │  the big remaining authoring gap.
│ frequency_quran · meaning_core_en/ar               │  D31 fixed: NULLs backfilled, dupes merged.
└────────────────────────────────────────────────────┘
   satellites (each keyed by root_id or root_norm):
   • ar_ling_root_semantic_fields   3    field membership (fear, warning…)  ← ar_ling_semantic_fields
   • ar_ling_root_variants          —    orthographic variants               ← lexica
   • ar_ling_root_relations         …    root↔root (antithetical_pair…)      ← a شاهد āyah
   • ar_ling_root_antonyms          12   بشارة↔إنذار                          ← a شاهد āyah (never opinion)
   • ar_ling_root_scholarship       12   Sinai / comparative-Semitic entries  ← ingested chunk id
   • ar_ling_root_sense_axes        6    root × 6 axes × weight(0–3)          ← āyāt scored (basis_json)  [D9 core]
   • ar_ling_root_development_stages 4   ordered semantic evolution           ← Maqāyīs block, when grounded [D9 core]
   • ar_ling_root_vocab             56   Membean hook / anchors per root      ← five-lens synthesis

┌ qr_morph_display_roots ───────────────────── 4 ┐  SOURCE: projection of ar_ling_roots + root blocks.
│ id 'MDR:بين' · root_display 'ب ي ن'            │  The render-ready root card. family_json,
│ meaning_core_{ar,en,ur} · family_json          │  senses_json, lens_coverage_json denormalised so
│ senses_json · lens_coverage_json · status      │  the UI needs no join. status: draft→live.
└─────────────────────────────────────────────────┘
```

### 2.3 · Grammatical register  `[AL]` — one dictionary of terms for the whole system

Two tables replace ~14 flat concept tables. Trilingual (ar/en/ur), each term optionally joined to QAC by `qac_flag`.

```
┌ ar_ling_gram_categories ── 24 ┐   pos, tense, voice, transitivity, mood, case,
│ category_key · discipline      │   derivation_type, form_tier, form_family, root_type,
│ (sarf|nahw|balagha|dalala)     │   inflection_class, sentence_class, balagha_* …
└────────────────────────────────┘   SOURCE: authored register (grammar tradition).
┌ ar_ling_gram_terms ──── 245 ┐   'GT:voice:passive' مَجْهُول/passive/مجہول, qac_flag='PASS'.
│ id · category_key · term_key  │   parent_term_id builds hierarchy (أضرب الخبر under khabar).
│ qac_flag · name_{ar,en,ur}    │   SOURCE: Shudhūr · Talkhīṣ · QAC-0.4, cited in
│ definition_{ar,en,ur}         │   ar_ling_gram_term_sources.
└───────────────────────────────┘
   • ar_ling_gram_term_relations 14   contrast|subsumes|confused_with (إنْ/إذا/لو)  ← authored
   • ar_ling_gram_term_examples  25   the شاهد for a term                          ← quran/qr_ref
   • ar_ling_gram_term_sources    …   citation per term                            ← page_ref
```

### 2.4 · Ṣarf engine  `[AL]` — how a lemma is built and governs

```
┌ ar_ling_morphology ───────── 963 bundles ┐  SOURCE: derived from morphology_tag_json.
│ id · pattern · gender/number/case         │  ONE row per distinct QAC parse, SHARED by every
│ tense/voice/person · derivation_type      │  lemma that parses that way. qac_flags is the
│ verb_form · root_type · qac_flags · pos   │  natural key; UNIQUE(qac_flags, pos). مُبِين,
│ mood                                       │  مُنذِر, مُرْسِلِين share ACT|MP|ACC|PCPL|(IV).
└────────────────────────────────────────────┘
   • ar_ling_form_paradigms      1,735  (verb_form, root_type) → full paradigm_json  ← wazn table + QAC
   • ar_ling_conjugation_templates 517  person×tense×voice cell forms                ← paradigm, re-keyed (D6)
   • ar_ling_inflection_rules      24   إعلال/إبدال rules (authored once)            ← al-Shāfiya / Ibn ʿUṣfūr
   • ar_ling_verb_government       26   transitivity + حرف (THE irreducible layer)   ← lisān + a شاهد āyah
   • ar_ling_word_sums              1   جذر+وزن+زوائد+iʿlāl decomposition            ← qac_morphology + wazn
   • qr_morph_form_tiers  [QR]      4   تجرّد/زيادة × ثلاثي/رباعي                     ← register (widened 2→4)
   • qr_morph_form_families [QR]   21   الأبواب والصيغ (I–XII + رباعي + noun)          ← register (widened 17→21)
```

`ar_ling_verb_government` is the **only thing QAC cannot give you** and the reason the sarf card can distinguish خَلَصَ, أَخْلَصَ, and أَخْلَصَ لِلهِ. See §3.

### 2.5 · Lemma layer  `[AL]` core + `[QR]` display

```
┌ ar_ling_lemmas ──────── 83,703 ┐  SOURCE: lexicon + corpus. is_quran_word flags the 4,817.
│ id · root_id · lemma_text       │  verb_form groups the family. frequency_quran denormalised.
│ part_of_speech · verb_form      │
└─────────────────────────────────┘
   • ar_ling_lemma_root_links   9,280   lemma → root (closes the 4,817)          ← qr_lemmas.root
   • ar_ling_lemma_morphology  12,431   lemma × attested morphology bundle       ← QAC (derived)
   • ar_ling_lemma_variants        …    spelling variants                        ← lexica
   • ar_ling_lemma_registers       …    register/frequency note                  ← lexica
   • ar_ling_tokens           128,211   one row per QAC segment (prefix/stem/suffix) ← segments[]
   • ar_ling_token_lexicon_link    …    token → lexicon entry                     ← lx_lemma_ref
   • ar_ling_lemma_difficulty   4,817   freq · morph_opacity · polysemy → level(1–5) ← materialised view

┌ qr_morph_display_lemmas ───────── 27 ┐  SOURCE: projection of the sarf engine.
│ id 'MDL:{bare}#{lemma_id[:8]}'         │  THE missing tier, now built. Keyed on qr_lemmas.id
│ lemma_ref (UNIQUE) · morphology_id     │  because lemma_bare collides with the root (D30):
│ form_family_id · tier_key · wazn_ar    │  بَيْن & بَيِّن both bare to 'بين'. derived_type_*,
│ derived_type_{ar,en,ur} · gloss_*      │  gloss_* trilingual. status draft→live.
└─────────────────────────────────────────┘
```

### 2.6 · Word / context layer  `[QR]`

```
┌ qr_morph_display_words ─────────── 24 ┐  SOURCE: Tier-1 strip of the occurrence.
│ (surah, ayah, word_index) UNIQUE       │  Only PROMOTED content words (nouns/verbs/adj) get a
│ surface_ar · lemma_ref → MDL           │  row — particles/pronouns never hit the grid.
│ importance(1–5) · is_anchor            │  No wazn here; that lives at the lemma tier (L2).
└─────────────────────────────────────────┘
┌ qr_morph_display_blocks ──────── 93 ┐  SOURCE: mixed. THE central display table.
│ scope_level ∈ (root|lemma|context)   │  UNIQUE(scope_level, scope_key, block_type, block_subtype).
│ scope_key · block_type · data_json    │  CHECK enforces provenance: is_synthesis=0 ⇒ real
│ source_slug (FK) · source_ref         │  source_slug + source_ref; is_synthesis=1 ⇒ 'kmaps_%'.
│ is_synthesis · status                 │  Root=13 blocks, lemma=3, context=4 (see §5).
└───────────────────────────────────────┘
┌ qr_morph_display_media ─────────── 5 ┐  SOURCE: generated/licensed asset in R2.
│ 'MDM:بين:root_dna' · r2_key · sha256  │  Lifecycle pending→stored→live. Linked to a block.
└───────────────────────────────────────┘
   context blocks read (never copy) from:
   • qr_irab_book_entries / iʿrāb display   → the irab block
   • qr_tafsir_* display                    → tafsir block (1 per mufassir)
   • ar_ling_balagha_examples               → balagha block
   • qr_translation_sources                 → translators block
```

### 2.7 · Near-synonyms — الفروق  `[AL]`

The kindred/furūq layer. Why ظاهر is not مُبِين; which "send down" verb a verse chose.

```
┌ ar_ling_near_synonym_sets ─── 746 (744 draft) ┐  SOURCE: تفريق tradition + LLM draft.
│ set_name · canonical_{en,ar,ur} · review_status│  review_status='draft' blocks citation at
│ 'To descend, to reveal, come down'             │  is_synthesis=0 (D23) — promote before kindred
└─────────────────────────────────────────────────┘  can point at them.
   • ar_ling_near_synonym_members    3,269  a lemma in a set + nuance/contrast note  ← member_sources
   • ar_ling_near_synonym_member_sources  …  the claim's citation                    ← source chunk
   • ar_ling_near_synonym_set_sources     …  the set's citation                      ← source chunk
   • ar_ling_near_synonym_evidence        …  a qr_ref شاهد for the contrast          ← qr_word_occurrence
   • ar_ling_near_synonym_review_queue    …  open QA issues                          ← curation
```

### 2.8 · Verbal idioms & expressions  `[AL]`

```
┌ ar_ling_expressions ─────────── 2,204 ┐  SOURCE: ingested (Islāḥī, tafsīr). NOTE: OCR-noisy,
│ expression_ar · expression_en          │  needs a cleaning pass before display (see gap report).
│ expression_type_id · primary_lemma_id  │  qr_refs_json anchors it to verses.
│ qr_refs_json                           │
└─────────────────────────────────────────┘
   • ar_ling_expression_tokens   …  token breakdown of the idiom       ← per-token lemma link
   • ar_ling_expression_types    …  Quranic expression / idiom / …      ← authored, name_{ar,en,ur}
   • ar_ling_collocations        0  lemma-A + lemma-B habitual pairing  ← corpus co-occurrence (EMPTY)
```

The **verb + preposition → meaning** contract (what most people mean by "expression") is stored precisely in `ar_ling_verb_government`, expanded next.

### 2.9 · Memlet / question learning layer  `[AL]`

```
ar_ling_memlet_kinds 14 · ar_ling_memlets 11 · ar_ling_memlet_media · ar_ling_memlet_mastery
ar_ling_question_kinds 11 · ar_ling_question_items 5 · ar_ling_question_distractors 20
ar_ling_context_passages 3 · ar_ling_exposure_log · ar_ling_vocab_memory_hooks 7
```
Eleven of fourteen memlets are `is_synthesis=0` re-projections of blocks already built (`block_ref` points, never copies). Distractors carry `why_wrong_*` drawn from `form_paradigms` + `near_synonym_members` — every wrong answer is a lesson. Full model in the master doc, Part X.

---

## 3 · Verb government — لازم · متعدٍّ · متعدٍّ بحرف · how many objects

This is the table that turns a root into **different verbs**. QAC tags the form (IV, VIII…) but not *what the verb governs*. `ar_ling_verb_government` stores, per `(root_norm, verb_form)`:

- `transitivity` — the four classes, joined to the register term `transitivity_term_id`
- `harf` — the preposition that completes a `transitive_by_harf` verb (إلى / من / لـ / بِ / (هـ))
- `meaning_en` — the sense *this government* produces
- `qr_ref` — the شاهد āyah proving it

**The four classes (register category `transitivity`):**

| class | العربية | objects | example (live rows) |
|---|---|---|---|
| `intransitive` (لازم) | لَازِم | 0 | بَانَ «to become distinct» · نَزَلَ «to come down» |
| `transitive` (متعدٍّ) | مُتَعَدٍّ | 1 | بَيَّنَ «to make clear» · كَتَبَ «to write» |
| `transitive_by_harf` | مُتَعَدٍّ بحرف | 1 via حرف | خَلَصَ **إلى** «to reach» · فَسَقَ **عن** «to depart from» |
| `ditransitive` | مُتَعَدٍّ لمفعولين | 2 | أَنْذَرَ «to warn [someone] [of something]» |

**Worked: the نزل family government (real rows).** One root, three verbs, three governments:

| verb_form | verb | transitivity | حرف | meaning | شاهد |
|---|---|---|---|---|---|
| I | نَزَلَ | intransitive | بِ | to come down (bi-: to bring down) | 26:193 |
| II | نَزَّلَ | transitive | — | to send down **in stages** | 2:23 |
| IV | أَنزَلَ | transitive | — | to send down | 44:3 — إِنَّا أَنزَلْنَاهُ |

**Worked: خلص — why the same root is three verbs.** This is the case the whole table exists for:

| verb | transitivity | حرف | meaning |
|---|---|---|---|
| خَلَصَ | lazim | — | to become pure |
| خَلَصَ | lazim | إلى | to reach, arrive at |
| خَلَصَ | lazim | مِن | to be freed from |
| أَخْلَصَ | mutaʿaddī | (الدينَ) لـ | to devote (religion) exclusively **to** — 39:2 |
| اِسْتَخْلَصَ | mutaʿaddī | (هـ) لـ | to select exclusively for — 12:54 |

The حرف *is* the meaning. أَخْلَصَ لِلهِ is not أَخْلَصَ + a note; it is a different verb, and only this table records it.

---

## 4 · Per-family expansion — all used words → range of meaning

For any root, the **family** is every attested lemma (masdars, participles, verbs), each with its wazn, and the **range of meaning** the root spans across them. This is `qr_lemmas WHERE root=? ORDER BY total_occurrences DESC`, joined to `wazn_ar`. Two families, live:

### بين — «separation → disclosure» (523×, 13 lemmas)

| lemma | wazn | occ | derivation / sense in range |
|---|---|---|---|
| بَيْن | فَعْل | 266 | مصدر — *the between / interval* (the spatial etymon) |
| مُّبِين | مُفْعِل | 119 | اسم فاعل IV — **making-clear, manifest** (Mubeen) |
| بَيِّنَة | فَعِّلَة | 71 | *clear proof* (the disclosure sense, nominalised) |
| بَيَّنَ | فَعَّلَ | 35 | verb II — *to make clear* |
| تَبَيَّنَ | تَفَعَّلَ | 18 | verb V — *to become evident* (reflexive) |
| بَيَان | فَعَال | 3 | *clear speech / exposition* |
| … مُسْتَبِين · تِبْيَٰن · تَسْتَبِينَ … | … | 1 each | X and other augmentations |

**Range:** the root travels from a *spatial gap* (بَيْن) to *making-visible* (مُبِين, بَيَّنَ) to *proof* (بَيِّنَة). One etymon, a fan of senses — exactly what the `usage_map` and `development` blocks render from `root_sense_axes` + `root_development_stages`.

### نزل — «descent → staged revelation» (293×, 13 lemmas)

| lemma | wazn | occ | derivation / sense in range |
|---|---|---|---|
| أَنزَلَ | أَفْعَلَ | 183 | verb IV — **to send down** (Anzala; whole-event) |
| نَزَّلَ | فَعَّلَ | 62 | verb II — *to send down in stages* (intensive) |
| تَنزِيل | تَفْعِيل | 15 | مصدر II — *the (staged) revelation* |
| نُزُل | فُعُل | 8 | *lodging / hospitality* (the settling sense) |
| تَنَزَّلَتْ | تَفَعَّلَ | 7 | verb V — *to descend gradually* |
| نَزَلَ | فَعَلَ | 6 | verb I — *to come down* |
| مَنَازِل | مَفَاعِل | 2 | اسم مكان — *stations / stages (of the moon)* |
| … مُنزَل · مُنَزِّل · نَزْلَة … | … | 1–5 | participles + مرّة noun |

**Range:** أَنزَلَ (IV, whole) vs نَزَّلَ (II, in stages) is the theological contrast the family makes visible — and it is *free*, because both are already tagged and their government is one row each in §3.

---

## 5 · Three worked words, end to end

### 5.1 · Mubeen — مُبِين  (root بين, Form IV active participle, **hollow** root)

| layer | table | stored value (live) |
|---|---|---|
| corpus | `qr_word_occurrences` | root `بين`, lemma `مُّبِين`, 119 occurrences |
| root core | `ar_ling_roots` | root_normalized `بين`, **weak_pattern `ajwaf_ya`** (hollow-yāʾ), freq 523 |
| root display | `qr_morph_display_roots` | `MDR:بين`, meaning_core_en *"separation and disclosure…"*, **status live** |
| root blocks | `qr_morph_display_blocks` scope=root | **12 blocks**: root_dna, lexicon, derivations, constellation, attestations, kindred, occurrences, usage_map, development, master_story, metaphor, synthesis |
| lemma | `qr_lemmas` | `مُّبِين`, wazn_ar `مُفْعِل` |
| word sum | `ar_ling_word_sums` | surface `مُبِين` ← underlying `مُبْيِن`, **inflection_class `ilal_naql`** (إعلال بالنقل) |
| government | `ar_ling_verb_government` | بَيَّنَ (II) transitive «to make clear»; أَبَانَ (IV) transitive |
| kindred | `ar_ling_near_synonym_sets` | set *"To become manifest, revealed"*: مُبِين vs ظَهَرَ · جَهَرَ · بَدَا |

> **The ṣarf lesson:** مُبِين and مُنذِر share the *same* wazn مُفْعِل, same Form IV, same اسم فاعل. But ب-ي-ن is **hollow** → مُبْيِن moves to مُبِين by إعلال بالنقل; ن-ذ-ر is **sound** → مُنذِر stays put. *The wazn is constant; the root type decides whether the surface moves.* `word_sums.rule_en` states this contrast verbatim.

### 5.2 · Anzala — أَنزَلَ  (root نزل, Form IV, **sound** root)

| layer | table | stored value (live) |
|---|---|---|
| corpus | `qr_word_occurrences` | root `نزل`, lemma `أَنزَلَ`, 183 occurrences |
| root core | `ar_ling_roots` | root_normalized `نزل`, weak_pattern `sound`, freq 293 |
| root display | `qr_morph_display_roots` | `MDR:نزل`, meaning_core_en *"sending down; revelation sent down in stages"*, **status draft** |
| root blocks | `qr_morph_display_blocks` scope=root | 12 blocks (same set as بين) |
| lemma | `qr_lemmas` | `أَنزَلَ`, wazn_ar `أَفْعَلَ` |
| government | `ar_ling_verb_government` | **3 rows**: نَزَلَ (I, intr, بِ), نَزَّلَ (II, tr, staged), أَنزَلَ (IV, tr) — the أنزل/نزّل contrast |
| kindred | `ar_ling_near_synonym_sets` | set *"To descend, to reveal, come down"*: نَزَلَ · أَنْزَلَ · تَنَزَّلَ · هَبَطَ · وَضَعَ |

> **D5 resolved.** The master doc flagged *"نزل: 13 blocks, no parent root row."* Live D1 now has `MDR:نزل` with all 12 root blocks — the orphan is fixed; it only awaits promotion `draft → live`.

### 5.3 · Kitab — كِتاب  (root كتب, مصدر/noun فِعال, **sound** root)

| layer | table | stored value (live) |
|---|---|---|
| corpus | `qr_word_occurrences` | root `كتب`, lemma `كِتَٰب`, 260 occurrences |
| root core | `ar_ling_roots` | root_normalized `كتب`, weak_pattern `sound`, freq 319 |
| root display | `qr_morph_display_roots` | `MDR:كتب`, meaning_core_en *"writing; prescribing; a Book/decree"*, **status live** |
| root blocks | `qr_morph_display_blocks` scope=root | 12 blocks |
| lemma | `qr_lemmas` | `كِتَٰب` wazn `فِعَٰل` · family: كَتَبَ (verb I, فَعَلَ), كَاتِب (فَاعِل), مَكْتُوب (مَفْعُول), اكْتَتَبَ (VIII) |
| government | `ar_ling_verb_government` | كَتَبَ (I) transitive «to write; to prescribe» — 21:105 |

> **Range:** كتب spans a *physical act* (كَتَبَ «to write», كَاتِب «scribe», مَكْتُوب «written»), a *legal act* (كُتِبَ «it is prescribed»), and an *object* (كِتاب «the Book / decree»). The noun كِتاب dominates (260/319) — the corpus reaches for the *thing written* far more than the act.

---

## 6 · Provenance is the point

Nothing renders that cannot name where it came from. The `qr_morph_display_blocks` CHECK constraint enforces it at write time:

```sql
CHECK ((is_synthesis = 1 AND source_slug LIKE 'kmaps_%')
    OR (is_synthesis = 0 AND source_slug NOT LIKE 'kmaps_%' AND source_ref IS NOT NULL))
```

A projection (`is_synthesis=0`) must cite a real upstream row (`root_dna` → a Maqāyīs block id). A synthesis (`is_synthesis=1`) must be labelled `kmaps_*` and every strand must resolve. There is no third route. That is why the schema has ~60 tables and not one JSON blob: **a column can be joined, validated, and cited; a blob cannot.**
