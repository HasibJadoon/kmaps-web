# km_worldview — the tables that matter, and the ones that do not

Counts are live as of 2026-08-29. **Re-count before trusting any of them** — that is the point of
this file, not its contents.

```
cd workers/worldview
npx wrangler d1 execute km_worldview --remote --json --command "SELECT COUNT(*) FROM wv_value_positions"
```

**D1 caps the terms in a compound SELECT below about ten.** A census written as one big
`UNION ALL` of `COUNT(*)` fails with `too many terms in compound SELECT`. Count in batches of five
to eight, or one at a time.

## The four tables the contrast turns on

### `core_concept` — the pivot
Registry of record in **km_core**, mirrored identically into km_quran and km_worldview.

```
id           CN:{domain}:{key}      -- CN:theology:tawhid
uid          26-hex                 -- the convention AL: and GT: already use
concept_key  tawhid
label_en, label_ar
domain       theology · ethics · eschatology · law · society · epistemology ·
             ideology · history · textuality · quran · analysis
origin       quran | worldview | axis
```

117 rows: 102 extracted from the three vocabularies that had grown separately, plus 15 authored as
the comparison axes. `origin='axis'` marks those 15 — revelation, prophecy, covenant, law, mercy,
justice, sacrifice, salvation, family, authority, hospitality, repentance, stewardship,
truthfulness, obedience. Their `note_md` says what the axis is *asking*, because an axis called
"law" could be several questions and a comparison only means something if every side answers the
same one.

**Authoring a new concept means writing it to all three databases.** One file, run three times. Two
copies written separately are not copies.

### `wv_traditions` — the worldviews
17 rows. `tradition_type` has **no CHECK constraint**, which is deliberate: religion, philosophy,
discipline, ideology, movement, era and mysticism all appear, because the only question that matters
is whether the thing holds a position.

```
wv-tradition-islam · christianity · judaism           religion
wv-tradition-late-antiquity                            era
wv-tradition-greek-philosophy                          philosophy
wv-tradition-enlightenment · modernity · postmodernism movement
wv-tradition-liberalism · marxism · feminism ·
  secular-naturalism                                   ideology
wv-tradition-sociology · psychology · legal-theory ·
  anthropology                                         discipline
wv-tradition-sufism                                    mysticism  (predates this work)
```

`wv_tradition_branches` exists and is empty — it is where Ashʿarī vs Muʿtazilī, Catholic vs
Reformed, first- vs third-wave feminism belong when a single row stops being honest.

### `wv_value_positions` — what a worldview says
```
id, moral_axis_id (NOT NULL), tradition_id, concept_ref,
position_title, position_text, position_type,
qr_scope_ref, surah, ayah_from, ayah_to, status
```
`moral_axis_id` is NOT NULL and predates `concept_ref`; both are kept. The axis is the coarse
grouping, the concept is the precise binding. `wv_moral_axes.concept_ref` links the 15 axes to the
registry, so the two vocabularies are one.

### `wv_value_position_source` — where it comes from
```
id, position_id, source_kind (quran|book|chunk|external),
source_id → wv_sources, source_unit_id → wv_source_units,
locator, qr_scope_ref, excerpt, note_md
```
The **only** table added by this line of work. It exists because `evidence_refs` beside it is a JSON
text column, and "each side carrying its own sources" has to be a join.

## Cross-database seams

Every cross-database reference in km_worldview is an unvalidated string — D1 cannot enforce a
foreign key across databases, so the discipline has to be ours.

| column | points at | state |
|---|---|---|
| `wv_value_positions.surah/ayah_from/ayah_to` | km_quran āyāt | resolvable, indexed |
| `wv_node_quran_links.surah/ayah_from/ayah_to` | km_quran āyāt | normalised by 025 from three incompatible string formats |
| `wv_evidence_items.al_concept_ref` | km_arabic_linguistic | column exists, NULL on all 6 rows, never used |
| `wv_unit_attachments.target_ref` | `CM:` doc space | 6 rows, the one cross-link that works |
| `wv_doc_links.cm_doc_ref` | supposedly `cm_` docs | **abused** — holds a filesystem path, a wv source id, `ext:` pseudo-refs and a YouTube URL. Not one is a real doc id. |
| `core_user_ref` on 10 tables | km_core users | **two incompatible forms**: `'1'` and `'CORE:000…'`. Nothing validates either. |

`canonical_ref` on `wv_nodes` is **two things at once** — `QR:S:39` on 14 nodes and page strings
like `p.31-35` on person nodes. Do not reuse it as an id; a column meaning two things is how three
reference formats happened.

## Id conventions

There is no single convention — at least eight coexist, layered by import epoch. When writing new
rows, follow the dominant modern one: `wv-{entity}-{slug}` with hyphens.

```
wv-topic-… wv-person-… wv-tradition-… wv-cmp-… wv-diagram-…   the modern convention
wv_node_… wv_edge_…      the Qurʾān-passage importer, underscores
wvn- wve- wva- wvrs-     a third generator
node- edge- cl- ax-      the Arjana import — no namespace at all, 127 nodes + 199 edges
wql_                     wv_node_quran_links only
QR: CN: GT: AL: CM:      the genuinely global ids
```

## The worked example

`WV_AR_RUM_30_2_6_FULL_DEEP_FLAT_V1` — Sūrat al-Rūm 30:2–6. 11 Qurʾānic positions against 10
secular, 27 `rebuts` edges, every Qurʾānic position sourced to the passage. Lifted out of
`data_json` by migration 024; read it before building a new passage.

It also carries 7 `framework` claims that were deliberately **not** lifted, because a claim about
the reading is not a position within it.

## Migrations, in order

| | |
|---|---|
| `021` / `021a` | `core_concept` + `core_concept_binding` in km_core; mirror into km_quran and km_worldview |
| `022` | 17 worldviews; `concept_ref` and resolvable scope on `wv_value_positions`; `wv_value_position_source` |
| `023` | the 15 axes authored as concepts — run against all three databases |
| `024` / `024a` | the al-Rūm lift, and its bindings in km_core |
| `025` | `surah`/`ayah_from`/`ayah_to` on the link tables; the `wv_ayah_coverage` view |
