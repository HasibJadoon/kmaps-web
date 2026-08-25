# The display spec

**What a layer of a root, lemma or word IS, shaped for reading.**

Read this before adding a block kind, a per-layer shape, or a client renderer.

---

## Why it exists

Three clients render the same data — the Angular app, the iOS app, and the
macOS Studio overlays. Each used to decide for itself how a layer should look,
and the decisions are the same ones every time: *what is the title of this row,
how are these ordered, is this weight large, how much should I show*.

Three implementations of "oldest witness first" drift, and nothing fails when
they do. The same disease produced 429 hand-maintained response interfaces, a
`children` field the API never sent, and text truncated at 48, 220, 140 and 130
characters in four files of one feature.

So the shape decisions live in the worker that already knows the schema, and the
clients render a small vocabulary.

## The one rule

> **Shaping in the worker. Chrome in the client.**

| the spec decides | the client decides |
|---|---|
| order, joins, grouping | layout, spacing, columns |
| which column is the title | what a heading looks like |
| weights as fractions of the largest | how a fraction is drawn |
| muted / highlighted / terminal | which colour those map to |
| vocabulary mapping (`fa` → `fāʾ`) | fonts and faces |
| every count and summary string | direction and interaction |
| how many rows to send | navigation |

If you want to sort something in a component, the sort belongs in the spec.
That is the whole exercise.

## Where it lives

```
workers/shared/src/contracts/ds.ts     the vocabulary — imported by BOTH sides
workers/ar-linguistics/…/ds.repo.ts    the domain half: what a layer is and holds
workers/core/…/ds.repo.ts              the composer: layers + plane + cards
apps/k-maps/…/cybernetics/ds/          the Angular renderer
```

```
GET /al/ds/root/:root?form=…      the layers alone
GET /core/ds/root/:root?form=…    the whole picture — ask for this
```

`km_core` is the management layer: it is the only worker bound to every other
one and the only place the four outputs, the SRS cards and the Qurʾānic
distribution live. It reaches a domain through that domain's **service
binding**, never by binding another domain's D1. AL knows what
`ar_ling_root_asl` means; core does not and should not.

## Three states, and the third is the point

| state | meaning |
|---|---|
| `filled` | the carrier was read and holds rows |
| `empty` | the carrier was read and holds nothing — a *measured* zero |
| `unknown` | **no audited carrier binds this sub-layer.** Nothing was ever read |

Collapsing `unknown` into `empty` claims a measurement nobody took. For a
typical root most layers are one of these two — identity and phonology cover all
23,689 roots, sense arcs cover 53, semantic fields 4 — so this is the common
case, not an edge case.

The same applies to an axis: `pct: 0, measured: false` means nobody has read it.
The number is not the claim; the flag is.

## Adding a per-layer shape

One `case` in `DsRepo.blocksFor`. A sub-layer with no case falls back to a table
of what it holds — a fallback, not a default: a table is always readable, and it
is how a newly-bound carrier appears the day it is bound rather than the day
someone writes a view for it.

Before writing one, check what the iOS `CyberneticsFeature` band views already
do for that band. The vocabulary was derived from them, so the shape you want
probably exists.

## Adding a block kind

1. Add it to `DsKnownBlock` **and** to `DS_BLOCK_KINDS` in `contracts/ds.ts`.
2. Add one block of it to `test/fixtures/display-spec.golden.json`.
   A test fails until you do — that fixture is how the other client learns the
   kind exists.
3. Add a `@case` to `cyb-ds-block.component.ts`.

You do **not** have to update every client at once. That is the point of the
next section.

## Why a client older than the spec still works

The vocabulary lives on the worker and will grow. Clients cannot be redeployed
in lockstep — the iOS app ships through review.

`DsBlock` is a **closed** union, so a renderer's switch narrows without casts.
Forward compatibility is handled at the boundary instead: `normaliseSpec` turns
a kind this build has never heard of into a `note` saying so, once, where the
data arrives. By the time a block reaches the renderer it is always one that
renderer can draw.

The failure this avoids is a **blank section** — a reader cannot tell that apart
from a layer that genuinely holds nothing, and the whole spec is built to keep
those two apart.

## Text carries its script

Never a bare string:

```json
{ "text": "النُّزول", "script": "ar" }
```

The Arabic UI face (AmiriQuran) and the muṣḥaf face (UthmanicHafs) are different
fonts. Setting a UI label in the muṣḥaf face is an error, not a preference, so
the spec says which script a run is in and the client picks the face. Qurʾānic
text also carries `register: "mushaf"`.

Sizes are **semantic roles**, never pixels: `ar_ling_reg_heading_style` stores
`font_size_px`, which is meaningless across an iOS point grid and a CSS `rem`
scale.

## Provenance

A synthesis is ours and says so; anything else cites where to check it. This
mirrors the CHECK on `qr_morph_display_block` — the one provenance rule in the
codebase that was actually enforced:

* `is_synthesis: true` → `source` must be a `kmaps_*` slug
* `is_synthesis: false` → `ref` must say where to look

## Never truncate silently

Every capped block carries `overflow_count`. A reader who cannot see the rest
must at least know there is a rest. Caps are per form factor and live in one
place — a phone is not a small desktop.

## Display tables are dead

Three attempts to *store* a display projection each stalled at a handful of
hand-authored rows:

| attempt | rows |
|---|---|
| `ar_ling_root_display` | 13 — one root |
| `display_json` on 13 AL tables | 2–27 each — one root, cosmetics only |
| `qr_morph_display_root` / `_lemma` / `_word` | 4 / 27 / 24 |

The spec is **computed, never stored**. A stored spec cannot say what the
carriers hold *now*, which is the only thing it is for.

## Verifying

Tests run the repositories' real SQL against an in-memory SQLite seeded from the
live schema (`test/d1-sqlite.ts`). Mocking would hide the bugs worth catching —
a filter on the wrong side of a join, an ordering that only looks right until
the tenth row, a NULL read as a zero. Two real bugs were caught that way:

* the `via` filter applied inside the subquery, where it named a column of the
  table being joined *to*;
* `band_key` and `display_icon` never reaching `LayerModelSub`, so every accent
  colour came back null.

```bash
npm test
```
