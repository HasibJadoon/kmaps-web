# Universal Root — Comprehensive Layered Table Tree

> Generated 2026-07-17 from live D1 (`km_arabic_linguistic` 192f4792…, `km_quran` 8dbd5053…)
> and the register (`ar_ling_reg_build_layer`, `ar_ling_reg_table_map`).
> This is the canonical "touch every table" map, ordered by the register's own
> `fill_order`. Tables added or changed on 2026-07-17 are marked **★**.

## How to read the codes

Every table carries a `code_full` of the form:

```
<DB>:<layer>-<CLUSTER>:<discipline>:<seq>-<role>:<kind>
      100    ROOT     DL        40   LINK   B
```

- **DB** — `AL` (km_arabic_linguistic), `QR` (km_quran), `KA` (km_arabic).
- **layer** — three-digit `layer_code`, ascending `fill_order` (000 → 990).
- **discipline** — `SF` ṣarf · `NH` naḥw · `DL` dalāla (semantics) · `BL` balāgha · `XC` cross-cutting.
- **role** — CORE (primary rows), LINK (bridge/edge), DNA (synthesis), STAT (status), GOV (government), CORR (corrections), META, DISP (display projection), REG (registry).
- **kind** — `P` primary · `B` bridge · `A` annotation · `J` job/runtime.

The **Root layer (100)** is the spine. Everything above it (form → lemma → word →
sentence → passage → surah) narrows from three radicals to a single token in a
verse; everything below it (kindred → expression → memlet → question → mastery)
turns the root into learning. A root is identified once in `ar_ling_roots`
(`AL:100`) and referenced everywhere else by typed id — never re-stored.

---

## The layered tree (000 → 990)

```
000  REGISTER  (AL:000-REG)  — master data / the map itself
 ├─ ar_ling_reg_build_layer            XC  the layer catalog (this tree's source)
 ├─ ar_ling_reg_table_map              XC  every table → layer/role/discipline
 ├─ ar_ling_reg_table_discipline       XC  table → discipline (many-to-one+)
 ├─ ar_ling_semantic_fields            DL  field taxonomy (parent_field_id tree)
 ├─ ar_ling_inflection_rules           SF  ṣarf rule base
 └─ ar_ling_gram_terms | _categories | _term_examples | _term_relations | _term_sources   XC  grammar ontology

010  SOURCE  (AL:010-SRC)  — lexica & corpus ingest (verbatim, never paraphrased)
 ├─ ar_ling_sources · _source_editions · _source_index · _source_toc · _source_entry_refs
 ├─ ar_ling_lexicon_root_entries        ROOT-scoped dictionary entry  ─┐ feeds layer 100
 ├─ ar_ling_lexicon_root_entry_sources  citations for the above       ─┘
 ├─ ar_ling_lexicon_blocks · _block_annotations · _block_links · _block_tags · _book_pages · _entry_sections · _entry_embeddings
 ├─ ar_ling_lexicon_quran_refs          lexicon → āyah bridge
 ├─ ar_ling_evidence_items              shawāhid pool
 └─ ar_ling_lane_patch_log · _lane_quality_index · _lane_source_pages   Lane QA

050  CURRICULUM  (KA:050-CUR)  — pedagogy shell (km_arabic)
 └─ ar_curricula · ar_curriculum_units · ar_containers · ar_container_units · ar_container_unit_tasks
    · ar_lessons · ar_learning_tracks · ar_domains · ar_domain_phrases · ar_scenarios
    · ar_classes · ar_class_enrolments · ar_class_assignments · ar_class_resources

100  ROOT  (AL:100-ROOT / QR:100-ROOT)  ★★★  THE SPINE
 │
 ├─ IDENTITY
 │   ├─ ar_ling_roots                    SF  CORE   canonical root (id, radicals, root_type, weak_pattern, freq)
 │   ├─ ar_ling_root_variants            SF  CORE   spelling / radical variants
 │   └─ qr_root_registry            ★    QR  REG    root_ar → root_uid → (AL id) bridge  [newly registered]
 │
 ├─ INTELLIGENCE (synthesis)
 │   ├─ ar_ling_root_dna                 SF  DNA    core image / story / poles / family (trilingual, provenance+confidence)
 │   ├─ ar_ling_root_vocab              —   CORE   derived-word inventory + Membean hooks
 │   └─ ar_ling_root_development_stages  DL  CORE   diachronic meaning stages
 │
 ├─ SENSE & FIELD  (the gap that is now closed)
 │   ├─ ar_ling_root_senses         ★    DL  CORE   canonical per-root senses (is_core = aṣl al-maʿnā)
 │   ├─ ar_ling_root_sense_axes          DL  CORE   continuous meaning dimensions (weighted by āyāt)
 │   └─ ar_ling_root_semantic_fields ★   DL  LINK   root → semantic_field (optionally sense-scoped)
 │
 ├─ GRAPH  (root-to-root)
 │   ├─ ar_ling_root_antonyms            DL  CORE   pairwise opposites
 │   ├─ ar_ling_root_relations      ★    DL  LINK   general typed edges (support/overcome/cognate/metathesis/sub_root…)
 │   ├─ ar_ling_syn_root                 XC  CORE   synonym / aḍdād family summary
 │   ├─ ar_ling_syn_sense                DL  LINK   sense-level synonymy
 │   └─ ar_ling_root_edges_v        ★    —   VIEW   unified read: antonyms ∪ relations ∪ syn_root families
 │
 ├─ SCHOLARSHIP
 │   └─ ar_ling_root_scholarship         DL  CORE   Ibn ʿĀshūr / Ṭabarī / comparanda / inscriptions
 │
 ├─ DISPLAY PROJECTION
 │   └─ qr_morph_display_roots      ★    QR  DISP   render cache; now carries al_root_ref → AL:<id> (typed pointer)
 │
 └─ BUILD STATUS
     └─ ar_ling_root_build_status        —   STAT   per-source build ledger

150  FORM (bāb / wazn)  (AL:150-FORM:SF / QR:150-FORM)
 ├─ ar_ling_form_families · ar_ling_form_tiers      SF  form paradigm scaffold
 ├─ ar_ling_lemma_form_map                          SF  lemma → form (LINK)
 └─ qr_morph_form_families · qr_morph_form_tiers     QR  display projection

200  LEMMA  (AL:200-LEM / QR:200-LEM)
 ├─ ar_ling_lemmas                       SF  CORE   canonical lemma
 ├─ ar_ling_lemma_root_links             SF  LINK   lemma → root (the 100↔200 seam)
 ├─ ar_ling_morphology · _morph_corrections · _conjugation_templates · _form_paradigms   SF  ṣarf realization
 ├─ ar_ling_verb_government              NH  GOV    transitivity / preposition government
 ├─ ar_ling_lemma_difficulty · _lemma_registers · _word_sums                             pedagogy signals
 ├─ ar_ling_syn_lemma · ar_ling_syn_lemma_sense   XC/DL  lemma-level synonymy
 └─ qr_lemmas · qr_lemma_occurrences · qr_morph_display_lemmas    QR  corpus + display

300  CONTEXT / WORD  (QR:300-CTX, AL:300 link)
 ├─ qr_word_occurrences                  QR  CORE   every token (root, lemma, pos, morph tag) — root attestation
 ├─ qr_morph_display_words · _blocks · _sources     QR  DISP  study-grid projection
 ├─ ar_ling_quran_links                  AL  LINK   AL → āyah bridge
 └─ context_src (source display): qr_irab_book_entries · qr_irab_sources · qr_irab_source_chunks · qr_irab_extraction_runs · qr_irab_import_errors
    · qr_iraab_book_display_{blocks,links,notes,refs,sources,tags} · qr_tafsir_entries · qr_tafsir_book_display_{blocks,links,notes,refs,sources,tags}

310  SENTENCE STRUCTURE (iʿrāb)  (QR:310-SS)
 ├─ occurrences: qr_ss_occ_sentence · _occ_clause · _occ_phrase · _occ_segment
 ├─ tree: qr_ss_tree · _tree_node · _tree_edge · _tree_layout_cache
 ├─ scope/readings: qr_ss_scope_reading · _scope_nuance · _scope_member_map · _scope_relations
 │   · _scope_reading_evidence_link · _scope_grammar_link · _scope_balagha_link · _scope_morph_link
 ├─ syntax/discourse: qr_ss_syntax_relations · _discourse_note · _discourse_citation · _discourse_source_link · _ellipsis_event · _term
 ├─ translation: qr_ss_translation_passage · _translation_unit · _translation_buildup · _translation_nuance · qr_ss_translation_decision ★
 └─ registers/log: qr_ss_pattern_register ★ · qr_ss_vocab_register ★    [newly registered]

320  PASSAGE  (QR:320-PSG)
 └─ qr_surah_study_passages · _study_steps · _study_tasks · _study_task_json_chunks
    · qr_passage_sections · qr_passage_analysis_cache · qr_scope_topics · qr_scope_nuances · qr_study_questions

330  SURAH STRUCTURES  (QR:330-STRC)
 └─ qr_surah_structure_units · _structure_readings · _structure_links · _openings · _closures
    · _structural_pivots · _clause_patterns · _sequence_patterns · _symmetry_patterns · _diamond_patterns
    · _ellipsis_patterns · _motif_clusters · _coherence_signals

340  ILLUSTRATION  (QR:340-ILL)
 └─ qr_mushaf_layout_lines

350  SURAH ANALYSIS  (QR:350-SANL)
 └─ qr_surah_profiles · _atomic_profiles · _theme_profiles · _theology_profiles · _worldview_profiles
    · _rhetoric_profiles · _topic_flows · _ayah_meta · _relations · _reception_histories
    · _analysis_cache · qr_surah_register_shifts ★    [newly registered]

360  RECEPTION & SCHOLARSHIP  (QR:360-RECP)
 └─ qr_scholar_profiles · _scholar_positions · _scholar_works · _scholar_paradigm_links · qr_scholarly_paradigms
    · qr_arguments · _argument_relations · qr_analysis_claims · _analysis_scopes · qr_claim_evidence_links
    · qr_evidence_items · qr_debate_clusters · qr_interpretive_differences · qr_historical_context_profiles
    · qr_quran_bil_quran_relations · qr_topic_registry

370  CORPUS BASE  (QR:370-CORP)  — canonical text
 └─ qr_surahs · qr_ayah · qr_translations · qr_translation_passages · qr_translation_sources · qr_doc_links

400  KINDRED (near-synonyms)  (AL:400-KIN:BL)
 └─ ar_ling_near_synonym_sets · _members · _evidence · _set_sources · _member_sources · _review_queue

500  EXPRESSIONS / IDIOMS  (AL:500-EXPR:BL)
 └─ ar_ling_expressions · ar_ling_expression_types

600  MEMLETS  (AL:600-MEM)
 └─ ar_ling_memlets · _memlet_kinds · _memlet_media · ar_ling_context_passages · ar_ling_vocab_memory_hooks

700  QUESTIONS  (AL:700-QUES)
 └─ ar_ling_question_items · _question_distractors · _question_kinds

800  MASTERY & EXPOSURE  (KA:800-MAST)
 └─ ar_srs_decks · ar_srs_cards · ar_srs_reviews · ar_mastery_profiles · ar_memlet_mastery
    · ar_unit_progress · ar_user_track_profiles · ar_task_completions · ar_assignment_submissions · ar_exposure_log

810  LEARNER VOCAB & GRAMMAR  (KA:810-LRN)
 └─ ar_unit_concept_map · ar_unit_lemma_map

900  MEDIA  (QR:900-MED)
 └─ qr_morph_display_media

990  INFRASTRUCTURE  (AL:990-SYS / QR:990-SYS)  — jobs, vectors, migrations
 └─ ar_ling_root_build_jobs · ar_ling_import_runs · ar_ling_embedding_jobs · ar_ling_vector_records
    · qr_ss_migration_log ★    [newly registered]
```

---

## The root thread (how one root touches every layer)

Take **ن-ص-ر**:

```
010  al-Mufradāt entry            ar_ling_lexicon_root_entries
100  identity + DNA + senses      ar_ling_roots → root_dna → root_senses{victory,aid}
100  fields                       root_semantic_fields → semantic_fields{victory,divine aid}
100  graph                        root_edges_v → {عون support, ظفر overcome, خذل antonym}
200  lemmas                       lemma_root_links → {نَصَرَ, نُصْرة, ناصِر, مَنْصور}
200  morphology                   ar_ling_morphology (Form I…X, wazn)
300  attestations                 qr_word_occurrences WHERE root='نصر' (freq → back to ar_ling_roots.frequency_quran)
310  in a sentence                qr_ss_* iʿrāb of an āyah containing a نصر token
400  kindred set                  near_synonym_sets {نصر, عون, مدد}
600  memlet                       ar_ling_memlets (the hook that teaches it)
700  question                     ar_ling_question_items (recall test)
800  mastery                      ar_srs_cards / ar_mastery_profiles (learner state)
```

Every hop is a **typed reference**, not a copy. The only projection cache is
`qr_morph_display_roots`, which now carries `al_root_ref = 'AL:<id>'` so it can be
re-synced from AL and can never silently diverge.

---

## Gaps found and closed on 2026-07-17

| Table | Layer | Gap | Action |
|---|---|---|---|
| `ar_ling_root_senses` ★ | 100 DL | no canonical sense pivot | created (0035) + registered (0036) |
| `ar_ling_root_semantic_fields` ★ | 100 DL | root→field link missing | created (0035) + registered (0036) |
| `ar_ling_root_relations` ★ | 100 DL | no general root graph | created (0035) + registered (0036) |
| `ar_ling_root_edges_v` ★ | 100 | edge tables fragmented | unified view (0037) |
| `qr_morph_display_roots` ★ | 100 QR | duplicated AL content | typed `al_root_ref` + sync job (0009) |
| `qr_root_registry` ★ | 100 QR | existed, unmapped | registered (0036) |
| `qr_ss_pattern_register` ★ | 310 | existed, unmapped | registered (0036) |
| `qr_ss_translation_decision` ★ | 310 | existed, unmapped | registered (0036) |
| `qr_ss_vocab_register` ★ | 310 | existed, unmapped | registered (0036) |
| `qr_surah_register_shifts` ★ | 350 | existed, unmapped | registered (0036) |
| `qr_ss_migration_log` ★ | 990 | existed, unmapped | registered (0036) |

After this pass, every base table in both databases resolves to a layer in
`ar_ling_reg_table_map`. Verified: the AL "unmapped existing tables" query returns
zero rows, and all six QR gaps are now registered.
