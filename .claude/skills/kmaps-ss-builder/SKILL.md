---
name: kmaps-ss-builder
description: >-
  Build the full sentence-structure (naḥw/iʿrāb) stack for one Qurʾānic āyah in K-Maps / km_quran:
  the syntactic layers (sentence, clauses, phrases, morpheme segments, dependency relations, and a
  constituency tree keyed to real word occurrences), the source-grounded interpretive layers
  (iʿrāb readings, grammar links, balāgha links, discourse nuance — every one trilingual Arabic /
  English / Urdu via a gloss_json {ar,en,ur} contract), and a DERIVED translation layer where the
  literal rendering is a grammar-only fold over the tree, the fluent rendering is the grammar ⊕
  balāgha fold, and every rendering choice links back to the exact grammar/balāgha/reading row that
  caused it (a translation_decision provenance graph). Use whenever the user wants to build, push,
  or "do properly" the sentence structure / إعراب / grammar / balāgha / translation of an āyah;
  triggers include "sentence structure", "ss-grammar", "ss-balagha", "push to all tables ss",
  "iʿrāb of this āyah", "trilingual balāgha", "derived / auditable translation", "build the tree
  for X:Y", or naming an āyah (43:4, 44:3) with any of grammar, balāgha, nuance, or translation.
  Ground every interpretive claim in real source text present in D1 — NEVER fabricate a scholar_ref
  or citation.
---

# K-Maps Sentence-Structure Builder

Take **one āyah** and produce its complete, layered, trilingual sentence-structure record in
**km_quran** (`8dbd5053-c9b8-4dd0-9e45-1d66d3a58fba`), so the reader (a father teaching a son)
can see *what joins what* (naḥw), *why it lands the way it does* (balāgha), and *a translation that
is derived from those two layers and can explain itself*.

Read the reference files as you need them:
- `references/ss-schema-and-ids.md` — every table, the ID namespace, dot-path node ids, the
  `term_key` vocabulary, real word-occurrence keying, and the D1 SQL gotchas. **Read before touching D1.**
- `references/interpretive-and-translation.md` — the `gloss_json {ar,en,ur}` contract, grounding
  readings in `qr_irab_book_entries`, balāgha `LX:` refs, and the translation-as-fold pipeline with
  its provenance graph. **Read before writing any reading, balāgha, nuance, or translation row.**

## The golden rules (violating these defeats the purpose)

1. **Ground every interpretive claim in real source text.** Readings cite iʿrāb books/works that
   actually exist in D1 — pull the āyah's rows from `qr_irab_book_entries` first and quote/paraphrase
   *those*. **Never invent a `scholar_ref`, a book slug, a `QR:WORK:*` ref, or a citation.** If a
   position is genuine cross-book consensus, mark it `jumhur`; if the source isn't in the DB, say so
   and leave it — do not manufacture provenance.
2. **Trilingual everywhere via `gloss_json`.** Every interpretive and translation row carries a
   `gloss_json {ar,en,ur}` with all three non-empty. No row ships bilingual. Build the JSON with
   `json_object('ar',…,'en',…,'ur',…)` so it is valid by construction; keep the legacy `_ar/_en`
   columns as the deprecated read-path.
3. **Translation is derived, not authored.** The **structural-literal** is a grammar-only fold over
   the constituency tree; the **fluent** is the grammar ⊕ balāgha fold. The fluent line must differ
   from the literal *only* by balāgha/nuance transforms — and **every divergence gets a
   `qr_ss_translation_decision` row** pointing at the driver (`QR:BL:*`, `QR:GR:*`, `QR:SR:*`). The
   `translation_unit` cache is **projected from the final buildup step**, never hand-typed.
4. **Real word-occurrence keying.** Tree leaves, dependency relations, segments, and the member-map
   all reference `qr_word_occurrences.id`. Pull those IDs first; never guess them.
5. **Mirror the gold template.** Copy the conventions of an already-built āyah (**44:3 = `QR:SS:44:3:s1`**)
   exactly — id namespaces, dot-path node ids, `term_key`s, `relation_label`s. Do not improvise a
   parallel scheme.
6. **Controlled vocab, not free text.** `term_key`, `relation_label`, `lx_grammar_ref`,
   `lx_balagha_ref` reuse the keys the corpus already uses. Reconcile against existing rows; only
   coin a new key when none fits, and say so.
7. **Provenance / defects are explicit.** Note dittography, OCR slips, or edition typos in the iʿrāb
   source rather than silently smoothing them. Additive-only schema changes (`ALTER … ADD COLUMN`).
8. **Idempotence & scope.** Check the āyah isn't already built before inserting; use a
   root/āyah-scoped ID namespace so you never collide with another āyah's rows.

## Workflow

### 1 — Resolve the āyah and pull its word occurrences
Confirm surah:āyah. Pull `qr_word_occurrences` for it (`id, word_index, word_text, pos, root,
lemma, morphology_tag`) ordered by `word_index`. These IDs are the anchors for the whole build.
Note which tokens are **compound** (a token carrying CONJ/particle/pronoun/lām segments, e.g.
وَإِنَّهُ, لَعَلِيٌّ, لَدَيْنَا) — only those get morpheme rows later.

### 2 — Check existence (do not duplicate)
Query `qr_ss_occ_sentence` for the āyah. If a sentence already exists, stop and ask before
rebuilding. Otherwise proceed.

### 3 — Mirror the gold template
Dump the full layer stack of a structurally similar built āyah (nominal/إنّ → **44:3**) — its
sentence, clause(s), tree/nodes/edges, segments, relations, translation unit — and copy every
convention. See `references/ss-schema-and-ids.md`.

### 4 — Build the structural stack (naḥw)
In order, each keyed to the āyah's word IDs (see the reference for schemas + templates):
1. `qr_ss_occ_sentence` — one row (`QR:SS:{s}:{a}:s{n}`), `sentence_kind`, iʿrāb `note_md`.
2. `qr_ss_occ_clause` — main clause(s) (`QR:CL:…`); split only when the khabar/جواب is itself a jumla.
3. `qr_ss_occ_phrase` — jar-majrūr, iḍāfa, ẓarf… (`QR:PH:…`, `head_word_id`, span).
4. `qr_ss_occ_segment` — morphemes of **compound tokens only** (`QR:SEG:{s}:{a}:{wi}:{a|b|c}`),
   each with a `segment_type` role key (harf_tawkid, ism_inna, lam_muzahlaqa, dharf_makan, …).
5. `qr_ss_syntax_relations` — dependency edges (`QR:SYN:…`, `head_word_id`, `dep_word_id`,
   `relation_label`): the aḵbār of إنّ, majrūr, muḍāf-ilayh, mutaʿalliq…
6. `qr_ss_tree` + `qr_ss_tree_node` + `qr_ss_tree_edge` — the constituency tree. **Node ids encode
   the dot-path** (`QR:SSN:{s}:{a}:s{n}:$.tree`, `…$.tree.children[1].children[0]`); each node has
   `node_label` (the Arabic span), `term_key` (the role), `label_ar` (Arabic gloss), `depth`,
   `node_order`, and `word_occurrence_id` on leaves.
7. `qr_ss_scope_member_map` — each word → the sentence scope (`member_role='member'`).

### 5 — Build the interpretive layers (source-grounded, trilingual)
Read `references/interpretive-and-translation.md`, then:
1. **Pull the real iʿrāb** for the āyah from `qr_irab_book_entries` (al-Daʿʿās, al-Jadwal/Ṣāfī,
   al-Muyassar, al-ʿUkbarī/Tibyān, al-Darwīsh…). Extract the actual positions and their books.
2. `qr_ss_scope_reading` — one row per distinct iʿrāb position (`QR:SR:…:r1..`), plus a
   `…:synth`. `scholar_ref` = the **real** book slugs / `QR:WORK:*` refs you found; `paradigm_ref`
   ∈ {jumhur, minority, synthesis}; set `is_minority`/`is_contested` honestly.
3. `qr_ss_scope_grammar_link` (`QR:GR:…`, `LX:GRAM_*`) — INNA_SISTERS, LAM_MUZAHLAQA,
   TAADDUD_KHABAR, IDAFA, TAALLUQ_SHIBH_JUMLA…
4. `qr_ss_scope_balagha_link` (`QR:BL:…`, `LX:*`, category ∈ {mani, bayan, badi}) — TAWKID,
   TAQDIM, TANKIR_TAZIM, QASR, ILTIFAT…
5. `qr_ss_scope_nuance` (`QR:NU:…`) — discourse force / emphasis.
Every one of these carries `gloss_json {ar,en,ur}`.

### 6 — Derive the translation (fold over the tree)
1. `qr_ss_translation_passage` (`QR:TLP:…`) — the āyah/passage shell + final fluent + `gloss_json`.
2. `qr_ss_translation_buildup` (`QR:TLB:…:s{k}`) — one step per tree node in reading order. Each
   step carries `added_gloss_json` and a cumulative `gloss_json` shaped
   `{structural:{ar,en,ur}, fluent:{ar,en,ur}}`, plus `driver_kind`+`driver_ref` and `layers_ar`.
   The structural fold uses grammar only; the fluent fold applies the balāgha transforms.
3. `qr_ss_translation_decision` (`QR:TD:…:d{k}`) — one row per rendering choice that the balāgha/
   readings drove, with `target_span_ar`, `rendered_json {ar,en,ur}`, `driver_kind`, `driver_ref`,
   `rationale_json {ar,en,ur}`.
4. Project the cache: `UPDATE qr_ss_translation_unit SET gloss_json = (SELECT gloss_json FROM
   qr_ss_translation_buildup WHERE id='…final step…')`.

### 7 — Verify
Confirm: the āyah's sentence/clause/phrase/segment/relation/tree/edge/member counts; `json_valid`
on every `gloss_json`/`rendered_json`/`rationale_json`; that the structural vs fluent folds read
correctly step by step; and that every `driver_ref` resolves to a real row. Report the counts and
the two folds back to the user.

## D1 gotchas (they will bite you — see the reference for detail)
- **Params cannot span multiple statements.** One parameterised `INSERT`/`UPDATE` per tool call
  (a single statement may have many `VALUES` rows). Multi-statement batches must be param-free.
- **Compound SELECT is capped at ~4 UNION arms.** Split wide count/verify queries.
- **`ALTER … ADD COLUMN` with a CHECK is fine** as long as the check permits NULL (existing rows
  default NULL). Adds are metadata-only even on a multi-GB DB.
- **Build `gloss_json` with `json_object(...)`** to guarantee validity; or pass a whole JSON string
  as one param (values must contain no `"`). Prefer `json_object`.
- **Avoid PK collisions:** the `<src>2` style namespaces are per-entity; use an āyah-scoped
  namespace (`QR:*:{surah}:{ayah}:…`) so two āyāt never clash.
