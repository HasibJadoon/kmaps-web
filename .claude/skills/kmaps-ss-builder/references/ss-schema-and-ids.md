# SS schema, ID conventions & SQL templates

Database: **km_quran** = `8dbd5053-c9b8-4dd0-9e45-1d66d3a58fba`.
Iʿrāb source text lives here too (`qr_irab_book_entries`). All word anchors are `qr_word_occurrences.id`.

## Contents
- ID namespace (all layers)
- Word anchors
- Structural table schemas + insert templates
- Interpretive + translation table schemas (see the other reference for how to fill them)
- `term_key` / `relation_label` / `segment_type` vocabularies
- D1 gotchas

## ID namespace (āyah-scoped — never collide)
For surah `S`, āyah `A`, sentence `n`, step `k`:

| Layer | Table | ID pattern |
|---|---|---|
| Sentence | qr_ss_occ_sentence | `QR:SS:S:A:s{n}` |
| Clause | qr_ss_occ_clause | `QR:CL:S:A:c{n}` |
| Phrase | qr_ss_occ_phrase | `QR:PH:S:A:p{n}` |
| Segment | qr_ss_occ_segment | `QR:SEG:S:A:{word_index}:{a|b|c}` |
| Relation | qr_ss_syntax_relations | `QR:SYN:S:A:{n}` |
| Tree | qr_ss_tree | `QR:TR:S:A:s{n}` |
| Tree node | qr_ss_tree_node | `QR:SSN:S:A:s{n}:$.tree[.children[i]...]` |
| Tree edge | qr_ss_tree_edge | `QR:SSE:S:A:s{n}:$.tree.children[i][...]` |
| Member map | qr_ss_scope_member_map | `QR:MM:S:A:{n}` |
| Reading | qr_ss_scope_reading | `QR:SR:S:A:r{n}` , `QR:SR:S:A:synth` |
| Grammar link | qr_ss_scope_grammar_link | `QR:GR:S:A:g{n}` |
| Balāgha link | qr_ss_scope_balagha_link | `QR:BL:S:A:b{n}` |
| Nuance | qr_ss_scope_nuance | `QR:NU:S:A:n{n}` |
| Translation passage | qr_ss_translation_passage | `QR:TLP:S:A` (or `S:A1-A2`) |
| Buildup step | qr_ss_translation_buildup | `QR:TLB:S:A:s{k}` |
| Decision | qr_ss_translation_decision | `QR:TD:S:A:d{k}` |
| Translation unit | qr_ss_translation_unit | `QR:TL:S:A:s{n}` |

**Node ids literally encode the JSON dot-path.** Root = `…:$.tree`; its children =
`…:$.tree.children[0]`, `…:$.tree.children[1]`; nested = `…:$.tree.children[1].children[0]`.
This is the `node_id + dot-path` addressing the app patches by. `depth`: root 0, children 1, …
`node_order`: sequential traversal order (root 1, then children in order).

## Word anchors
```sql
SELECT id, word_index, word_text, pos, root, lemma, morphology_tag
FROM qr_word_occurrences WHERE surah=S AND ayah=A ORDER BY word_index;
```
A **compound token** (e.g. وَإِنَّهُ = وَ+إِنَّ+هُ, لَعَلِيٌّ = لَ+عَلِيّ, لَدَيْنَا = لَدَيْ+نَا) is a single
`qr_word_occurrences` row; its internal morphemes become `qr_ss_occ_segment` rows. Simple content
words get no segment rows (mirror the gold āyah — it segments only compound tokens).

## Structural schemas + templates

### qr_ss_occ_sentence
`(id, surah, ayah_from, ayah_to, word_start_index, word_end_index, sentence_kind, discourse_role, note_md)`
`sentence_kind` ∈ {nominal, verbal, conditional, …}. `note_md` = concise Arabic iʿrāb of the whole sentence.

### qr_ss_occ_clause
`(id, sentence_id, parent_clause_id, clause_order, surah, ayah_from, ayah_to, word_start_index, word_end_index, clause_type, clause_function, note_md)`
`clause_type` ∈ {main, subordinate}. `clause_function` e.g. jawab_qasam, khabar_inna, istinafiyya.

### qr_ss_occ_phrase
`(id, clause_id, phrase_order, surah, ayah, word_start_index, word_end_index, phrase_type, phrase_function, head_word_id, note_md)`
`phrase_type` ∈ {jar_majrur, idafa, dharf, …}. `head_word_id` = a `qr_word_occurrences.id`.

### qr_ss_occ_segment
`(id, surah, ayah, word_occurrence_id, segment_index, segment_text, segment_type[, morphology_tag])`
`segment_index` per word (1,2,3). `segment_text` = the Arabic morpheme.

### qr_ss_syntax_relations
`(id, surah, ayah, head_word_id, dep_word_id, relation_label[, lx_rel_type_ref, note_md])`

### qr_ss_tree / _node / _edge
```
qr_ss_tree      (id, sentence_id, tree_type, grounding, source_ref[, note_md])   -- tree_type='constituency', grounding='authored'
qr_ss_tree_node (id, tree_id, parent_node_id, node_label, scope_type, scope_id, depth, node_order, term_key, label_ar, word_occurrence_id)
qr_ss_tree_edge (id, tree_id, parent_node_id, child_node_id[, edge_label])
```
`node_label` = the Arabic text span of the constituent. `label_ar` = Arabic gloss of its role.
`scope_type`/`scope_id` on nodes are usually NULL. Set `word_occurrence_id` on terminal (leaf) nodes.

### qr_ss_scope_member_map
`(id, word_occurrence_id, scope_type, scope_id, member_role)` — one row per word,
`scope_type='sentence'`, `scope_id='QR:SS:S:A:s{n}'`, `member_role='member'`.

### Insert template (parameterised, one statement)
```sql
INSERT INTO qr_ss_tree_node
(id, tree_id, parent_node_id, node_label, scope_type, scope_id, depth, node_order, term_key, label_ar, word_occurrence_id)
VALUES
('QR:SSN:S:A:s1:$.tree', 'QR:TR:S:A:s1', NULL, ?, NULL, NULL, 0, 1, 'jumlah_ismiyyah', ?, NULL),
('QR:SSN:S:A:s1:$.tree.children[0]', 'QR:TR:S:A:s1', 'QR:SSN:S:A:s1:$.tree', ?, NULL, NULL, 1, 2, 'inna_wa_ismuha', ?, '<woid>');
-- params: node_label & label_ar per row, in order
```

## Interpretive + translation schemas (fill per the other reference)
```
qr_ss_scope_reading      (id, scope_type, scope_id, scholar_ref, paradigm_ref, reading_type, lx_reading_type_ref, reading_text, reading_text_ar, is_minority, is_contested, note_md, gloss_json)
qr_ss_scope_grammar_link (id, scope_type, scope_id, lx_grammar_ref, application_note, note_md, gloss_json)
qr_ss_scope_balagha_link (id, scope_type, scope_id, lx_balagha_ref, balagha_category, rhetorical_effect, note_md, gloss_json)
qr_ss_scope_nuance       (id, scope_type, scope_id, nuance_type, lx_nuance_type_ref, nuance_text, nuance_text_ar, note_md, gloss_json)
qr_ss_translation_passage(id, passage_ref, surah, ayah_from, ayah_to, assembled_fluent_en, final_fluent_en, assembly_note_ar, synthesis_md, status, gloss_json)
qr_ss_translation_buildup(id, passage_id, surah, step_seq, unit_id, combination_ref, relation_type, connector_en, added_en, cumulative_en, layers_ar, status, driver_kind, driver_ref, gloss_json, added_gloss_json)
qr_ss_translation_decision(id, unit_id, buildup_id, surah, ayah, step_seq, target_span_ar, rendered_json, driver_kind, driver_ref, rationale_json, status)
qr_ss_translation_unit   (id, scope_type, scope_id, surah, ayah_from, ayah_to, seq, structural_literal_en, fluent_en, fluent_ar, decision_note_ar, status, gloss_json)
```
`scope_reading.scope_id` may be a **word_occurrence_id** (word-scoped reading) or a sentence id
(the synthesis). `grammar/balagha/nuance.scope_id` is normally the sentence id (or a word id for a
word-local point like iḍāfa). If `gloss_json` columns are absent, add them (see gotchas).

## Vocabularies (reuse; reconcile before coining new)
- **term_key** (tree nodes): jumlah_ismiyyah, jumlah_filiyyah, inna_wa_ismuha, khabar_inna,
  khabar_thani, jar_wa_majrur, mudaf_ilayh, dharf_makan, fiil_madi, fail, maful_bih, naat, jumlah_khabariyya.
- **segment_type**: harf_atf, harf_istinaf, harf_tawkid, ism_inna, lam_muzahlaqa, dharf_makan,
  mudaf_ilayh, fiil_madi, fail, maful_bih, fiil_madi_naqis, ism_kana.
- **relation_label**: khabar_inna, khabar_thani, majrur, mudaf_ilayh, mutaalliq, naat, fail, maful_bih.
- **lx_grammar_ref**: LX:GRAM_INNA_SISTERS, LX:GRAM_LAM_MUZAHLAQA, LX:GRAM_TAADDUD_KHABAR,
  LX:GRAM_IDAFA, LX:GRAM_TAALLUQ_SHIBH_JUMLA, LX:GRAM_MUBTADA_KHABAR, LX:GRAM_MA_MAWSUL.
- **lx_balagha_ref**: LX:TAWKID_INNA_LAM, LX:TAQDIM_SHIBH_JUMLA, LX:TANKIR_TAZIM, LX:QASR,
  LX:ILTIFAT, LX:IJAZ_IDAFA, LX:BARAAT_ISTIHILAL, LX:TARAJI_LAALLA. `balagha_category` ∈ {mani, bayan, badi}.
- **nuance_type**: discourse_force, emphasis, contrast_release, register_shift.
> If a controlled-vocabulary registry table exists for `LX:*`, reconcile refs against it and fix
> mismatches rather than coining silently.

## D1 gotchas
- **Params never span multiple statements** (`params with multiple statements is not supported`).
  One parameterised statement per tool call; multi-row `VALUES` is fine within it. Multi-statement
  batches (several `INSERT`/`ALTER`) must be **param-free** — inline the values (safe when text has
  no `'`/`"`; Arabic/Urdu qualify).
- **Compound SELECT capped at ~4 UNION arms** — split verification queries.
- **`ALTER TABLE … ADD COLUMN col TYPE CHECK(col IS NULL OR json_valid(col))`** works because new
  rows default NULL; metadata-only.
- **Build JSON with `json_object('ar',ar_col,'en',en_col,'ur','<urdu>')`** — pulls existing
  columns, guarantees validity, only the new language is inline. For fresh rows, pass the full JSON
  string as one param (no `"` inside values).
- **Check existence & mirror** before writing: dump the gold āyah (`QR:SS:44:3:s1`) across every
  layer and copy its conventions.
