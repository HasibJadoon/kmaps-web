# The standard · a claim envelope for every carrier

Everything in `km_arabic_linguistic` is a **claim**: someone said something, about something, at
some level, with some standing. 117 tables say it 117 ways.

This proposes one envelope — **five fields, on every carrier row** — and the evidence for why
each is needed. It is not a rewrite: every field below already exists somewhere; the standard is
picking one of each and retiring the rest.

---

## The measured problem

**A root is keyed six ways.** Across 61 table-uses:

| column | tables |
|---|---|
| `root_norm` | **34** |
| `root_id` | 19 |
| `root_text` | 5 |
| `root_bw` | 2 |
| `root_ar` | 1 |

A reader wanting "everything about بين" writes five different joins, and `root_bw` needs a
Buckwalter the lemma table does not store — which is why `forms[].lemmas[].derivation` is still
null.

**Provenance is expressed nine ways.**

| column | tables |
|---|---|
| `source_slug` | 43 |
| `confidence` | 24 |
| `source_ref` | 21 |
| `generated_by` | 7 |
| `provenance_json` | 5 |
| `is_synthesis` | 3 |
| `claim_basis` | 3 |
| `is_qiyasi` | 2 |
| `is_curated` | 1 |

The producer currently derives *attested* vs *ours* from four of these, differently per table.
That logic is a guess dressed as a rule.

**`status` is nine incomparable values, and there is no publication gate.**

| carrier | values |
|---|---|
| `ar_ling_root_asl` | `extracted` 998 · `candidate` 539 · `draft` 67 · `active` 14 · **`live` 8** |
| `ar_ling_root_sense` | `draft` 552 · `live` 354 · `migrated_to_lemma_arc` 9 · `superseded_duplicate` 5 |
| `ar_ling_root_lemma_ilal` | `raw` 24 |
| `ar_ling_reg_sub_layer` | `live` · `na` |

**This is not a tidiness problem. It is a correctness one.**

- **Not one of بين's four aṣl statements is published** — three `draft`, one `extracted`. The
  root page's §1, Ibn Fāris's single-aṣl statement, was rendering unpublished rows. That is also
  the real explanation for the `confidence: low` flagged earlier: those rows were never promoted.
- **كشف has 32 live labelled senses, not 42.** Nine are `migrated_to_lemma_arc` and one is
  `superseded_duplicate` — rows explicitly retired, which a producer filtering only on
  `label_ar IS NOT NULL` serves anyway. My own earlier audit repeated the 42.

**Scope is declared on 7 tables and keyed on 3.** `scope_level` exists without `scope_key` on
four carriers, so the level is stated and the subject is not.

**Trilingual is the one thing already near-standard** — 65 of 117 tables carry `*_ar/_en/_ur`,
8 carry Arabic without Urdu. Keep the convention; close the 8.

---

## The envelope

Five fields. Every carrier row, no exceptions.

```sql
subject_kind  TEXT NOT NULL    -- root | form | lemma | word | sense | arc
subject_ref   TEXT NOT NULL    -- the id of that subject, always an id, never a surface
state         TEXT NOT NULL    -- live | draft | retired
basis         TEXT NOT NULL    -- attested | derived
source_ref    TEXT             -- required when basis = 'attested'
```

with the existing convention kept for content:

```sql
<field>_ar / <field>_en / <field>_ur      -- never one mixed string
```

### 1 · `subject_kind` + `subject_ref` — one way to name what a row is about

Replaces `root_norm`, `root_id`, `root_text`, `root_bw`, `root_ar`, `lemma_id`, `scope_level`,
`scope_key`. **`root_norm` is the wrong survivor** despite being the most common: it is a
surface string, it collides across normalisation, and it cannot name a lemma or a word. The pair
can name any subject, which is what the three views need.

Keep `root_norm` as a denormalised convenience column where a query is hot — but never as the
only key.

### 2 · `state` — three values, and a reader sees one

`live` · `draft` · `retired`. Everything else maps in:

| today | becomes |
|---|---|
| `live`, `active` | `live` |
| `draft`, `candidate`, `extracted`, `raw`, `pending` | `draft` |
| `na`, `superseded_duplicate`, `migrated_to_lemma_arc` | `retired` |

**Every reader query filters `state = 'live'`. Without exception.** A layer whose rows are all
`draft` reports as *unpublished*, not as absent — the two look identical to a reader and must not
to a builder.

Applied now in `root-doc.repo.ts`: بين's aṣl section returns **empty**, with a gap reading
*"4 rows held back — status is extracted, draft"*. That is the honest state, and it is worth
seeing.

### 3 · `basis` — attested or ours, and nothing between

`attested` means a named source says it, at a locatable place. `derived` means K-Maps produced
it. Replaces `is_synthesis`, `is_curated`, `is_qiyasi`, `generated_by`, and the `kmaps_%`
prefix convention.

**`confidence` is not provenance and must stop being read as it.** It is a separate axis — how
sure the ingest was that it read the source correctly — and conflating them is what produced a
page badging `verbatim` over rows marked `low`.

A row with `basis = 'attested'` and no `source_ref` should fail a constraint, not render.

### 4 · Absence is a state, not a string

`غير مأثور` and `غير مستعمل` currently live **inside value fields** — the paradigm carrier writes
"not attested" where a participle would go. That is correct scholarship in the wrong place: a
renderer cannot distinguish it from a participle, and only a regex saves it.

```sql
<slot>_ar        TEXT     -- the value, or NULL
<slot>_absent    TEXT     -- 'not_built' | 'not_recorded' | NULL
```

`not_built` = the language declines it (Form I of بين has no ism mafʿūl, on the Miṣbāḥ's
authority). `not_recorded` = nobody has looked. **These are different facts and a reader deserves
both**, which is the same rule that made `unknown` ≠ `empty` in the display spec.

---

## Order to adopt it

1. **`state`, now.** One column, mechanical mapping, and it stops drafts reaching readers. The
   producer is already gated; the carriers should agree with it.
2. **`basis`, next.** Also mechanical, from the four columns it replaces. Unblocks a single
   provenance rule instead of four.
3. **`subject_kind`/`subject_ref`** as new carriers are added, and backfilled on the seven
   already carrying `scope_level`. Do not rewrite 34 tables at once.
4. **`*_absent`** on the paradigm and form carriers only — that is where prose-as-absence lives.
5. **Trilingual gaps** on the 8 tables missing Urdu.

Steps 1 and 2 are a day's work and remove two classes of wrong output. Step 3 is the one that
makes the three views cheap, and it can be incremental.

## What this does not standardise

`ar_ling_root_sense` holding **two contracts** — a labelled inventory for بين, per-lemma
analytical notes with arcs inside `label_ar` for كشف — is not a column problem and no envelope
fixes it. It needs a decision about what a sense row is. It remains the highest-value open
question in the corpus.
