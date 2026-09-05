# Interpretive layers & derived translation

This governs *meaning*: the trilingual contract, how to ground readings in real sources, the balāgha
layer, and the translation-as-a-fold pipeline with its provenance graph.

## The `gloss_json {ar,en,ur}` contract
Every interpretive and translation row carries a `gloss_json` holding the same content in three
languages, all non-empty:
```json
{"ar":"…","en":"…","ur":"…"}
```
- **No row ships bilingual.** Arabic + English + Urdu, always.
- **No romanization.** English is real English; when an Arabic word must be named, write it in
  Arabic script inside the sentence. Same for Urdu.
- Build it with `json_object(...)`, pulling any existing `_ar/_en` columns and adding the new
  language, e.g.:
  ```sql
  UPDATE qr_ss_scope_balagha_link
  SET gloss_json = json_object('ar', note_md, 'en', rhetorical_effect, 'ur', '<urdu>')
  WHERE id='QR:BL:S:A:b1';
  ```
- Legacy `_ar/_en` columns stay as the deprecated read-path; `gloss_json` is the write-path. Adding
  a 4th language later is a key inside the JSON — **no migration**. (This is why JSON beats `_ur`
  columns: one shape validated everywhere, additive forever.)

## Grounding readings — the non-negotiable rule
**Never fabricate a citation.** Pull the āyah's real iʿrāb first:
```sql
SELECT source_slug, target_text_ar, grammar_role_ar,
       COALESCE(irab_text_ar, source_quote_ar) AS txt
FROM qr_irab_book_entries
WHERE surah=S AND ayah_from<=A AND ayah_to>=A
ORDER BY source_slug, entry_order;
```
Known whole-Qurʾān iʿrāb slugs seen in the corpus: `qul_irab_muyassar` (al-Muyassar),
`qul_irab_quran_daas` (al-Daʿʿās, per-word), `qul_jadwal_irab_quran` (al-Jadwal / Ṣāfī),
`tibyan_ukbari_irab` (al-ʿUkbarī's Tibyān), `qul_irab_darwish` (Darwīsh). Tafsīr works are ref: 
`QR:WORK:ZAMAKHSHARI:AL-KASHSHAF-`, `QR:WORK:ABU_HAYYAN:AL-BAHR-AL-M`, etc.

Then write `qr_ss_scope_reading` rows:
- one row per **distinct position** (`…:r1`, `…:r2`, …), plus one `…:synth` that summarises across books;
- `scholar_ref` = the **real** slugs / work-refs you actually found, semicolon-separated;
- `paradigm_ref` ∈ {jumhur, minority, synthesis}; `reading_type` ∈ {irab, synthesis};
- set `is_minority`/`is_contested` honestly; put the Arabic statement in `reading_text_ar`, English
  in `reading_text`, and the triple in `gloss_json`.
- Word-scoped readings use `scope_type='word'`, `scope_id=<word_occurrence_id>`; the synthesis uses
  `scope_type='sentence'`, `scope_id='QR:SS:S:A:s{n}'`.

If a position is genuine cross-book consensus but you cannot point to a specific book in the DB,
mark it `jumhur` and say so; **do not invent a slug**. Flag dittography / OCR / edition typos in the
source rather than smoothing them.

## Grammar, balāgha, nuance layers
- `qr_ss_scope_grammar_link` — the naḥw facts driving structure (INNA_SISTERS, LAM_MUZAHLAQA,
  TAADDUD_KHABAR, IDAFA, TAALLUQ_SHIBH_JUMLA). `application_note` short EN; `gloss_json` the triple.
- `qr_ss_scope_balagha_link` — the rhetoric. `lx_balagha_ref` = `LX:*`; `balagha_category` ∈
  {mani, bayan, badi}; `rhetorical_effect` short EN; `note_md` Arabic; `gloss_json` the triple.
  Typical for an إنّ + mufrad-khabar āyah: TAWKID_INNA_LAM (mani), TAQDIM_SHIBH_JUMLA (mani),
  TANKIR_TAZIM (mani).
- `qr_ss_scope_nuance` — discourse force / emphasis / tashrīf. `nuance_text`(EN) + `nuance_text_ar`
  + `gloss_json`.

## Translation = a fold over the tree
The thesis: **translation is a function, not a fact.**
```
structural-literal = fold over the constituency tree using ss-grammar join rules only
fluent             = the same fold, with ss-balāgha applied as coloring transforms
```
- **Join rules (grammar):** each node's `term_key` says how to fuse its children — `khabar_inna`
  ⇒ predication, `jar_wa_majrur` ⇒ attach, `mudaf_ilayh` ⇒ "of", `khabar_thani` ⇒ coordinate with
  "and".
- **Coloring rules (balāgha):** each balāgha tag is a transform at the node it sits on —
  `TAWKID_INNA_LAM` ⇒ "truly / most surely / یقیناً"; `TANKIR_TAZIM` ⇒ lift "high" → "sublime /
  نہایت بلند"; `TAQDIM_SHIBH_JUMLA` ⇒ keep the fronting in the target so the ground leads.

The fluent line must differ from the literal **only** by these transforms — and each difference is
recorded as a decision (below).

### Buildup ladder (`qr_ss_translation_buildup`)
One step per tree node in reading order. Per step:
- `combination_ref` = the node dot-path; `relation_type` = how it joins; `connector_en` = the
  English connective logic; `added_en` / `cumulative_en` = the running **fluent** line (back-compat);
- `added_gloss_json` and cumulative `gloss_json` shaped **`{structural:{ar,en,ur}, fluent:{ar,en,ur}}`** —
  both folds, trilingual, at each step;
- `driver_kind` ∈ {grammar, balagha, reading, nuance} and `driver_ref` = the row(s) driving this
  step (semicolon-joined); `layers_ar` = the human layer note (`نحو (…) · بلاغة (…) · قراءة (…)`).

Structural and fluent are identical until a balāgha/nuance driver enters — that step is where they
diverge (e.g. `[is] lofty` vs `truly sublime`).

### Provenance graph (`qr_ss_translation_decision`) — the highest-leverage table
One row per rendering choice the balāgha/readings caused:
`target_span_ar`, `rendered_json {ar,en,ur}`, `driver_kind`, `driver_ref` (→ `QR:BL:*`/`QR:GR:*`/
`QR:SR:*`), `rationale_json {ar,en,ur}`. This makes the translation:
- **regenerable** — edit a balāgha row → `SELECT … WHERE driver_ref='QR:BL:S:A:bX'` finds every
  rendering that leans on it;
- **explainable** — the UI can answer "why 'sublime'?" with the driver + its rationale;
- **auditable** — every rendering resting on a contested reading is findable.

### Cache projection (`qr_ss_translation_unit`)
Never hand-type the final translation. Project it from the last buildup step so the cache cannot
drift from the derivation:
```sql
UPDATE qr_ss_translation_unit
SET gloss_json = (SELECT gloss_json FROM qr_ss_translation_buildup WHERE id='QR:TLB:S:A:s{last}')
WHERE id='QR:TL:S:A:s{n}';
```

## Verify the meaning layers
- `json_valid` on every `gloss_json` / `rendered_json` / `rationale_json`, and each has non-empty
  `ar`/`en`/`ur`:
  ```sql
  SELECT id, json_valid(gloss_json),
    length(json_extract(gloss_json,'$.ar'))>0,
    length(json_extract(gloss_json,'$.en'))>0,
    length(json_extract(gloss_json,'$.ur'))>0
  FROM qr_ss_scope_balagha_link WHERE id LIKE 'QR:BL:S:A:%';
  ```
- Read the two folds side by side to confirm the divergence lands where a balāgha driver enters:
  ```sql
  SELECT step_seq,
    json_extract(gloss_json,'$.structural.en'),
    json_extract(gloss_json,'$.fluent.en'),
    driver_kind, driver_ref
  FROM qr_ss_translation_buildup WHERE passage_id='QR:TLP:S:A' ORDER BY step_seq;
  ```
- Confirm every `driver_ref` resolves to a real interpretive row.

## The worked reference (43:4)
The first full build was **al-Zukhruf 43:4** (`وَإِنَّهُ فِي أُمِّ ٱلْكِتَٰبِ لَدَيْنَا لَعَلِيٌّ حَكِيمٌ`): 7-node
tree, 5 readings grounded in al-Muyassar/al-Daʿʿās/al-Jadwal/al-ʿUkbarī, 3 balāgha, 2 nuance, a
5-step buildup ladder, 5 decisions, cached unit — all trilingual. Use it as the template to imitate.
